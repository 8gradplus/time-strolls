"""Parties (who made or owns content), sources (where it came from) and the
permissions to distribute it: granted by personal communication, revoked but
never deleted."""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from api.model.tables import Party, Permission, Source, now
from service import Actor, Invalid, NotFound, audit, require


class PartyIn(BaseModel):
    name: str
    kind: str | None = None  # person | organisation
    note: str | None = None


def party(session: Session, actor: Actor, data: PartyIn, commit: bool = True) -> Party:
    """The party of this name, added if missing."""
    existing = session.exec(select(Party).where(Party.name == data.name)).first()
    if existing:
        return existing
    require(actor, "write")
    row = Party(**data.model_dump())
    session.add(row)
    audit.log(session, actor, "party", "create", row.id, diff=data.model_dump())
    session.flush()
    if commit:
        session.commit()
        session.refresh(row)
    return row


def party_id(session: Session, actor: Actor, name: str | None) -> UUID | None:
    return party(session, actor, PartyIn(name=name), commit=False).id if name else None


def parties(session: Session) -> list[Party]:
    return list(session.exec(select(Party).order_by(Party.name)))


class SourceIn(BaseModel):
    code: str  # e.g. topothek:deutsch-reichenau
    name: str
    base_url: str | None = None
    operator: str | None = None  # party name


def source(
    session: Session, actor: Actor, data: SourceIn, commit: bool = True
) -> Source:
    """The source with this code, added if missing."""
    existing = session.exec(select(Source).where(Source.code == data.code)).first()
    if existing:
        return existing
    require(actor, "write")
    row = Source(
        code=data.code,
        name=data.name,
        base_url=data.base_url,
        operator_id=party_id(session, actor, data.operator),
    )
    session.add(row)
    audit.log(session, actor, "source", "create", row.id, diff=data.model_dump())
    session.flush()
    if commit:
        session.commit()
        session.refresh(row)
    return row


def find_source(session: Session, code: str) -> Source:
    row = session.exec(select(Source).where(Source.code == code)).first()
    if not row:
        raise NotFound(f"no source {code!r}")
    return row


def sources(session: Session) -> list[Source]:
    return list(session.exec(select(Source).order_by(Source.code)))


class PermissionIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    # exactly one of them: a source code or a party name
    source: str | None = None
    party: str | None = None
    party_role: str | None = None  # creator | owner | operator
    show: bool = True
    # "copy" in JSON (the name would shadow BaseModel.copy)
    allow_copy: bool = Field(default=False, alias="copy")
    granted_by: str | None = None  # party name
    granted_at: date | None = None
    note: str | None = None
    evidence: str | None = None


def grant(session: Session, actor: Actor, data: PermissionIn) -> Permission:
    require(actor, "review")
    if (data.source is None) == (data.party is None):
        raise Invalid("a permission is for a source or for a party")
    if data.allow_copy and not data.show:
        raise Invalid("copy needs show")
    row = Permission(
        source_id=find_source(session, data.source).id if data.source else None,
        party_id=party_id(session, actor, data.party),
        party_role=data.party_role,
        show=data.show,
        allow_copy=data.allow_copy,
        granted_by=party_id(session, actor, data.granted_by),
        granted_at=data.granted_at,
        note=data.note,
        evidence=data.evidence,
        recorded_by=actor.account_id,
    )
    session.add(row)
    audit.log(session, actor, "permission", "create", row.id, diff=data.model_dump())
    session.commit()
    session.refresh(row)
    return row


def revoke(session: Session, actor: Actor, id: UUID) -> Permission:
    require(actor, "review")
    row = session.get(Permission, id)
    if not row:
        raise NotFound(f"no permission {id}")
    row.revoked_at = now()
    audit.log(session, actor, "permission", "revoke", id)
    session.commit()
    session.refresh(row)
    return row


def permissions(session: Session) -> list[Permission]:
    return list(session.exec(select(Permission).order_by(Permission.recorded_at)))
