from sqlmodel import SQLModel
from typing import List, Optional

from api.model.image import ImagePublic
from api.model.podcast import PodcastPublic

class Place(SQLModel):
    name: str
    id: int
    type: str
    lat: float
    lon: float

class Image(SQLModel):
    title: Optional[str] = None
    url: str
    owner: Optional[str] = None
    year: Optional[int] = None

class Podcast(SQLModel):
    title: str
    url: str
    owner: Optional[str]

class Location(SQLModel):
    place: Place
    podcast: Optional[PodcastPublic] = None
    images: List[Image]
