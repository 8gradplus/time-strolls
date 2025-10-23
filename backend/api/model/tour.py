from sqlmodel import  SQLModel, Field
from typing import Optional
from datetime import datetime
from geoalchemy2 import Geometry
from sqlalchemy import Column, Float, Computed


class TourBase(SQLModel):
    name: str
    description: Optional[str]

class TourCreate(TourBase):
    geom: str = Field(sa_column=Geometry(geometry_type="LINESTRINGZ", srid=4326))


class Tour(TourBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    geom: str = Field(sa_column=Geometry(geometry_type="LINESTRINGZ", srid=4326))
    length: Optional[float] = Field(
        default=None,
        sa_column=Column(
            Float,
            Computed("ST_LengthSpheroid(geom, 'SPHEROID[\"WGS 84\",6378137,298.257223563]') / 1000", persisted=True),
            nullable=True)
    )
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

class TourPublic(TourBase):
    id: int
    length: float
    geom: tuple
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TourPublicSlim(TourBase):
    id: int
    length: float

class TrackUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    geom: Optional[str] = Field(sa_column=Geometry(geometry_type="LINESTRINGZ", srid=4326), default=None)
