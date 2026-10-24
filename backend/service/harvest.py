"""Harvesting: a record from a source is kept as it came (source_record) and
becomes a media, once. Harvesting it again only refreshes the record."""

from datetime import datetime
from urllib.parse import urlparse
from uuid import UUID

from sqlmodel import Session, select

from api.model.tables import ResourceSource, SourceRecord, now
from service import Actor, audit, require
from service import media, resources, rights

# Topothek document type -> media kind
TOPOTHEK_KINDS = {"Bild": "image"}


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
    require(actor, "write")
    source = rights.source(session, actor, topothek_source(document), commit=False)
    external_id = str(document["id"])
    record = session.exec(
        select(SourceRecord).where(
            SourceRecord.source_id == source.id,
            SourceRecord.external_id == external_id,
        )
    ).first()
    retrieved_at = (
        datetime.fromisoformat(document["retrieved_at"].replace("Z", "+00:00"))
        if document.get("retrieved_at")
        else now()
    )
    if record:
        record.raw = document
        record.retrieved_at = retrieved_at
        record.updated_at = now()
        session.add(record)
        media_id = session.exec(
            select(ResourceSource.resource_id).where(
                ResourceSource.source_record_id == record.id
            )
        ).first()
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
    else:
        record = SourceRecord(
            source_id=source.id,
            external_id=external_id,
            url=document.get("source_url"),
            lang=document.get("language"),
            retrieved_at=retrieved_at,
            raw=document,
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
