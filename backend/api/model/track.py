from sqlmodel import  SQLModel, Field
from typing import Optional
from datetime import datetime
from geoalchemy2 import Geometry

class TrackBase(SQLModel):
    name: str
    description: Optional[str]
    # do we really need this Geometry specifcation here?

class TrackCreate(TrackBase):
    geom: str = Field(sa_column=Geometry(geometry_type="LINESTRINGZ", srid=4326))


class Track(TrackBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    geom: str = Field(sa_column=Geometry(geometry_type="LINESTRINGZ", srid=4326))
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

class TrackPublic(TrackBase):
    id: int
    geom: tuple
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TrackPublicSlim(TrackBase):
    id: int

class TrackUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    geom: Optional[str] = Field(sa_column=Geometry(geometry_type="LINESTRINGZ", srid=4326), default=None)
