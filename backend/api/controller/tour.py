from fastapi import APIRouter, HTTPException
from api.db import Session, engine
from sqlmodel import select
from fastapi import UploadFile, File, Form
from api.model.tour import TourPublic, TourPublicSlim
from api.model.tour import Tour
from api.model.tour import TourCreate
from api.model.tour import TrackUpdate
from datetime import datetime as dt
from shapely.geometry import mapping
from shapely import wkb

from tour import parse_gpx

router = APIRouter(
    tags=['Tours'],
    prefix='/api/tours'
)

router_public = APIRouter(
    tags=['Tracks'],
    prefix='/api/tours'
)

@router_public.get('/', response_model=list[TourPublicSlim])
def get_tours():
    with Session(engine) as session:
        return session.exec(select(Tour)).all()


@router_public.get('/{id}', response_model=TourPublic)
def get_tour(id: int):
    with Session(engine) as session:
        tour = session.get(Tour, id)
    if not tour:
        raise HTTPException(status_code=404, detail=f"Track {id} not found")
    # convert hex line to geojson
    geojson = mapping(wkb.loads(tour.geom))['coordinates']
    tour_dict = tour.model_dump()
    tour_dict["geom"] = geojson
    return TourPublic(**tour_dict)

@router.post("/", response_model=Tour)
def post_tour(track: TourCreate):
    db_track = Tour.model_validate(track)
    db_track.sqlmodel_update(dict(created_at=dt.utcnow()))
    with Session(engine) as session:
        session.add(db_track)
        session.commit()
        session.refresh(db_track)
    return db_track

# As we need a mulitpart form anyway let's not put an pydantic object as input
@router.post('/upload/')
async def upload_tour(
    name: str = Form(...),
    description: str = Form (...),
    file: UploadFile = File(...),
    response_model=Tour
):
    if not file:
            raise HTTPException(status_code=400, detail="No file uploaded")
    content = await file.read()
    wkt = parse_gpx(content)
    tour = Tour(name=name, description=description, geom=wkt, created_at=dt.utcnow())
    with Session(engine) as session:
        session.add(tour)
        session.commit()
        session.refresh(tour)
    return tour

@router.patch("/{id}", response_model=Tour)
def patch_tour(id: int, tour: TrackUpdate):
    with Session(engine) as session:
        db_tour = session.get(Tour, id)
    if not db_tour:
        raise HTTPException(status_code=404, detail=f"Track {id} not found")
    tour_data = tour.model_dump(exclude_unset=True)
    db_tour.sqlmodel_update(tour_data)
    db_tour.sqlmodel_update(dict(updated_at=dt.utcnow()))
    session.add(db_tour)
    session.commit()
    session.refresh(db_tour)
    return db_tour

@router.delete('/{id}')
def delete_tour(id: int):
    with Session(engine) as session:
        tour = session.get(Tour, id)
        if not tour:
            raise HTTPException(status_code=404, detail=f"Track {id} not found")
        session.delete(tour)
        session.commit()
    return {f"Deleted tour {tour}": True}
