from fastapi import APIRouter, HTTPException
from api.db import Session, engine
from api.model.place import Place, PlaceCreate, PlacePublic, PlaceUpdate
from sqlmodel import select
from datetime import datetime as dt
router = APIRouter(
    tags=['Places'],
    prefix='/api/places'
)

@router.get('/', response_model=list[PlacePublic])
def get_places():
    with Session(engine) as session:
        return session.exec(select(Place)).all()

@router.get('/{id}', response_model=PlacePublic)
def get_place(id: int):
    with Session(engine) as session:
        place = session.get(Place, id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Place {id} not found")
    return place

@router.post("/", response_model=PlacePublic)
def post_place(place: PlaceCreate):
    db_place = Place.model_validate(place)
    db_place.sqlmodel_update(dict(created_at=dt.utcnow()))
    with Session(engine) as session:
        session.add(db_place)
        session.commit()
        session.refresh(db_place)
    return db_place

@router.patch("/{id}", response_model=PlacePublic)
def path_place(id: int, place: PlaceUpdate):
    with Session(engine) as session:
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
def delete_place(id: int):
    with Session(engine) as session:
        place = session.get(Place, id)
        if not place:
            raise HTTPException(status_code=404, detail=f"Place {id} not found")
        session.delete(place)
        session.commit()
    return {f"Deleted place {id}": True}
