from pathlib import Path

import pytest
from pydantic import ValidationError

from replay import Content, Live, describe, load, plan

DOC = "https://deutsch-reichenau.topothek.at/?doc="


def content(**overrides):
    data = {
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
                "podcast": {"title": "GAG83", "url": "https://audio/x.mp3"},
                "images": [DOC + "3"],
            },
        ],
        "tours": [],
    }
    data.update(overrides)
    return Content.model_validate(data)


def test_the_real_file_is_valid():
    places = load(Path(__file__).parent.parent / "places.yml")
    assert len(places.places) == 13
    assert places.tours[0].name == "Schwemmkanalweg"


@pytest.mark.parametrize(
    "places",
    [
        [{"name": "A", "lat": 1, "lon": 2, "images": [DOC + "1 "]}],  # stray space
        [{"name": "A", "lat": 1, "lon": 2, "images": ["https://example.com/1"]}],
        [{"name": "A", "lon": 2}],  # no lat
        [{"name": "A", "lat": 1, "lon": 2, "imgaes": []}],  # typo in a key
        [  # the same link at two places
            {"name": "A", "lat": 1, "lon": 2, "images": [DOC + "1"]},
            {"name": "B", "lat": 1, "lon": 2, "images": [DOC + "1"]},
        ],
        [{"name": "A", "lat": 1, "lon": 2}, {"name": "A", "lat": 3, "lon": 4}],
    ],
)
def test_mistakes_in_the_file_are_errors(places):
    with pytest.raises(ValidationError):
        Content.model_validate({"places": places})


def test_an_empty_api_gets_everything():
    todo = plan(content(), Live())
    assert [p.name for p in todo.places] == ["Asang", "Sankt Thoma"]
    assert len(todo.images) == 3
    assert todo.podcasts[0][0] == "Sankt Thoma"


def test_only_what_is_missing_is_added():
    live = Live(
        places={
            "Asang": {"id": 1, "type": "Place", "lat": 48.6, "lon": 14.0},
            "Sankt Thoma": {"id": 2, "type": "Place", "lat": 48.64, "lon": 14.1},
        },
        images={DOC + "1": "Asang", DOC + "3": "Sankt Thoma"},
        podcasts={"https://audio/x.mp3": "Sankt Thoma"},
    )
    todo = plan(content(), live)
    assert todo.places == [] and todo.podcasts == []
    assert todo.images == [("Asang", DOC + "2")]
    assert describe(todo) == "+ 1 images for Asang"


def test_differences_are_reported_not_changed():
    live = Live(
        places={
            "Asang": {"id": 1, "type": "Place", "lat": 48.7, "lon": 14.0},
            "Sankt Thoma": {"id": 2, "type": "Place", "lat": 48.64, "lon": 14.1},
        },
        images={DOC + "1": "Sankt Thoma", DOC + "2": "Asang", DOC + "3": "Sankt Thoma"},
        podcasts={"https://audio/x.mp3": "Sankt Thoma"},
    )
    todo = plan(content(), live)
    assert todo.empty()
    assert any("lat is 48.7" in note for note in todo.notes)
    assert any("belongs to Sankt Thoma" in note for note in todo.notes)


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
