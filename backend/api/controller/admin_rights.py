"""Admin routes for parties, sources, permissions, accounts and tokens."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from api.auth.bearer import scope
from api.db import SessionDep
from api.model.tables import Account, ApiToken, Party, Permission, Source
from service import Actor, accounts, rights

router = APIRouter(tags=["Admin: rights and accounts"], prefix="/api/admin")

Reader = Annotated[Actor, Depends(scope("read:all"))]
Writer = Annotated[Actor, Depends(scope("write"))]
Reviewer = Annotated[Actor, Depends(scope("review"))]
Admin = Annotated[Actor, Depends(scope("admin"))]


@router.get("/parties/", response_model=list[Party])
def get_parties(session: SessionDep, _: Reader):
    return rights.parties(session)


@router.post("/parties/", response_model=Party)
def post_party(data: rights.PartyIn, session: SessionDep, actor: Writer):
    """The party of this name, added if missing."""
    return rights.party(session, actor, data)


@router.get("/sources/", response_model=list[Source])
def get_sources(session: SessionDep, _: Reader):
    return rights.sources(session)


@router.post("/sources/", response_model=Source)
def post_source(data: rights.SourceIn, session: SessionDep, actor: Writer):
    """The source with this code, added if missing."""
    return rights.source(session, actor, data)


class PermissionOut(BaseModel):
    id: UUID
    source_id: UUID | None
    party_id: UUID | None
    party_role: str | None
    show: bool
    allow_copy: bool = Field(serialization_alias="copy")
    granted_by: UUID | None
    granted_at: str | None
    note: str | None
    evidence: str | None
    recorded_by: UUID
    recorded_at: str
    revoked_at: str | None

    @classmethod
    def of(cls, p: Permission) -> "PermissionOut":
        data = p.model_dump()
        for key in ("granted_at", "recorded_at", "revoked_at"):
            data[key] = data[key].isoformat() if data[key] else None
        return cls(**data)


@router.get("/permissions/", response_model=list[PermissionOut])
def get_permissions(session: SessionDep, _: Reader):
    return [PermissionOut.of(p) for p in rights.permissions(session)]


@router.post("/permissions/", response_model=PermissionOut, status_code=201)
def post_permission(data: rights.PermissionIn, session: SessionDep, actor: Reviewer):
    """Records a permission for a source (code) or a party (name)."""
    return PermissionOut.of(rights.grant(session, actor, data))


@router.post("/permissions/{id}/revoke", response_model=PermissionOut)
def revoke_permission(id: UUID, session: SessionDep, actor: Reviewer):
    return PermissionOut.of(rights.revoke(session, actor, id))


@router.get("/accounts/", response_model=list[Account])
def get_accounts(session: SessionDep, _: Admin):
    return accounts.accounts(session)


@router.post("/accounts/", response_model=Account, status_code=201)
def post_account(data: accounts.AccountIn, session: SessionDep, actor: Admin):
    return accounts.create_account(session, actor, data)


class TokenOut(BaseModel):
    id: UUID
    name: str
    scopes: list[str]
    created_at: str
    last_used_at: str | None = None
    revoked_at: str | None = None

    @classmethod
    def of(cls, t: ApiToken) -> "TokenOut":
        return cls(
            id=t.id,
            name=t.name,
            scopes=t.scopes,
            created_at=t.created_at.isoformat(),
            last_used_at=t.last_used_at.isoformat() if t.last_used_at else None,
            revoked_at=t.revoked_at.isoformat() if t.revoked_at else None,
        )


class NewToken(TokenOut):
    token: str  # shown only once


@router.get("/accounts/{name}/tokens", response_model=list[TokenOut])
def get_tokens(name: str, session: SessionDep, _: Admin):
    account = accounts.find_account(session, name)
    return [TokenOut.of(t) for t in accounts.tokens(session, account.id)]


@router.post("/accounts/{name}/tokens", response_model=NewToken, status_code=201)
def post_token(name: str, data: accounts.TokenIn, session: SessionDep, actor: Admin):
    """A new token; keep it, it is shown only here."""
    account = accounts.find_account(session, name)
    row, token = accounts.create_token(session, actor, account.id, data)
    return NewToken(**TokenOut.of(row).model_dump(), token=token)


@router.post("/tokens/{id}/revoke", response_model=TokenOut)
def revoke_token(id: UUID, session: SessionDep, actor: Admin):
    return TokenOut.of(accounts.revoke_token(session, actor, id))
