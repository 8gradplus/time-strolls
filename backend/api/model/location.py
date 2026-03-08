from sqlmodel import SQLModel
from typing import List, Optional

class Place(SQLModel):
    name: str
    id: int
    slug: str
    type: str
    lat: float
    lon: float

class Image(SQLModel):
    title: Optional[str] = None
    url: str
    source_url: Optional[str] = None
    owner: Optional[str] = None
    year: Optional[int] = None

class Podcast(SQLModel):
    title: str
    url: str
    owner: Optional[str]

class Location(SQLModel):
    place: Place
    podcast: Optional[Podcast] = None
    images: List[Image]
