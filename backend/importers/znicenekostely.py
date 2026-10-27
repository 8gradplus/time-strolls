"""Destroyed and endangered sacral buildings from znicenekostely.cz via
time-strolls-scraper; stored by service.harvest.

`objects_near` raises httpx.HTTPError when the site can't be reached.
"""

from scrape_time_strolls.scrapers import znicenekostely


async def objects_near(lat: float, lon: float, radius_km: float) -> dict:
    """The objects within radius_km, nearest first, as the scraper returns
    them."""
    return await znicenekostely.objects_near(lat, lon, radius_km)
