"""Replays places.yml into a Time Strolls API.

Adds the sources, permissions, places, links, Topothek images, podcasts and
tours that are missing, and never changes or deletes anything, so it can run
any number of times: into an empty database or into production. Talks only
to the HTTP API (the admin routes, /api/admin/...); what it adds is
published, as the file is curated.

    uv run replay.py local|production [--check] [--file places.yml]

--check only lists what would be added. Both need a bearer token for the
target: API_KEY_LOCAL or API_KEY_PRODUCTION (the API_KEY of that stack, or a
token with the scopes read:all, write and review), read from replay/.env
(git-ignored, only on your Mac); the environment wins over the file.
"""

import argparse
import os
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import httpx
import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

HERE = Path(__file__).parent
TARGETS = {
    "local": "http://localhost:8000/api",
    "production": "https://timestrolls.debtray.com/api",
}
KEY_FILE = HERE / ".env"


def api_key(target: str) -> str | None:
    """The key of this target: API_KEY_LOCAL or API_KEY_PRODUCTION, from the
    environment or from replay/.env (NAME=value lines)."""
    name = f"API_KEY_{target.upper()}"
    if os.environ.get(name):
        return os.environ[name]
    if KEY_FILE.is_file():
        for line in KEY_FILE.read_text().splitlines():
            key, _, value = line.partition("=")
            if key.strip() == name and value.strip():
                return value.strip().strip("'\"")
    return None


# The file ------------------------------------------------------------------


class Strict(BaseModel):
    # A typo in a key is an error, not silently ignored
    model_config = ConfigDict(extra="forbid")


class Source(Strict):
    code: str  # e.g. topothek:deutsch-reichenau
    name: str
    base_url: str | None = None


class Permission(Strict):
    """A permission to show content, from a source (code) or a party (name)."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    source: str | None = None
    party: str | None = None
    party_role: str | None = None  # creator | owner | operator
    show: bool = True
    allow_copy: bool = Field(default=False, alias="copy")
    granted_at: date | None = None
    note: str | None = None

    @model_validator(mode="after")
    def source_or_party(self):
        if (self.source is None) == (self.party is None):
            raise ValueError("a permission is for a source or for a party")
        return self

    def key(self) -> tuple[str, str]:
        return ("source", self.source) if self.source else ("party", self.party)


class Podcast(Strict):
    title: str
    owner: str | None = None
    url: str


class Place(Strict):
    name: str
    kind: str = "village"
    lat: float
    lon: float
    # other original names, e.g. {cs: Horní Ureš}
    names: dict[str, str] = {}
    # the name of the place this one belongs to (a chapel in a village)
    part_of: str | None = None
    podcasts: list[Podcast] = []
    images: list[str] = []

    @field_validator("images")
    @classmethod
    def topothek_links(cls, urls):
        for url in urls:
            if url != url.strip():
                raise ValueError(f"space around {url!r}")
            if not url.startswith("https://") or "topothek.at/?doc=" not in url:
                raise ValueError(f"not a Topothek document link: {url}")
        return urls


class Tour(Strict):
    name: str
    description: str | None = None
    gpx: str

    @field_validator("gpx")
    @classmethod
    def file_exists(cls, path):
        if not (HERE / path).is_file():
            raise ValueError(f"no such file: {path}")
        return path


class Content(Strict):
    sources: list[Source] = []
    permissions: list[Permission] = []
    places: list[Place]
    tours: list[Tour] = []

    @model_validator(mode="after")
    def consistent(self):
        names = [p.name for p in self.places]
        if len(names) != len(set(names)):
            raise ValueError("a place name appears twice")
        for place in self.places:
            if place.part_of and place.part_of not in names:
                raise ValueError(f"{place.name} is part of an unknown place")
            if len(place.images) != len(set(place.images)):
                raise ValueError(f"an image appears twice at {place.name}")
        codes = {s.code for s in self.sources}
        for permission in self.permissions:
            if permission.source and permission.source not in codes:
                raise ValueError(
                    f"permission for an unknown source {permission.source}"
                )
        return self

    def places_of(self, attribute: str) -> dict[str, list[str]]:
        """Image links (or podcast URLs) → the names of the places listing them."""
        found: dict[str, list[str]] = {}
        for place in self.places:
            for item in getattr(place, attribute):
                key = item.url if isinstance(item, Podcast) else item
                found.setdefault(key, []).append(place.name)
        return found


def load(path: Path) -> Content:
    return Content.model_validate(yaml.safe_load(path.read_text()))


# What the API has ------------------------------------------------------------


@dataclass
class Live:
    sources: set[str] = field(default_factory=set)
    # ("source", code) or ("party", name) → (show, copy), not revoked
    permissions: dict[tuple[str, str], tuple[bool, bool]] = field(default_factory=dict)
    places: dict[str, dict] = field(default_factory=dict)  # name → place
    part_of: set[tuple[str, str]] = field(default_factory=set)  # (place, parent)
    # Topothek link (or podcast URL) → media id, and the places it is linked to
    media: dict[str, str] = field(default_factory=dict)
    linked: dict[str, set[str]] = field(default_factory=dict)
    tours: set[str] = field(default_factory=set)


def read_live(client: httpx.Client) -> Live:
    def get(path):
        return client.get(path).raise_for_status().json()

    live = Live()
    codes = {s["id"]: s["code"] for s in get("/admin/sources/")}
    live.sources = set(codes.values())
    parties = {p["id"]: p["name"] for p in get("/admin/parties/")}
    for p in get("/admin/permissions/"):
        if p["revoked_at"] is None:
            key = (
                ("source", codes[p["source_id"]])
                if p["source_id"]
                else ("party", parties[p["party_id"]])
            )
            live.permissions[key] = (p["show"], p["copy"])

    names = {}
    for place in get("/admin/places/"):
        live.places[place["name"]] = place
        names[place["id"]] = place["name"]
    keys = {}
    for media in get("/admin/media/"):
        # Topothek images by their link, podcasts by their file
        key = media["source_url"] or media["url"]
        keys[media["id"]] = key
        live.media[key] = media["id"]
        live.linked[key] = set()
    for id, name in names.items():
        for rel in get(f"/admin/resources/{id}")["relations"]:
            if rel["predicate"] == "part_of" and rel["subject_id"] == id:
                live.part_of.add((name, names.get(rel["object_id"])))
            if rel["object_id"] == id and rel["subject_id"] in keys:
                live.linked[keys[rel["subject_id"]]].add(name)
    live.tours = {t["name"] for t in get("/admin/tours/")}
    return live


# What is missing --------------------------------------------------------------


@dataclass
class Plan:
    sources: list[Source] = field(default_factory=list)
    permissions: list[Permission] = field(default_factory=list)
    places: list[Place] = field(default_factory=list)
    part_of: list[tuple[str, str]] = field(default_factory=list)
    images: list[tuple[str, list[str]]] = field(default_factory=list)  # link, places
    podcasts: list[tuple[Podcast, list[str]]] = field(default_factory=list)
    # existing media to link: (link or URL, place, predicate)
    links: list[tuple[str, str, str]] = field(default_factory=list)
    tours: list[Tour] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def empty(self) -> bool:
        return not any(
            (
                self.sources,
                self.permissions,
                self.places,
                self.part_of,
                self.images,
                self.podcasts,
                self.links,
                self.tours,
            )
        )


def plan(content: Content, live: Live) -> Plan:
    todo = Plan()
    todo.sources = [s for s in content.sources if s.code not in live.sources]
    for permission in content.permissions:
        existing = live.permissions.get(permission.key())
        if existing is None:
            todo.permissions.append(permission)
        elif existing != (permission.show, permission.allow_copy):
            todo.notes.append(
                f"permission for {permission.key()[1]}: show/copy is {existing} "
                "in the API (not changed)"
            )
    for place in content.places:
        existing = live.places.get(place.name)
        if existing is None:
            todo.places.append(place)
        else:
            for key in ("kind", "lat", "lon"):
                if existing.get(key) != getattr(place, key):
                    todo.notes.append(
                        f"{place.name}: {key} is {existing.get(key)} in the API, "
                        f"{getattr(place, key)} in the file (not changed)"
                    )
        if place.part_of and (place.name, place.part_of) not in live.part_of:
            todo.part_of.append((place.name, place.part_of))

    podcasts = {p.url: p for place in content.places for p in place.podcasts}
    for kind, wanted in (
        ("images", content.places_of("images")),
        ("podcasts", content.places_of("podcasts")),
    ):
        predicate = "shows" if kind == "images" else "about"
        for key, places in wanted.items():
            if key not in live.media:
                if kind == "images":
                    todo.images.append((key, places))
                else:
                    todo.podcasts.append((podcasts[key], places))
                continue
            for name in places:
                if name not in live.linked[key]:
                    todo.links.append((key, name, predicate))
    todo.tours = [t for t in content.tours if t.name not in live.tours]
    return todo


def describe(todo: Plan) -> str:
    lines = [f"+ source {s.code}" for s in todo.sources]
    lines += [f"+ permission for {p.key()[1]}" for p in todo.permissions]
    lines += [f"+ place {p.name}" for p in todo.places]
    lines += [f"+ {place} part of {parent}" for place, parent in todo.part_of]
    per_place = {}
    for _, places in todo.images:
        per_place[places[0]] = per_place.get(places[0], 0) + 1
    lines += [f"+ {n} images for {name}" for name, n in per_place.items()]
    lines += [f"+ podcast {pod.title!r} for {', '.join(p)}" for pod, p in todo.podcasts]
    lines += [f"+ link {key} to {place}" for key, place, _ in todo.links]
    lines += [f"+ tour {t.name}" for t in todo.tours]
    lines += [f"! {note}" for note in todo.notes]
    return "\n".join(lines) if lines else "Nothing to add."


# Adding it ----------------------------------------------------------------------


def apply(client: httpx.Client, todo: Plan, live: Live) -> list[str]:
    """Posts what is missing; returns the Topothek links that could not be
    imported (documents can disappear from Topothek)."""

    def post(path, **kwargs):
        return client.post(path, **kwargs).raise_for_status().json()

    for source in todo.sources:
        post("/admin/sources/", json=source.model_dump())
        print(f"+ source {source.code}")
    for permission in todo.permissions:
        body = permission.model_dump(mode="json", by_alias=True)
        post("/admin/permissions/", json=body)
        print(f"+ permission for {permission.key()[1]}")

    for place in todo.places:
        body = place.model_dump(include={"name", "kind", "lat", "lon", "names"})
        # curated by hand: create it even near a similar place (the API's
        # duplicate guard is for agents)
        live.places[place.name] = post(
            "/admin/places/", json=body | {"status": "published", "force": True}
        )
        print(f"+ place {place.name}")

    def slug(name):
        return live.places[name]["slug"]

    for name, parent in todo.part_of:
        body = {"subject": slug(name), "predicate": "part_of", "object": slug(parent)}
        post("/admin/relations/", json=body)
        print(f"+ {name} part of {parent}")

    failed = []
    for i, (url, places) in enumerate(todo.images, 1):
        r = client.post(
            "/admin/media/topothek/",
            json={
                "url": url,
                "places": [slug(p) for p in places],
                "status": "published",
            },
            timeout=60,
        )
        if r.status_code == 404:
            failed.append(url)
        else:
            r.raise_for_status()
        if i % 25 == 0 or i == len(todo.images):
            print(f"  images {i}/{len(todo.images)}")

    for podcast, places in todo.podcasts:
        body = {
            "kind": "audio",
            "url": podcast.url,
            "title": podcast.title,
            "rights_holder": podcast.owner,
            "places": [slug(p) for p in places],
            "status": "published",
        }
        post("/admin/media/", json=body)
        print(f"+ podcast {podcast.title!r}")

    for key, name, predicate in todo.links:
        body = {
            "subject": live.media[key],
            "predicate": predicate,
            "object": slug(name),
        }
        post("/admin/relations/", json=body)
        print(f"+ link {key} to {name}")

    for tour in todo.tours:
        with open(HERE / tour.gpx, "rb") as gpx:
            post(
                "/admin/tours/upload/",
                data={
                    "name": tour.name,
                    "description": tour.description or "",
                    "status": "published",
                },
                files={"file": (Path(tour.gpx).name, gpx, "application/gpx+xml")},
                timeout=60,
            )
        print(f"+ tour {tour.name}")
    return failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("target", choices=TARGETS)
    parser.add_argument(
        "--check", action="store_true", help="only list what would be added"
    )
    parser.add_argument("--file", default=str(HERE / "places.yml"))
    args = parser.parse_args()

    content = load(Path(args.file))
    print(
        f"{args.file}: {len(content.places)} places, "
        f"{len(content.places_of('images'))} images, {len(content.tours)} tours"
    )

    key = api_key(args.target)
    if not key:
        name = f"API_KEY_{args.target.upper()}"
        print(f"{name} is not set in replay/.env", file=sys.stderr)
        return 1

    base = TARGETS[args.target]
    with httpx.Client(
        base_url=base,
        headers={"Authorization": f"Bearer {key}"},
        timeout=30,
        follow_redirects=True,
    ) as client:
        live = read_live(client)
        todo = plan(content, live)
        print(f"{base}: {len(live.places)} places, {len(live.media)} media")
        print(describe(todo))
        if args.check or todo.empty():
            return 0
        failed = apply(client, todo, live)
    if failed:
        print(f"Topothek did not deliver {len(failed)} documents:")
        print("\n".join(f"  {url}" for url in failed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
