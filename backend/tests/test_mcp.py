"""The MCP servers over HTTP, as a client sees them: tokens, which tools a
scope lists, drafts and review, and the public server's view."""

import asyncio

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


async def names(client):
    return {t.name for t in await client.list_tools()}


@pytest.fixture
def app(clean, monkeypatch):
    from api.main import app
    from importers import topothek

    async def document(url):
        return DOCUMENT

    monkeypatch.setattr(topothek, "document", document)
    return app


def test_a_wrong_token_is_refused(app):
    with pytest.raises(Exception):
        run(app, "/api/mcp/admin/", "wrong", names)


def test_tools_follow_the_scopes(app, admin):
    agent = token(admin, ["read:all", "write"])
    tools = run(app, "/api/mcp/admin/", agent, names)
    assert {"harvest_topothek", "create_place", "set_text"} <= tools
    assert "set_status" not in tools  # no review scope
    assert not any(t.startswith("scraping_") for t in tools)  # no scrape scope
    tools = run(app, "/api/mcp/admin/", API_KEY, names)
    assert {"set_status", "scraping_scrape_topothek_search"} <= tools


def test_an_agent_drafts_and_a_reviewer_publishes(app, admin):
    agent = token(admin, ["read:all", "write"])

    async def draft(client):
        place = (
            await client.call_tool(
                "create_place",
                {"name": "Oberuresch", "lat": 48.609008, "lon": 14.056219},
            )
        ).data
        house = (
            await client.call_tool(
                "create_place",
                {
                    "name": "Oberuresch 3",
                    "kind": "house",
                    "lat": 48.6091,
                    "lon": 14.0563,
                    "attributes": {"number": "3", "house_name": "Jågl-Kårl"},
                    "part_of": place["slug"],
                },
            )
        ).data
        harvested = (
            await client.call_tool(
                "harvest_topothek",
                {
                    "url": DOCUMENT["source_url"],
                    "places": [place["slug"], house["slug"]],
                },
            )
        ).data
        await client.call_tool(
            "set_text",
            {
                "resource": harvested["media"]["id"],
                "field": "title",
                "lang": "en",
                "body": "Karl and Anna",
                "method": "machine",
                "translated_from": "de",
                "model": "test",
            },
        )
        return place, house, harvested

    place, house, harvested = run(app, "/api/mcp/admin/", agent, draft)
    assert place["status"] == house["status"] == "new"
    assert harvested["created"] and harvested["media"]["status"] == "new"
    assert admin.get("/api/locations/").json() == []

    async def publish(client):
        new = (await client.call_tool("list_resources", {"status": "new"})).data
        await client.call_tool(
            "grant_permission", {"source": "topothek:deutsch-reichenau", "note": "test"}
        )
        for item in new:
            await client.call_tool(
                "set_status", {"resource": item["id"], "status": "published"}
            )
        return new, (await client.call_tool("history", {"id": place["id"]})).data

    new, history = run(app, "/api/mcp/admin/", API_KEY, publish)
    assert len(new) == 3
    assert history[0]["run"] == {"model": "test"}

    async def read(client):
        found = (await client.call_tool("find_places", {"text": "ober"})).data
        detail = (
            await client.call_tool("get_place", {"slug": house["slug"], "lang": "en"})
        ).data
        return found, detail

    found, detail = run(app, "/api/mcp/", token(admin, ["read"], "reader"), read)
    assert {p["name"] for p in found} == {"Oberuresch", "Oberuresch 3"}
    (image,) = detail["images"]
    assert image["title"] == "Karl and Anna" and image["method"] == "machine"


def test_paths_without_the_trailing_slash(app):
    assert {"set_status", "list_resources"} <= run(
        app, "/api/mcp/admin", API_KEY, names
    )
    assert "get_place" in run(app, "/api/mcp", API_KEY, names)


def test_the_public_server_needs_the_read_scope(app, admin):
    agent = token(admin, ["write"])
    assert run(app, "/api/mcp/", agent, names) == set()
