"""What agents cost: the MCP tool calls of the admin server, grouped into
runs (ROADMAP, Next session, 4.5). A run is what one X-Run header names;
clients that send none (claude.ai) are split by a pause of RUN_PAUSE."""

import json
from datetime import datetime, timedelta
from uuid import UUID

from sqlmodel import Session, select

from api.model.tables import Account, ToolCall
from service import Actor, require

RUN_PAUSE = timedelta(minutes=15)


def record(
    session: Session,
    account_id: UUID,
    run: dict | None,
    tool: str,
    bytes: int,
    ms: int,
    ok: bool,
):
    session.add(
        ToolCall(account_id=account_id, run=run, tool=tool, bytes=bytes, ms=ms, ok=ok)
    )
    session.commit()


def runs(
    session: Session,
    actor: Actor,
    since: datetime,
    account: str | None = None,
) -> list[dict]:
    """The runs since `since` (of one account, by name), newest first: when,
    who, the X-Run, calls, bytes, seconds and the same per tool."""
    require(actor, "read:all")
    query = (
        select(ToolCall, Account.name)
        .join(Account, Account.id == ToolCall.account_id)
        .where(ToolCall.at >= since)
        .order_by(ToolCall.at)
    )
    if account:
        query = query.where(Account.name == account)
    groups: dict[tuple, list] = {}
    last: dict[tuple, tuple] = {}  # per account and run: (key, time) of the last
    for call, name in session.exec(query):
        label = json.dumps(call.run, sort_keys=True) if call.run else None
        who = (name, label)
        key, at = last.get(who, (None, None))
        if key is None or (label is None and call.at - at > RUN_PAUSE):
            key = (name, label, call.at)
            groups[key] = []
        groups[key].append(call)
        last[who] = (key, call.at)
    return [summary(name, calls) for (name, _, _), calls in reversed(groups.items())]


def summary(account: str, calls: list[ToolCall]) -> dict:
    tools: dict[str, dict] = {}
    for call in calls:
        tool = tools.setdefault(call.tool, {"calls": 0, "bytes": 0, "s": 0.0})
        tool["calls"] += 1
        tool["bytes"] += call.bytes
        tool["s"] += call.ms / 1000
        if not call.ok:
            tool["errors"] = tool.get("errors", 0) + 1
    for tool in tools.values():
        tool["s"] = round(tool["s"], 1)
    return {
        "account": account,
        "run": calls[0].run,
        "from": calls[0].at,
        "to": calls[-1].at,
        "calls": len(calls),
        "bytes": sum(c.bytes for c in calls),
        "s": round(sum(c.ms for c in calls) / 1000, 1),
        "errors": sum(not c.ok for c in calls),
        # the costliest first
        "tools": dict(sorted(tools.items(), key=lambda t: -t[1]["bytes"])),
    }
