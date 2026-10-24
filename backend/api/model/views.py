"""The read views (backend/migration/V001_005__views.sql). *View: every row
(admin); Public*: only what may be distributed (public routes and tools)."""

from datetime import date, datetime
from uuid import UUID

from geoalchemy2 import Geometry
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

SCHEMA = {"schema": "timestrolls"}


class StatusColumns(SQLModel):
    status: str
    status_reason: str | None = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime | None = None
    published_at: datetime | None = None


class PlaceColumns(StatusColumns):
    id: UUID = Field(primary_key=True)
    slug: str
    name: str | None = None
    kind: str
    map_visible: bool
    lat: float
    lon: float
    attributes: dict = Field(sa_type=JSONB)


class MediaColumns(StatusColumns):
    id: UUID = Field(primary_key=True)
    kind: str
    date_text: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    creator: str | None = None
    rights_holder: str | None = None
    may_show: bool
    may_copy: bool
    url: str | None = None
    source_url: str | None = None
    attributes: dict = Field(sa_type=JSONB)


class TourColumns(StatusColumns):
    id: UUID = Field(primary_key=True)
    slug: str
    name: str | None = None
    length: float | None = None
    # not serialised (WKB); public.tour returns the coordinates
    geom: str = Field(sa_type=Geometry("LINESTRINGZ", srid=4326), exclude=True)
    attributes: dict = Field(sa_type=JSONB)


class PlaceView(PlaceColumns, table=True):
    __tablename__ = "place_view"
    __table_args__ = SCHEMA


class PublicPlace(PlaceColumns, table=True):
    __tablename__ = "public_place"
    __table_args__ = SCHEMA


class MediaView(MediaColumns, table=True):
    __tablename__ = "media_view"
    __table_args__ = SCHEMA


class PublicMedia(MediaColumns, table=True):
    __tablename__ = "public_media"
    __table_args__ = SCHEMA


class TourView(TourColumns, table=True):
    __tablename__ = "tour_view"
    __table_args__ = SCHEMA


class PublicTour(TourColumns, table=True):
    __tablename__ = "public_tour"
    __table_args__ = SCHEMA


class PublicText(SQLModel, table=True):
    __tablename__ = "public_text"
    __table_args__ = SCHEMA
    id: UUID = Field(primary_key=True)
    resource_id: UUID
    field: str
    lang: str
    body: str
    method: str
    translated_from: str | None = None
    model: str | None = None
    is_primary: bool
    source_record_id: UUID | None = None
    created_by: UUID


class PublicRelation(SQLModel, table=True):
    __tablename__ = "public_relation"
    __table_args__ = SCHEMA
    id: UUID = Field(primary_key=True)
    subject_id: UUID
    predicate: str
    object_id: UUID
    position: int | None = None
