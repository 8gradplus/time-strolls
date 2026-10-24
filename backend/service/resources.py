"""What all types share: lookup by id or slug, status, texts and links."""

from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import (
    Place,
    Relation,
    RelationKind,
    Resource,
    SlugAlias,
    Text,
    Tour,
    now,
)
from service import (
    STATUSES,
    Actor,
    Conflict,
    Invalid,
    NotFound,
    audit,
    require,
)


def new(session: Session, actor: Actor, type: str, status: str) -> Resource:
    resource = Resource(type=type, status=status, created_by=actor.account_id)
    if status == "published":
        resource.published_by = actor.account_id
        resource.published_at = now()
    session.add(resource)
    session.flush()
    return resource


def get(session: Session, id: UUID) -> Resource:
    resource = session.get(Resource, id)
    if not resource:
        raise NotFound(f"no resource {id}")
    return resource


def resolve(session: Session, key: str | UUID, type: str | None = None) -> UUID:
    """The id of a resource given as id, slug or earlier slug."""
    id = None
    try:
        id = UUID(str(key))
    except ValueError:
        for table in (Place, Tour):
            if type in (None, table.__tablename__):
                row = session.exec(select(table).where(table.slug == key)).first()
                if row:
                    id = row.id
                    break
        if id is None:
            alias = session.get(SlugAlias, key)
            id = alias.resource_id if alias else None
    if id is None:
        raise NotFound(f"no {type or 'resource'} {key!r}")
    if type and get(session, id).type != type:
        raise NotFound(f"no {type} {key!r}")
    return id


def touch(session: Session, id: UUID):
    get(session, id).updated_at = now()


def set_status(
    session: Session, actor: Actor, id: UUID, status: str, reason: str | None = None
) -> Resource:
    """Publish, mute (with a reason), withdraw, or back to new."""
    require(actor, "review")
    if status not in STATUSES:
        raise Invalid(f"unknown status {status!r}")
    resource = get(session, id)
    before = resource.status
    resource.status = status
    resource.status_reason = reason
    resource.updated_at = now()
    if status == "published":
        resource.published_by = actor.account_id
        resource.published_at = now()
    audit.log(
        session,
        actor,
        "resource",
        "status",
        id,
        id,
        {"from": before, "to": status, "reason": reason},
    )
    session.commit()
    session.refresh(resource)
    return resource


# Texts -------------------------------------------------------------------------


class TextIn(BaseModel):
    body: str
    method: str = "original"  # original | human | machine
    translated_from: str | None = None
    model: str | None = None
    is_primary: bool = False


def set_text(
    session: Session,
    actor: Actor,
    resource_id: UUID,
    field: str,
    lang: str,
    text: TextIn,
    source_record_id: UUID | None = None,
    commit: bool = True,
) -> Text:
    """Adds or replaces the text of a field in one language. A translation
    keeps the source of its original, so it needs the same permission."""
    require(actor, "write")
    get(session, resource_id)
    if (text.method == "original") != (text.translated_from is None):
        raise Invalid("a translation needs translated_from, an original none")
    if text.method != "original" and source_record_id is None:
        original = session.exec(
            select(Text).where(
                Text.resource_id == resource_id,
                Text.field == field,
                Text.lang == text.translated_from,
            )
        ).first()
        if not original:
            raise Invalid(f"no {field} in {text.translated_from} to translate from")
        source_record_id = original.source_record_id
    row = session.exec(
        select(Text).where(
            Text.resource_id == resource_id, Text.field == field, Text.lang == lang
        )
    ).first()
    action = "update" if row else "create"
    if not row:
        row = Text(
            resource_id=resource_id,
            field=field,
            lang=lang,
            body=text.body,
            created_by=actor.account_id,
        )
    else:
        row.updated_at = now()
    row.sqlmodel_update(text.model_dump())
    row.source_record_id = source_record_id
    if row.is_primary:
        for other in session.exec(
            select(Text).where(
                Text.resource_id == resource_id,
                Text.field == field,
                Text.lang != lang,
                Text.is_primary,
            )
        ):
            other.is_primary = False
    session.add(row)
    audit.log(
        session,
        actor,
        "text",
        action,
        f"{field}/{lang}",
        resource_id,
        text.model_dump(),
    )
    if commit:
        session.commit()
        session.refresh(row)
    return row


def texts(session: Session, resource_id: UUID) -> list[Text]:
    return list(
        session.exec(
            select(Text)
            .where(Text.resource_id == resource_id)
            .order_by(Text.field, Text.lang)
        )
    )


def pick(rows, field: str, lang: str | None):
    """The text of a field in the language asked for, else the original
    (the primary one first)."""
    candidates = [t for t in rows if t.field == field]
    for t in candidates:
        if t.lang == lang:
            return t
    originals = [t for t in candidates if t.method == "original"]
    originals.sort(key=lambda t: not t.is_primary)
    return (originals or candidates or [None])[0]


# Links ---------------------------------------------------------------------------


def link(
    session: Session,
    actor: Actor,
    subject_id: UUID,
    predicate: str,
    object_id: UUID,
    position: int | None = None,
    commit: bool = True,
) -> Relation:
    """Links two resources (idempotent: an existing link is returned)."""
    require(actor, "write")
    kind = session.get(RelationKind, predicate)
    if not kind:
        raise Invalid(f"unknown relation {predicate!r}")
    subject, object = get(session, subject_id), get(session, object_id)
    if subject.type not in kind.subject_types or object.type not in kind.object_types:
        raise Invalid(f"{subject.type} {predicate} {object.type} is not a valid link")
    if subject_id == object_id:
        raise Invalid("a resource can't link to itself")
    existing = session.exec(
        select(Relation).where(
            Relation.subject_id == subject_id,
            Relation.predicate == predicate,
            Relation.object_id == object_id,
        )
    ).first()
    if existing:
        return existing
    if kind.ordered and position is None:
        position = len(
            session.exec(
                select(Relation.id).where(
                    Relation.object_id == object_id, Relation.predicate == predicate
                )
            ).all()
        )
    relation = Relation(
        subject_id=subject_id,
        predicate=predicate,
        object_id=object_id,
        position=position,
        created_by=actor.account_id,
    )
    session.add(relation)
    audit.log(
        session,
        actor,
        "relation",
        "create",
        relation.id,
        subject_id,
        relation.model_dump(
            include={"subject_id", "predicate", "object_id", "position"}
        ),
    )
    if commit:
        session.commit()
        session.refresh(relation)
    return relation


def unlink(session: Session, actor: Actor, id: UUID):
    require(actor, "write")
    relation = session.get(Relation, id)
    if not relation:
        raise NotFound(f"no relation {id}")
    audit.log(
        session,
        actor,
        "relation",
        "delete",
        id,
        relation.subject_id,
        relation.model_dump(
            include={"subject_id", "predicate", "object_id", "position"}
        ),
    )
    session.delete(relation)
    session.commit()


def relations(session: Session, resource_id: UUID) -> list[Relation]:
    return list(
        session.exec(
            select(Relation).where(
                (Relation.subject_id == resource_id)
                | (Relation.object_id == resource_id)
            )
        )
    )


def check_slug_free(session: Session, slug: str):
    for table in (Place, Tour):
        if session.exec(select(table).where(table.slug == slug)).first():
            raise Conflict(f"the slug {slug!r} is taken")
    if session.get(SlugAlias, slug):
        raise Conflict(f"the slug {slug!r} is taken (an earlier slug)")
