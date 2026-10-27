"""Villages and their houses from the Südböhmen-Archiv via
time-strolls-scraper; stored by service.harvest.

`scrape_village` raises LookupError for an unknown village and
httpx.HTTPError when the archive can't be reached.
"""

from scrape_time_strolls.scrapers.suedboehmenarchiv import scrape_village


async def village(name: str) -> dict:
    """A village with all its houses, as the scraper returns it."""
    return await scrape_village(name)
