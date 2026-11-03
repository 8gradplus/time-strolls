"""Looking at any resource: lists by type and status (the review queue is
status 'new'), and one resource with everything attached to it."""

from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import Integer, cast
from sqlmodel import Session, func, select

from api.model.tables import (
    Account,
    Permission,
    Place,
    Relation,
    Resource,
    ResourceSource,
    Source,
    SourceRecord,
    Text,
)
from api.model.views import MediaView, PlaceView, TourView
from service import STATUSES, Actor, Invalid, each, resources
from service import media, places, rights, tours
from service.rights import Rights


class Summary(BaseModel):
    id: UUID
    type: str
    status: str
    label: str | None = None
    created_at: str


def label(session: Session, resource: Resource) -> str | None:
    field = "title" if resource.type == "media" else "name"
    text = resources.pick(resources.texts(session, resource.id), field, None)
    return text.body if text else None


def list_(
    session: Session,
    type: str | None = None,
    status: str | None = None,
    limit: int = 200,
    kind: str | None = None,
) -> list[Summary]:
    query = select(Resource).order_by(Resource.created_at.desc()).limit(limit)
    if type:
        query = query.where(Resource.type == type)
    if status:
        query = query.where(Resource.status == status)
    if kind:  # places only
        query = query.join(Place, Place.id == Resource.id).where(Place.kind == kind)
    return [
        Summary(
            id=r.id,
            type=r.type,
            status=r.status,
            label=label(session, r),
            created_at=r.created_at.isoformat(),
        )
        for r in session.exec(query)
    ]


class Shown(BaseModel):
    """A place a media shows, with the link (to remove it) and its village."""

    relation_id: UUID
    id: UUID
    slug: str
    name: str | None = None
    kind: str
    status: str
    part_of_name: str | None = None


class Detail(BaseModel):
    resource: Resource
    item: dict
    texts: list[Text]
    relations: list[Relation]
    sources: list[dict]
    # the source's wording of edited texts, by "field/lang"
    verbatim: dict[str, str] = {}
    # the places a media shows (its `shows` links), named
    shows: list[Shown] = []
    # why a media may be shown (or not)
    rights: Rights | None = None


def shown(session: Session, id: UUID, relations: list[Relation]) -> list[Shown]:
    links = {
        r.object_id: r.id
        for r in relations
        if r.predicate == "shows" and r.subject_id == id
    }
    if not links:
        return []
    rows = session.exec(select(PlaceView).where(PlaceView.id.in_(list(links))))
    found = {p.id: p for p in rows}
    parents = dict(
        session.exec(
            select(Relation.subject_id, Relation.object_id).where(
                Relation.subject_id.in_(list(found)), Relation.predicate == "part_of"
            )
        ).all()
    )
    names = dict(
        session.exec(
            select(PlaceView.id, PlaceView.name).where(
                PlaceView.id.in_(list(parents.values()))
            )
        ).all()
    )
    return sorted(
        (
            Shown(
                relation_id=links[p.id],
                id=p.id,
                slug=p.slug,
                name=p.name,
                kind=p.kind,
                status=p.status,
                part_of_name=names.get(parents.get(p.id)),
            )
            for p in found.values()
        ),
        key=lambda s: (s.part_of_name or s.name or "", s.name or ""),
    )


def detail(session: Session, key: str) -> Detail:
    id = resources.resolve(session, key)
    resource = resources.get(session, id)
    getter = {"place": places.get, "media": media.get, "tour": tours.get}
    if resource.type not in getter:
        raise Invalid(f"unknown type {resource.type}")
    item = getter[resource.type](session, id).model_dump(exclude={"geom"})
    records = session.exec(
        select(SourceRecord)
        .join(ResourceSource, ResourceSource.source_record_id == SourceRecord.id)
        .where(ResourceSource.resource_id == id)
    )
    relations = resources.relations(session, id)
    return Detail(
        resource=resource,
        item=item,
        texts=resources.texts(session, id),
        verbatim=resources.verbatim(session, id),
        relations=relations,
        shows=shown(session, id, relations),
        rights=rights.of_media(session, id) if resource.type == "media" else None,
        sources=[
            r.model_dump(include={"id", "external_id", "url", "lang", "retrieved_at"})
            for r in records
        ],
    )


# Several at once ------------------------------------------------------------------


def set_statuses(
    session: Session,
    actor: Actor,
    keys: list[str | tuple[str, str | None]],
    status: str,
    reason: str | None = None,
) -> dict:
    """Publishes, mutes, withdraws or resets resources (ids or slugs; or
    (key, reason) for a reason of its own). Returns {done, errors: [{item,
    error}]}; one failure doesn't stop the rest."""

    def change(session: Session, item):
        key, why = (item, reason) if isinstance(item, str) else item
        resources.set_status(
            session, actor, resources.resolve(session, key), status, why or reason
        )

    return each(session, keys, change)


# The review queue (the admin UI) --------------------------------------------------

TYPES = ("place", "media", "tour")


class QueueItem(BaseModel):
    id: UUID
    type: str
    status: str
    status_reason: str | None = None
    label: str | None = None
    kind: str | None = None
    slug: str | None = None
    created_at: str
    created_by: str | None = None  # the account's name
    # media: the picture, its source, whether the public map may show it
    url: str | None = None
    source_url: str | None = None
    may_show: bool | None = None
    # media: the source's name and whether it gave a permission to show
    source: str | None = None
    source_permitted: bool | None = None
    # the places it belongs to (part_of) or shows (media)
    places: list[str] = []


class Queue(BaseModel):
    total: int
    items: list[QueueItem]


def _order(view):
    """Places and tours alphabetically, house numbers as numbers ("Stuben 2"
    before "Stuben 10"); media (no title in the view) newest first."""
    if view is MediaView:
        return [view.created_at.desc(), view.id]
    name = func.coalesce(view.name, "")
    number = func.substring(name, r"(\d+)\s*$")
    return [
        func.lower(func.regexp_replace(name, r"\s*\d+\s*$", "")),
        cast(number, Integer).nulls_first(),
        func.lower(name),
        view.id,
    ]


def permitted_sources(session: Session) -> set[UUID]:
    """The sources that gave a permission to show their content."""
    return set(
        session.exec(
            select(Permission.source_id).where(
                Permission.source_id.is_not(None),
                Permission.revoked_at.is_(None),
                Permission.show,
            )
        ).all()
    )


class MediaSource(BaseModel):
    code: str
    name: str
    count: int  # its media in the status
    permitted: bool  # it gave a permission to show


def media_sources(session: Session, status: str = "new") -> list[MediaSource]:
    """The sources of media in a status, with counts and permission (the
    admin's source filter), by name."""
    if status not in STATUSES:
        raise Invalid(f"unknown status {status!r}")
    allowed = permitted_sources(session)
    rows = session.exec(
        select(
            Source.id, Source.code, Source.name, func.count(func.distinct(MediaView.id))
        )
        .join(SourceRecord, SourceRecord.source_id == Source.id)
        .join(ResourceSource, ResourceSource.source_record_id == SourceRecord.id)
        .join(MediaView, MediaView.id == ResourceSource.resource_id)
        .where(MediaView.status == status)
        .group_by(Source.id, Source.code, Source.name)
        .order_by(Source.name)
    ).all()
    return [
        MediaSource(code=code, name=name, count=count, permitted=id in allowed)
        for id, code, name, count in rows
    ]


def queue(
    session: Session,
    type: str,
    status: str = "new",
    kind: str | None = None,
    limit: int = 50,
    offset: int = 0,
    sources: list[str] | None = None,
) -> Queue:
    """One type's resources in a status (places and tours by name, media
    newest first), with what a row of the review list shows; a few queries
    per page, not one per row. sources: media of these sources (codes)."""
    views = {"place": PlaceView, "media": MediaView, "tour": TourView}
    if type not in views:
        raise Invalid(f"unknown type {type!r}; known: {list(TYPES)}")
    if status not in STATUSES:
        raise Invalid(f"unknown status {status!r}")
    view = views[type]
    where = [view.status == status]
    if kind and type != "tour":
        where.append(view.kind == kind)
    if sources and type == "media":
        where.append(
            view.id.in_(
                select(ResourceSource.resource_id)
                .join(SourceRecord, SourceRecord.id == ResourceSource.source_record_id)
                .join(Source, Source.id == SourceRecord.source_id)
                .where(Source.code.in_(sources))
            )
        )
    total = session.exec(select(func.count()).select_from(view).where(*where)).one()
    rows = list(
        session.exec(
            select(view)
            .where(*where)
            .order_by(*_order(view))
            .offset(offset)
            .limit(min(limit, 200))
        )
    )
    ids = [r.id for r in rows]
    names = dict(
        session.exec(
            select(Account.id, Account.name).where(
                Account.id.in_({r.created_by for r in rows})
            )
        ).all()
    )
    titles = {}
    if type == "media" and ids:
        texts = session.exec(
            select(Text).where(Text.resource_id.in_(ids), Text.field == "title")
        ).all()
        for id in ids:
            text = resources.pick(
                [t for t in texts if t.resource_id == id], "title", None
            )
            titles[id] = text.body if text else None
    source_of: dict[UUID, tuple[str, bool]] = {}
    if type == "media" and ids:
        allowed = permitted_sources(session)
        for media_id, source_id, name in session.exec(
            select(ResourceSource.resource_id, Source.id, Source.name)
            .join(SourceRecord, SourceRecord.id == ResourceSource.source_record_id)
            .join(Source, Source.id == SourceRecord.source_id)
            .where(ResourceSource.resource_id.in_(ids))
            .order_by(SourceRecord.created_at)
        ):
            source_of.setdefault(media_id, (name, source_id in allowed))
    places_of: dict[UUID, list[str]] = {id: [] for id in ids}
    predicate = {"place": "part_of", "media": "shows"}.get(type)
    if predicate and ids:
        links = session.exec(
            select(Relation.subject_id, PlaceView.name)
            .join(PlaceView, PlaceView.id == Relation.object_id)
            .where(Relation.subject_id.in_(ids), Relation.predicate == predicate)
            .order_by(PlaceView.name)
        ).all()
        for subject, name in links:
            places_of[subject].append(name)
    return Queue(
        total=total,
        items=[
            QueueItem(
                id=r.id,
                type=type,
                status=r.status,
                status_reason=r.status_reason,
                label=titles.get(r.id) if type == "media" else r.name,
                kind=getattr(r, "kind", None),
                slug=getattr(r, "slug", None),
                created_at=r.created_at.isoformat(),
                created_by=names.get(r.created_by),
                url=getattr(r, "url", None),
                source_url=getattr(r, "source_url", None),
                may_show=getattr(r, "may_show", None),
                source=source_of.get(r.id, (None, None))[0],
                source_permitted=source_of.get(r.id, (None, None))[1],
                places=places_of[r.id],
            )
            for r in rows
        ],
    )
