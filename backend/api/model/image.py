from sqlmodel import Field, SQLModel
from datetime import datetime
from typing import Optional

class ImageBase(SQLModel):
    title: Optional[str] = None
    place_id: int
    owner: Optional[str] = None
    year: Optional[int] = None
    description: Optional[str] = None

class Image(ImageBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: int | None = Field(default=None, primary_key=True)
    source_url: Optional[str] = Field(default=None)
    source_id: Optional[str] = Field(default=None)
    url: str
    path: Optional[str] = Field(default=None)
    content_type: Optional[str] = Field(default=None)
    hash: Optional[str] = Field(default=None)
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

class ImageUpdate(SQLModel):
    title: Optional[str] = None
    place_id: Optional[str] = None
    owner: Optional[str] = None

class ImagePublic(ImageBase):
    id: int
    url: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ImageCreate(ImageBase):
    url: str
