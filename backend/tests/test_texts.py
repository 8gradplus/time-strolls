"""Cutting parts out of a text and splitting it into sentences (no database)."""

import pytest

from service import Invalid
from service.resources import sentences, without


def test_sentences_keep_abbreviations_dates_and_initials():
    body = (
        "Karl Hinterberger und Anna. Am 12. Mai 1945 bei K. Bauer.\n\n"
        "Siehe auch Bild Nr. 742589! Wer kennt die Personen?"
    )
    assert sentences(body) == [
        "Karl Hinterberger und Anna.",
        "Am 12. Mai 1945 bei K. Bauer.",
        "Siehe auch Bild Nr. 742589!",
        "Wer kennt die Personen?",
    ]


def test_sentences_survive_dots_only():
    assert sentences("Karl. ... Anna.") == ["Karl.", "...", "Anna."]


def test_without_removes_the_parts_and_tidies_the_gaps():
    body = "Karl und Anna. Wer kennt sie?\n\nDanke an Franz.\n\nSiehe Bild 3."
    assert (
        without(body, ["Wer kennt sie?", "Danke an Franz."])
        == "Karl und Anna.\n\nSiehe Bild 3."
    )
    # a Topothek title: the request after the last " - "
    assert without("Oberuresch 3 - Wer kennt das Haus?", ["Wer kennt das Haus?"]) == (
        "Oberuresch 3"
    )


def test_without_refuses_what_isnt_there():
    with pytest.raises(Invalid, match="not in the text"):
        without("Karl und Anna.", ["Wer kennt sie?"])
