"""The MCP servers over HTTP, as a client sees them: tokens, which tools a
scope lists, batches of drafts and review, duplicates, what an agent reads,
and the public server's view."""

import asyncio
import json

import httpx
import pytest

from tests.conftest import API_KEY
from tests.test_api import DOCUMENT, token


def run(app, path, bearer, steps):
    """Connects a FastMCP client to the app at `path` and runs `steps`."""
    from fastmcp import Client
    from fastmcp.client.transports import StreamableHttpTransport

    def factory(headers=None, timeout=None, auth=None, **_):
        return httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
            headers=headers,
            timeout=timeout,
            auth=auth,
        )

    async def go():
        async with app.router.lifespan_context(app):
            transport = StreamableHttpTransport(
                f"http://test{path}",
                headers={
                    "Authorization": f"Bearer {bearer}",
                    "X-Run": '{"model": "test"}',
                },
                httpx_client_factory=factory,
            )
            async with Client(transport) as client:
                return await steps(client)

    return asyncio.run(go())


def parse(result):
    """A tool's answer as the model reads it (an empty list has no text)."""
    return json.loads(result.content[0].text) if result.content else result.data


async def names(client):
    return {t.name for t in await client.list_tools()}


@pytest.fixture
def app(clean, monkeypatch):
    from api.main import app
    from importers import topothek

    async def document(url):
        if "?doc=" not in url:
            raise ValueError(f"not a Topothek document link: {url}")
        return DOCUMENT

    monkeypatch.setattr(topothek, "document", document)
    return app


def test_a_wrong_token_is_refused(app):
    with pytest.raises(Exception):
        run(app, "/api/mcp/admin/", "wrong", names)


def test_tools_follow_the_scopes(app, admin):
    agent = token(admin, ["read:all", "write"])
    tools = run(app, "/api/mcp/admin/", agent, names)
    assert {"harvest_topothek", "create_places", "set_texts", "find_places"} <= tools
    assert "set_status" not in tools  # no review scope
    assert not any(t.startswith("scraping_") for t in tools)  # no scrape scope
    tools = run(app, "/api/mcp/admin/", API_KEY, names)
    assert {"set_status", "scraping_scrape_topothek_search"} <= tools


VILLAGE = {"name": "Oberuresch", "lat": 48.609008, "lon": 14.056219}
HOUSES = [
    {
        "name": f"Oberuresch {n}",
        "kind": "house",
        # about 30 m apart
        "lat": 48.6091 + n * 0.0003,
        "lon": 14.0563,
        "attributes": {"number": str(n)},
        "part_of": "Oberuresch",
    }
    for n in range(1, 11)
]


class Meter:
    """Counts the calls and the bytes the model reads (the text content)."""

    def __init__(self, client):
        self.client, self.calls, self.bytes = client, 0, 0

    async def __call__(self, name, arguments):
        result = await self.client.call_tool(name, arguments)
        self.calls += 1
        self.bytes += sum(len(c.text.encode()) for c in result.content)
        return parse(result)


def test_an_agent_drafts_a_village_and_a_reviewer_publishes_it(app, admin):
    agent = token(admin, ["read:all", "write"])

    async def draft(client):
        call = Meter(client)
        assert await call("find_places", {"text": "Oberuresch"}) == []
        places = await call("create_places", {"places": [VILLAGE, *HOUSES]})
        harvested = await call(
            "harvest_topothek",
            {
                "documents": [
                    {"url": DOCUMENT["source_url"], "places": [places[0]["slug"]]},
                    {"url": "https://example.org/", "places": []},
                ]
            },
        )
        media = harvested[0]["id"]
        texts = await call(
            "set_texts",
            {
                "texts": [
                    {
                        "resource": media,
                        "field": "title",
                        "lang": lang,
                        "body": body,
                        "method": "machine",
                        "translated_from": "de",
                        "model": "test",
                    }
                    for lang, body in (("en", "Karl and Anna"), ("cs", "Karel a Anna"))
                ]
            },
        )
        links = await call(
            "link",
            {
                "links": [
                    {"subject": media, "predicate": "shows", "object": p["slug"]}
                    for p in places[1:3]
                ]
            },
        )
        return call, places, harvested, texts, links

    call, places, harvested, texts, links = run(app, "/api/mcp/admin/", agent, draft)
    assert [p["name"] for p in places] == ["Oberuresch"] + [h["name"] for h in HOUSES]
    assert all(p["slug"] for p in places)
    assert harvested[0]["created"] and harvested[0]["year"] == 1945
    assert "error" in harvested[1]  # not a Topothek link; the first still counts
    assert texts == {"done": 2} and links == {"done": 2}
    # one call per step, not per item
    assert call.calls == 5
    drafting = call.bytes

    async def review(client):
        call = Meter(client)
        new = await call("list_resources", {"status": "new", "limit": 100})
        await call(
            "grant_permission", {"source": "topothek:deutsch-reichenau", "note": "test"}
        )
        done = await call(
            "set_status",
            {"resources": [item["id"] for item in new], "status": "published"},
        )
        house = await call("get_resource", {"key": places[1]["slug"]})
        return call, new, done, house

    call, new, done, house = run(app, "/api/mcp/admin/", API_KEY, review)
    assert len(new) == 12 and done == {"done": 12}
    assert house["status"] == "published" and house["attributes"] == {"number": "1"}
    (parent,) = [link for link in house["links"] if link["predicate"] == "part_of"]
    assert parent["direction"] == "out" and parent["label"] == "Oberuresch"
    assert call.calls == 4
    # what 11 places, a harvest, 2 translations, 2 links and a review cost the
    # model to read; the first agent test needed one call per item
    print(f"\nMCP scenario: {5 + call.calls} calls, {drafting + call.bytes} bytes")
    assert drafting + call.bytes < 8000

    async def read(client):
        found = (await client.call_tool("find_places", {"text": "ober"})).data
        detail = (
            await client.call_tool(
                "get_place", {"slug": places[1]["slug"], "lang": "en"}
            )
        ).data
        return found, detail

    found, detail = run(app, "/api/mcp/", token(admin, ["read"], "reader"), read)
    assert len(found) == 11
    (image,) = detail["images"]
    assert image["title"] == "Karl and Anna" and image["method"] == "machine"


def test_find_places_by_other_spelling_and_position(app, admin):
    async def steps(client):
        await client.call_tool(
            "create_places",
            {
                "places": [
                    {
                        "name": "Sankt Thoma",
                        "names": {"cs": "Svatý Tomáš"},
                        "lat": 48.62,
                        "lon": 14.1,
                    }
                ]
            },
        )

        async def find(**query):
            result = await client.call_tool("find_places", query)
            return parse(result)

        return (
            await find(text="St. Thoma"),
            await find(text="svaty tomas"),
            await find(lat=48.6201, lon=14.1, radius_m=50),
            await find(lat=48.63, lon=14.1, radius_m=50),
        )

    by_short, by_czech, near, far = run(app, "/api/mcp/admin/", API_KEY, steps)
    assert by_short[0]["name"] == "Sankt Thoma"
    assert by_czech[0]["names"] == ["Svatý Tomáš"]
    assert near[0]["distance_m"] == pytest.approx(11, abs=1)
    assert far == []


def test_create_places_refuses_duplicates(app, admin):
    async def steps(client):
        async def create(*places):
            result = await client.call_tool("create_places", {"places": list(places)})
            return parse(result)

        first = await create(
            {"name": "Sankt Thoma", "lat": 48.62, "lon": 14.1},
            {
                "name": "Haus 1",
                "kind": "house",
                "lat": 48.621,
                "lon": 14.1,
                "attributes": {"number": "1"},
            },
        )
        again = await create(
            # another spelling, 30 m away
            {"name": "St. Thoma", "lat": 48.6203, "lon": 14.1},
            # the same kind on the same spot
            {"name": "Kapelle", "kind": "house", "lat": 48.62101, "lon": 14.1},
            # the next house on the same spot is another house
            {
                "name": "Haus 2",
                "kind": "house",
                "lat": 48.62101,
                "lon": 14.1,
                "attributes": {"number": "2"},
            },
            # a different place altogether, created anyway
            {"name": "St. Thoma", "lat": 48.6203, "lon": 14.1, "force": True},
            {"name": "Nowhere", "kind": "castle", "lat": 48.0, "lon": 14.0},
        )
        return first, again

    first, (spelling, spot, house, forced, invalid) = run(
        app, "/api/mcp/admin/", API_KEY, steps
    )
    assert all("slug" in row for row in first)
    assert spelling["duplicate_of"][0]["name"] == "Sankt Thoma"
    assert "slug" not in spelling
    assert spot["duplicate_of"][0]["name"] == "Haus 1"
    assert "slug" in house and "slug" in forced
    assert "unknown place kind" in invalid["error"]


def test_paths_without_the_trailing_slash(app):
    assert {"set_status", "list_resources"} <= run(
        app, "/api/mcp/admin", API_KEY, names
    )
    assert "get_place" in run(app, "/api/mcp", API_KEY, names)


def test_the_public_server_needs_the_read_scope(app, admin):
    agent = token(admin, ["write"])
    assert run(app, "/api/mcp/", agent, names) == set()


def test_the_tool_list_stays_small(app):
    """The model reads the tool list (names, docs, schemas) on every turn."""

    async def size(client):
        tools = await client.list_tools()
        ours = [t for t in tools if not t.name.startswith("scraping_")]
        listed = [t.model_dump(mode="json", exclude_none=True) for t in ours]
        return len(ours), len(json.dumps(listed, ensure_ascii=False).encode())

    count, size = run(app, "/api/mcp/admin/", API_KEY, size)
    print(f"\nadmin tools: {count}, {size} bytes (without the scraper's)")
    assert size < 16000


# Imports from the scrapers, without the network -----------------------------------

SUEDBOEHMEN = {
    "language": "de",
    "retrieved_at": "2026-10-27T10:00:00Z",
    "source": "suedboehmenarchiv",
    "id": 3223,
    "name": "Oberuresch",
    "houses": [
        {
            "id": 12950 + n,
            "number": str(n),
            "name": name,
            "address": "verfallen",
            "history": "Lange Geschichte ...",
            "lat": 48.6091 + n * 0.0003,
            "lon": 14.0563,
            "source_url": f"https://suedboehmenarchiv.eu/haus_sb.php?id_haus={12950 + n}",
        }
        for n, name in ((1, "Gregern"), (2, None), (3, "Jågl-Kårl"))
    ]
    + [{"id": 12999, "number": "9", "source_url": "https://suedboehmenarchiv.eu/"}],
}

KOSTELY = {
    "language": "cs",
    "retrieved_at": "2026-10-27T10:00:00Z",
    "source": "znicenekostely",
    "total": 2,
    "objects": [
        {
            "id": 11154,
            "name": "Kaple sv. Jana",
            "category": "Velké kaple",
            "state": "Zaniklé",
            "lat": 48.609008,
            "lon": 14.0562,
            "source_url": "https://www.znicenekostely.cz/objekt/detail/11154",
        },
        {
            "id": 11155,
            "name": "Hřbitov",
            "category": "Hřbitovy",
            "lat": 48.612,
            "lon": 14.058,
            "source_url": "https://www.znicenekostely.cz/objekt/detail/11155",
        },
    ],
}


@pytest.fixture
def importing(app, monkeypatch):
    from importers import suedboehmen, znicenekostely

    async def village(name):
        if name != "Oberuresch":
            raise LookupError(f"No village matches {name!r}")
        return SUEDBOEHMEN

    async def objects_near(lat, lon, radius_km):
        return KOSTELY

    monkeypatch.setattr(suedboehmen, "village", village)
    monkeypatch.setattr(znicenekostely, "objects_near", objects_near)
    return app


def test_houses_and_chapels_are_imported_once(importing, admin):
    async def steps(client):
        async def tool(name, arguments):
            return parse(await client.call_tool(name, arguments))

        (village,) = await tool("create_places", {"places": [VILLAGE]})
        # an agent made house 3 by hand before
        await tool(
            "create_places",
            {
                "places": [
                    {
                        "name": "Jågl-Kårl",
                        "kind": "house",
                        "lat": 48.6091 + 3 * 0.0003,
                        "lon": 14.0563,
                    }
                ]
            },
        )
        args = {"village": "Oberuresch", "place": village["slug"]}
        first = await tool("import_suedboehmen_houses", args)
        again = await tool("import_suedboehmen_houses", args)
        sacral = await tool(
            "import_sacral_buildings",
            {"lat": 48.609, "lon": 14.056, "place": village["slug"]},
        )
        house = await tool("get_resource", {"key": first["created"][0]["slug"]})
        return first, again, sacral, house

    first, again, sacral, house = run(importing, "/api/mcp/admin/", API_KEY, steps)
    assert [h["name"] for h in first["created"]] == ["Oberuresch 1", "Oberuresch 2"]
    assert first["duplicates"][0]["duplicate_of"][0]["name"] == "Jågl-Kårl"
    assert first["skipped"] == [{"number": "9", "reason": "no coordinates"}]
    assert len(again["existing"]) == 2 and "created" not in again
    assert {(c["name"]) for c in sacral["created"]} == {"Kaple sv. Jana", "Hřbitov"}
    assert house["kind"] == "house"
    assert house["attributes"] == {
        "number": "1",
        "house_name": "Gregern",
        "address": "verfallen",
    }
    assert house["sources"] == [SUEDBOEHMEN["houses"][0]["source_url"]]
    (parent,) = house["links"]
    assert parent["predicate"] == "part_of" and parent["label"] == "Oberuresch"
    # the history stays in the record
    assert "description" not in house.get("texts", {})


def test_sacral_kinds_and_an_unknown_village(importing, admin):
    async def steps(client):
        async def tool(name, arguments):
            return parse(await client.call_tool(name, arguments))

        (village,) = await tool("create_places", {"places": [VILLAGE]})
        await tool(
            "import_sacral_buildings",
            {"lat": 48.609, "lon": 14.056, "place": village["slug"]},
        )
        kinds = {
            row["name"]: row["kind"]
            for row in await tool("find_places", {"lat": 48.609, "lon": 14.056})
        }
        try:
            await client.call_tool(
                "import_suedboehmen_houses", {"village": "Nirgendwo", "place": "x"}
            )
        except Exception as e:
            return kinds, str(e)

    kinds, error = run(importing, "/api/mcp/admin/", API_KEY, steps)
    assert kinds["Kaple sv. Jana"] == "chapel"
    assert kinds["Hřbitov"] == "landmark"
    assert "No village matches" in error
