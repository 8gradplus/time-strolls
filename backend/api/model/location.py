from sqlmodel import SQLModel
from typing import List, Optional

from api.model.image import ImagePublic
from api.model.place import PlacePublic
from api.model.podcast import PodcastPublic

class LocationInfo(SQLModel):
    place: PlacePublic
    podcast: Optional[PodcastPublic] = None
    images: List[ImagePublic]
