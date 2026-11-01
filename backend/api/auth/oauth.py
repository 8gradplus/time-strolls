"""Who may change content (ROADMAP.md, step 5): one auth for the admin MCP and
the admin REST routes.

- Bearer tokens (API_KEY, `api_token`) work in every mode.
- With Google (`config.auth.google`) the API is also an OAuth 2.1
  authorization server, as MCP clients (claude.ai, ChatGPT, Gemini) expect:
  FastMCP's GoogleProvider, an OAuth proxy that lets people sign in with
  Google and issues our own tokens. A token's Google identity becomes an
  account by invitation (`accounts.login`); everyone else is refused.
- Two changes to FastMCP's defaults: its state goes into our Postgres
  (`oauth_store`), not a file in the container, lost on every release;
  and Google's answer about a token is cached, instead of two calls to
  Google on every request.
"""

import hashlib
import time
from functools import partial

import anyio
import asyncpg
from fastmcp.server.auth import AccessToken, MultiAuth, TokenVerifier
from fastmcp.server.auth.providers.google import GoogleProvider
from key_value.aio.stores.postgresql import PostgreSQLStore
from sqlmodel import Session
from starlette.routing import Route

from api.db import engine
from config import config
from service import Actor, accounts

GOOGLE = "https://accounts.google.com"
# The admin MCP, the resource the tokens are for; its path in api/main.py
MCP_PATH = "/api/mcp/admin"


def access_token(token: str, actor: Actor, expires_at: int | None = None):
    return AccessToken(
        token=token,
        client_id=actor.name,
        scopes=sorted(actor.scopes),
        expires_at=expires_at,
        claims={"account_id": str(actor.account_id), "name": actor.name},
    )


class Tokens(TokenVerifier):
    """API_KEY or a token from api_token."""

    async def verify_token(self, token: str) -> AccessToken | None:
        def check():
            with Session(engine) as session:
                return accounts.authenticate(session, token, config.api.key)

        actor = await anyio.to_thread.run_sync(check)
        return access_token(token, actor) if actor else None


class Cached(TokenVerifier):
    """Remembers what another verifier said about a token, for `ttl` seconds
    at most and never past the token's expiry; per worker."""

    def __init__(self, verifier: TokenVerifier, ttl: float = 600, size: int = 1000):
        super().__init__()
        self.verifier, self.ttl, self.size = verifier, ttl, size
        self.cache: dict[str, tuple[float, AccessToken]] = {}

    async def verify_token(self, token: str) -> AccessToken | None:
        key = hashlib.sha256(token.encode()).hexdigest()
        now = time.time()
        hit = self.cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
        found = await self.verifier.verify_token(token)
        if found is not None:
            if len(self.cache) >= self.size:
                self.cache = {k: v for k, v in self.cache.items() if v[0] > now}
            until = now + self.ttl
            if found.expires_at:
                until = min(until, found.expires_at)
            self.cache[key] = (until, found)
        return found


class Store(PostgreSQLStore):
    """FastMCP's Postgres store in our schema, with a small pool: every
    gunicorn worker has its own."""

    async def _create_pool(self):
        return await asyncpg.create_pool(
            self._url,
            min_size=0,
            max_size=2,
            server_settings={"search_path": "timestrolls"},
        )


def store_url() -> str:
    db = config.database
    return f"postgresql://{db.user}:{db.password}@{db.host}:{db.port}/{db.name}"


def verified(value) -> bool:
    # Google's tokeninfo says "true" as a string
    return value is True or str(value).lower() == "true"


def actor_of(claims: dict) -> Actor | None:
    """The invited account behind a Google identity, or None."""
    with Session(engine) as session:
        try:
            return accounts.login(
                session,
                GOOGLE,
                claims["sub"],
                claims.get("email"),
                verified(claims.get("email_verified")),
            )
        except accounts.NotInvited:
            return None


class Logins(MultiAuth):
    """Bearer tokens first, then a token from our OAuth server; either way
    the scopes of our account, so the tools' and routes' checks stay as they
    are."""

    async def verify_token(self, token: str) -> AccessToken | None:
        for verifier in self.verifiers:
            if found := await verifier.verify_token(token):
                return found
        upstream = await self.server.verify_token(token)
        if upstream is None:
            return None
        actor = await anyio.to_thread.run_sync(partial(actor_of, upstream.claims))
        return access_token(token, actor, upstream.expires_at) if actor else None


def google() -> GoogleProvider:
    settings = config.auth
    provider = GoogleProvider(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        base_url=f"{settings.base_url}/api",
        resource_base_url=f"{settings.base_url}{MCP_PATH}",
        required_scopes=["openid", "email"],
        jwt_signing_key=settings.jwt_key,
        client_storage=Store(
            url=store_url(), table_name="oauth_store", auto_create=False
        ),
    )
    provider._token_validator = Cached(provider._token_validator)
    return provider


def build():
    """The auth of the admin MCP and the admin routes."""
    if not config.auth.google:
        return Tokens()
    return Logins(server=google(), verifiers=[Tokens()], required_scopes=[])


auth = build()


def routes() -> tuple[list[Route], list[Route]]:
    """The OAuth server's routes, for api/main.py: the metadata under
    /.well-known at the root, and the authorization server's own routes
    (/authorize, /token, /register, /auth/callback, /consent), served under
    /api. Without Google, none."""
    if not isinstance(auth, Logins):
        return [], []
    well_known = auth.get_well_known_routes(mcp_path="/")
    # The resource is /api/mcp/admin/; clients configured without the
    # trailing slash look its metadata up without it
    for r in list(well_known):
        if r.path.startswith("/.well-known/oauth-protected-resource/"):
            well_known.append(Route(r.path.rstrip("/"), r.endpoint, methods=r.methods))
    server = [
        r
        for r in auth.get_routes(mcp_path="/")
        if not r.path.startswith("/.well-known")
    ]
    return well_known, server
