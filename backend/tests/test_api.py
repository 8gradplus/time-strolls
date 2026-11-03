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


def test_a_village_lists_its_houses_and_chapels(admin):
    village = place(admin)
    houses = [
        place(
            admin,
            f"Oberuresch {number}",
            kind="house",
            lat=48.6081 + i / 1000,
            attributes=attributes | {"number": number},
        )
        for i, (number, attributes) in enumerate(
            [
                ("12", {"address": "Wüstung", "former_number": "78, 155"}),
                ("3", {"address": "verfallen", "house_name": "Jogl"}),
                ("4", {"address": "Pasečná 111"}),
            ]
        )
    ]
    chapel = place(
        admin, "kaple", kind="chapel", attributes={"state": "Zaniklé"}, force=True
    )
    for child in houses + [chapel]:
        admin.post(
            "/api/admin/relations/",
            json={
                "subject": child["slug"],
                "predicate": "part_of",
                "object": village["slug"],
            },
        )

    listed = {p["name"]: p for p in admin.get("/api/locations/").json()}
    assert listed["Oberuresch 3"]["part_of"] == village["id"]
    assert listed["Oberuresch 3"]["house_name"] == "Jogl"
    assert listed["Oberuresch 3"]["address"] == "verfallen"
    assert listed["Oberuresch 12"]["former_number"] == "78, 155"
    assert listed["Oberuresch 4"]["address"] == "Pasečná 111"
    assert listed["kaple"]["state"] == "Zaniklé"
    assert listed["Oberuresch"]["part_of"] is None

    detail = admin.get(f"/api/locations/{village['slug']}").json()
    assert [c["name"] for c in detail["children"]] == [
        "kaple",
        "Oberuresch 3",
        "Oberuresch 4",
        "Oberuresch 12",
    ]
    house = admin.get(f"/api/locations/{houses[1]['slug']}").json()
    assert house["parent"]["name"] == "Oberuresch" and house["children"] == []

    admin.put(
        f"/api/admin/resources/{houses[1]['id']}/status",
        json={"status": "muted", "reason": "test"},
    )
    detail = admin.get(f"/api/locations/{village['slug']}").json()
    assert "Oberuresch 3" not in [c["name"] for c in detail["children"]]


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
    assert result["title"] == DOCUMENT["title"]
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


def test_language_codes_are_normalised(admin):
    p = place(admin)
    r = admin.put(
        f"/api/admin/resources/{p['id']}/texts/description/DEU", json={"body": "Hof"}
    )
    assert r.json()["lang"] == "de"
    r = admin.put(
        f"/api/admin/resources/{p['id']}/texts/description/EN",
        json={"body": "Farm", "method": "machine", "translated_from": "german"},
    )
    assert r.status_code == 200, r.text
    assert (r.json()["lang"], r.json()["translated_from"]) == ("en", "de")
    r = admin.put(
        f"/api/admin/resources/{p['id']}/texts/description/x y", json={"body": "?"}
    )
    assert r.status_code == 422


def test_a_source_text_is_edited_not_replaced(admin, client, harvested):
    """Cleaning up a caption: an edit marked as such, never inside a
    translation, and only by a reviewer once the photo is published."""
    slug, result = harvested
    id = result["media"]["id"]
    admin.post("/api/admin/permissions/", json={"source": "topothek:deutsch-reichenau"})
    url = f"/api/admin/resources/{id}/texts/description"
    # neither a replacement nor a translation over the original
    assert admin.put(f"{url}/de", json={"body": "Karl."}).status_code == 409
    r = admin.put(
        f"{url}/de",
        json={"body": "Karl.", "method": "machine", "translated_from": "de"},
    )
    assert r.status_code == 409
    admin.put(
        f"{url}/en",
        json={
            "body": "Karl and Anna. See also",
            "method": "machine",
            "translated_from": "de",
        },
    )
    edit = {"body": "Karl Hinterberger und Anna.", "note": "removed a reference"}
    writer = {"Authorization": f"Bearer {token(admin, ['write'])}"}
    assert client.patch(f"{url}/de", json=edit, headers=writer).status_code == 403
    assert admin.patch(f"{url}/de", json=edit | {"note": ""}).status_code == 422
    r = admin.patch(f"{url}/de", json=edit)
    assert r.status_code == 200, r.text
    assert r.json()["edited_by"] and r.json()["method"] == "original"

    (image,) = admin.get(f"/api/locations/{slug}").json()["images"]
    assert image["description"] == edit["body"] and image["edited"] is True
    (image,) = admin.get(f"/api/locations/{slug}", params={"lang": "en"}).json()[
        "images"
    ]
    assert image["edited"] is True  # translated from an edited original

    # harvesting again keeps the edit; the verbatim text is in the history
    admin.post("/api/admin/media/topothek/", json={"url": DOCUMENT["source_url"]})
    (image,) = admin.get(f"/api/locations/{slug}").json()["images"]
    assert image["description"] == edit["body"]
    (change,) = [
        c
        for c in admin.get(f"/api/admin/resources/{id}/history").json()
        if c["action"] == "edit"
    ]
    assert change["diff"]["from"] == DOCUMENT["comment"]
    # a second edit and a move: the verbatim stays the source's wording
    admin.patch(f"{url}/de", json=edit | {"body": "Karl und Anna.", "note": "short"})
    admin.post(
        f"/api/admin/resources/{id}/texts/lang",
        json={"from_lang": "de", "to_lang": "de-AT", "field": "description"},
    )
    detail = admin.get(f"/api/admin/resources/{id}").json()
    assert detail["verbatim"] == {"description/de-AT": DOCUMENT["comment"]}


def test_a_wrong_language_is_moved(admin, harvested):
    slug, result = harvested
    id = result["media"]["id"]
    admin.put(
        f"/api/admin/resources/{id}/texts/title/en",
        json={"body": "Karl", "method": "machine", "translated_from": "de"},
    )
    url = f"/api/admin/resources/{id}/texts/lang"
    r = admin.post(url, json={"from_lang": "de", "to_lang": "en"})
    assert r.status_code == 409  # the title has an English text already
    r = admin.post(url, json={"from_lang": "deu", "to_lang": "cz"})
    assert r.status_code == 200, r.text
    assert sorted(r.json()) == ["description", "title"]
    texts = admin.get(f"/api/admin/resources/{id}").json()["texts"]
    langs = {(t["field"], t["lang"], t["translated_from"]) for t in texts}
    assert langs == {
        ("title", "cs", None),
        ("description", "cs", None),
        ("title", "en", "cs"),
    }


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


# The review list and several statuses at once (the admin UI) ----------------------


def test_the_review_list_shows_what_a_row_needs(admin, harvested):
    slug, _ = harvested
    village = admin.get(f"/api/admin/places/{slug}").json()
    house = place(
        admin, "Oberuresch 3", status="new", kind="house", lat=48.6091, lon=14.0563
    )
    admin.post(
        "/api/admin/relations/",
        json={"subject": house["id"], "predicate": "part_of", "object": village["id"]},
    )
    places = admin.get("/api/admin/review/", params={"type": "place"}).json()
    assert places["total"] == 1
    (row,) = places["items"]
    assert row["label"] == "Oberuresch 3" and row["kind"] == "house"
    assert row["places"] == ["Oberuresch"] and row["created_by"] == "admin"
    assert row["slug"] == house["slug"]
    # the village is published, so it is in the published list, not the queue
    published = admin.get(
        "/api/admin/review/", params={"type": "place", "status": "published"}
    ).json()
    assert [r["label"] for r in published["items"]] == ["Oberuresch"]
    # kinds filter
    villages = admin.get(
        "/api/admin/review/", params={"type": "place", "kind": "village"}
    ).json()
    assert villages["total"] == 0


def test_the_review_list_shows_a_photo_with_its_title_and_source(admin, harvested):
    _, harvest = harvested
    media = admin.get(
        "/api/admin/review/", params={"type": "media", "status": "published"}
    ).json()
    (row,) = media["items"]
    assert row["label"].startswith("Hinterberger Karl")
    assert row["url"] == DOCUMENT["image_url"]
    assert row["source_url"] == DOCUMENT["source_url"]
    assert row["places"] == ["Oberuresch"]
    assert row["may_show"] is False  # no permission yet


def test_a_photo_shows_several_places_that_can_change(admin, harvested):
    village, harvest = harvested
    id = harvest["media"]["id"]
    house = place(admin, "Oberuresch 3", kind="house", lat=48.6092)
    admin.post(
        "/api/admin/relations/",
        json={"subject": house["slug"], "predicate": "part_of", "object": village},
    )
    added = admin.post(
        "/api/admin/relations/",
        json={"subject": id, "predicate": "shows", "object": house["id"]},
    )
    assert added.status_code == 201
    shows = admin.get(f"/api/admin/resources/{id}").json()["shows"]
    assert [(s["name"], s["kind"], s["part_of_name"]) for s in shows] == [
        ("Oberuresch", "village", None),
        ("Oberuresch 3", "house", "Oberuresch"),
    ]
    first = shows[0]["relation_id"]
    assert admin.delete(f"/api/admin/relations/{first}").status_code == 204
    (left,) = admin.get(f"/api/admin/resources/{id}").json()["shows"]
    assert left["slug"] == house["slug"]


def test_a_photo_says_which_permission_covers_it(admin, harvested):
    _, harvest = harvested
    id = harvest["media"]["id"]
    rights = admin.get(f"/api/admin/resources/{id}").json()["rights"]
    assert rights == {
        "own": False,
        "sources": [rights["sources"][0]],
        "creator": DOCUMENT["author"],
        "owner": DOCUMENT["owner"],
        "permissions": [],
    }
    admin.post(
        "/api/admin/permissions/",
        json={"source": "topothek:deutsch-reichenau", "note": "by mail"},
    )
    admin.post(
        "/api/admin/permissions/",
        json={"party": DOCUMENT["owner"], "party_role": "owner", "copy": True},
    )
    detail = admin.get(f"/api/admin/resources/{id}").json()
    assert detail["item"]["may_show"] is True
    assert [
        (p["scope"], p["via"], p["show"], p["copy"], p["note"])
        for p in detail["rights"]["permissions"]
    ] == [
        ("source", rights["sources"][0], True, False, "by mail"),
        ("owner", DOCUMENT["owner"], True, True, None),
    ]
    place_detail = admin.get(f"/api/admin/resources/{harvested[0]}").json()
    assert place_detail["rights"] is None


def test_a_place_has_a_description_per_language(admin):
    p = place(admin)
    assert admin.get(f"/api/locations/{p['slug']}").json()["description"] is None
    r = admin.put(
        f"/api/admin/resources/{p['id']}/texts/description/de",
        json={"body": "Ein Dorf am Schwemmkanal."},
    )
    assert r.status_code == 200, r.text
    about = admin.get(f"/api/locations/{p['slug']}", params={"lang": "en"}).json()
    assert about["description"] == {
        "text": "Ein Dorf am Schwemmkanal.",
        "lang": "de",
        "method": None,
        "edited": False,
    }
    admin.put(
        f"/api/admin/resources/{p['id']}/texts/description/en",
        json={
            "body": "A village on the canal.",
            "method": "human",
            "translated_from": "de",
        },
    )
    about = admin.get(f"/api/locations/{p['slug']}", params={"lang": "en"}).json()
    assert about["description"]["text"] == "A village on the canal."
    assert about["description"]["method"] == "human"


def test_the_review_list_pages(admin):
    for i in range(3):
        place(admin, f"Haus {i}", status="new", lat=48.6 + i / 100, lon=14.0)
    page = admin.get(
        "/api/admin/review/", params={"type": "place", "limit": 2, "offset": 2}
    ).json()
    assert page["total"] == 3
    assert [r["label"] for r in page["items"]] == ["Haus 0"]  # newest first
    assert admin.get("/api/admin/review/", params={"type": "x"}).status_code == 422
    r = admin.get("/api/admin/review/", params={"status": "draft"})
    assert r.status_code == 422


def test_several_statuses_at_once(admin, client):
    a = place(admin, "Haus A", status="new", lat=48.60, lon=14.0)
    b = place(admin, "Haus B", status="new", lat=48.61, lon=14.0)
    r = admin.post(
        "/api/admin/resources/status",
        json={"ids": [a["id"], b["slug"], "nothing"], "status": "published"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["done"] == 2
    assert [e["item"] for e in r.json()["errors"]] == [2]
    assert (
        admin.get("/api/admin/review/", params={"type": "place"}).json()["total"] == 0
    )
    # muting needs the review scope
    writer = {"Authorization": f"Bearer {token(admin, ['read:all', 'write'])}"}
    r = client.post(
        "/api/admin/resources/status",
        json={"ids": [a["id"]], "status": "muted"},
        headers=writer,
    )
    assert r.status_code == 403


def test_places_are_searched_by_name_and_position_with_their_village(admin):
    village = place(admin)
    house = place(admin, "Oberuresch 3", kind="house", lat=48.6095, force=True)
    admin.post(
        "/api/admin/relations/",
        json={"subject": house["id"], "predicate": "part_of", "object": village["id"]},
    )
    found = admin.get("/api/admin/places/search?q=uresch 3").json()
    assert [(p["name"], p["part_of_name"]) for p in found] == [
        ("Oberuresch 3", "Oberuresch")
    ]
    near = admin.get("/api/admin/places/search?lat=48.6095&lon=14.056219").json()
    assert near[0]["name"] == "Oberuresch 3" and near[0]["distance_m"] < 1


# Hard delete -----------------------------------------------------------------------


def test_only_admins_delete(admin, client):
    p = place(admin)
    editor = token(admin, ["read:all", "write", "review"])
    r = client.delete(
        f"/api/admin/resources/{p['id']}",
        headers={"Authorization": f"Bearer {editor}"},
    )
    assert r.status_code == 403
    assert admin.get(f"/api/admin/resources/{p['id']}").status_code == 200


def test_a_village_with_houses_is_deleted_after_them(admin):
    village = place(admin)
    house = place(admin, "Oberuresch 3", kind="house", lat=48.6092)
    admin.post(
        "/api/admin/relations/",
        json={"subject": house["id"], "predicate": "part_of", "object": village["id"]},
    )
    r = admin.delete(f"/api/admin/resources/{village['id']}")
    assert r.status_code == 409
    assert "Oberuresch 3" in r.json()["detail"]
    assert admin.delete(f"/api/admin/resources/{house['id']}").status_code == 200
    assert admin.delete(f"/api/admin/resources/{village['slug']}").status_code == 200
    assert admin.get(f"/api/locations/{village['slug']}").status_code == 404
    assert admin.get("/api/locations/").json() == []


def test_a_deleted_photo_is_not_harvested_again(admin, harvested):
    from api.db import engine

    slug, harvest = harvested
    id = harvest["media"]["id"]
    r = admin.delete(f"/api/admin/resources/{id}")
    assert r.status_code == 200, r.text
    assert r.json()["type"] == "media"
    assert admin.get(f"/api/admin/resources/{id}").status_code == 404
    # the place stays, without the photo
    assert admin.get(f"/api/locations/{slug}").json()["images"] == []
    again = admin.post(
        "/api/admin/media/topothek/",
        json={"url": DOCUMENT["source_url"], "places": [slug]},
    )
    assert again.status_code == 409
    assert "deleted" in again.json()["detail"]
    with engine.connect() as connection:
        (snapshot,) = connection.execute(
            text(
                "SELECT diff FROM timestrolls.change_log "
                "WHERE action = 'delete' AND table_name = 'resource'"
            )
        ).one()
    assert snapshot["type"] == "media"
    assert any(t["body"] == DOCUMENT["title"] for t in snapshot["texts"])
