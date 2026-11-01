"""Looking at any resource: lists by type and status (the review queue is
status 'new'), and one resource with everything attached to it."""

from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, func, select

from api.model.tables import (
    Account,
    Place,
    Relation,
    Resource,
    ResourceSource,
    SourceRecord,
    Text,
)
from api.model.views import MediaView, PlaceView, TourView
from service import STATUSES, Actor, Invalid, each, resources
from service import media, places, tours


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


class Detail(BaseModel):
    resource: Resource
    item: dict
    texts: list[Text]
    relations: list[Relation]
    sources: list[dict]
    # the source's wording of edited texts, by "field/lang"
    verbatim: dict[str, str] = {}


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
    return Detail(
        resource=resource,
        item=item,
        texts=resources.texts(session, id),
        verbatim=resources.verbatim(session, id),
        relations=resources.relations(session, id),
        sources=[
            r.model_dump(include={"id", "external_id", "url", "lang", "retrieved_at"})
            for r in records
        ],
    )


# Several at once ------------------------------------------------------------------


def set_statuses(
    session: Session,
    actor: Actor,
    keys: list[str],
    status: str,
    reason: str | None = None,
) -> dict:
    """Publishes, mutes, withdraws or resets resources (ids or slugs).
    Returns {done, errors: [{item, error}]}; one failure doesn't stop the rest."""

    def change(session: Session, key: str):
        resources.set_status(
            session, actor, resources.resolve(session, key), status, reason
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
    # the places it belongs to (part_of) or shows (media)
    places: list[str] = []


class Queue(BaseModel):
    total: int
    items: list[QueueItem]


def queue(
    session: Session,
    type: str,
    status: str = "new",
    kind: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Queue:
    """One type's resources in a status, newest first, with what a row of
    the review list shows; a few queries per page, not one per row."""
    views = {"place": PlaceView, "media": MediaView, "tour": TourView}
    if type not in views:
        raise Invalid(f"unknown type {type!r}; known: {list(TYPES)}")
    if status not in STATUSES:
        raise Invalid(f"unknown status {status!r}")
    view = views[type]
    where = [view.status == status]
    if kind and type != "tour":
        where.append(view.kind == kind)
    total = session.exec(select(func.count()).select_from(view).where(*where)).one()
    rows = list(
        session.exec(
            select(view)
            .where(*where)
            .order_by(view.created_at.desc(), view.id)
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
                places=places_of[r.id],
            )
            for r in rows
        ],
    )
