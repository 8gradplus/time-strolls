"""Harvesting: a record from a source is kept as it came (source_record) and
becomes a resource, once. Harvesting it again only refreshes the record.

The records come from time-strolls-scraper; a result names its `source` and
each record has an `id` (the record key). Topothek documents become media;
houses (Südböhmen-Archiv) and sacral buildings (znicenekostely.cz) become
places. Names and numbers of places are facts: their texts carry no source
record, so they need no permission; longer texts (a house's history) stay in
the record.
"""

from datetime import datetime
from urllib.parse import urlparse
from uuid import UUID

from sqlmodel import Session, select

from api.model.tables import ResourceSource, SourceRecord, now
from service import Actor, ServiceError, audit, require
from service import media, resources, rights
from service import places as place_service

# Topothek document type -> media kind
TOPOTHEK_KINDS = {"Bild": "image"}

SUEDBOEHMEN = rights.SourceIn(
    code="suedboehmenarchiv",
    name="Südböhmen-Archiv",
    base_url="https://suedboehmenarchiv.eu/",
)
ZNICENEKOSTELY = rights.SourceIn(
    code="znicenekostely",
    name="Zničené kostely",
    base_url="https://www.znicenekostely.cz/",
)
# znicenekostely category -> place kind; the rest are landmarks
SACRAL_KINDS = {
    "Kostely": "church",
    "Velké kaple": "chapel",
    "Kaple": "chapel",
    "Kapličky": "chapel",
    "Boží muka": "wayside_shrine",
    "Svaté obrazy": "wayside_shrine",
}


def retrieved(result: dict) -> datetime:
    value = result.get("retrieved_at")
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else now()


def keep_record(
    session: Session,
    actor: Actor,
    source: rights.SourceIn,
    external_id: str,
    raw: dict,
    url: str | None,
    lang: str | None,
    retrieved_at: datetime,
) -> tuple[SourceRecord, UUID | None]:
    """The record, stored once (a known one is refreshed), and the resource
    made from it, if there is one. Doesn't commit."""
    require(actor, "write")
    source_row = rights.source(session, actor, source, commit=False)
    record = session.exec(
        select(SourceRecord).where(
            SourceRecord.source_id == source_row.id,
            SourceRecord.external_id == external_id,
        )
    ).first()
    if record:
        record.raw = raw
        record.retrieved_at = retrieved_at
        record.updated_at = now()
        session.add(record)
        resource_id = session.exec(
            select(ResourceSource.resource_id).where(
                ResourceSource.source_record_id == record.id
            )
        ).first()
        return record, resource_id
    record = SourceRecord(
        source_id=source_row.id,
        external_id=external_id,
        url=url,
        lang=lang,
        retrieved_at=retrieved_at,
        raw=raw,
        retrieved_by=actor.account_id,
    )
    session.add(record)
    session.flush()
    audit.log(
        session,
        actor,
        "source_record",
        "create",
        record.id,
        diff={"source": source.code, "external_id": external_id},
    )
    return record, None


def topothek_source(document: dict) -> rights.SourceIn:
    name = document["topothek"]
    host = urlparse(document["source_url"]).netloc
    return rights.SourceIn(
        code=f"topothek:{name}",
        name=f"Topothek {name.replace('-', ' ').title()}",
        base_url=f"https://{host}/",
    )


def topothek(
    session: Session,
    actor: Actor,
    document: dict,
    places: list[str] = (),
    status: str | None = None,
) -> tuple[UUID, bool]:
    """Stores a document from scrape_time_strolls.scrapers.topothek.document
    as a media. Returns its id and whether it is new; for a known document
    the record is refreshed and the places are linked."""
    external_id = str(document["id"])
    record, media_id = keep_record(
        session,
        actor,
        topothek_source(document),
        external_id,
        document,
        document.get("source_url"),
        document.get("language"),
        retrieved(document),
    )
    if media_id:
        for key in places:
            resources.link(
                session,
                actor,
                media_id,
                "shows",
                resources.resolve(session, key, "place"),
                commit=False,
            )
        session.commit()
        return media_id, False
    media_id = media.create(
        session,
        actor,
        media.MediaIn(
            kind=TOPOTHEK_KINDS.get(document.get("type"), "document"),
            url=document["image_url"],
            title=document.get("title") or f"Topothek {external_id}",
            description=document.get("comment"),
            lang=document.get("language", "de"),
            date_text=document.get("date"),
            year=document.get("year"),
            creator=document.get("author"),
            rights_holder=document.get("owner"),
            places=list(places),
            status=status,
        ),
        source_record_id=record.id,
        commit=False,
    )
    session.add(ResourceSource(resource_id=media_id, source_record_id=record.id))
    session.commit()
    return media_id, True


# Places from records -------------------------------------------------------------


def import_places(
    session: Session,
    actor: Actor,
    source: rights.SourceIn,
    items: list[tuple[str, dict, place_service.PlaceIn]],
    parent: UUID,
    retrieved_at: datetime,
) -> dict:
    """Creates a place per (external id, record, place) that isn't there yet,
    part_of `parent`, each in its own transaction. A place that looks like an
    existing one is reported, not created; a record imported before only
    gets its link to the parent."""
    summary = {"created": [], "existing": [], "duplicates": [], "errors": []}
    for external_id, raw, data in items:
        row = {"name": data.name}
        try:
            record, place_id = keep_record(
                session,
                actor,
                source,
                external_id,
                raw,
                raw.get("source_url"),
                raw.get("language"),
                retrieved_at,
            )
            if place_id:
                summary["existing"].append(row | {"id": place_id})
            else:
                place = place_service.create(session, actor, data, commit=False)
                place_id = place.id
                session.add(
                    ResourceSource(resource_id=place_id, source_record_id=record.id)
                )
                summary["created"].append(row | {"slug": place.slug})
            resources.link(session, actor, place_id, "part_of", parent, commit=False)
            session.commit()
        except place_service.Duplicate as e:
            session.rollback()
            matches = [{"name": m.name, "slug": m.slug} for m in e.matches]
            summary["duplicates"].append(row | {"duplicate_of": matches})
        except ServiceError as e:
            session.rollback()
            summary["errors"].append(row | {"error": str(e)})
    return summary


def suedboehmen_houses(
    session: Session,
    actor: Actor,
    village: dict,
    place: str,
    numbers: list[str] | None = None,
    status: str | None = None,
) -> dict:
    """The houses of a village from scrape_village() as house places, part
    of `place` (slug or id). Name: the village and the house number; the
    house name, former number and address become attributes. Houses without
    coordinates are skipped."""
    parent = resources.resolve(session, place, "place")
    wanted = {str(n) for n in numbers} if numbers else None
    items, skipped = [], []
    for house in village.get("houses", []):
        number = house.get("number")
        if wanted is not None and number not in wanted:
            continue
        if house.get("lat") is None or house.get("lon") is None:
            skipped.append({"number": number, "reason": "no coordinates"})
            continue
        attributes = {
            "number": number,
            "former_number": house.get("former_number"),
            "house_name": house.get("name"),
            "address": house.get("address"),
        }
        data = place_service.PlaceIn(
            name=f"{village['name']} {number}" if number else house["name"],
            lang=village.get("language", "de"),
            kind="house",
            lat=house["lat"],
            lon=house["lon"],
            attributes={k: v for k, v in attributes.items() if v},
            status=status,
        )
        raw = {
            "language": village.get("language"),
            "village": {"id": village.get("id"), "name": village.get("name")},
            **house,
        }
        items.append((f"house:{house['id']}", raw, data))
    summary = import_places(
        session, actor, SUEDBOEHMEN, items, parent, retrieved(village)
    )
    return summary | {"skipped": skipped}


def sacral_buildings(
    session: Session,
    actor: Actor,
    result: dict,
    place: str,
    status: str | None = None,
) -> dict:
    """Objects from znicenekostely (objects_near or objects_by_locality) as
    places, part of `place` (slug or id). The kind follows the category
    (SACRAL_KINDS, else landmark); the Czech name is the name; category,
    state and position become attributes."""
    parent = resources.resolve(session, place, "place")
    items, skipped = [], []
    for item in result.get("objects", []):
        if item.get("lat") is None or item.get("lon") is None:
            skipped.append({"name": item.get("name"), "reason": "no coordinates"})
            continue
        attributes = {
            "category": item.get("category"),
            "state": item.get("state"),
            "position": item.get("position"),
        }
        data = place_service.PlaceIn(
            name=item.get("name") or item.get("category") or f"Objekt {item['id']}",
            lang=result.get("language", "cs"),
            kind=SACRAL_KINDS.get(item.get("category"), "landmark"),
            lat=item["lat"],
            lon=item["lon"],
            attributes={k: v for k, v in attributes.items() if v},
            status=status,
        )
        raw = {"language": result.get("language"), **item}
        items.append((f"object:{item['id']}", raw, data))
    summary = import_places(
        session, actor, ZNICENEKOSTELY, items, parent, retrieved(result)
    )
    return summary | {"skipped": skipped}
