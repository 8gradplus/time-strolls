"""Places: villages, houses, chapels, ... Names are texts (field 'name'),
one of them primary; the slug comes from it and the coordinates, once."""

import re
import unicodedata
from uuid import UUID

from geoalchemy2 import Geography
from pydantic import BaseModel
from sqlalchemy import cast, func, null
from sqlmodel import Session, select

from api.model.tables import Place, PlaceKind, Relation, Text
from api.model.views import PlaceView
from helpers.slug import generate_place_slug
from service import Actor, Conflict, Invalid, NotFound, audit, initial_status, require
from service import resources
from service.resources import TextIn

# A new place is taken for an existing one if a name matches within this
# distance, or if it has the same kind (and no other house number) this close
DUPLICATE_NAME_M = 1000
DUPLICATE_SPOT_M = 15


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
    # create it even if it looks like an existing place
    force: bool = False


class Found(BaseModel):
    """A place as search() finds it: compact, for lists and agents."""

    id: UUID
    slug: str
    name: str | None = None
    kind: str
    status: str
    lat: float
    lon: float
    number: str | None = None  # a house number, from the attributes
    names: list[str] = []  # the other names, in any language
    part_of: UUID | None = None
    distance_m: float | None = None


class Duplicate(Conflict):
    def __init__(self, matches: list[Found]):
        self.matches = matches
        listed = ", ".join(
            f"{m.name} ({m.slug}, {m.kind}, {m.distance_m:.0f} m)" for m in matches
        )
        super().__init__(f"looks like an existing place: {listed}")


def normalise(name: str) -> str:
    """For comparing names: case, accents, punctuation and 'St.' for
    'Sankt' don't count ("St. Thoma" = "Sankt Thoma", "Ureš" = "Ures")."""
    plain = unicodedata.normalize("NFKD", name.casefold())
    plain = "".join(c for c in plain if not unicodedata.combining(c))
    words = re.sub(r"[\W_]+", " ", plain).split()
    return " ".join("sankt" if w in ("st", "skt") else w for w in words)


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
    """A new place; one that looks like an existing place raises Duplicate,
    unless data.force."""
    require(actor, "write")
    check_kind(session, data.kind)
    status = initial_status(actor, data.status)
    if not data.force:
        matches = duplicates(session, data)
        if matches:
            raise Duplicate(matches)
    slug = generate_place_slug(data.name, data.lat, data.lon)
    resources.check_slug_free(session, slug)
    resource = resources.new(session, actor, "place", status)
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


def number_of(attributes: dict) -> str | None:
    number = attributes.get("number")
    return str(number) if number not in (None, "") else None


def search(
    session: Session,
    text: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_m: float | None = None,
    kind: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[Found]:
    """Places of any status by name (any language, normalised, a part of it
    is enough) and/or near a point (nearest first)."""
    query = select(PlaceView, null())
    distance = None
    if lat is not None and lon is not None:
        here = cast(func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326), Geography)
        there = cast(Place.geom, Geography)
        distance = func.ST_Distance(there, here)
        query = select(PlaceView, distance).join(Place, Place.id == PlaceView.id)
        if radius_m is not None:
            query = query.where(func.ST_DWithin(there, here, radius_m))
        query = query.order_by(distance)
    else:
        query = query.order_by(PlaceView.name)
    if kind:
        query = query.where(PlaceView.kind == kind)
    if status:
        query = query.where(PlaceView.status == status)
    rows = session.exec(query).all()
    ids = [place.id for place, _ in rows]
    names: dict[UUID, list[str]] = {id: [] for id in ids}
    for id, body in session.exec(
        select(Text.resource_id, Text.body).where(
            Text.resource_id.in_(ids), Text.field == "name"
        )
    ):
        names[id].append(body)
    if text:
        # the names are few (hundreds), so they are compared here
        wanted = normalise(text)
        rows = [
            row for row in rows if any(wanted in normalise(n) for n in names[row[0].id])
        ]
    rows = rows[:limit]
    parents = dict(
        session.exec(
            select(Relation.subject_id, Relation.object_id).where(
                Relation.subject_id.in_([place.id for place, _ in rows]),
                Relation.predicate == "part_of",
            )
        ).all()
    )
    return [
        Found(
            **place.model_dump(
                include={"id", "slug", "name", "kind", "status", "lat", "lon"}
            ),
            number=number_of(place.attributes),
            names=[n for n in names[place.id] if n != place.name],
            part_of=parents.get(place.id),
            distance_m=round(meters, 1) if distance is not None else None,
        )
        for place, meters in rows
    ]


def duplicates(session: Session, data: PlaceIn) -> list[Found]:
    """Existing places that the new one would repeat: a name matches within
    DUPLICATE_NAME_M, or the same kind is within DUPLICATE_SPOT_M (unless both
    have house numbers and they differ)."""
    wanted = {normalise(n) for n in (data.name, *data.names.values())}
    number = number_of(data.attributes)
    matches = []
    near = search(session, lat=data.lat, lon=data.lon, radius_m=DUPLICATE_NAME_M)
    for place in near:
        same_name = wanted & {normalise(n) for n in (place.name or "", *place.names)}
        same_spot = (
            place.kind == data.kind
            and place.distance_m <= DUPLICATE_SPOT_M
            and not (number and place.number and number != place.number)
        )
        if same_name or same_spot:
            matches.append(place)
    return matches
