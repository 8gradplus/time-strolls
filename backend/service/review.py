"""Looking at any resource: lists by type and status (the review queue is
status 'new'), and one resource with everything attached to it."""

from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import Relation, Resource, ResourceSource, SourceRecord, Text
from service import Invalid, resources
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
) -> list[Summary]:
    query = select(Resource).order_by(Resource.created_at.desc()).limit(limit)
    if type:
        query = query.where(Resource.type == type)
    if status:
        query = query.where(Resource.status == status)
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
        relations=resources.relations(session, id),
        sources=[
            r.model_dump(include={"id", "external_id", "url", "lang", "retrieved_at"})
            for r in records
        ],
    )
