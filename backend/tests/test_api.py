"""The API against a real database (see conftest.py): tokens and scopes,
review, visibility and permissions, harvesting, texts, links, history."""

from pathlib import Path

import pytest
from sqlalchemy import text

TOURS = Path(__file__).parents[2] / "replay" / "tours"

DOCUMENT = {
    "language": "de",
    "retrieved_at": "2026-10-24T18:02:01Z",
    "topothek": "deutsch-reichenau",
    "id": 742582,
    "type": "Bild",
    "title": "Hinterberger Karl und Anna vulgo Jågl-Kårl Oberuresch 3",
    "date": "Bildaufnahme im Jahre 1945",
    "year": 1945,
    "comment": "Karl Hinterberger und Anna.\n\nSiehe auch Bild Nr. [doc 742589]",
    "author": "Bildersammlung Franz Bertlwieser, Aigen-Schlägl",
    "owner": "Franz Bertlwieser",
    "image_url": "https://deutsch-reichenau.topothek.at/data/x/file742582.jpg",
    "source_url": "https://deutsch-reichenau.topothek.at/?doc=742582",
}


def place(client, name="Oberuresch", status="published", **extra):
    body = {"name": name, "lat": 48.609008, "lon": 14.056219, "status": status}
    r = client.post("/api/admin/places/", json=body | extra)
    assert r.status_code == 201, r.text
    return r.json()


def token(admin, scopes, name="agent"):
    admin.post("/api/admin/accounts/", json={"name": name, "operated_by": "admin"})
    r = admin.post(
        f"/api/admin/accounts/{name}/tokens", json={"name": "t", "scopes": scopes}
    )
    assert r.status_code == 201, r.text
    return r.json()["token"]


@pytest.fixture
def harvested(admin, monkeypatch):
    """Harvests DOCUMENT (no network) for a published place."""
    from importers import topothek

    async def document(url):
        return DOCUMENT

    monkeypatch.setattr(topothek, "document", document)
    slug = place(admin)["slug"]
    r = admin.post(
        "/api/admin/media/topothek/",
        json={"url": DOCUMENT["source_url"], "places": [slug], "status": "published"},
    )
    assert r.status_code == 200, r.text
    return slug, r.json()


# Tokens and scopes ---------------------------------------------------------------


def test_admin_routes_need_a_token(client):
    assert client.get("/api/admin/places/").status_code == 401
    client.headers["Authorization"] = "Bearer wrong"
    assert client.get("/api/admin/places/").status_code == 401


def test_a_writer_adds_new_content_but_cannot_publish(admin, client):
    agent = token(admin, ["read:all", "write"])
    headers = {"Authorization": f"Bearer {agent}"}
    body = {"name": "Asang", "lat": 48.6, "lon": 14.0}
    r = client.post("/api/admin/places/", json=body, headers=headers)
    assert r.json()["status"] == "new"
    r = client.post(
        "/api/admin/places/",
        json=body | {"name": "B", "status": "published"},
        headers=headers,
    )
    assert r.status_code == 403
    id = client.get("/api/admin/places/asang-n48-600-e14-000", headers=headers).json()[
        "id"
    ]
    r = client.put(
        f"/api/admin/resources/{id}/status",
        json={"status": "published"},
        headers=headers,
    )
    assert r.status_code == 403


def test_revoked_tokens_stop_working(admin, client):
    agent = token(admin, ["read:all"])
    headers = {"Authorization": f"Bearer {agent}"}
    assert client.get("/api/admin/places/", headers=headers).status_code == 200
    (row,) = admin.get("/api/admin/accounts/agent/tokens").json()
    admin.post(f"/api/admin/tokens/{row['id']}/revoke")
    assert client.get("/api/admin/places/", headers=headers).status_code == 401


def test_only_admins_manage_accounts(admin, client):
    agent = token(admin, ["read:all", "write", "review"])
    r = client.get("/api/admin/accounts/", headers={"Authorization": f"Bearer {agent}"})
    assert r.status_code == 403


# Places and review -------------------------------------------------------------------


def test_new_places_are_not_public_until_published(admin):
    new = place(admin, "Asang", status=None)
    assert new["slug"] == "asang-n48-609-e14-056"
    assert admin.get("/api/locations/").json() == []
    assert admin.get(f"/api/locations/{new['slug']}").status_code == 404
    review = admin.get("/api/admin/resources/", params={"status": "new"}).json()
    assert [r["label"] for r in review] == ["Asang"]
    admin.put(f"/api/admin/resources/{new['id']}/status", json={"status": "published"})
    (public,) = admin.get("/api/locations/").json()
    assert public["name"] == "Asang" and public["lat"] == pytest.approx(48.609008)


def test_muted_places_disappear(admin):
    p = place(admin)
    admin.put(
        f"/api/admin/resources/{p['id']}/status",
        json={"status": "muted", "reason": "duplicate"},
    )
    assert admin.get("/api/locations/").json() == []
    assert (
        admin.get(f"/api/admin/places/{p['slug']}").json()["status_reason"]
        == "duplicate"
    )


def test_slug_stays_when_the_place_moves(admin):
    p = place(admin)
    r = admin.patch(
        f"/api/admin/places/{p['slug']}", json={"lat": 48.7, "kind": "hamlet"}
    )
    assert r.json()["slug"] == p["slug"] and r.json()["lat"] == pytest.approx(48.7)


def test_names_in_other_languages(admin):
    p = place(admin, names={"cs": "Horní Ureš"})
    assert (
        admin.get(f"/api/locations/{p['slug']}", params={"lang": "cs"}).json()["place"][
            "name"
        ]
        == "Horní Ureš"
    )
    assert (
        admin.get(f"/api/locations/{p['slug']}", params={"lang": "en"}).json()["place"][
            "name"
        ]
        == "Oberuresch"
    )


def test_unknown_kind_and_duplicate_slug(admin):
    assert (
        admin.post(
            "/api/admin/places/",
            json={"name": "X", "lat": 1, "lon": 1, "kind": "castle"},
        ).status_code
        == 422
    )
    place(admin)
    r = admin.post(
        "/api/admin/places/",
        json={"name": "Oberuresch", "lat": 48.609008, "lon": 14.056219},
    )
    assert r.status_code == 409


def test_a_place_like_an_existing_one_needs_force(admin):
    place(admin, "Sankt Thoma")
    body = {"name": "St. Thoma", "lat": 48.6093, "lon": 14.056219}
    r = admin.post("/api/admin/places/", json=body)
    assert r.status_code == 409
    assert "Sankt Thoma" in r.json()["detail"]
    r = admin.post("/api/admin/places/", json=body | {"force": True})
    assert r.status_code == 201, r.text


# Media and permissions -----------------------------------------------------------------


def podcast(admin, slug, **extra):
    body = {
        "kind": "audio",
        "url": "https://audio.example/episode.mp3",
        "title": "GAG83",
        "rights_holder": "Geschichten aus der Geschichte",
        "places": [slug],
        "status": "published",
    }
    r = admin.post("/api/admin/media/", json=body | extra)
    assert r.status_code == 201, r.text
    return r.json()


def test_media_from_others_need_a_permission(admin):
    slug = place(admin)["slug"]
    podcast(admin, slug)
    assert admin.get(f"/api/locations/{slug}").json()["podcasts"] == []
    r = admin.post(
        "/api/admin/permissions/",
        json={
            "party": "Geschichten aus der Geschichte",
            "party_role": "owner",
            "show": True,
        },
    )
    assert r.status_code == 201 and r.json()["copy"] is False
    location = admin.get(f"/api/locations/{slug}").json()
    assert location["podcast"]["title"] == "GAG83"
    assert location["podcast"]["owner"] == "Geschichten aus der Geschichte"
    admin.post(f"/api/admin/permissions/{r.json()['id']}/revoke")
    assert admin.get(f"/api/locations/{slug}").json()["podcasts"] == []


def test_own_media_need_no_permission(admin):
    slug = place(admin)["slug"]
    podcast(admin, slug, rights_holder=None)
    assert len(admin.get(f"/api/locations/{slug}").json()["podcasts"]) == 1


def test_harvested_topothek_documents_need_the_source_permission(admin, harvested):
    slug, result = harvested
    assert result["created"] and result["media"]["source_url"] == DOCUMENT["source_url"]
    assert admin.get(f"/api/locations/{slug}").json()["images"] == []
    admin.post(
        "/api/admin/permissions/",
        json={"source": "topothek:deutsch-reichenau", "show": True, "note": "by mail"},
    )
    (image,) = admin.get(f"/api/locations/{slug}").json()["images"]
    assert image["url"] == DOCUMENT["image_url"]
    assert image["year"] == 1945 and image["owner"] == "Franz Bertlwieser"
    assert image["lang"] == "de" and image["method"] is None
    assert image["description"].startswith("Karl Hinterberger")


def test_harvesting_again_adds_nothing(admin, harvested):
    slug, first = harvested
    r = admin.post(
        "/api/admin/media/topothek/",
        json={"url": DOCUMENT["source_url"], "places": [slug]},
    )
    assert r.json()["created"] is False
    assert r.json()["media"]["id"] == first["media"]["id"]
    assert len(admin.get("/api/admin/media/").json()) == 1


def test_bad_topothek_links(admin):
    r = admin.post(
        "/api/admin/media/topothek/",
        json={"url": "https://deutsch-reichenau.topothek.at/"},
    )
    assert r.status_code == 422


def test_machine_translations_are_marked(admin, harvested):
    slug, result = harvested
    admin.post("/api/admin/permissions/", json={"source": "topothek:deutsch-reichenau"})
    id = result["media"]["id"]
    r = admin.put(
        f"/api/admin/resources/{id}/texts/title/en",
        json={
            "body": "Karl and Anna",
            "method": "machine",
            "translated_from": "de",
            "model": "claude",
        },
    )
    assert r.status_code == 200, r.text
    (image,) = admin.get(f"/api/locations/{slug}", params={"lang": "en"}).json()[
        "images"
    ]
    assert image["title"] == "Karl and Anna"
    assert image["lang"] == "en" and image["method"] == "machine"
    assert r.json()["source_record_id"] is not None  # follows its original


def test_translations_need_their_original(admin):
    p = place(admin)
    r = admin.put(
        f"/api/admin/resources/{p['id']}/texts/description/en",
        json={"body": "x", "method": "machine", "translated_from": "de"},
    )
    assert r.status_code == 422


# Links, tours, history, the database rules ----------------------------------------------


def test_links_check_their_types(admin):
    village, chapel = (
        place(admin)["slug"],
        place(admin, "Waldkapelle", kind="chapel")["slug"],
    )
    r = admin.post(
        "/api/admin/relations/",
        json={"subject": chapel, "predicate": "part_of", "object": village},
    )
    assert r.status_code == 201
    again = admin.post(
        "/api/admin/relations/",
        json={"subject": chapel, "predicate": "part_of", "object": village},
    )
    assert again.json()["id"] == r.json()["id"]
    bad = admin.post(
        "/api/admin/relations/",
        json={"subject": chapel, "predicate": "shows", "object": village},
    )
    assert bad.status_code == 422
    assert admin.delete(f"/api/admin/relations/{r.json()['id']}").status_code == 204


def test_tours(admin):
    with open(TOURS / "schwemmkanalweg.gpx", "rb") as gpx:
        r = admin.post(
            "/api/admin/tours/upload/",
            data={
                "name": "Schwemmkanalweg",
                "description": "Grosse Runde",
                "status": "published",
            },
            files={"file": ("schwemmkanalweg.gpx", gpx, "application/gpx+xml")},
        )
    assert r.status_code == 201, r.text
    (tour,) = admin.get("/api/tours/").json()
    assert tour["slug"] == "schwemmkanalweg" and tour["length"] > 1
    detail = admin.get("/api/tours/schwemmkanalweg").json()
    assert detail["description"] == "Grosse Runde" and len(detail["geom"][0]) == 3
    assert admin.get(f"/api/tours/{tour['id']}").status_code == 200


def test_history_names_the_account_and_run(admin, client):
    agent = token(admin, ["read:all", "write"])
    client.headers.update(
        {"Authorization": f"Bearer {agent}", "X-Run": '{"model": "claude"}'}
    )
    p = client.post(
        "/api/admin/places/", json={"name": "Asang", "lat": 48.6, "lon": 14.0}
    ).json()
    history = admin.get(f"/api/admin/resources/{p['id']}/history").json()
    assert {h["action"] for h in history} >= {"create"}
    assert all(h["run"] == {"model": "claude"} for h in history)


def test_the_app_user_cannot_delete_content(admin):
    from api.db import engine

    place(admin)
    with engine.connect() as connection:
        with pytest.raises(Exception, match="permission denied"):
            connection.execute(text("DELETE FROM timestrolls.resource"))


def test_credits_name_permitted_sources_and_translations(admin, harvested):
    slug, result = harvested
    admin.post("/api/admin/permissions/", json={"source": "topothek:deutsch-reichenau"})
    # a permission for a party with nothing on the map credits nobody
    admin.post(
        "/api/admin/permissions/", json={"party": "Geschichten aus der Geschichte"}
    )
    admin.put(
        f"/api/admin/resources/{result['media']['id']}/texts/title/cs",
        json={
            "body": "Karel",
            "method": "machine",
            "translated_from": "de",
            "model": "claude",
        },
    )
    credits = admin.get("/api/credits/").json()
    assert credits["sources"] == [
        {
            "name": "Topothek Deutsch Reichenau",
            "url": "https://deutsch-reichenau.topothek.at/",
        }
    ]
    assert credits["owners"] == []
    assert credits["translations"] == [
        {"lang": "cs", "method": "machine", "model": "claude", "by": None}
    ]
