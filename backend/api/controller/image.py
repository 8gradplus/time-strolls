from fastapi import APIRouter, HTTPException
from sqlmodel import select, Session
from api.db import engine
from api.model.image import Image, ImageCreate, ImagePublic, ImageUpdate
from helpers import cdn
from datetime import datetime as dt
from topothek.crawl import crawl_document_async
# Todo: upload image directly

router = APIRouter(
    tags=['Images'],
    prefix='/api/images'
)

@router.get('/', response_model=list[ImagePublic])
def get_images():
    with Session(engine) as session:
        return session.exec(select(Image)).all()

@router.get('/{id}', response_model=ImagePublic)
def get_image(id: int):
    with Session(engine) as session:
        image = session.get(Image, id)
    if not image:
        raise HTTPException(status_code=404, detail=f"Image {id} not found")
    return image

@router.delete('/{id}')
async def delete_image(id: int):
    with Session(engine) as session:
        image = session.get(Image, id)
        if not image:
            raise HTTPException(status_code=404, detail=f"Image {id} not found")
        session.delete(image)
        session.commit()
    if image.path:
        try:
            await cdn.delete(image.path)
        except:
            raise HTTPException(status_code=404, detail=f"Could not delete image {image.title} (title: {image.title}) on cdn")
    return {f"Deleted Image {id}": True}

@router.patch('/{id}', response_model=ImagePublic)
def patch_podcast(id: int, image: ImageUpdate):
    with Session(engine) as session:
        db_image = session.get(Image, id)
        if not db_image:
            raise HTTPException(status_code=404, detail=f"Image {id} not found")
        db_image.sqlmodel_update(image.model_dump(exclude_unset=True))
        db_image.sqlmodel_update(dict(updated_at=dt.utcnow()))
        session.add(db_image)
        session.commit()
        session.refresh(db_image)
    return db_image

@router.post('/topothek/', response_model=ImagePublic)
async def post_topothek_document(image: ImageCreate):
    try:
        topothek_image = await crawl_document_async(image.url)
    except:
            raise HTTPException(status_code=404, detail=f"Could not parse topothek document {image.url}.")
    db_image = Image(**dict(topothek_image, place_id=image.place_id, created_at=dt.utcnow()))
    with Session(engine) as session:
        exists = session.exec(select(Image).where(Image.url == db_image.url)).first()
        if exists:
            raise HTTPException(status_code=409,detail=f"Image with URL '{image.url}' already exists.")
        session.add(db_image)
        session.commit()
        session.refresh(db_image)
    return db_image
