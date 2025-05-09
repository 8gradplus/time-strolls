from sqlmodel import Field, SQLModel
from typing import Optional


class PlaceBase(SQLModel):
    name: str
    type: str
    lat: float
    lon: float

class Place(PlaceBase, table=True):
    id: int | None = Field(default=None, primary_key=True)

class PlacePublic(PlaceBase):
    id: int

class ImageBase(SQLModel):
    title: str = Field(default=None, nullable=True)
    url: str
    place_id: int = Field(index=True)

class Image(ImageBase, table=True):
    id: int | None = Field(default=None, primary_key=True)

class ImagePublic(ImageBase):
    id: int

class PodcastBase(SQLModel):
    title: str = Field(default=None, nullable=True)
    url: str
    place_id: int

class Podcast(PodcastBase, table=True):
    id: int | None = Field(default=None, primary_key=True)

class PodcastPublic(PodcastBase):
    id: int


class PlaceInfo(SQLModel):
    place: PlacePublic
    podcast: Optional[PodcastPublic] = None
    images: Optional[list[Image]] = None
