"""Replays places.yml into a Time Strolls API.

Adds the places, Topothek images, podcasts and tours that are missing, and
never changes or deletes anything, so it can run any number of times: into an
empty database or into production. Talks only to the HTTP API; reading uses
the public endpoints, writing needs the API key (X-API-Key).

    uv run replay.py local|production [--check]

--check only lists what would be added and needs no key. Each target has
its own key, API_KEY_LOCAL or API_KEY_PRODUCTION, read from replay/.env
(git-ignored, only on your Mac); the environment wins over the file.
"""

import argparse
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import yaml
from pydantic import BaseModel, ConfigDict, field_validator, model_validator

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


class Podcast(Strict):
    title: str
    owner: str | None = None
    url: str


class Place(Strict):
    name: str
    type: str = "Place"
    lat: float
    lon: float
    podcast: Podcast | None = None
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
    places: list[Place]
    tours: list[Tour] = []

    @model_validator(mode="after")
    def unique(self):
        names = [p.name for p in self.places]
        if len(names) != len(set(names)):
            raise ValueError("a place name appears twice")
        seen = {}
        for place in self.places:
            for url in place.images:
                if url in seen:
                    raise ValueError(f"{url} is in {seen[url]} and {place.name}")
                seen[url] = place.name
        return self


def load(path: Path) -> Content:
    return Content.model_validate(yaml.safe_load(path.read_text()))


# What the API has ------------------------------------------------------------


@dataclass
class Live:
    places: dict[str, dict] = field(default_factory=dict)  # name → place
    images: dict[str, str] = field(default_factory=dict)  # Topothek link → place
    podcasts: dict[str, str] = field(default_factory=dict)  # url → place
    tours: set[str] = field(default_factory=set)


def read_live(client: httpx.Client) -> Live:
    live = Live()
    for place in client.get("/locations/").raise_for_status().json():
        live.places[place["name"]] = place
        location = client.get(f"/locations/{place['slug']}").raise_for_status().json()
        for image in location["images"]:
            if image.get("source_url"):
                # Older imports may have stored a trailing space
                live.images[image["source_url"].strip()] = place["name"]
        if location.get("podcast"):
            live.podcasts[location["podcast"]["url"]] = place["name"]
    live.tours = {t["name"] for t in client.get("/tours/").raise_for_status().json()}
    return live


# What is missing --------------------------------------------------------------


@dataclass
class Plan:
    places: list[Place] = field(default_factory=list)
    images: list[tuple[str, str]] = field(default_factory=list)  # (place, link)
    podcasts: list[tuple[str, Podcast]] = field(default_factory=list)
    tours: list[Tour] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def empty(self) -> bool:
        return not (self.places or self.images or self.podcasts or self.tours)


def plan(content: Content, live: Live) -> Plan:
    todo = Plan()
    for place in content.places:
        existing = live.places.get(place.name)
        if existing is None:
            todo.places.append(place)
        else:
            for key in ("type", "lat", "lon"):
                if existing.get(key) != getattr(place, key):
                    todo.notes.append(
                        f"{place.name}: {key} is {existing.get(key)} in the API, "
                        f"{getattr(place, key)} in the file (not changed)"
                    )
        for url in place.images:
            elsewhere = live.images.get(url)
            if elsewhere is None:
                todo.images.append((place.name, url))
            elif elsewhere != place.name:
                todo.notes.append(
                    f"{url} belongs to {elsewhere} in the API (not moved)"
                )
        if place.podcast:
            elsewhere = live.podcasts.get(place.podcast.url)
            if elsewhere is None:
                todo.podcasts.append((place.name, place.podcast))
            elif elsewhere != place.name:
                todo.notes.append(
                    f"podcast {place.podcast.title!r} belongs to {elsewhere} in the API"
                )
    todo.tours = [t for t in content.tours if t.name not in live.tours]
    return todo


def describe(todo: Plan) -> str:
    lines = [f"+ place {p.name}" for p in todo.places]
    per_place = {}
    for name, _ in todo.images:
        per_place[name] = per_place.get(name, 0) + 1
    lines += [f"+ {n} images for {name}" for name, n in per_place.items()]
    lines += [f"+ podcast {pod.title!r} for {name}" for name, pod in todo.podcasts]
    lines += [f"+ tour {t.name}" for t in todo.tours]
    lines += [f"! {note}" for note in todo.notes]
    return "\n".join(lines) if lines else "Nothing to add."


# Adding it ----------------------------------------------------------------------


def apply(client: httpx.Client, todo: Plan, live: Live) -> list[str]:
    """Posts what is missing; returns the Topothek links that could not be
    imported (documents can disappear from Topothek)."""
    for place in todo.places:
        body = place.model_dump(include={"name", "type", "lat", "lon"})
        live.places[place.name] = (
            client.post("/places/", json=body).raise_for_status().json()
        )
        print(f"+ place {place.name}")

    failed = []
    for i, (name, url) in enumerate(todo.images, 1):
        r = client.post(
            "/images/topothek/",
            json={"url": url, "place_id": live.places[name]["id"]},
            timeout=60,
        )
        if r.status_code == 404:
            failed.append(url)
        elif r.status_code != 409:  # 409: it exists already
            r.raise_for_status()
        if i % 25 == 0 or i == len(todo.images):
            print(f"  images {i}/{len(todo.images)}")

    for name, podcast in todo.podcasts:
        body = podcast.model_dump() | {"place_id": live.places[name]["id"]}
        client.post("/podcasts/", json=body).raise_for_status()
        print(f"+ podcast {podcast.title!r}")

    for tour in todo.tours:
        with open(HERE / tour.gpx, "rb") as gpx:
            client.post(
                "/tours/upload/",
                data={"name": tour.name, "description": tour.description or ""},
                files={"file": (Path(tour.gpx).name, gpx, "application/gpx+xml")},
                timeout=60,
            ).raise_for_status()
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
        f"{sum(len(p.images) for p in content.places)} images, {len(content.tours)} tours"
    )

    headers = {}
    if not args.check:
        key = api_key(args.target)
        if not key:
            name = f"API_KEY_{args.target.upper()}"
            print(f"{name} is not set in replay/.env", file=sys.stderr)
            return 1
        headers["X-API-Key"] = key

    base = TARGETS[args.target]
    with httpx.Client(
        base_url=base, headers=headers, timeout=30, follow_redirects=True
    ) as client:
        live = read_live(client)
        todo = plan(content, live)
        print(f"{base}: {len(live.places)} places, {len(live.images)} images")
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
