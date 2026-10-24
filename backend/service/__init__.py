"""The service layer: every read and write of content, used by the REST
controllers (api/controller/) and later the MCP tools alike. Functions take
a session and, for writes, the Actor; writes commit and go to the change log.
"""

from dataclasses import dataclass, field
from uuid import UUID

# read: published data; read:all: also new and muted; write: create drafts,
# harvest; review: publish, mute, links, permissions; scrape: the scraper
# tools; admin: everything, also accounts and tokens
SCOPES = ("read", "read:all", "write", "review", "scrape", "admin")
STATUSES = ("new", "published", "muted", "withdrawn")


@dataclass(frozen=True)
class Actor:
    """Who is writing: an account with its scopes, and for agents the run
    (model, session, ...) that goes into the change log."""

    account_id: UUID
    name: str
    scopes: frozenset[str] = field(default_factory=frozenset)
    run: dict | None = None

    def can(self, scope: str) -> bool:
        return scope in self.scopes or "admin" in self.scopes


class ServiceError(Exception):
    """Base of the errors the API maps to status codes (api/main.py)."""


class NotFound(ServiceError):
    pass


class Conflict(ServiceError):
    pass


class Invalid(ServiceError):
    pass


class Forbidden(ServiceError):
    pass


def require(actor: Actor, scope: str):
    if not actor.can(scope):
        raise Forbidden(f"needs the scope {scope!r}")


def initial_status(actor: Actor, status: str | None) -> str:
    """New content is 'new'; another status needs the review scope (the
    replay publishes what it adds, an agent's harvest waits for review)."""
    if status in (None, "new"):
        return "new"
    if status not in STATUSES:
        raise Invalid(f"unknown status {status!r}")
    require(actor, "review")
    return status
