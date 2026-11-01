import pytest

from helpers.lang import normalize_lang


@pytest.mark.parametrize(
    "value, code",
    [
        ("de", "de"),
        (" DE ", "de"),
        ("deu", "de"),
        ("ger", "de"),
        ("German", "de"),
        ("cz", "cs"),
        ("ces", "cs"),
        ("Čeština", "cs"),
        ("eng", "en"),
        ("de-at", "de-AT"),
        ("de_AT", "de-AT"),
        ("deu-AT", "de-AT"),
        ("sr-latn", "sr-Latn"),
        ("bar", "bar"),  # Bavarian: a valid code we have no alias for
    ],
)
def test_normalize_lang(value, code):
    assert normalize_lang(value) == code


@pytest.mark.parametrize("value", [None, "", "d", "Deutsch/Tschechisch", "de at"])
def test_unreadable_codes_are_refused(value):
    with pytest.raises(ValueError):
        normalize_lang(value)
