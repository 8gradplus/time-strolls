from fastapi import APIRouter, HTTPException
from sqlmodel import select, Session
import uuid
from datetime import datetime as dt

from helpers import cdn
from helpers.hash import hash, hash_exists
from ..db import SessionDep
from ..db import engine
from fastapi import UploadFile, File, Form
from api.model.podcast import Podcast, PodcastCreate, PodcastPublic, PodcastUpdate
from config import config

router = APIRouter(
    tags=['Podcasts'],
    prefix='/podcasts'
)

@router.get('/', response_model=list[PodcastPublic])
def get_postcast(session: SessionDep):
    return session.exec(select(Podcast)).all()


@router.get('/{id}', response_model=PodcastPublic)
def get_pocast(id: int, session: SessionDep):
    podcast = session.get(Podcast, id)
    if not podcast:
        raise HTTPException(status_code=404, detail=f"Podcast {id} not found")
    return podcast


@router.delete('/{id}')
async def delete_podcast(id: int):
    with Session(engine) as session:
        podcast = session.get(Podcast, id)
        if not podcast:
            raise HTTPException(status_code=404, detail=f"Podcast {id} not found")
        session.delete(podcast)
        session.commit()
    try:
        await cdn.delete(podcast.path)
    except:
        raise HTTPException(status_code=404, detail=f"Could not delete {podcast.title} on cdn")
    return {f"Deleted podcast {id}": True}


@router.post('/', response_model=PodcastPublic)
def post_podcast(podcast: PodcastCreate):
    # Todo: add created at info
    db_podcast = Podcast.model_validate(podcast)
    db_podcast.sqlmodel_update(dict(created_at=dt.utcnow()))
    print(db_podcast)
    with Session(engine) as session:
        session.add(db_podcast)
        session.commit()
        session.refresh(db_podcast)
    return db_podcast

@router.patch('/{id}', response_model=PodcastPublic)
def patch_podcast(id: int, podcast: PodcastUpdate):
    print(f'PODCAST {podcast}')
    with Session(engine) as session:
        db_podcast = session.get(Podcast, id)
        if not db_podcast:
            raise HTTPException(status_code=404, detail=f"Podcast {id} not found")
        db_podcast.sqlmodel_update(podcast.model_dump(exclude_unset=True))
        db_podcast.sqlmodel_update(dict(updated_at=dt.utcnow()))
        session.add(db_podcast)
        session.commit()
        session.refresh(db_podcast)
    return db_podcast

# As we need a mulitpart from anyway let's not put an pydantic object as input
@router.post('/upload/')
async def upload_podcast(
    file: UploadFile = File(...),
    title: str = Form(...),
    place_id: int = Form( ... ),
    owner: str = Form (...),
    response_model=PodcastPublic
):

    file_hash = await hash(file)
    if existing := hash_exists(Podcast, file_hash):
        pc = PodcastPublic.validate(existing)
        raise HTTPException(status_code=404, detail=f"Podcast {file.filename} already uploaded: {pc.url} (id = {pc.id})  ")

    path = f'{config.cdn.path.podcast}/{str(uuid.uuid4())}.mp3'
    try:
        await cdn.write(file.file, path, file.content_type)
    except:
        raise HTTPException(status_code=404, detail=f"Could not upload file {file.filename} to cdn")

    db_podcast = Podcast(
        title = title,
        place_id= place_id,
        url = f'https://{config.cdn.bucket}.{config.cdn.endpoint.split('//')[-1]}/{path}',
        path=path,
        hash=file_hash,
        owner = owner,
        content_type=file.content_type,
        created_at = dt.utcnow()
    )
    with Session(engine) as session:
        session.add(db_podcast)
        session.commit()
        session.refresh(db_podcast)
    return db_podcast
