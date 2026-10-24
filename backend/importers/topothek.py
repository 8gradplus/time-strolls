"""Topothek documents via time-strolls-scraper; stored by service.harvest.

`topothek.document` raises ValueError for a URL without `?doc=<id>`,
LookupError for an unknown document and httpx.HTTPError when the Topothek
can't be reached.
"""

from scrape_time_strolls.scrapers import topothek


async def document(url: str) -> dict:
    """A Topothek document by its share URL, as the scraper returns it."""
    return await topothek.document(url)
