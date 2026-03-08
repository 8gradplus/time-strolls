from fastapi import APIRouter
from fastapi import HTTPException
from sqlmodel import Session, select
from api.db import engine
from api.model.location import Location
from api.model.location import Place as LocationPlace
from api.model.location import Image as LocationImage
from api.model.location import Podcast as LocationPodcast
from api.model.place import Place
from api.model.podcast import Podcast
from api.model.image import Image
from api.controller.place import get_places

router = APIRouter(
    tags=['Locations'],
    prefix='/api/locations'
)

@router.get('/', response_model=list[LocationPlace])
def get_locations():
    return get_places()


@router.get('/{slug_or_id}', response_model=Location)
def get_location_info(slug_or_id: str):
    with Session(engine) as session:
        # Try as slug first
        place = session.exec(select(Place).where(Place.slug == slug_or_id)).first()

        # If not found and looks like an ID, try as integer ID for backward compatibility
        if not place and slug_or_id.isdigit():
            place = session.get(Place, int(slug_or_id))

        if not place:
            raise HTTPException(
                status_code=404,
                detail=f"Location information for '{slug_or_id}' not found"
            )

        # Get podcast
        db_podcast = session.exec(select(Podcast).where(Podcast.place_id == place.id)).first()

        # Get images - we'll sort by year in Python to handle nulls simply
        db_images = list(session.exec(
            select(Image)
            .where(Image.place_id == place.id)
        ).all())

        # Sort by year, with None values at the end
        db_images.sort(key=lambda img: (img.year is None, img.year or 0))

        # Convert to location models
        # Ensure id is not None (should always be set for existing places)
        if place.id is None:
            raise HTTPException(status_code=500, detail="Place has no ID")

        location_place = LocationPlace(
            id=place.id,
            slug=place.slug,
            name=place.name,
            type=place.type,
            lat=place.lat,
            lon=place.lon
        )

        location_podcast = None
        if db_podcast:
            location_podcast = LocationPodcast(
                title=db_podcast.title,
                url=db_podcast.url,
                owner=db_podcast.owner
            )

        location_images = [
            LocationImage(
                title=img.title,
                url=img.url,
                source_url=img.source_url,
                owner=img.owner,
                year=img.year
            )
            for img in db_images
        ]

        return Location(
            place=location_place,
            podcast=location_podcast,  # type: ignore
            images=location_images
        )
