from fastapi import APIRouter, HTTPException
from ..db import SessionDep
from api.model.place import Place, PlaceCreate, PlacePublic, PlaceUpdate
from sqlmodel import select
from datetime import datetime as dt
router = APIRouter(
    tags=['Public'],
    prefix='/places'
)

@router.get('/', response_model=list[PlacePublic])
def get_places(session: SessionDep):
    return session.exec(select(Place)).all()

@router.get('/{id}', response_model=PlacePublic)
def get_place(id: int, session: SessionDep):
    place = session.get(Place, id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Place {id} not found")
    return place

@router.post("/", response_model=PlacePublic)
def post_place(place: PlaceCreate, session: SessionDep):
    db_place = Place.model_validate(place)
    session.add(db_place)
    session.commit()
    session.refresh(db_place)
    return db_place

@router.patch("/{id}", response_model=PlacePublic)
def path_place(id: int, place: PlaceUpdate,  session: SessionDep):
    db_place = session.get(Place, id)
    if not db_place:
        raise HTTPException(status_code=404, detail=f"Place {id} not found")
    place_data = place.model_dump(exclude_unset=True)
    db_place.sqlmodel_update(place_data)
    db_place.sqlmodel_update(dict(updated_at=dt.utcnow()))
    session.add(db_place)
    session.commit()
    session.refresh(db_place)
    return db_place


@router.delete('/{id}')
def delete_place(id: int, session: SessionDep):
    place = session.get(Place, id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Place {id} not found")
    session.delete(place)
    session.commit()
    return {f"Deleted place {id}": True}

"""
@router.get('/info/{place_id}')
def get_info(place_id: int, session: SessionDep):
    place = get_place(place_id, session=session)
    images = session.exec(select(Image).where(Image.place_id == place_id)).all()
    podcast = session.exec(select(Podcast).where(Podcast.place_id == place_id)).first()
    return PlaceInfo(place=place, images=images, podcast=podcast)
"""
