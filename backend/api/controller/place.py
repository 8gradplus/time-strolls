from fastapi import APIRouter, HTTPException
from api.db import Session, engine
from api.model.place import Place, PlaceCreate, PlacePublic, PlaceUpdate
from sqlmodel import select
from datetime import datetime as dt
from helpers.slug import generate_place_slug

router = APIRouter(
    tags=['Places'],
    prefix='/api/places'
)

@router.get('/', response_model=list[PlacePublic])
def get_places():
    with Session(engine) as session:
        return session.exec(select(Place)).all()

@router.get('/{slug_or_id}', response_model=PlacePublic)
def get_place(slug_or_id: str):
    with Session(engine) as session:
        # Try as slug first
        place = session.exec(select(Place).where(Place.slug == slug_or_id)).first()

        # If not found and looks like an ID, try as integer ID
        if not place and slug_or_id.isdigit():
            place = session.get(Place, int(slug_or_id))

        if not place:
            raise HTTPException(status_code=404, detail=f"Place {slug_or_id} not found")
    return place

@router.post("/", response_model=PlacePublic)
def post_place(place: PlaceCreate):
    # Generate slug from name and coordinates
    slug = generate_place_slug(place.name, place.lat, place.lon)

    # Create Place object with all required fields
    db_place = Place(
        name=place.name,
        type=place.type,
        lat=place.lat,
        lon=place.lon,
        slug=slug,
        created_at=dt.utcnow()
    )

    with Session(engine) as session:
        # Check if slug already exists
        existing = session.exec(select(Place).where(Place.slug == slug)).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Place with slug '{slug}' already exists"
            )

        session.add(db_place)
        session.commit()
        session.refresh(db_place)
    return db_place

@router.patch("/{slug_or_id}", response_model=PlacePublic)
def patch_place(slug_or_id: str, place: PlaceUpdate):
    with Session(engine) as session:
        # Try as slug first
        db_place = session.exec(select(Place).where(Place.slug == slug_or_id)).first()

        # If not found and looks like an ID, try as integer ID
        if not db_place and slug_or_id.isdigit():
            db_place = session.get(Place, int(slug_or_id))

        if not db_place:
            raise HTTPException(status_code=404, detail=f"Place {slug_or_id} not found")

        place_data = place.model_dump(exclude_unset=True)

        # If name or coordinates changed, regenerate slug
        if 'name' in place_data or 'lat' in place_data or 'lon' in place_data:
            new_name = place_data.get('name', db_place.name)
            new_lat = place_data.get('lat', db_place.lat)
            new_lon = place_data.get('lon', db_place.lon)
            new_slug = generate_place_slug(new_name, new_lat, new_lon)

            # Check if new slug conflicts with another place
            if new_slug != db_place.slug:
                existing = session.exec(select(Place).where(Place.slug == new_slug)).first()
                if existing:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Place with slug '{new_slug}' already exists"
                    )
                place_data['slug'] = new_slug

        db_place.sqlmodel_update(place_data)
        db_place.updated_at = dt.utcnow()

        session.add(db_place)
        session.commit()
        session.refresh(db_place)
    return db_place


@router.delete('/{slug_or_id}')
def delete_place(slug_or_id: str):
    with Session(engine) as session:
        # Try as slug first
        place = session.exec(select(Place).where(Place.slug == slug_or_id)).first()

        # If not found and looks like an ID, try as integer ID
        if not place and slug_or_id.isdigit():
            place = session.get(Place, int(slug_or_id))

        if not place:
            raise HTTPException(status_code=404, detail=f"Place {slug_or_id} not found")

        session.delete(place)
        session.commit()
    return {f"Deleted place {slug_or_id}": True}
