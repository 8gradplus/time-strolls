"""Sign-in by invitation (ROADMAP.md, step 5): invitations, roles and the
login of a person from an identity provider, against a real database."""

import pytest

GOOGLE = "https://accounts.google.com"


@pytest.fixture
def session(admin):
    from sqlmodel import Session

    from api.db import engine

    with Session(engine) as session:
        yield session


def login(session, subject="g-1", email="anna@example.org", verified=True):
    from service import accounts

    return accounts.login(session, GOOGLE, subject, email, verified)


def invite(admin, email="Anna@Example.org", role="editor", **extra):
    r = admin.post("/api/admin/invites/", json={"email": email, "role": role} | extra)
    assert r.status_code == 201, r.text
    return r.json()


def test_an_invited_person_signs_in_with_the_editor_scopes(admin, session):
    account = invite(admin)
    assert account["email"] == "anna@example.org"
    assert account["name"] == "anna@example.org"
    actor = login(session)
    assert str(actor.account_id) == account["id"]
    assert actor.scopes == {"scrape", "read:all", "write", "review"}
    assert not actor.can("admin")


def test_the_identity_is_kept_after_the_first_login(admin, session):
    invite(admin)
    first = login(session)
    # the same Google account, its address changed since
    assert login(session, email="anna@new.example").account_id == first.account_id


def test_people_without_an_invitation_are_refused(admin, session):
    from service.accounts import NotInvited

    invite(admin)
    with pytest.raises(NotInvited):
        login(session, subject="g-2", email="eve@example.org")
    with pytest.raises(NotInvited):  # the address must be verified
        login(session, subject="g-3", verified=False)
    with pytest.raises(NotInvited):
        login(session, subject="g-4", email=None)


def test_a_revoked_role_stops_the_login(admin, session):
    from service.accounts import NotInvited

    invite(admin)
    login(session)
    (role,) = admin.get("/api/admin/accounts/anna@example.org/roles").json()
    r = admin.post(f"/api/admin/roles/{role['id']}/revoke")
    assert r.status_code == 200 and r.json()["revoked_at"]
    with pytest.raises(NotInvited):
        login(session)
    # granted again, it works again
    r = admin.post("/api/admin/accounts/anna@example.org/roles", json={"role": "editor"})
    assert r.status_code == 201, r.text
    assert login(session).can("write")
    assert len(admin.get("/api/admin/accounts/anna@example.org/roles").json()) == 2


def test_an_admin_has_every_scope(admin, session):
    invite(admin, role="admin", name="Anna")
    assert login(session).can("admin")


def test_inviting_again_adds_a_role_not_an_account(admin):
    first = invite(admin)
    again = invite(admin, email="anna@example.org", role="admin")
    assert again["id"] == first["id"]
    roles = admin.get("/api/admin/accounts/anna@example.org/roles").json()
    assert sorted(r["role"] for r in roles) == ["admin", "editor"]
    # the same role twice is not an error for an invitation
    invite(admin, email="anna@example.org")


def test_roles_are_checked(admin):
    invite(admin)
    url = "/api/admin/accounts/anna@example.org/roles"
    assert admin.post(url, json={"role": "editor"}).status_code == 409
    assert admin.post(url, json={"role": "owner"}).status_code == 422
    assert admin.post("/api/admin/invites/", json={"email": "x"}).status_code == 422
    # an area must be a place
    area = {"role": "admin", "area": "01900000-0000-7000-8000-000000000000"}
    assert admin.post(url, json=area).status_code == 422


def test_an_area_is_stored(admin):
    from tests.test_api import place

    invite(admin)
    village = place(admin)["id"]
    r = admin.post(
        "/api/admin/accounts/anna@example.org/roles",
        json={"role": "admin", "area": village},
    )
    assert r.status_code == 201, r.text
    assert r.json()["area"] == village


def test_only_admins_invite(admin, client):
    from tests.test_api import token

    editor = token(admin, ["read:all", "write", "review", "scrape"])
    headers = {"Authorization": f"Bearer {editor}"}
    r = client.post("/api/admin/invites/", json={"email": "a@b.c"}, headers=headers)
    assert r.status_code == 403


def test_invitations_and_roles_are_in_the_change_log(admin, session):
    from sqlalchemy import text

    invite(admin)
    login(session)
    rows = session.exec(
        text("SELECT table_name, action FROM timestrolls.change_log ORDER BY id")
    ).all()
    assert [tuple(r) for r in rows] == [
        ("account", "invite"),
        ("account_role", "grant"),
        ("account_identity", "link"),
    ]
