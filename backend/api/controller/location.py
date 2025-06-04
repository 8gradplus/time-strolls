from fastapi import APIRouter
from fastapi import HTTPException
from sqlmodel import Session, select
from api.db import engine
from api.model.location import LocationInfo
from api.model.place import Place
from api.model.podcast import Podcast
from api.model.image import Image

router = APIRouter(
    tags=['Images'],
    prefix='/api/locations'
)

@router.get('/{id}')
def get_location_info(id: int, response_model=LocationInfo):
    with Session(engine) as session:
        place = session.get(Place, id)
        if not place:
            raise HTTPException(status_code=404, detail=f"Location information for place{id} not found")
        podcast = session.exec(select(Podcast).where(Podcast.place_id == id)).first()
        images = session.exec(select(Image).where(Image.place_id == id).order_by(Image.year)).all()
        return LocationInfo(place=place, podcast=podcast, images=images)
