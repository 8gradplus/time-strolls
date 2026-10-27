"""What the map, the public API and the public MCP tools read: only the
public_* views (published, and permitted)."""

from uuid import UUID

from geoalchemy2.shape import to_shape
from pydantic import BaseModel
from sqlmodel import Session, func, select

from api.model.tables import (
    Account,
    Party,
    Permission,
    ResourceSource,
    Source,
    SourceRecord,
)
from api.model.views import (
    PublicMedia,
    PublicPlace,
    PublicRelation,
    PublicText,
    PublicTour,
)
from service import NotFound, resources


class Translated(BaseModel):
    """The language of the texts returned and, for a translation, how it was
    made (the menu's sources credit machine translations)."""

    lang: str | None = None
    method: str | None = None  # None for an original


class LocationPlace(BaseModel):
    id: UUID
    slug: str
    name: str
    kind: str
    lat: float
    lon: float
    part_of: UUID | None = None  # the village a house or chapel belongs to
    images: int = 0
    # facts from the archives (houses, sacral buildings), where known
    number: str | None = None
    house_name: str | None = None
    former_number: str | None = None
    state: str | None = None  # standing | ruined | vanished
    address: str | None = None  # today's address of a standing house


class LocationImage(Translated):
    id: UUID
    title: str | None = None
    description: str | None = None
    url: str
    source_url: str | None = None
    owner: str | None = None
    creator: str | None = None
    year: int | None = None
    date_text: str | None = None


class LocationPodcast(Translated):
    id: UUID
    title: str
    url: str
    owner: str | None = None


class Location(BaseModel):
    place: LocationPlace
    parent: LocationPlace | None = None
    # what is part of it (a village's houses and chapels), by kind and number
    children: list[LocationPlace] = []
    # the first of podcasts, as before
    podcast: LocationPodcast | None = None
    podcasts: list[LocationPodcast]
    images: list[LocationImage]


class TourSummary(Translated):
    id: UUID
    slug: str
    name: str
    description: str | None = None
    length: float


class TourDetail(TourSummary):
    geom: list


def texts_of(session: Session, ids) -> dict[UUID, list[PublicText]]:
    by_resource = {id: [] for id in ids}
    if ids:
        for text in session.exec(
            select(PublicText).where(PublicText.resource_id.in_(list(ids)))
        ):
            by_resource[text.resource_id].append(text)
    return by_resource


def translated(text) -> dict:
    if not text:
        return {}
    return {
        "lang": text.lang,
        "method": None if text.method == "original" else text.method,
    }


def body(text) -> str | None:
    return text.body if text else None


# The archives' words for a building's state. The Südböhmen archive keeps it
# in the address: "verfallen", "Wüstung", or today's address where the house
# still stands.
STATES = {
    "verfallen": "ruined",
    "Wüstung": "vanished",
    "Zaniklé": "vanished",
    "Opravené": "standing",
}
NO_ADDRESS = {"ohne Nummer"}


def facts(attributes: dict | None) -> dict:
    a = attributes or {}
    address = a.get("address")
    state = STATES.get(a.get("state") or "")
    today = None
    if address in STATES:
        state = STATES[address]
    elif address and address not in NO_ADDRESS:
        state, today = "standing", address
    return dict(
        number=a.get("number"),
        house_name=a.get("house_name"),
        former_number=a.get("former_number"),
        state=state,
        address=today,
    )


def parents_of(session: Session, ids) -> dict[UUID, UUID]:
    if not ids:
        return {}
    rows = session.exec(
        select(PublicRelation)
        .where(
            PublicRelation.predicate == "part_of",
            PublicRelation.subject_id.in_(list(ids)),
        )
        .order_by(PublicRelation.id)
    )
    parents = {}
    for r in rows:
        parents.setdefault(r.subject_id, r.object_id)
    return parents


def image_counts(session: Session, ids) -> dict[UUID, int]:
    if not ids:
        return {}
    rows = session.exec(
        select(PublicRelation.object_id, func.count())
        .join(PublicMedia, PublicMedia.id == PublicRelation.subject_id)
        .where(
            PublicRelation.predicate == "shows",
            PublicRelation.object_id.in_(list(ids)),
            PublicMedia.kind == "image",
        )
        .group_by(PublicRelation.object_id)
    )
    return dict(rows.all())


def location_places(session: Session, places, lang) -> list[LocationPlace]:
    ids = [p.id for p in places]
    names = texts_of(session, ids)
    parents = parents_of(session, ids)
    images = image_counts(session, ids)
    return [
        LocationPlace(
            **p.model_dump(include={"id", "slug", "kind", "lat", "lon"}),
            name=body(resources.pick(names[p.id], "name", lang)) or p.name,
            part_of=parents.get(p.id),
            images=images.get(p.id, 0),
            **facts(p.attributes),
        )
        for p in places
    ]


def locations(session: Session, lang: str | None = None) -> list[LocationPlace]:
    places = list(session.exec(select(PublicPlace).where(PublicPlace.map_visible)))
    return location_places(session, places, lang)


def by_kind_and_number(place: LocationPlace):
    number = place.number or ""
    digits = "".join(c for c in number if c.isdigit())
    return (place.kind, not digits, int(digits or 0), number, place.name)


def linked_media(session: Session, place_id: UUID, predicate: str, kinds):
    links = {
        r.subject_id: r.position
        for r in session.exec(
            select(PublicRelation).where(
                PublicRelation.object_id == place_id,
                PublicRelation.predicate == predicate,
            )
        )
    }
    if not links:
        return []
    rows = session.exec(
        select(PublicMedia).where(
            PublicMedia.id.in_(list(links)), PublicMedia.kind.in_(kinds)
        )
    )
    return sorted(
        rows,
        key=lambda m: (m.date_from is None, m.date_from or 0, links[m.id] or 0),
    )


def location(session: Session, key: str, lang: str | None = None) -> Location:
    place = session.get(PublicPlace, resources.resolve(session, key, "place"))
    if not place:
        raise NotFound(f"no place {key!r}")
    images = linked_media(session, place.id, "shows", ["image"])
    podcasts = linked_media(session, place.id, "about", ["audio"])
    texts = texts_of(session, [m.id for m in images + podcasts])

    def image(m: PublicMedia) -> LocationImage:
        title = resources.pick(texts[m.id], "title", lang)
        return LocationImage(
            id=m.id,
            title=body(title),
            description=body(resources.pick(texts[m.id], "description", lang)),
            url=m.url,
            source_url=m.source_url,
            owner=m.rights_holder,
            creator=m.creator,
            year=m.date_from.year if m.date_from else None,
            date_text=m.date_text,
            **translated(title),
        )

    def podcast(m: PublicMedia) -> LocationPodcast:
        title = resources.pick(texts[m.id], "title", lang)
        return LocationPodcast(
            id=m.id,
            title=body(title) or "",
            url=m.url,
            owner=m.rights_holder,
            **translated(title),
        )

    podcast_list = [podcast(m) for m in podcasts]
    parent_id = parents_of(session, [place.id]).get(place.id)
    child_ids = [
        r.subject_id
        for r in session.exec(
            select(PublicRelation).where(
                PublicRelation.object_id == place.id,
                PublicRelation.predicate == "part_of",
            )
        )
    ]
    near = list(
        session.exec(
            select(PublicPlace).where(
                PublicPlace.id.in_([place.id, parent_id, *child_ids])
            )
        )
    )
    rows = {p.id: p for p in location_places(session, near, lang)}
    return Location(
        place=rows[place.id],
        parent=rows.get(parent_id),
        children=sorted(
            (rows[id] for id in child_ids if id in rows), key=by_kind_and_number
        ),
        podcast=podcast_list[0] if podcast_list else None,
        podcasts=podcast_list,
        images=[image(m) for m in images],
    )


def tour_summary(tour: PublicTour, texts, lang) -> dict:
    name = resources.pick(texts, "name", lang)
    return dict(
        id=tour.id,
        slug=tour.slug,
        name=body(name) or tour.name,
        description=body(resources.pick(texts, "description", lang)),
        length=tour.length,
        **translated(name),
    )


def tours(session: Session, lang: str | None = None) -> list[TourSummary]:
    rows = list(session.exec(select(PublicTour)))
    texts = texts_of(session, [t.id for t in rows])
    return [TourSummary(**tour_summary(t, texts[t.id], lang)) for t in rows]


def tour(session: Session, key: str, lang: str | None = None) -> TourDetail:
    row = session.get(PublicTour, resources.resolve(session, key, "tour"))
    if not row:
        raise NotFound(f"no tour {key!r}")
    texts = texts_of(session, [row.id])
    return TourDetail(
        **tour_summary(row, texts[row.id], lang),
        geom=[list(c) for c in to_shape(row.geom).coords],
    )


class CreditSource(BaseModel):
    name: str
    url: str | None = None


class CreditTranslation(BaseModel):
    lang: str
    method: str  # human | machine
    model: str | None = None
    by: str | None = None  # the translator's name, where the account has one


class Credits(BaseModel):
    """For the menu's sources: where the content that is shown comes from
    (by permission) and how its texts were translated."""

    sources: list[CreditSource]
    owners: list[str]
    translations: list[CreditTranslation]


def credits(session: Session) -> Credits:
    """Only sources and parties with a permission and at least one media on
    the map: a permission alone credits nobody."""
    active = (Permission.show) & (Permission.revoked_at.is_(None))
    sources = session.exec(
        select(Source)
        .join(Permission, Permission.source_id == Source.id)
        .join(SourceRecord, SourceRecord.source_id == Source.id)
        .join(ResourceSource, ResourceSource.source_record_id == SourceRecord.id)
        .join(PublicMedia, PublicMedia.id == ResourceSource.resource_id)
        .where(active)
        .distinct()
        .order_by(Source.name)
    )
    owners = session.exec(
        select(Party.name)
        .join(Permission, Permission.party_id == Party.id)
        .join(
            PublicMedia,
            (PublicMedia.rights_holder == Party.name)
            | (PublicMedia.creator == Party.name),
        )
        .where(active)
        .distinct()
        .order_by(Party.name)
    )
    rows = session.exec(
        select(PublicText.lang, PublicText.method, PublicText.model, Party.name)
        .join(Account, Account.id == PublicText.created_by)
        .join(Party, Party.id == Account.party_id, isouter=True)
        .where(PublicText.method != "original")
        .distinct()
        .order_by(PublicText.lang, PublicText.method)
    )
    return Credits(
        sources=[CreditSource(name=s.name, url=s.base_url) for s in sources],
        owners=list(owners),
        translations=[
            CreditTranslation(lang=lang, method=method, model=model, by=by)
            for lang, method, model, by in rows
        ],
    )
