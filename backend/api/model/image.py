from sqlmodel import Field, SQLModel
from datetime import datetime

class ImageBase(SQLModel):
    title: str = Field(default=None, nullable=True)
    url: str
    place_id: int = Field(index=True)

class Image(ImageBase, table=True):
    __table_args__ = {"schema": "timestrolls"}
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ImagePublic(ImageBase):
    id: int
