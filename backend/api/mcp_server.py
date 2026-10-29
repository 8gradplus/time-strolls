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
import httpx
from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.auth import AccessToken, TokenVerifier
from fastmcp.server.dependencies import get_access_token, get_http_headers
from fastmcp.server.middleware.authorization import AuthMiddleware
from pydantic import BaseModel
from pydantic_core import to_jsonable_python
from scrape_time_strolls.mcp.server import mcp as scraping
from sqlmodel import Session

from api.db import engine
from config import config
from importers import suedboehmen, topothek, znicenekostely
from service import (
    Actor,
    ServiceError,
    accounts,
    audit,
    harvest,
    media,
    public,
    resources,
    review,
    rights,
)
from service import places as place_service
from service import resources as resource_service

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
    """Places on the map (id, slug, name, kind, lat, lon, part_of and a
    house's facts), optionally only those whose name contains `text`."""
    found = await call(public.locations, lang)
    if text:
        found = [p for p in found if text.lower() in p["name"].lower()]
    return compact(found)


@public_mcp.tool(auth=READ)
async def get_place(slug: str, lang: str | None = None) -> dict:
    """A place with its photos (title, year, owner, source link) and podcasts."""
    return compact(await call(public.location, slug, lang))


@public_mcp.tool(auth=READ)
async def list_tours(lang: str | None = None) -> list[dict]:
    """The walking tours (slug, name, description, length in km)."""
    return await call(public.tours, lang)


@public_mcp.tool(auth=READ)
async def credits() -> dict:
    """Where the content comes from (by permission) and how it was translated."""
    return await call(public.credits)


# The admin server ----------------------------------------------------------------
#
# Built for agents that curate many items: the writing tools take lists (one
# call for a village's houses), and the answers are compact (ids and slugs,
# no timestamps; get_resource(full=True) for everything).

admin_mcp = FastMCP(
    "Time Strolls admin",
    instructions="""Curate the content of Time Strolls.

- Resources: places (kinds: village, hamlet, house, farm, chapel, church,
  wayside_shrine, mill, ruin, landmark), media (image, document, audio) and
  tours. Status: new (waiting for review), published, muted, withdrawn.
  Nothing is deleted.
- Links: part_of (place -> place, a house in a village), shows (media ->
  place), about (media or tour -> place or tour), stop (tour -> place),
  same_as (media -> media).
- Before creating places, call find_places (by name and position): the
  place may exist under another spelling or language ("St. Thoma" = "Sankt
  Thoma"). create_places refuses near-duplicates and names them
  (duplicate_of); use the existing place, or force only if it really is
  another place.
- Work in batches: the writing tools take lists (up to 50 items per call)
  and report errors per item without stopping the rest.
- What you add stays 'new' until a reviewer publishes it.
- Texts are per language (ISO codes); a translation names its method
  (machine or human), translated_from and, for machines, the model.
  Translate only when asked, titles before descriptions.
- Houses and sacral buildings: import_suedboehmen_houses and
  import_sacral_buildings store them directly (with their source record),
  so don't copy scraper results into create_places.
- Topothek: search with the scraping_ tools, then harvest_topothek; the
  archives are small, so harvest only what is needed. The scraping_ tools
  for suedboehmen and znicenekostely take numbers/categories, limit and
  url_template to answer with less.
- The public map shows only published content whose source or owner gave a
  permission.""",
    auth=Tokens(),
    middleware=[AuthMiddleware(auth=scraper_scope)],
)
admin_mcp.mount(scraping, namespace="scraping")

READ_ALL, WRITE, REVIEW = scope("read:all"), scope("write"), scope("review")


def compact(value):
    """Leaves out everything without a value, at every level."""
    if isinstance(value, dict):
        items = ((key, compact(item)) for key, item in value.items())
        return {key: item for key, item in items if item not in (None, "", [], {})}
    if isinstance(value, list):
        return [compact(item) for item in value]
    return value


def each(session, items, fn) -> dict:
    """Runs fn(session, item) for every item. An item that fails is reported
    with its position and doesn't stop the rest."""
    done, errors = 0, []
    for position, item in enumerate(items):
        try:
            fn(session, item)
            done += 1
        except ServiceError as e:
            session.rollback()
            errors.append({"item": position, "error": str(e)})
    return {"done": done, "errors": errors}


# Reading


@admin_mcp.tool(auth=READ_ALL, name="find_places")
async def find_any_places(
    text: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_m: float | None = None,
    kind: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Places of any status by name (any language; part of a name is enough;
    case, accents and "St."/"Sankt" don't count) and/or within radius_m of
    lat/lon, nearest first. Rows: id, slug, name, kind, status, lat, lon,
    number (houses), names (other names), part_of, distance_m."""
    found = await call(
        place_service.search, text, lat, lon, radius_m, kind, status, limit
    )
    return compact(found)


@admin_mcp.tool(auth=READ_ALL)
async def list_resources(
    type: str | None = None,
    status: str | None = None,
    kind: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Resources, newest first: id, type, status, label. status='new' is the
    review queue; type: place, media or tour; kind: a place kind."""
    rows = await call(review.list_, type, status, limit, kind)
    return [
        compact({k: v for k, v in row.items() if k != "created_at"}) for row in rows
    ]


def resource_brief(session, key: str) -> dict:
    detail = review.detail(session, key)
    id = detail.resource.id
    texts: dict = {}
    for t in detail.texts:
        texts.setdefault(t.field, {})[t.lang] = (
            t.body
            if t.method == "original"
            else {"body": t.body, "method": t.method, "from": t.translated_from}
        )
    links = []
    for r in detail.relations:
        out = r.subject_id == id
        other = r.object_id if out else r.subject_id
        links.append(
            {
                "id": r.id,
                "predicate": r.predicate,
                "direction": "out" if out else "in",
                "other": other,
                "label": review.label(session, resources.get(session, other)),
            }
        )
    skip = {"id", "created_by", "created_at", "updated_at", "published_at"}
    return compact(
        {
            "id": id,
            "type": detail.resource.type,
            "status": detail.resource.status,
            "status_reason": detail.resource.status_reason,
            **{k: v for k, v in detail.item.items() if k not in skip},
            "texts": texts,
            "links": links,
            "sources": [s["url"] for s in detail.sources],
        }
    )


@admin_mcp.tool(auth=READ_ALL)
async def get_resource(key: str, full: bool = False) -> dict:
    """One resource (id or slug): its fields, texts {field: {lang: body}}
    (translations with method), links (with the relation id for unlink) and
    source URLs. full=True: every row as stored, with timestamps."""
    if full:
        return await call(review.detail, key)
    return await call(resource_brief, key)


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


# Writing


class NewPlace(place_service.PlaceIn):
    # slug or id of an existing place, or the name of one earlier in the list
    part_of: str | None = None


@admin_mcp.tool(auth=WRITE)
async def create_places(places: list[NewPlace]) -> list[dict]:
    """New places, one row each: {name, id, slug}, {name, duplicate_of} when
    it looks like an existing place (nothing created; force: true creates it
    anyway) or {name, error}. names: other original names, e.g. {"cs":
    "Horní Ureš"}; attributes: facts of the kind (number, house_name, ...);
    part_of: the place it belongs to."""
    me = actor()

    def create(session):
        created: dict[str, UUID] = {}
        rows = []
        for item in places:
            row = {"name": item.name}
            try:
                data = place_service.PlaceIn(**item.model_dump(exclude={"part_of"}))
                place = place_service.create(session, me, data)
                created[item.name] = place.id
                row |= {"id": place.id, "slug": place.slug}
                if item.part_of:
                    parent = created.get(item.part_of) or resources.resolve(
                        session, item.part_of, "place"
                    )
                    resources.link(session, me, place.id, "part_of", parent)
            except place_service.Duplicate as e:
                session.rollback()
                keep = {"id", "slug", "name", "kind", "status", "distance_m"}
                row["duplicate_of"] = [m.model_dump(include=keep) for m in e.matches]
            except ServiceError as e:
                session.rollback()
                row["error"] = str(e)
            rows.append(row)
        return rows

    return compact(await call(create))


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
        place = place_service.update(
            session, me, id, place_service.PlaceUpdate(**changes)
        )
        return place.model_dump(include={"id", "slug", "kind", "lat", "lon"})

    return await call(update)


class Harvest(BaseModel):
    url: str  # the share URL, https://<name>.topothek.at/?doc=<id>
    places: list[str] = []  # slugs or ids, linked with 'shows'


@admin_mcp.tool(auth=WRITE)
async def harvest_topothek(
    documents: list[Harvest], status: str | None = None
) -> list[dict]:
    """Harvests Topothek documents (one after another) as media linked to
    their places. Rows: {url, id, title, year, created} (created: false for a
    document harvested before; its places are linked) or {url, error}."""
    me = actor()
    rows = []
    for item in documents:
        row = {"url": item.url}
        try:
            document = await topothek.document(item.url)
            id, created = await call(
                harvest.topothek, me, document, item.places, status
            )
            row |= {
                "id": id,
                "title": document.get("title"),
                "year": document.get("year"),
                "created": created,
            }
        except (ValueError, LookupError, httpx.HTTPError, ToolError) as e:
            row["error"] = str(e) or type(e).__name__
        rows.append(row)
    return compact(rows)


IMPORT_ERRORS = (LookupError, ValueError, httpx.HTTPError)


@admin_mcp.tool(auth=WRITE)
async def import_suedboehmen_houses(
    village: str,
    place: str,
    numbers: list[str] | None = None,
    status: str | None = None,
) -> dict:
    """Imports the houses of a village from the Südböhmen-Archiv (German
    name, e.g. "Oberuresch") as house places, part of `place` (slug or id of
    the village place), without passing them through you: names "<village>
    <number>", attributes number, former_number, house_name, address.
    `numbers` limits it to some houses. Importing again adds nothing new.
    Returns created [{name, slug}], existing, duplicates (an existing place
    looks the same: nothing created), skipped (no coordinates), errors."""
    me = actor()
    try:
        data = await suedboehmen.village(village)
    except IMPORT_ERRORS as e:
        raise ToolError(str(e) or type(e).__name__)
    return compact(
        await call(harvest.suedboehmen_houses, me, data, place, numbers, status)
    )


@admin_mcp.tool(auth=WRITE)
async def import_sacral_buildings(
    lat: float,
    lon: float,
    place: str,
    radius_km: float = 1.0,
    status: str | None = None,
) -> dict:
    """Imports the destroyed or endangered sacral buildings within radius_km
    of lat/lon from znicenekostely.cz as places, part of `place` (slug or
    id), without passing them through you. Kinds: church, chapel,
    wayside_shrine, else landmark; the Czech name is the name; category,
    state and position become attributes. Importing again adds nothing new.
    Returns created [{name, slug}], existing, duplicates, skipped, errors."""
    me = actor()
    try:
        data = await znicenekostely.objects_near(lat, lon, radius_km)
    except IMPORT_ERRORS as e:
        raise ToolError(str(e) or type(e).__name__)
    return compact(await call(harvest.sacral_buildings, me, data, place, status))


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
    permission (or one for its source). Returns its id."""
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
    return {"id": await call(media.create, actor(), data)}


class Link(BaseModel):
    subject: str  # id or slug
    predicate: str  # part_of, shows, about, stop, same_as
    object: str  # id or slug
    position: int | None = None  # the order of a tour's stops


@admin_mcp.tool(auth=WRITE)
async def link(links: list[Link]) -> dict:
    """Links resources; an existing link counts as done. Returns {done,
    errors: [{item, error}]}."""
    me = actor()

    def add(session, item: Link):
        resources.link(
            session,
            me,
            resources.resolve(session, item.subject),
            item.predicate,
            resources.resolve(session, item.object),
            item.position,
        )

    return compact(await call(each, links, add))


@admin_mcp.tool(auth=WRITE)
async def unlink(relation_ids: list[str]) -> dict:
    """Removes links by relation id (from get_resource); the change log keeps
    them. Returns {done, errors}."""
    me = actor()

    def remove(session, id: str):
        resources.unlink(session, me, UUID(id))

    return compact(await call(each, relation_ids, remove))


class TextItem(BaseModel):
    resource: str  # id or slug
    field: str  # name, title, description, ...
    lang: str
    body: str
    method: str = "original"  # original, machine or human
    translated_from: str | None = None
    model: str | None = None  # for machine translations


@admin_mcp.tool(auth=WRITE)
async def set_texts(texts: list[TextItem]) -> dict:
    """Adds or replaces texts, one per resource, field and language. A
    translation: method 'machine' or 'human', translated_from the original's
    language, model for machines. Returns {done, errors: [{item, error}]}."""
    me = actor()

    def put(session, item: TextItem):
        text = resources.TextIn(
            **item.model_dump(include={"body", "method", "translated_from", "model"})
        )
        id = resources.resolve(session, item.resource)
        resources.set_text(session, me, id, item.field, item.lang, text)

    return compact(await call(each, texts, put))


# Reviewing


@admin_mcp.tool(auth=REVIEW)
async def set_status(
    resources: list[str], status: str, reason: str | None = None
) -> dict:
    """Publishes, mutes (give a reason), withdraws or resets resources (ids
    or slugs) to new. Returns {done, errors: [{item, error}]}."""
    me = actor()

    def change(session, key: str):
        id = resource_service.resolve(session, key)
        resource_service.set_status(session, me, id, status, reason)

    return compact(await call(each, resources, change))


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
