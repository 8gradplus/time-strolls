"""Admin routes for content: places, media, tours, their status, texts and
links. They need a bearer token with the scope named per route."""

from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from api.auth.bearer import scope
from api.db import SessionDep
from api.model.tables import ChangeLog, Relation, Resource, Text
from api.model.views import MediaView, PlaceView, TourView
from importers import topothek
from service import Actor, audit, harvest, media, places, resources, review, tours

router = APIRouter(tags=["Admin: content"], prefix="/api/admin")

Reader = Annotated[Actor, Depends(scope("read:all"))]
Writer = Annotated[Actor, Depends(scope("write"))]
Reviewer = Annotated[Actor, Depends(scope("review"))]


# Places --------------------------------------------------------------------


@router.get("/places/", response_model=list[PlaceView])
def get_places(
    session: SessionDep, _: Reader, status: str | None = None, kind: str | None = None
):
    return places.list_(session, status, kind)


@router.get("/places/{key}", response_model=PlaceView)
def get_place(key: str, session: SessionDep, _: Reader):
    return places.find(session, key)


@router.post("/places/", response_model=PlaceView, status_code=201)
def post_place(data: places.PlaceIn, session: SessionDep, actor: Writer):
    """A new place; its slug comes from the name and the coordinates."""
    return places.create(session, actor, data)


@router.patch("/places/{key}", response_model=PlaceView)
def patch_place(key: str, data: places.PlaceUpdate, session: SessionDep, actor: Writer):
    return places.update(session, actor, resources.resolve(session, key, "place"), data)


# Media ---------------------------------------------------------------------


@router.get("/media/", response_model=list[MediaView])
def get_media_list(
    session: SessionDep, _: Reader, status: str | None = None, kind: str | None = None
):
    return media.list_(session, status, kind)


@router.get("/media/{id}", response_model=MediaView)
def get_media(id: UUID, session: SessionDep, _: Reader):
    return media.get(session, id)


@router.post("/media/", response_model=MediaView, status_code=201)
def post_media(data: media.MediaIn, session: SessionDep, actor: Writer):
    """A media whose file stays where it is (e.g. a podcast episode)."""
    return media.get(session, media.create(session, actor, data))


class TopothekIn(BaseModel):
    url: str  # share URL, https://<name>.topothek.at/?doc=<id>
    places: list[str] = []  # ids or slugs the media shows
    status: str | None = None


class Harvested(BaseModel):
    media: MediaView
    created: bool


@router.post("/media/topothek/", response_model=Harvested)
async def post_topothek(data: TopothekIn, session: SessionDep, actor: Writer):
    """Harvests a Topothek document. A known document is not added again:
    its record is refreshed and the places are linked (created: false)."""
    try:
        document = await topothek.document(data.url)
    except ValueError:
        raise HTTPException(422, f"Not a Topothek document link: {data.url}")
    except LookupError:
        raise HTTPException(404, f"No Topothek document {data.url}")
    except httpx.HTTPError:
        raise HTTPException(502, f"Could not reach the Topothek for {data.url}")
    id, created = await run_in_threadpool(
        harvest.topothek, session, actor, document, data.places, data.status
    )
    return Harvested(media=media.get(session, id), created=created)


# Tours ---------------------------------------------------------------------


@router.get("/tours/", response_model=list[TourView])
def get_tours(session: SessionDep, _: Reader, status: str | None = None):
    return tours.list_(session, status)


@router.post("/tours/upload/", response_model=TourView, status_code=201)
async def upload_tour(
    session: SessionDep,
    actor: Writer,
    name: str = Form(...),
    description: str | None = Form(None),
    lang: str = Form("de"),
    status: str | None = Form(None),
    file: UploadFile = File(...),
):
    """A tour from a GPX track (with elevations)."""
    gpx = await file.read()
    data = tours.TourIn(name=name, description=description, lang=lang, status=status)
    return await run_in_threadpool(tours.create, session, actor, data, gpx)


# Any resource: review, status, texts, links ---------------------------------


@router.get("/resources/", response_model=list[review.Summary])
def get_resources(
    session: SessionDep,
    _: Reader,
    type: str | None = None,
    status: str | None = None,
    limit: int = 200,
):
    """All resources, newest first; status=new is the review queue."""
    return review.list_(session, type, status, limit)


@router.get("/resources/{key}", response_model=review.Detail)
def get_resource(key: str, session: SessionDep, _: Reader):
    """A resource (id or slug) with its texts, links and sources."""
    return review.detail(session, key)


@router.get("/resources/{id}/history", response_model=list[ChangeLog])
def get_history(id: UUID, session: SessionDep, _: Reader):
    return audit.history(session, id)


class StatusIn(BaseModel):
    status: str  # new | published | muted | withdrawn
    reason: str | None = None


@router.put("/resources/{id}/status", response_model=Resource)
def put_status(id: UUID, data: StatusIn, session: SessionDep, actor: Reviewer):
    return resources.set_status(session, actor, id, data.status, data.reason)


@router.put("/resources/{id}/texts/{field}/{lang}", response_model=Text)
def put_text(
    id: UUID,
    field: str,
    lang: str,
    data: resources.TextIn,
    session: SessionDep,
    actor: Writer,
):
    """Adds or replaces a text; a translation names its method (human,
    machine), the language it comes from and, for machines, the model."""
    return resources.set_text(session, actor, id, field, lang, data)


class RelationIn(BaseModel):
    subject: str  # id or slug
    predicate: str  # part_of, shows, about, stop, same_as
    object: str
    position: int | None = None


@router.post("/relations/", response_model=Relation, status_code=201)
def post_relation(data: RelationIn, session: SessionDep, actor: Writer):
    return resources.link(
        session,
        actor,
        resources.resolve(session, data.subject),
        data.predicate,
        resources.resolve(session, data.object),
        data.position,
    )


@router.delete("/relations/{id}", status_code=204)
def delete_relation(id: UUID, session: SessionDep, actor: Writer):
    resources.unlink(session, actor, id)
