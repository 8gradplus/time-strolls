"""Signing in (ROADMAP.md, step 5): the OAuth server's metadata and client
registration as MCP clients see them, a Google identity becoming an invited
account, the cache of Google's answers, and no login locally. Google itself
is never called: its verifier is replaced."""

import asyncio

import pytest
from sqlalchemy import text

HOST = "https://timestrolls.debtray.com"
GOOGLE_TOKEN = "google-access-token"


@pytest.fixture
def google(admin, monkeypatch):
    """Our OAuth server answers for GOOGLE_TOKEN as if Google had signed in
    the person whose claims are in the returned dict."""
    from fastmcp.server.auth import AccessToken

    from api.auth.oauth import auth

    claims = {"sub": "g-1", "email": "anna@example.org", "email_verified": "true"}

    async def verify(token):
        if token != GOOGLE_TOKEN:
            return None
        return AccessToken(token=token, client_id="c", scopes=[], claims=claims)

    monkeypatch.setattr(auth.server, "verify_token", verify)
    return claims


def me(client, token=GOOGLE_TOKEN):
    return client.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})


def test_the_metadata_points_to_our_oauth_server(client):
    for path in (
        "/.well-known/oauth-protected-resource/api/mcp/admin",
        "/.well-known/oauth-protected-resource/api/mcp/admin/",
    ):
        r = client.get(path)
        assert r.status_code == 200, path
        assert r.json()["resource"] == f"{HOST}/api/mcp/admin/"
        assert r.json()["authorization_servers"] == [f"{HOST}/api"]
    server = client.get("/.well-known/oauth-authorization-server/api").json()
    assert server["authorization_endpoint"] == f"{HOST}/api/authorize"
    assert server["registration_endpoint"] == f"{HOST}/api/register"


def test_the_admin_mcp_asks_for_a_login(client):
    r = client.post(
        "/api/mcp/admin/",
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
        headers={"Accept": "application/json, text/event-stream"},
    )
    assert r.status_code == 401
    assert "oauth-protected-resource/api/mcp/admin" in r.headers["www-authenticate"]


def test_clients_register_in_our_database(client):
    """Dynamic client registration (claude.ai, ChatGPT) stores the client in
    oauth_store, as the restricted app user."""
    r = client.post(
        "/api/register",
        json={
            "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
            "client_name": "claude",
            "token_endpoint_auth_method": "none",
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
        },
    )
    assert r.status_code == 201, r.text
    from tests.conftest import DB, admin_connection

    connection, _ = admin_connection(DB)
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM timestrolls.oauth_store")
        assert cursor.fetchone()[0] >= 1
    connection.close()


def test_an_invited_person_signs_in_with_google(admin, client, google):
    admin.post("/api/admin/invites/", json={"email": "Anna@example.org"})
    del client.headers["Authorization"]  # admin and client are one client
    r = me(client)
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "anna@example.org"
    assert r.json()["roles"] == ["editor"]
    assert "write" in r.json()["scopes"] and "admin" not in r.json()["scopes"]
    # the Google identity is linked to the account
    from api.db import engine

    with engine.connect() as connection:
        rows = connection.execute(
            text("SELECT issuer, subject FROM timestrolls.account_identity")
        ).all()
    assert [tuple(r) for r in rows] == [("https://accounts.google.com", "g-1")]


def test_people_without_an_invitation_are_refused(admin, client, google):
    del client.headers["Authorization"]
    assert me(client).status_code == 401
    assert me(client, "something-else").status_code == 401


def test_bearer_tokens_still_work(admin):
    r = admin.get("/api/admin/me")
    assert r.status_code == 200
    assert r.json()["name"] == "admin" and "admin" in r.json()["scopes"]


def test_without_a_token_the_admin_routes_answer_401(client):
    assert client.get("/api/admin/me").status_code == 401


def test_locally_nobody_logs_in(client, monkeypatch):
    from config import config

    monkeypatch.setattr(config.auth, "mode", "local")
    r = client.get("/api/admin/me")
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "admin"
    assert client.get("/api/admin/accounts/").status_code == 200


def test_googles_answer_is_cached():
    import time

    from fastmcp.server.auth import AccessToken, TokenVerifier

    from api.auth.oauth import Cached

    class Counting(TokenVerifier):
        calls = 0

        async def verify_token(self, token):
            Counting.calls += 1
            if token == "bad":
                return None
            soon = int(time.time()) - 1 if token == "expired" else None
            return AccessToken(token=token, client_id="c", scopes=[], expires_at=soon)

    cached = Cached(Counting(), ttl=600)

    async def go():
        for _ in range(3):
            assert await cached.verify_token("good")
        assert Counting.calls == 1
        for _ in range(2):  # a refusal is asked again
            assert await cached.verify_token("bad") is None
        assert Counting.calls == 3
        for _ in range(2):  # never past the token's expiry
            await cached.verify_token("expired")
        assert Counting.calls == 5

    asyncio.run(go())


def test_google_needs_its_keys():
    from pydantic import ValidationError

    from config.validate import Auth

    assert not Auth(mode="oauth").google
    assert not Auth(mode="local", google_client_id="x").google
    with pytest.raises(ValidationError):
        Auth(mode="oauth", google_client_id="x")
    assert Auth(google_client_id="x", google_client_secret="y", jwt_key="z").google


def test_the_oauth_routes_hide_no_other_route(client):
    """v0.5.0 mounted the OAuth server at /api, which answered /api/ready
    (the health check) with 404 and took production down."""
    assert client.get("/api/ready").status_code == 200
    assert client.get("/api/locations/").status_code == 200
    r = client.get("/api/no-such-route")
    assert r.status_code == 404 and r.json() == {"detail": "Not Found"}
    assert client.get("/api/authorize").status_code == 400  # ours, no params
