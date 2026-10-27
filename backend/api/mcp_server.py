"""The MCP servers, mounted in the API (api/main.py) and calling the same
service layer as the REST routes:

- /api/mcp: published, permitted content (scope read), for any LLM later.
- /api/mcp/admin: the scraper tools (scope scrape), harvesting and creating
  drafts (write), review and permissions (review). External LLMs never see it.

Both take `Authorization: Bearer <token>` as the REST API: API_KEY or a token
from api_token. A tool the token's scopes don't allow is not listed. OAuth
2.1 later is another TokenVerifier; the tools only ask for scopes.
"""

import json
from functools import partial
from uuid import UUID

import anyio
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.auth import AccessToken, TokenVerifier
from fastmcp.server.dependencies import get_access_token, get_http_headers
from fastmcp.server.middleware.authorization import AuthMiddleware
from pydantic_core import to_jsonable_python
from scrape_time_strolls.mcp.server import mcp as scraping
from sqlmodel import Session

from api.db import engine
from config import config
from importers import topothek
from service import (
    Actor,
    ServiceError,
    accounts,
    audit,
    harvest,
    media,
    places,
    public,
    resources,
    review,
    rights,
)

# Calling the service layer -----------------------------------------------------


def _call(fn, *args, **kwargs):
    with Session(engine) as session:
        try:
            # serialised inside the session, where the rows can still load
            return to_jsonable_python(fn(session, *args, **kwargs))
        except ServiceError as e:
            raise ToolError(str(e))


async def call(fn, *args, **kwargs):
    """Runs a service function in a thread with its own session."""
    return await anyio.to_thread.run_sync(partial(_call, fn, *args, **kwargs))


def actor() -> Actor:
    """The account behind the current token; the X-Run header (JSON) goes to
    the change log."""
    token = get_access_token()
    if token is None:
        raise ToolError("a bearer token is required")
    raw = get_http_headers().get("x-run")
    try:
        run = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        run = {"text": raw}
    return Actor(
        UUID(token.claims["account_id"]),
        token.claims["name"],
        frozenset(token.scopes),
        run,
    )


# Tokens and scopes -------------------------------------------------------------


class Tokens(TokenVerifier):
    """API_KEY or a token from api_token, as for the REST routes."""

    async def verify_token(self, token: str) -> AccessToken | None:
        def check():
            with Session(engine) as session:
                return accounts.authenticate(session, token, config.api.key)

        found = await anyio.to_thread.run_sync(check)
        if found is None:
            return None
        return AccessToken(
            token=token,
            client_id=found.name,
            scopes=sorted(found.scopes),
            claims={"account_id": str(found.account_id), "name": found.name},
        )


def scope(name: str):
    """An auth check: the token has this scope (or admin)."""

    def check(ctx) -> bool:
        return ctx.token is not None and (
            name in ctx.token.scopes or "admin" in ctx.token.scopes
        )

    return check


def scraper_scope(ctx) -> bool:
    """The mounted scraper tools need the scope scrape."""
    name = getattr(ctx.component, "name", "")
    return not name.startswith("scraping_") or scope("scrape")(ctx)


# The public server -------------------------------------------------------------

public_mcp = FastMCP(
    "Time Strolls",
    instructions=(
        "Places in the Bohemian Forest (Deutsch Reichenau, Austria/Czech "
        "border) with historical photos and podcasts, and walking tours. Only "
        "published content the archives allowed us to show. Texts come in the "
        "language asked for (lang: de, cs, en, ...) where they exist, else in "
        "their original language; 'method: machine' marks machine translations."
    ),
    auth=Tokens(),
)

READ = scope("read")


@public_mcp.tool(auth=READ)
async def find_places(text: str | None = None, lang: str | None = None) -> list[dict]:
    """Places on the map (id, slug, name, kind, lat, lon), optionally only
    those whose name contains `text`."""
    found = await call(public.locations, lang)
    if text:
        found = [p for p in found if text.lower() in p["name"].lower()]
    return found


@public_mcp.tool(auth=READ)
async def get_place(slug: str, lang: str | None = None) -> dict:
    """A place with its photos (title, year, owner, source link) and podcasts."""
    return await call(public.location, slug, lang)


@public_mcp.tool(auth=READ)
async def list_tours(lang: str | None = None) -> list[dict]:
    """The walking tours (slug, name, description, length in km)."""
    return await call(public.tours, lang)


@public_mcp.tool(auth=READ)
async def credits() -> dict:
    """Where the content comes from (by permission) and how it was translated."""
    return await call(public.credits)


# The admin server ----------------------------------------------------------------

admin_mcp = FastMCP(
    "Time Strolls admin",
    instructions="""Curate the content of Time Strolls (see SCHEMA_CONCEPT.md in the repo).

- Every object is a resource: a place (kinds: village, hamlet, house, farm,
  chapel, church, wayside_shrine, mill, ruin, landmark), a media (image,
  document, audio) or a tour. Status: new (waiting for review), published,
  muted (hidden, with a reason), withdrawn. Nothing is deleted.
- Links between resources are optional: part_of (place -> place, e.g. a
  house in a village), shows (media -> place), about (media or tour ->
  place or tour), stop (tour -> place), same_as (media -> media).
- What you add stays 'new' until a reviewer publishes it; only tokens with
  the review scope may set another status.
- Texts are per language (ISO codes). A translation names its method
  (human, machine), the language it comes from and, for machines, the model.
- Harvest Topothek documents with harvest_topothek: it keeps the record,
  creates the media once and links it; harvesting again adds nothing.
  Search with the scraping_ tools first. The archives are small: one request
  at a time, only what is needed.
- Look up places by slug or id. The public map only shows published
  content whose source or owner gave a permission.""",
    auth=Tokens(),
    middleware=[AuthMiddleware(auth=scraper_scope)],
)
admin_mcp.mount(scraping, namespace="scraping")

READ_ALL, WRITE, REVIEW = scope("read:all"), scope("write"), scope("review")


@admin_mcp.tool(auth=READ_ALL)
async def list_resources(
    type: str | None = None, status: str | None = None, limit: int = 50
) -> list[dict]:
    """Resources, newest first (id, type, status, label). status='new' is the
    review queue; type is place, media or tour."""
    return await call(review.list_, type, status, limit)


@admin_mcp.tool(auth=READ_ALL)
async def get_resource(key: str) -> dict:
    """One resource (id or slug) with its fields, texts in all languages,
    links and source records."""
    return await call(review.detail, key)


@admin_mcp.tool(auth=READ_ALL)
async def history(id: str) -> list[dict]:
    """Who changed a resource, when and how (the change log)."""
    return await call(audit.history, UUID(id))


@admin_mcp.tool(auth=READ_ALL)
async def list_permissions() -> dict:
    """Sources, parties and the permissions to show (and copy) their content."""

    def all_rights(session):
        return {
            "sources": rights.sources(session),
            "parties": rights.parties(session),
            "permissions": [
                p.model_dump() | {"copy": p.allow_copy}
                for p in rights.permissions(session)
            ],
        }

    return await call(all_rights)


@admin_mcp.tool(auth=WRITE)
async def create_place(
    name: str,
    lat: float,
    lon: float,
    kind: str = "village",
    lang: str = "de",
    names: dict[str, str] | None = None,
    attributes: dict | None = None,
    part_of: str | None = None,
    status: str | None = None,
) -> dict:
    """A new place. `names`: other original names, e.g. {"cs": "Horní Ureš"};
    `attributes`: facts of the kind (house number, house name, ...);
    `part_of`: slug or id of the place it belongs to."""
    me = actor()
    data = places.PlaceIn(
        name=name,
        lat=lat,
        lon=lon,
        kind=kind,
        lang=lang,
        names=names or {},
        attributes=attributes or {},
        status=status,
    )
    place = await call(places.create, me, data)
    if part_of:

        def link(session):
            return resources.link(
                session,
                me,
                UUID(place["id"]),
                "part_of",
                resources.resolve(session, part_of, "place"),
            )

        await call(link)
    return place


@admin_mcp.tool(auth=WRITE)
async def update_place(
    key: str,
    kind: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    attributes: dict | None = None,
) -> dict:
    """Changes kind, position or attributes of a place (slug or id); the
    slug stays."""
    me = actor()
    changes = {
        k: v
        for k, v in dict(kind=kind, lat=lat, lon=lon, attributes=attributes).items()
        if v is not None
    }

    def update(session):
        id = resources.resolve(session, key, "place")
        return places.update(session, me, id, places.PlaceUpdate(**changes))

    return await call(update)


@admin_mcp.tool(auth=WRITE)
async def harvest_topothek(
    url: str, places: list[str] | None = None, status: str | None = None
) -> dict:
    """Harvests a Topothek document by its share URL
    (https://<name>.topothek.at/?doc=<id>) as a media, linked to `places`
    (slugs or ids) with 'shows'. Returns the media and whether it is new."""
    me = actor()
    try:
        document = await topothek.document(url)
    except (ValueError, LookupError) as e:
        raise ToolError(str(e))
    id, created = await call(harvest.topothek, me, document, places or [], status)
    return {"media": await call(media.get, UUID(id)), "created": created}


@admin_mcp.tool(auth=WRITE)
async def add_media(
    kind: str,
    url: str,
    title: str,
    description: str | None = None,
    lang: str = "de",
    date_text: str | None = None,
    year: int | None = None,
    creator: str | None = None,
    rights_holder: str | None = None,
    places: list[str] | None = None,
    status: str | None = None,
) -> dict:
    """A media whose file stays where it is (image, document or audio, e.g. a
    podcast episode), linked to `places` (shows; about for audio).
    `creator` and `rights_holder` are party names; showing it needs their
    permission (or one for its source)."""
    data = media.MediaIn(
        kind=kind,
        url=url,
        title=title,
        description=description,
        lang=lang,
        date_text=date_text,
        year=year,
        creator=creator,
        rights_holder=rights_holder,
        places=places or [],
        status=status,
    )
    id = await call(media.create, actor(), data)
    return await call(media.get, UUID(id))


@admin_mcp.tool(auth=WRITE)
async def link(
    subject: str, predicate: str, object: str, position: int | None = None
) -> dict:
    """Links two resources (ids or slugs): part_of, shows, about, stop,
    same_as. An existing link is returned as it is."""
    me = actor()

    def add(session):
        return resources.link(
            session,
            me,
            resources.resolve(session, subject),
            predicate,
            resources.resolve(session, object),
            position,
        )

    return await call(add)


@admin_mcp.tool(auth=WRITE)
async def unlink(relation_id: str) -> str:
    """Removes a link (the change log keeps it)."""
    await call(resources.unlink, actor(), UUID(relation_id))
    return "removed"


@admin_mcp.tool(auth=WRITE)
async def set_text(
    resource: str,
    field: str,
    lang: str,
    body: str,
    method: str = "original",
    translated_from: str | None = None,
    model: str | None = None,
) -> dict:
    """Adds or replaces a text (field: name, title, description, ...) of a
    resource (id or slug) in one language. A translation: method 'machine'
    or 'human', translated_from the original's language, model for machines."""
    me = actor()
    text = resources.TextIn(
        body=body, method=method, translated_from=translated_from, model=model
    )

    def put(session):
        id = resources.resolve(session, resource)
        return resources.set_text(session, me, id, field, lang, text)

    return await call(put)


@admin_mcp.tool(auth=REVIEW)
async def set_status(resource: str, status: str, reason: str | None = None) -> dict:
    """Publishes, mutes (give a reason), withdraws or resets a resource (id or
    slug) to new."""
    me = actor()

    def change(session):
        id = resources.resolve(session, resource)
        return resources.set_status(session, me, id, status, reason)

    return await call(change)


@admin_mcp.tool(auth=REVIEW)
async def grant_permission(
    source: str | None = None,
    party: str | None = None,
    party_role: str | None = None,
    show: bool = True,
    copy: bool = False,
    granted_at: str | None = None,
    note: str | None = None,
) -> dict:
    """Records a permission from a source (code, e.g. topothek:lichtenau) or a
    party (name, as creator or owner). show: in the app, API and MCP; copy:
    also stored on our CDN and offline."""
    data = rights.PermissionIn(
        source=source,
        party=party,
        party_role=party_role,
        show=show,
        allow_copy=copy,
        granted_at=granted_at,
        note=note,
    )
    return await call(rights.grant, actor(), data)


@admin_mcp.tool(auth=REVIEW)
async def revoke_permission(id: str) -> dict:
    """Revokes a permission: the content it covered disappears from the map."""
    return await call(rights.revoke, actor(), UUID(id))


# Mounted in api/main.py; stateless, as gunicorn runs several workers
public_app = public_mcp.http_app(path="/", stateless_http=True)
admin_app = admin_mcp.http_app(path="/", stateless_http=True)
