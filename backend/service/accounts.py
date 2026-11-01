"""Accounts and bearer tokens. API_KEY (config.yml) is the token of the
account 'admin' with every scope; agents and people get their own tokens,
stored as SHA-256 hashes. People sign in by invitation (`invite`, `login`):
issuer + subject map to an account, and its roles to the same scopes."""

import hashlib
import hmac
import secrets
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Session, select

from api.model.tables import (
    Account,
    AccountIdentity,
    AccountRole,
    ApiToken,
    Place,
    now,
)
from service import (
    SCOPES,
    Actor,
    Conflict,
    Forbidden,
    Invalid,
    NotFound,
    audit,
    require,
)

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


# Roles and sign-in by invitation ----------------------------------------------

# What a role may do, in the scopes the routes and tools ask for. Finer roles
# (a reviewer apart from editors, ...) only add rows here and to the CHECK in
# the migration.
ROLES = {
    "editor": frozenset({"scrape", "read:all", "write", "review"}),
    "admin": frozenset(SCOPES),
}


def normal_email(email: str) -> str:
    email = email.strip().lower()
    if "@" not in email:
        raise Invalid(f"not an email address: {email!r}")
    return email


class InviteIn(BaseModel):
    email: str
    role: str = "editor"
    name: str | None = None  # the account's name; the email by default


class RoleIn(BaseModel):
    role: str
    area: UUID | None = None  # a place; stored, not enforced yet


def _check_role(role: str):
    if role not in ROLES:
        raise Invalid(f"unknown role {role!r}; known: {list(ROLES)}")


def active_roles(session: Session, account_id: UUID) -> list[AccountRole]:
    return list(
        session.exec(
            select(AccountRole)
            .where(AccountRole.account_id == account_id)
            .where(AccountRole.revoked_at.is_(None))
            .order_by(AccountRole.created_at)
        )
    )


def roles(session: Session, account_id: UUID) -> list[AccountRole]:
    """All roles of an account, also the revoked ones."""
    return list(
        session.exec(
            select(AccountRole)
            .where(AccountRole.account_id == account_id)
            .order_by(AccountRole.created_at)
        )
    )


def scopes_of(roles: list[AccountRole]) -> frozenset[str]:
    return frozenset().union(*(ROLES[r.role] for r in roles))


def grant_role(
    session: Session, actor: Actor, account_id: UUID, data: RoleIn
) -> AccountRole:
    require(actor, "admin")
    _check_role(data.role)
    if not session.get(Account, account_id):
        raise NotFound(f"no account {account_id}")
    if data.area and not session.get(Place, data.area):
        raise Invalid(f"the area must be a place, {data.area} is none")
    for row in active_roles(session, account_id):
        if row.role == data.role and row.area == data.area:
            raise Conflict(f"the account has the role {data.role!r}")
    row = AccountRole(
        account_id=account_id, role=data.role, area=data.area, granted_by=actor.account_id
    )
    session.add(row)
    audit.log(
        session, actor, "account_role", "grant", row.id, diff=data.model_dump(mode="json")
    )
    session.commit()
    session.refresh(row)
    return row


def revoke_role(session: Session, actor: Actor, id: UUID) -> AccountRole:
    require(actor, "admin")
    row = session.get(AccountRole, id)
    if not row:
        raise NotFound(f"no role {id}")
    if row.revoked_at is None:
        row.revoked_at = now()
        audit.log(session, actor, "account_role", "revoke", id)
        session.commit()
        session.refresh(row)
    return row


def invite(session: Session, actor: Actor, data: InviteIn) -> Account:
    """An account for a person, signed in later with this email (Google);
    an existing account with the address gets the role."""
    require(actor, "admin")
    _check_role(data.role)
    email = normal_email(data.email)
    account = session.exec(select(Account).where(Account.email == email)).first()
    if account is None:
        name = data.name or email
        if session.exec(select(Account).where(Account.name == name)).first():
            raise Conflict(f"an account {name!r} exists")
        account = Account(kind="human", name=name, email=email)
        session.add(account)
        audit.log(
            session, actor, "account", "invite", account.id,
            diff={"name": name, "email": email},
        )
        session.flush()
    if not any(r.role == data.role for r in active_roles(session, account.id)):
        grant_role(session, actor, account.id, RoleIn(role=data.role))
    session.commit()
    session.refresh(account)
    return account


class NotInvited(Forbidden):
    pass


def login(
    session: Session,
    issuer: str,
    subject: str,
    email: str | None,
    email_verified: bool,
    run: dict | None = None,
) -> Actor:
    """The actor behind a login from an identity provider. The first login
    links the identity to the account invited with this (verified) email;
    without an invitation, or without an active role, it is refused."""
    identity = session.get(AccountIdentity, (issuer, subject))
    if identity is None:
        account = None
        if email and email_verified:
            account = session.exec(
                select(Account).where(Account.email == email.strip().lower())
            ).first()
        if account is None:
            raise NotInvited(f"{email or subject} is not invited")
        identity = AccountIdentity(issuer=issuer, subject=subject, account_id=account.id)
        session.add(identity)
        audit.log(
            session,
            Actor(account.id, account.name),
            "account_identity",
            "link",
            account.id,
            diff={"issuer": issuer, "subject": subject},
        )
        session.commit()
    else:
        account = session.get(Account, identity.account_id)
    scopes = scopes_of(active_roles(session, account.id))
    if not scopes:
        raise NotInvited(f"{account.name} has no role")
    return Actor(account.id, account.name, scopes, run)
