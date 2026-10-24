"""Places: villages, houses, chapels, ... Names are texts (field 'name'),
one of them primary; the slug comes from it and the coordinates, once."""

from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import Place, PlaceKind
from api.model.views import PlaceView
from helpers.slug import generate_place_slug
from service import Actor, Invalid, NotFound, audit, initial_status, require
from service import resources
from service.resources import TextIn


class PlaceIn(BaseModel):
    name: str
    lang: str = "de"
    kind: str = "village"
    lat: float
    lon: float
    # other original names, e.g. {"cs": "Horní Ureš"}
    names: dict[str, str] = {}
    attributes: dict = {}
    status: str | None = None


class PlaceUpdate(BaseModel):
    kind: str | None = None
    lat: float | None = None
    lon: float | None = None
    attributes: dict | None = None


def point(lat: float, lon: float) -> str:
    return f"SRID=4326;POINT({lon} {lat})"


def check_kind(session: Session, kind: str):
    if not session.get(PlaceKind, kind):
        raise Invalid(f"unknown place kind {kind!r}")


def create(session: Session, actor: Actor, data: PlaceIn) -> PlaceView:
    require(actor, "write")
    check_kind(session, data.kind)
    slug = generate_place_slug(data.name, data.lat, data.lon)
    resources.check_slug_free(session, slug)
    resource = resources.new(
        session, actor, "place", initial_status(actor, data.status)
    )
    session.add(
        Place(
            id=resource.id,
            slug=slug,
            kind=data.kind,
            geom=point(data.lat, data.lon),
            attributes=data.attributes,
        )
    )
    session.flush()
    resources.set_text(
        session,
        actor,
        resource.id,
        "name",
        data.lang,
        TextIn(body=data.name, is_primary=True),
        commit=False,
    )
    for lang, name in data.names.items():
        resources.set_text(
            session, actor, resource.id, "name", lang, TextIn(body=name), commit=False
        )
    audit.log(
        session,
        actor,
        "place",
        "create",
        resource.id,
        resource.id,
        data.model_dump() | {"slug": slug, "status": resource.status},
    )
    session.commit()
    return get(session, resource.id)


def update(session: Session, actor: Actor, id: UUID, data: PlaceUpdate) -> PlaceView:
    """Changes kind, position or attributes; the slug stays."""
    require(actor, "write")
    place = session.get(Place, id)
    if not place:
        raise NotFound(f"no place {id}")
    changes = data.model_dump(exclude_unset=True)
    if "kind" in changes:
        check_kind(session, data.kind)
        place.kind = data.kind
    if "attributes" in changes:
        place.attributes = data.attributes
    if "lat" in changes or "lon" in changes:
        current = get(session, id)
        place.geom = point(
            changes.get("lat", current.lat), changes.get("lon", current.lon)
        )
    session.add(place)
    resources.touch(session, id)
    audit.log(session, actor, "place", "update", id, id, changes)
    session.commit()
    return get(session, id)


def get(session: Session, id: UUID) -> PlaceView:
    place = session.get(PlaceView, id)
    if not place:
        raise NotFound(f"no place {id}")
    return place


def find(session: Session, key: str) -> PlaceView:
    return get(session, resources.resolve(session, key, "place"))


def list_(
    session: Session, status: str | None = None, kind: str | None = None
) -> list[PlaceView]:
    query = select(PlaceView).order_by(PlaceView.name)
    if status:
        query = query.where(PlaceView.status == status)
    if kind:
        query = query.where(PlaceView.kind == kind)
    return list(session.exec(query))
