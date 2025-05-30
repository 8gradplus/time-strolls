from asyncio.timeouts import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime


class PlaceBase(SQLModel):
    name: str
    type: str = Field(default="Place")
    lat: float
    lon: float

class Place(PlaceBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

class PlaceCreate(PlaceBase):
    pass

class PlacePublic(PlaceBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PlaceUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
