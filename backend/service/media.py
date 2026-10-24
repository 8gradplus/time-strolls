"""Media: images, documents and audio (podcasts). A media is the object;
its files say where the bytes are: the source's own URL (external) or our
CDN copy (only with a copy permission)."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import File, Media
from api.model.views import MediaView
from service import Actor, Conflict, NotFound, audit, initial_status, require
from service import resources, rights
from service.resources import TextIn

# How a media links to a place by default
PREDICATE = {"image": "shows", "document": "shows", "audio": "about"}


class MediaIn(BaseModel):
    kind: str  # image | document | audio
    url: str  # the file, where it is (external)
    title: str
    description: str | None = None
    lang: str = "de"
    date_text: str | None = None
    year: int | None = None
    creator: str | None = None  # party names
    rights_holder: str | None = None
    # places (id or slug) the media shows or is about
    places: list[str] = []
    attributes: dict = {}
    status: str | None = None


def year_range(year: int | None) -> tuple[date | None, date | None]:
    return (date(year, 1, 1), date(year, 12, 31)) if year else (None, None)


def create(
    session: Session,
    actor: Actor,
    data: MediaIn,
    source_record_id: UUID | None = None,
    commit: bool = True,
) -> UUID:
    """Adds a media with its external file, texts and links."""
    require(actor, "write")
    if session.exec(select(File).where(File.url == data.url)).first():
        raise Conflict(f"a media with the file {data.url} exists")
    resource = resources.new(
        session, actor, "media", initial_status(actor, data.status)
    )
    date_from, date_to = year_range(data.year)
    session.add(
        Media(
            id=resource.id,
            kind=data.kind,
            date_text=data.date_text,
            date_from=date_from,
            date_to=date_to,
            creator_id=rights.party_id(session, actor, data.creator),
            rights_holder_id=rights.party_id(session, actor, data.rights_holder),
            attributes=data.attributes,
        )
    )
    session.flush()
    session.add(File(media_id=resource.id, storage="external", url=data.url))
    for field in ("title", "description"):
        if body := getattr(data, field):
            resources.set_text(
                session,
                actor,
                resource.id,
                field,
                data.lang,
                TextIn(body=body),
                source_record_id=source_record_id,
                commit=False,
            )
    for key in data.places:
        resources.link(
            session,
            actor,
            resource.id,
            PREDICATE[data.kind],
            resources.resolve(session, key, "place"),
            commit=False,
        )
    audit.log(
        session,
        actor,
        "media",
        "create",
        resource.id,
        resource.id,
        data.model_dump() | {"status": resource.status},
    )
    if commit:
        session.commit()
    return resource.id


def get(session: Session, id: UUID) -> MediaView:
    media = session.get(MediaView, id)
    if not media:
        raise NotFound(f"no media {id}")
    return media


def list_(
    session: Session, status: str | None = None, kind: str | None = None
) -> list[MediaView]:
    query = select(MediaView).order_by(MediaView.created_at)
    if status:
        query = query.where(MediaView.status == status)
    if kind:
        query = query.where(MediaView.kind == kind)
    return list(session.exec(query))
