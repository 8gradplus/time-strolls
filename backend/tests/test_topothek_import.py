import asyncio

import pytest

from importers import topothek

# As returned by topothek.document (shortened)
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
    "related_ids": [742589],
    "author": "Bildersammlung Franz Bertlwieser, Aigen-Schlägl",
    "owner": "Franz Bertlwieser",
    "image_url": "https://deutsch-reichenau.topothek.at/data/Deutsch_Reichenau428/files2970/file742582.jpg",
    "source_url": "https://deutsch-reichenau.topothek.at/?doc=742582",
}


def test_to_image():
    assert topothek.to_image(DOCUMENT) == {
        "source_url": "https://deutsch-reichenau.topothek.at/?doc=742582",
        "source_id": "742582",
        "url": "https://deutsch-reichenau.topothek.at/data/Deutsch_Reichenau428/files2970/file742582.jpg",
        "title": "Hinterberger Karl und Anna vulgo Jågl-Kårl Oberuresch 3",
        "description": "Karl Hinterberger und Anna.\n\nSiehe auch Bild Nr. [doc 742589]",
        "owner": "Franz Bertlwieser",
        "year": 1945,
    }


def test_to_image_without_optional_fields():
    document = {
        key: DOCUMENT[key] for key in ("id", "title", "image_url", "source_url")
    }
    image = topothek.to_image(document)
    assert image["description"] is None
    assert image["owner"] is None
    assert image["year"] is None


def test_image_fetches_the_document(monkeypatch):
    async def document(url):
        assert url == DOCUMENT["source_url"]
        return DOCUMENT

    monkeypatch.setattr(topothek.topothek, "document", document)
    image = asyncio.run(topothek.image(DOCUMENT["source_url"]))
    assert image["source_id"] == "742582"


def test_image_rejects_links_without_document():
    with pytest.raises(ValueError):
        asyncio.run(topothek.image("https://deutsch-reichenau.topothek.at/"))
