"""The change log: who changed what, when (never updated or deleted)."""

from uuid import UUID

from pydantic_core import to_jsonable_python
from sqlmodel import Session, select

from api.model.tables import ChangeLog
from service import Actor


def log(
    session: Session,
    actor: Actor,
    table: str,
    action: str,
    row_id=None,
    resource_id: UUID | None = None,
    diff: dict | None = None,
):
    session.add(
        ChangeLog(
            account_id=actor.account_id,
            resource_id=resource_id,
            table_name=table,
            row_id=None if row_id is None else str(row_id),
            action=action,
            diff=to_jsonable_python(diff or {}),
            run=actor.run,
        )
    )


def history(session: Session, resource_id: UUID) -> list[ChangeLog]:
    return list(
        session.exec(
            select(ChangeLog)
            .where(ChangeLog.resource_id == resource_id)
            .order_by(ChangeLog.id)
        )
    )
