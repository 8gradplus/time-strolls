from sqlmodel import Field, SQLModel
from datetime import datetime


class PlaceBase(SQLModel):
    name: str
    type: str = Field(default="Place")
    lat: float
    lon: float

class Place(PlaceBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: int | None = Field(default=None, primary_key=True, index=True)
    created_at: datetime | None = Field(default=None)
    updated_at: datetime | None = Field(default=None)

class PlaceCreate(PlaceBase):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlacePublic(PlaceBase):
    id: int
    created_at: datetime
    updated_at: datetime

class PlaceUpdate(SQLModel):
    name: str | None = None
    type: str | None = None
    lat: float | None = None
    lon: float | None = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


"""
class PlaceInfo(SQLModel):
    place: PlacePublic
    podcast: Optional[PodcastPublic] = None
    images: Optional[list[ImagePublic]] = None
"""
