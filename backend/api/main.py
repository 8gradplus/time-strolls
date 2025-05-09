from fastapi import FastAPI, Depends, HTTPException
from typing import Annotated
from sqlmodel import select
from sqlmodel import Session
from swak.funcflow import Map

from .database import init_db, engine
from .database import get_session
from .models import Place, PlaceBase, PlaceInfo, PlacePublic, Podcast, Image


# Mock some data
places = [
    Place(name="Unterurasch", type="Place", lat=48.61017854015886, lon=14.04406485511563),
    Place(name="Sankt Thoma", type="Place", lat=48.645228734293525, lon=14.10324739758884)
]

podcasts = [
    Podcast(title="A random title",
            url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/podcasts/test.mp3",
            place_id=1),
    Podcast(title="GAG83: 100 Jahre vor der Reformation – Jan Hus und die Hussitenkriege",
            url="https://audio.podigee-cdn.net/543211-m-64d99e1b9312e44e27a75be845df3628.mp3?source=webplayer",
            place_id=2),
]

images = [
    Image(url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file430410.webp",
        title="Sonntags Spaziergang",
         place_id=1),
    Image(url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546065.webp",
        place_id=1),
    Image(url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546072.webp",
        place_id=1),
    Image(url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546074.webp",
        place_id=1),
    Image(url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file564226.webp",
        place_id=1),
    Image(url="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file840955.webp",
        place_id=1),

]


SessionDep = Annotated[Session, Depends(get_session)]


app = FastAPI()

@app.on_event("startup")
def startup():
    init_db()
    # SessionDep does not work on startup.
    with Session(engine) as session:
        Map(session.add)(places)
        Map(session.add)(images)
        Map(session.add)(podcasts)
        session.commit()

@app.get('/ready')
def foobar():
    return {"message": "I am ready!"}


@app.get('/places/', response_model=list[PlacePublic])
def locations(session: SessionDep):
    return session.exec(select(Place)).all()

@app.get('/places/{id}', response_model=PlacePublic)
def get_place(id: int, session: SessionDep):
    place = session.get(Place, id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Place {id} not found")
    return place

@app.post("/places/", response_model=PlacePublic)
def create_place(place: PlaceBase, session: SessionDep):
    db_place = Place.model_validate(place)
    session.add(db_place)
    session.commit()
    session.refresh(db_place)
    return db_place

@app.delete('/places/{id}')
def delete_place(id: int, session: SessionDep):
    place = session.get(Place, id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Place {id} not found")
    session.delete(place)
    session.commit()
    return {f"Deleted place {id}": True}

@app.get('/info/{place_id}')
def get_info(place_id: int, session: SessionDep):
    place = get_place(place_id, session=session)
    images = session.exec(select(Image).where(Image.place_id == place_id)).all()
    podcast = session.exec(select(Podcast).where(Podcast.place_id == place_id)).first()
    return PlaceInfo(place=place, images=images, podcast=podcast)
