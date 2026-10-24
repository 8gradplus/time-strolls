"""Accounts and bearer tokens. API_KEY (config.yml) is the token of the
account 'admin' with every scope; agents and people get their own tokens,
stored as SHA-256 hashes. OAuth (later) maps issuer + subject to an account
and its scope claim to the same scopes."""

import hashlib
import hmac
import secrets
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import Account, ApiToken, now
from service import SCOPES, Actor, Conflict, Invalid, NotFound, audit, require

TOKEN_PREFIX = "ts_"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def authenticate(
    session: Session, token: str, api_key: str, run: dict | None = None
) -> Actor | None:
    """The actor holding this token, or None."""
    if api_key and hmac.compare_digest(token, api_key):
        admin = session.exec(select(Account).where(Account.name == "admin")).one()
        return Actor(admin.id, admin.name, frozenset(SCOPES), run)
    row = session.exec(
        select(ApiToken).where(
            ApiToken.hash == hash_token(token), ApiToken.revoked_at.is_(None)
        )
    ).first()
    if not row:
        return None
    row.last_used_at = now()
    session.add(row)
    session.commit()
    account = session.get(Account, row.account_id)
    return Actor(account.id, account.name, frozenset(row.scopes), run)


class AccountIn(BaseModel):
    name: str
    kind: str = "agent"  # human | agent
    operated_by: str | None = None  # account name, for agents


def create_account(session: Session, actor: Actor, data: AccountIn) -> Account:
    require(actor, "admin")
    if session.exec(select(Account).where(Account.name == data.name)).first():
        raise Conflict(f"an account {data.name!r} exists")
    operator = None
    if data.operated_by:
        operator = find_account(session, data.operated_by).id
    account = Account(name=data.name, kind=data.kind, operated_by=operator)
    session.add(account)
    audit.log(session, actor, "account", "create", account.id, diff=data.model_dump())
    session.commit()
    session.refresh(account)
    return account


def find_account(session: Session, name: str) -> Account:
    account = session.exec(select(Account).where(Account.name == name)).first()
    if not account:
        raise NotFound(f"no account {name!r}")
    return account


def accounts(session: Session) -> list[Account]:
    return list(session.exec(select(Account).order_by(Account.name)))


class TokenIn(BaseModel):
    name: str
    scopes: list[str]


def create_token(
    session: Session, actor: Actor, account_id: UUID, data: TokenIn
) -> tuple[ApiToken, str]:
    """A new token; the token itself is returned only here."""
    require(actor, "admin")
    unknown = set(data.scopes) - set(SCOPES)
    if unknown:
        raise Invalid(f"unknown scopes {sorted(unknown)}; known: {list(SCOPES)}")
    if not session.get(Account, account_id):
        raise NotFound(f"no account {account_id}")
    token = TOKEN_PREFIX + secrets.token_urlsafe(32)
    row = ApiToken(
        account_id=account_id,
        name=data.name,
        hash=hash_token(token),
        scopes=data.scopes,
    )
    session.add(row)
    audit.log(session, actor, "api_token", "create", row.id, diff=data.model_dump())
    session.commit()
    session.refresh(row)
    return row, token


def revoke_token(session: Session, actor: Actor, id: UUID) -> ApiToken:
    require(actor, "admin")
    row = session.get(ApiToken, id)
    if not row:
        raise NotFound(f"no token {id}")
    row.revoked_at = now()
    audit.log(session, actor, "api_token", "revoke", id)
    session.commit()
    session.refresh(row)
    return row


def tokens(session: Session, account_id: UUID) -> list[ApiToken]:
    return list(session.exec(select(ApiToken).where(ApiToken.account_id == account_id)))
