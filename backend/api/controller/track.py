from fastapi import APIRouter, HTTPException
from api.db import Session, engine
from sqlmodel import select
from fastapi import UploadFile, File, Form
from api.model.track import TrackPublic, TrackPublicSlim
from api.model.track import Track
from api.model.track import TrackCreate
from api.model.track import TrackUpdate
from datetime import datetime as dt
from shapely.geometry import mapping
from shapely import wkb

from api.track import parse_gpx

router = APIRouter(
    tags=['Tracks'],
    prefix='/api/tracks'
)

router_public = APIRouter(
    tags=['Tracks'],
    prefix='/api/tracks'
)

@router_public.get('/', response_model=list[TrackPublicSlim])
def get_tracks():
    with Session(engine) as session:
        return session.exec(select(Track)).all()


@router_public.get('/{id}', response_model=TrackPublic)
def get_track(id: int):
    with Session(engine) as session:
        track = session.get(Track, id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {id} not found")
    # convert hex line to geojson
    geojson = mapping(wkb.loads(track.geom))['coordinates']
    track_dict = track.model_dump()
    track_dict["geom"] = geojson
    return TrackPublic(**track_dict)

@router.post("/", response_model=Track)
def post_track(track: TrackCreate):
    db_track = Track.model_validate(track)
    db_track.sqlmodel_update(dict(created_at=dt.utcnow()))
    with Session(engine) as session:
        session.add(db_track)
        session.commit()
        session.refresh(db_track)
    return db_track

# As we need a mulitpart form anyway let's not put an pydantic object as input
@router.post('/upload/')
async def upload_podcast(
    name: str = Form(...),
    description: str = Form (...),
    file: UploadFile = File(...),
    response_model=Track
):
    if not file:
            raise HTTPException(status_code=400, detail="No file uploaded")
    content = await file.read()
    wkt = parse_gpx(content)
    print(type(wkt),  wkt)
    track = TrackCreate(name=name, description=description, geom=wkt)
    track = Track.model_validate(track)
    track.sqlmodel_update(dict(created_at=dt.utcnow()))
    with Session(engine) as session:
        session.add(track)
        session.commit()
        session.refresh(track)
    return track

@router.patch("/{id}", response_model=Track)
def path_place(id: int, track: TrackUpdate):
    with Session(engine) as session:
        db_track = session.get(Track, id)
    if not db_track:
        raise HTTPException(status_code=404, detail=f"Track {id} not found")
    track_data = track.model_dump(exclude_unset=True)
    db_track.sqlmodel_update(track_data)
    db_track.sqlmodel_update(dict(updated_at=dt.utcnow()))
    session.add(db_track)
    session.commit()
    session.refresh(db_track)
    return db_track

@router.delete('/{id}')
def delete_place(id: int):
    with Session(engine) as session:
        track = session.get(Track, id)
        if not track:
            raise HTTPException(status_code=404, detail=f"Track {id} not found")
        session.delete(track)
        session.commit()
    return {f"Deleted place {track}": True}
