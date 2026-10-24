"""Bearer tokens for the admin routes (and the MCP tools later):
`Authorization: Bearer <token>`, where the token is API_KEY or one from
api_token. Routes ask only for scopes, never for the kind of token, so OAuth
can be added here later without touching them."""

import json

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_403_FORBIDDEN

from api.db import SessionDep
from config import config
from service import Actor
from service.accounts import authenticate

bearer = HTTPBearer(auto_error=False)


def current_actor(
    session: SessionDep,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    x_run: str | None = Header(
        default=None,
        description='For agents: the run, as JSON (e.g. {"model": "...", "session": "..."}), kept in the change log',
    ),
) -> Actor:
    if credentials is None:
        raise HTTPException(
            HTTP_401_UNAUTHORIZED,
            "a bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        run = json.loads(x_run) if x_run else None
    except json.JSONDecodeError:
        run = {"text": x_run}
    actor = authenticate(session, credentials.credentials, config.api.key, run)
    if actor is None:
        raise HTTPException(
            HTTP_401_UNAUTHORIZED,
            "invalid or revoked token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return actor


def scope(name: str):
    """A dependency: the actor, if the token has this scope."""

    def check(actor: Actor = Depends(current_actor)) -> Actor:
        if not actor.can(name):
            raise HTTPException(HTTP_403_FORBIDDEN, f"needs the scope {name!r}")
        return actor

    return check
