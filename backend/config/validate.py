from pydantic import BaseModel
from typing import Optional


class CdnPath(BaseModel):
    image: str
    audio: str
    tile: str

class CdnCredentials(BaseModel):
    key: str
    secret: str

class Cdn(BaseModel):
    path: CdnPath
    credentials: Optional[CdnCredentials] = None
    endpoint: Optional[str] = None
    region: Optional[str] = 'fra1'
    bucket: Optional[str] = None

class TileZoom(BaseModel):
    min: Optional[int] = 10
    max: Optional[int] = 18

class Tile(BaseModel):
    zoom: Optional[TileZoom] = TileZoom()
    size: Optional[int] = 256
    format: Optional[str] = 'png'

class Validator(BaseModel):
    cdn: Cdn
    tile: Optional[Tile] = Tile()
