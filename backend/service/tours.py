"""Tours: a GPS track with texts; stops and places are links."""

from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import Tour
from api.model.views import TourView
from helpers.slug import slugify
from service import Actor, Invalid, NotFound, audit, initial_status, require
from service import resources
from service.resources import TextIn
from tour import parse_gpx


class TourIn(BaseModel):
    name: str
    description: str | None = None
    lang: str = "de"
    status: str | None = None


def create(session: Session, actor: Actor, data: TourIn, gpx: bytes) -> TourView:
    require(actor, "write")
    slug = slugify(data.name)
    resources.check_slug_free(session, slug)
    try:
        wkt = parse_gpx(gpx)
    except Exception as e:
        raise Invalid(f"not a GPX track with elevations: {e}")
    resource = resources.new(session, actor, "tour", initial_status(actor, data.status))
    session.add(Tour(id=resource.id, slug=slug, geom=f"SRID=4326;{wkt}"))
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
    if data.description:
        resources.set_text(
            session,
            actor,
            resource.id,
            "description",
            data.lang,
            TextIn(body=data.description),
            commit=False,
        )
    audit.log(
        session,
        actor,
        "tour",
        "create",
        resource.id,
        resource.id,
        data.model_dump() | {"slug": slug, "status": resource.status},
    )
    session.commit()
    return get(session, resource.id)


def get(session: Session, id: UUID) -> TourView:
    tour = session.get(TourView, id)
    if not tour:
        raise NotFound(f"no tour {id}")
    return tour


def list_(session: Session, status: str | None = None) -> list[TourView]:
    query = select(TourView).order_by(TourView.name)
    if status:
        query = query.where(TourView.status == status)
    return list(session.exec(query))
