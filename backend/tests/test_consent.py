"""The OAuth consent page names our server, not FastMCP (ROADMAP.md)."""

from fastmcp.server.auth.oauth_proxy.ui import create_consent_html


def test_consent_page_shows_our_logo_and_site(database):
    # Importing the API creates the database engine from the settings that
    # the fixture `database` provides: never import it at the top of a test
    # module (in CI every database test then failed with port 5432)
    from api.main import app

    server = app.state.fastmcp_server
    html = create_consent_html(
        client_id="client",
        redirect_uri="https://claude.ai/callback",
        scopes=[],
        txn_id="txn",
        csrf_token="csrf",
        server_name=server.name,
        server_icon_url=server.icons[0].src,
        server_website_url=server.website_url,
    )
    assert 'src="https://timestrolls.debtray.com/logo192.png"' in html
    assert 'href="https://timestrolls.debtray.com"' in html
    assert "Time Strolls admin" in html
