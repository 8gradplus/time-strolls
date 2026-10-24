"""The tables (backend/migration/), for writing. Reading goes through the
views in api/model/views.py. Ids are UUIDv7, created here; timestamps are
timezone-aware."""

from datetime import date, datetime, timezone
from uuid import UUID

from geoalchemy2 import Geometry
from sqlalchemy import ARRAY, Boolean, Column, Computed, Float, Text as SAText
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from helpers.ids import uuid7

SCHEMA = {"schema": "timestrolls"}


def now() -> datetime:
    return datetime.now(timezone.utc)


def jsonb(nullable: bool = False):
    return Field(default_factory=dict, sa_column=Column(JSONB, nullable=nullable))


# Accounts and parties ------------------------------------------------------


class Party(SQLModel, table=True):
    __tablename__ = "party"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    kind: str | None = None  # person | organisation
    name: str
    note: str | None = None
    created_at: datetime = Field(default_factory=now)


class Account(SQLModel, table=True):
    __tablename__ = "account"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    kind: str  # human | agent | system
    name: str
    operated_by: UUID | None = None
    party_id: UUID | None = None
    created_at: datetime = Field(default_factory=now)


class ApiToken(SQLModel, table=True):
    __tablename__ = "api_token"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    account_id: UUID
    name: str
    hash: str
    scopes: list[str] = Field(sa_column=Column(ARRAY(SAText), nullable=False))
    created_at: datetime = Field(default_factory=now)
    last_used_at: datetime | None = None
    revoked_at: datetime | None = None


# Resources -------------------------------------------------------------------


class Resource(SQLModel, table=True):
    __tablename__ = "resource"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    type: str  # place | media | tour
    status: str = "new"  # new | published | muted | withdrawn
    status_reason: str | None = None
    created_by: UUID
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime | None = None
    published_by: UUID | None = None
    published_at: datetime | None = None


class Place(SQLModel, table=True):
    __tablename__ = "place"
    __table_args__ = SCHEMA
    id: UUID = Field(primary_key=True)
    slug: str
    kind: str
    geom: str = Field(sa_column=Column(Geometry("GEOMETRY", srid=4326), nullable=False))
    attributes: dict = jsonb()


class Media(SQLModel, table=True):
    __tablename__ = "media"
    __table_args__ = SCHEMA
    id: UUID = Field(primary_key=True)
    kind: str  # image | document | audio
    date_text: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    creator_id: UUID | None = None
    rights_holder_id: UUID | None = None
    attributes: dict = jsonb()


class File(SQLModel, table=True):
    __tablename__ = "file"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    media_id: UUID
    role: str = "original"  # original | preview
    storage: str  # external | cdn
    url: str
    cdn_path: str | None = None
    hash: str | None = None
    content_type: str | None = None
    width: int | None = None
    height: int | None = None
    duration: float | None = None
    created_at: datetime = Field(default_factory=now)


class Tour(SQLModel, table=True):
    __tablename__ = "tour"
    __table_args__ = SCHEMA
    id: UUID = Field(primary_key=True)
    slug: str
    geom: str = Field(
        sa_column=Column(Geometry("LINESTRINGZ", srid=4326), nullable=False)
    )
    length: float | None = Field(
        default=None,
        sa_column=Column(
            Float,
            Computed(
                "ST_LengthSpheroid(geom, 'SPHEROID[\"WGS 84\",6378137,298.257223563]') / 1000",
                persisted=True,
            ),
        ),
    )
    attributes: dict = jsonb()


class SlugAlias(SQLModel, table=True):
    __tablename__ = "slug_alias"
    __table_args__ = SCHEMA
    slug: str = Field(primary_key=True)
    resource_id: UUID
    created_at: datetime = Field(default_factory=now)


class PlaceKind(SQLModel, table=True):
    __tablename__ = "place_kind"
    __table_args__ = SCHEMA
    code: str = Field(primary_key=True)
    map_visible: bool = True


class RelationKind(SQLModel, table=True):
    __tablename__ = "relation_kind"
    __table_args__ = SCHEMA
    code: str = Field(primary_key=True)
    subject_types: list[str] = Field(sa_column=Column(ARRAY(SAText), nullable=False))
    object_types: list[str] = Field(sa_column=Column(ARRAY(SAText), nullable=False))
    ordered: bool = False


class Relation(SQLModel, table=True):
    __tablename__ = "relation"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    subject_id: UUID
    predicate: str
    object_id: UUID
    position: int | None = None
    created_by: UUID
    created_at: datetime = Field(default_factory=now)


# Texts, origin, rights, history ------------------------------------------------


class Text(SQLModel, table=True):
    __tablename__ = "text"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    resource_id: UUID
    field: str
    lang: str
    body: str
    method: str = "original"  # original | human | machine
    translated_from: str | None = None
    model: str | None = None
    is_primary: bool = False
    source_record_id: UUID | None = None
    created_by: UUID
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime | None = None


class Source(SQLModel, table=True):
    __tablename__ = "source"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    code: str
    name: str
    base_url: str | None = None
    operator_id: UUID | None = None
    created_at: datetime = Field(default_factory=now)


class SourceRecord(SQLModel, table=True):
    __tablename__ = "source_record"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    source_id: UUID
    external_id: str
    url: str | None = None
    lang: str | None = None
    retrieved_at: datetime | None = None
    raw: dict = jsonb()
    retrieved_by: UUID
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime | None = None


class ResourceSource(SQLModel, table=True):
    __tablename__ = "resource_source"
    __table_args__ = SCHEMA
    resource_id: UUID = Field(primary_key=True)
    source_record_id: UUID = Field(primary_key=True)


class Permission(SQLModel, table=True):
    __tablename__ = "permission"
    __table_args__ = SCHEMA
    id: UUID = Field(default_factory=uuid7, primary_key=True)
    source_id: UUID | None = None
    party_id: UUID | None = None
    party_role: str | None = None  # creator | owner | operator
    show: bool
    # column "copy" (the name would shadow BaseModel.copy)
    allow_copy: bool = Field(sa_column=Column("copy", Boolean, nullable=False))
    granted_by: UUID | None = None
    granted_at: date | None = None
    note: str | None = None
    evidence: str | None = None
    recorded_by: UUID
    recorded_at: datetime = Field(default_factory=now)
    revoked_at: datetime | None = None


class ChangeLog(SQLModel, table=True):
    __tablename__ = "change_log"
    __table_args__ = SCHEMA
    id: int | None = Field(default=None, primary_key=True)
    account_id: UUID
    at: datetime = Field(default_factory=now)
    resource_id: UUID | None = None
    table_name: str
    row_id: str | None = None
    action: str
    diff: dict = jsonb()
    run: dict | None = Field(default=None, sa_column=Column(JSONB))
