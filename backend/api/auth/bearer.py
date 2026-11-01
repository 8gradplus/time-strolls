"""The actor of an admin route: `Authorization: Bearer <token>`, a bearer
token (API_KEY, api_token) or, with Google sign-in, a token from our OAuth
server (api/auth/oauth.py, shared with the admin MCP). Routes ask only for
scopes, never for the kind of token. In `auth.mode: local` a request without
a token is the admin: no login locally."""

import json
from uuid import UUID

import anyio
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN

from api.auth.oauth import auth
from api.db import engine
from api.model.tables import Account
from config import config
from service import SCOPES, Actor

bearer = HTTPBearer(auto_error=False)


def local_admin(run: dict | None) -> Actor:
    with Session(engine) as session:
        admin = session.exec(select(Account).where(Account.name == "admin")).one()
    return Actor(admin.id, admin.name, frozenset(SCOPES), run)


async def current_actor(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    x_run: str | None = Header(
        default=None,
        description='For agents: the run, as JSON (e.g. {"model": "...", "session": "..."}), kept in the change log',
    ),
) -> Actor:
    try:
        run = json.loads(x_run) if x_run else None
    except json.JSONDecodeError:
        run = {"text": x_run}
    if credentials is None:
        if config.auth.mode == "local":
            return await anyio.to_thread.run_sync(local_admin, run)
        raise HTTPException(
            HTTP_401_UNAUTHORIZED,
            "a bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = await auth.verify_token(credentials.credentials)
    if token is None:
        raise HTTPException(
            HTTP_401_UNAUTHORIZED,
            "invalid or revoked token, or not invited",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Actor(
        UUID(token.claims["account_id"]),
        token.claims["name"],
        frozenset(token.scopes),
        run,
    )


def scope(name: str):
    """A dependency: the actor, if the token has this scope."""

    def check(actor: Actor = Depends(current_actor)) -> Actor:
        if not actor.can(name):
            raise HTTPException(HTTP_403_FORBIDDEN, f"needs the scope {name!r}")
        return actor

    return check
