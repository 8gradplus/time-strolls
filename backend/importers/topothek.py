"""Topothek documents as image records, via time-strolls-scraper.

`topothek.document` raises ValueError for a URL without `?doc=<id>`,
LookupError for an unknown document and httpx.HTTPError when the Topothek
can't be reached.
"""

from scrape_time_strolls.scrapers import topothek

# Image field <- field of the scraped document (empty fields are left out there)
FIELDS = {
    "source_url": "source_url",
    "url": "image_url",
    "title": "title",
    "description": "comment",
    "owner": "owner",
    "year": "year",
}


def to_image(document: dict) -> dict:
    """The fields of an Image for a scraped Topothek document."""
    image = {field: document.get(key) for field, key in FIELDS.items()}
    image["source_id"] = str(document["id"])
    return image


async def image(url: str) -> dict:
    """Fetches a Topothek document by its share URL as Image fields."""
    return to_image(await topothek.document(url))
