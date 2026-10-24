from pathlib import Path

import pytest
from pydantic import ValidationError

from replay import Content, Live, describe, load, plan

DOC = "https://deutsch-reichenau.topothek.at/?doc="
MP3 = "https://audio/x.mp3"


def content(**overrides):
    data = {
        "sources": [{"code": "topothek:deutsch-reichenau", "name": "Topothek DR"}],
        "permissions": [
            {"source": "topothek:deutsch-reichenau", "note": "by mail"},
            {"party": "GAG", "party_role": "owner"},
        ],
        "places": [
            {
                "name": "Asang",
                "lat": 48.6,
                "lon": 14.0,
                "images": [DOC + "1", DOC + "2"],
            },
            {
                "name": "Sankt Thoma",
                "lat": 48.64,
                "lon": 14.1,
                "podcasts": [{"title": "GAG83", "owner": "GAG", "url": MP3}],
                "images": [DOC + "3"],
            },
            {
                "name": "Kapelle",
                "kind": "chapel",
                "part_of": "Sankt Thoma",
                "lat": 48.64,
                "lon": 14.1,
                "images": [DOC + "3"],  # also at Sankt Thoma
            },
        ],
        "tours": [],
    }
    data.update(overrides)
    return Content.model_validate(data)


def place(name, id, lat, lon, kind="village"):
    return {"id": id, "slug": name.lower(), "kind": kind, "lat": lat, "lon": lon}


def everything_live():
    return Live(
        sources={"topothek:deutsch-reichenau"},
        permissions={
            ("source", "topothek:deutsch-reichenau"): (True, False),
            ("party", "GAG"): (True, False),
        },
        places={
            "Asang": place("Asang", "a", 48.6, 14.0),
            "Sankt Thoma": place("Sankt Thoma", "t", 48.64, 14.1),
            "Kapelle": place("Kapelle", "k", 48.64, 14.1, "chapel"),
        },
        part_of={("Kapelle", "Sankt Thoma")},
        media={DOC + "1": "m1", DOC + "2": "m2", DOC + "3": "m3", MP3: "m4"},
        linked={
            DOC + "1": {"Asang"},
            DOC + "2": {"Asang"},
            DOC + "3": {"Sankt Thoma", "Kapelle"},
            MP3: {"Sankt Thoma"},
        },
    )


def test_the_real_file_is_valid():
    places = load(Path(__file__).parent.parent / "places.yml")
    assert len(places.places) == 13
    assert places.tours[0].name == "Schwemmkanalweg"
    assert all(not p.allow_copy for p in places.permissions)  # show only


@pytest.mark.parametrize(
    "places",
    [
        [{"name": "A", "lat": 1, "lon": 2, "images": [DOC + "1 "]}],  # stray space
        [{"name": "A", "lat": 1, "lon": 2, "images": ["https://example.com/1"]}],
        [{"name": "A", "lon": 2}],  # no lat
        [{"name": "A", "lat": 1, "lon": 2, "imgaes": []}],  # typo in a key
        [{"name": "A", "lat": 1, "lon": 2, "images": [DOC + "1", DOC + "1"]}],
        [{"name": "A", "lat": 1, "lon": 2}, {"name": "A", "lat": 3, "lon": 4}],
        [{"name": "A", "lat": 1, "lon": 2, "part_of": "B"}],  # unknown place
    ],
)
def test_mistakes_in_the_file_are_errors(places):
    with pytest.raises(ValidationError):
        Content.model_validate({"places": places})


def test_permissions_need_a_known_source_or_a_party():
    with pytest.raises(ValidationError):
        content(permissions=[{"source": "topothek:elsewhere"}])
    with pytest.raises(ValidationError):
        content(permissions=[{"show": True}])


def test_an_empty_api_gets_everything():
    todo = plan(content(), Live())
    assert [s.code for s in todo.sources] == ["topothek:deutsch-reichenau"]
    assert len(todo.permissions) == 2
    assert [p.name for p in todo.places] == ["Asang", "Sankt Thoma", "Kapelle"]
    assert todo.part_of == [("Kapelle", "Sankt Thoma")]
    assert (DOC + "3", ["Sankt Thoma", "Kapelle"]) in todo.images
    assert len(todo.images) == 3
    assert todo.podcasts[0][1] == ["Sankt Thoma"]


def test_nothing_is_added_twice():
    todo = plan(content(), everything_live())
    assert todo.empty() and todo.notes == []
    assert describe(todo) == "Nothing to add."


def test_existing_media_get_missing_links():
    live = everything_live()
    live.linked[DOC + "3"] = {"Sankt Thoma"}
    todo = plan(content(), live)
    assert todo.images == [] and todo.links == [(DOC + "3", "Kapelle", "shows")]
    assert describe(todo) == f"+ link {DOC}3 to Kapelle"


def test_differences_are_reported_not_changed():
    live = everything_live()
    live.places["Asang"]["lat"] = 48.7
    live.permissions[("party", "GAG")] = (True, True)
    todo = plan(content(), live)
    assert todo.empty()
    assert any("lat is 48.7" in note for note in todo.notes)
    assert any("permission for GAG" in note for note in todo.notes)


def test_each_target_has_its_own_key(tmp_path, monkeypatch):
    import replay

    keys = tmp_path / "keys"
    keys.write_text("API_KEY_LOCAL=abc\nAPI_KEY_PRODUCTION=\n")
    monkeypatch.setattr(replay, "KEY_FILE", keys)
    monkeypatch.delenv("API_KEY_LOCAL", raising=False)
    monkeypatch.delenv("API_KEY_PRODUCTION", raising=False)
    assert replay.api_key("local") == "abc"
    assert replay.api_key("production") is None  # empty: not set
    monkeypatch.setenv("API_KEY_PRODUCTION", "xyz")
    assert replay.api_key("production") == "xyz"
