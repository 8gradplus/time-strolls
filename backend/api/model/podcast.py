from sqlmodel import Field, SQLModel
from datetime import datetime
from typing import Optional

class PodcastBase(SQLModel):
    title: str
    place_id: int
    owner: Optional[str]


class Podcast(PodcastBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: Optional[int] = Field(default=None, primary_key=True)
    url: str
    path: Optional[str] = Field(default=None)
    content_type: Optional[str] = Field(default=None)
    hash: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

class PodcastCreate(PodcastBase):
    url: str

class PodcastUpdate(SQLModel):
    title: Optional[str] = None
    place_id: Optional[str] = None
    owner: Optional[str] = None

class PodcastPublic(PodcastBase):
    id: int
    url: str
    path: Optional[str]
    content_type: Optional[str]
    hash: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
