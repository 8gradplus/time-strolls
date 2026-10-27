"""What the map, the public API and the public MCP tools read: only the
public_* views (published, and permitted)."""

from uuid import UUID

from geoalchemy2.shape import to_shape
from pydantic import BaseModel
from sqlmodel import Session, select

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


def locations(session: Session, lang: str | None = None) -> list[LocationPlace]:
    places = list(session.exec(select(PublicPlace).where(PublicPlace.map_visible)))
    names = texts_of(session, [p.id for p in places])
    return [
        LocationPlace(
            **p.model_dump(include={"id", "slug", "kind", "lat", "lon"}),
            name=body(resources.pick(names[p.id], "name", lang)) or p.name,
        )
        for p in places
    ]


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
    texts = texts_of(session, [place.id] + [m.id for m in images + podcasts])

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
    return Location(
        place=LocationPlace(
            **place.model_dump(include={"id", "slug", "kind", "lat", "lon"}),
            name=body(resources.pick(texts[place.id], "name", lang)) or place.name,
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
