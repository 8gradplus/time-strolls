"""The public routes the map uses: published and permitted content only."""

from fastapi import APIRouter, Query

from api.db import SessionDep
from service import public

router = APIRouter(tags=["Public"], prefix="/api")

Lang = Query(default=None, description="ISO 639 language, e.g. de, cs, en")


@router.get("/locations/", response_model=list[public.LocationPlace])
def get_locations(session: SessionDep, lang: str | None = Lang):
    return public.locations(session, lang)


@router.get("/locations/{slug}", response_model=public.Location)
def get_location(slug: str, session: SessionDep, lang: str | None = Lang):
    """A place with its podcasts and images. Texts come in `lang` where
    they exist, else in their original language."""
    return public.location(session, slug, lang)


@router.get("/tours/", response_model=list[public.TourSummary])
def get_tours(session: SessionDep, lang: str | None = Lang):
    return public.tours(session, lang)


@router.get("/tours/{key}", response_model=public.TourDetail)
def get_tour(key: str, session: SessionDep, lang: str | None = Lang):
    """A tour by slug or id, with its track."""
    return public.tour(session, key, lang)


@router.get("/credits/", response_model=public.Credits)
def get_credits(session: SessionDep):
    """Where the content comes from and how its texts were translated."""
    return public.credits(session)
