"""Places: villages, houses, chapels, ... Names are texts (field 'name'),
one of them primary; the slug comes from it and the coordinates, once."""

import re
import unicodedata
from math import asin, cos, radians, sin, sqrt
from uuid import UUID

from geoalchemy2 import Geography
from pydantic import BaseModel
from sqlalchemy import cast, func, null
from sqlmodel import Session, select

from api.model.tables import (
    Place,
    PlaceKind,
    Relation,
    ResourceSource,
    SourceRecord,
    Text,
)
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


# Words that say what a place is, not which one: archives name many chapels
# just "kaple" (and the sacral import falls back to the category, "Kapličky").
# They stay the stored name, but don't count as a name for duplicates.
KIND_WORDS = frozenset(
    normalise(word)
    for word in (
        # cs, with the categories of znicenekostely
        "kaple", "kaplička", "kapličky", "velká kaple", "velké kaple",
        "kostel", "kostely", "kostelík", "boží muka", "svatý obraz",
        "svaté obrazy", "kříž", "křížek", "zvonice", "zvonička", "zvoničky",
        "hřbitov", "hřbitovy", "fara", "fary", "márnice", "klášter",
        "kláštery", "mlýn", "dům", "statek",
        # de
        "Kapelle", "Wegkapelle", "Kirche", "Marterl", "Bildstock",
        "Wegkreuz", "Kreuz", "Friedhof", "Mühle", "Pfarrhof", "Glockenturm",
        "Haus", "Hof",
        # en
        "chapel", "church", "wayside shrine", "cross", "cemetery", "mill",
        "house", "farm",
    )
)  # fmt: skip


def names_for_duplicates(names) -> set[str]:
    """The normalised names that identify a place: no kind words."""
    return {n for n in map(normalise, names) if n and n not in KIND_WORDS}


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


def create(
    session: Session,
    actor: Actor,
    data: PlaceIn,
    commit: bool = True,
    record: SourceRecord | None = None,
) -> PlaceView:
    """A new place; one that looks like an existing place raises Duplicate,
    unless data.force. `record`: the source record it is made from."""
    require(actor, "write")
    check_kind(session, data.kind)
    status = initial_status(actor, data.status)
    if not data.force:
        matches = duplicates(session, data, record)
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
    if commit:
        session.commit()
    else:
        session.flush()
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


def duplicates(
    session: Session, data: PlaceIn, record: SourceRecord | None = None
) -> list[Found]:
    """Existing places that the new one would repeat: a name matches within
    DUPLICATE_NAME_M (kind words like "kaple" aren't names), or the same kind
    is within DUPLICATE_SPOT_M (unless both have house numbers and they
    differ). A place made from another record of the same source as
    `record` is another place: the archive tells them apart."""
    wanted = names_for_duplicates((data.name, *data.names.values()))
    number = number_of(data.attributes)
    matches = []
    near = search(session, lat=data.lat, lon=data.lon, radius_m=DUPLICATE_NAME_M)
    for place in near:
        same_name = wanted & names_for_duplicates((place.name or "", *place.names))
        same_spot = (
            place.kind == data.kind
            and place.distance_m <= DUPLICATE_SPOT_M
            and not (number and place.number and number != place.number)
        )
        if same_name or same_spot:
            matches.append(place)
    if record and matches:
        others = set(
            session.exec(
                select(ResourceSource.resource_id)
                .join(
                    SourceRecord,
                    SourceRecord.id == ResourceSource.source_record_id,
                )
                .where(
                    ResourceSource.resource_id.in_([m.id for m in matches]),
                    SourceRecord.source_id == record.source_id,
                    SourceRecord.id != record.id,
                )
            )
        )
        matches = [m for m in matches if m.id not in others]
    return matches


# Houses and their villages (agents fix part_of after an import) ----------------


def move(session: Session, actor: Actor, id: UUID, to: UUID):
    """Makes `to` the one place `id` is part of: links it, then removes the
    other part_of links (both in the change log). Moving again changes nothing."""
    require(actor, "write")
    resources.link(session, actor, id, "part_of", to)
    old = session.exec(
        select(Relation.id).where(
            Relation.subject_id == id,
            Relation.predicate == "part_of",
            Relation.object_id != to,
        )
    ).all()
    for relation_id in old:
        resources.unlink(session, actor, relation_id)


HOUSE_KINDS = ("house", "farm")
# a house this far from its village and this close to another (and clearly
# closer) is reported as misplaced; same number this close: the same house
MISPLACED_FAR_M = 600
MISPLACED_NEAR_M = 500
MISPLACED_GAIN_M = 300
SAME_SPOT_M = 30


def meters(a: PlaceView, b: PlaceView) -> float:
    """Distance on the sphere; good enough for a few kilometres."""
    dlat, dlon = radians(b.lat - a.lat), radians(b.lon - a.lon)
    h = (
        sin(dlat / 2) ** 2
        + cos(radians(a.lat)) * cos(radians(b.lat)) * sin(dlon / 2) ** 2
    )
    return 2 * 6_371_000 * asin(sqrt(h))


class Misplaced(BaseModel):
    house: str  # slug
    village: str | None = None  # the slug of the village it is part of
    village_m: int | None = None
    nearest: str  # the slug of the nearest other village
    nearest_m: int


class SameSpot(BaseModel):
    houses: list[str]  # slugs, same number on (almost) the same point
    villages: list[str | None]  # what each is part of
    distance_m: int


class HouseCheck(BaseModel):
    houses: int
    misplaced: list[Misplaced] = []
    same_spot: list[SameSpot] = []
    no_village: list[str] = []


def check_houses(
    session: Session,
    lat: float,
    lon: float,
    radius_m: float = 5000,
    far_m: float = MISPLACED_FAR_M,
    near_m: float = MISPLACED_NEAR_M,
) -> HouseCheck:
    """Houses (not muted or withdrawn) within radius_m: same-number pairs on
    the same point under different villages (one to mute), those far from
    their village and near another (to move; twins are left out until one
    is muted), and those without a village."""
    here = cast(func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326), Geography)
    there = cast(Place.geom, Geography)

    def within(radius, kinds):
        return list(
            session.exec(
                select(PlaceView)
                .join(Place, Place.id == PlaceView.id)
                .where(
                    func.ST_DWithin(there, here, radius),
                    PlaceView.kind.in_(kinds),
                    PlaceView.status.notin_(("muted", "withdrawn")),
                )
                .order_by(PlaceView.name)
            )
        )

    houses = within(radius_m, HOUSE_KINDS)
    # villages a little beyond the circle, for houses near its edge
    villages = within(radius_m + 3000, ("village",))
    village_of = dict(
        session.exec(
            select(Relation.subject_id, Relation.object_id).where(
                Relation.subject_id.in_([h.id for h in houses]),
                Relation.predicate == "part_of",
            )
        ).all()
    )
    by_id = {v.id: v for v in villages}
    for missing in set(village_of.values()) - by_id.keys():
        place = session.get(PlaceView, missing)
        if place:
            by_id[missing] = place
    check = HouseCheck(houses=len(houses))
    by_number: dict[str, list[PlaceView]] = {}
    for house in houses:
        number = number_of(house.attributes)
        if number:
            by_number.setdefault(number, []).append(house)
    for same in by_number.values():
        for i, a in enumerate(same):
            for b in same[i + 1 :]:
                apart = meters(a, b)
                if apart <= SAME_SPOT_M and village_of.get(a.id) != village_of.get(
                    b.id
                ):
                    check.same_spot.append(
                        SameSpot(
                            houses=[a.slug, b.slug],
                            villages=[
                                getattr(by_id.get(village_of.get(h.id)), "slug", None)
                                for h in (a, b)
                            ],
                            distance_m=round(apart),
                        )
                    )
    # a house listed twice is muted first, not moved
    twins = {slug for pair in check.same_spot for slug in pair.houses}
    for house in houses:
        if house.slug in twins:
            continue
        own = by_id.get(village_of.get(house.id))
        if own is None:
            check.no_village.append(house.slug)
            continue
        own_m = meters(house, own)
        others = [(meters(house, v), v) for v in villages if v.id != own.id]
        if own_m <= far_m or not others:
            continue
        nearest_m, nearest = min(others, key=lambda pair: pair[0])
        if nearest_m <= near_m and own_m - nearest_m >= MISPLACED_GAIN_M:
            check.misplaced.append(
                Misplaced(
                    house=house.slug,
                    village=own.slug,
                    village_m=round(own_m),
                    nearest=nearest.slug,
                    nearest_m=round(nearest_m),
                )
            )
    return check
