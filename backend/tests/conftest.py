"""
Pytest configuration file.

Database tests run against a PostGIS server: TEST_POSTGRES_URL (an admin
connection), by default the container of `make test-db` on port 5433. They
create the database timestrolls_test, apply the migrations as Flyway would
and connect as the restricted app user, so missing grants fail. Without a
server they are skipped (in CI, with REQUIRE_TEST_DB set, they fail).
"""

import os
import sys
from pathlib import Path

import pytest

# Add the backend directory to Python path so imports work correctly
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

ADMIN_URL = os.environ.get(
    "TEST_POSTGRES_URL", "postgresql://postgres:postgres@localhost:5433/postgres"
)
DB, USER, PASSWORD = "timestrolls_test", "timestrolls_test", "test"
API_KEY = "test-api-key"

# Read by config.yml when the API is imported (only by the database tests)
os.environ.update(
    API_KEY=API_KEY,
    POSTGRES_DB=DB,
    POSTGRES_USER=USER,
    POSTGRES_USER_PASSWORD=PASSWORD,
    SPACES_KEY="test",
    SPACES_SECRET="test",
)


def admin_connection(dbname: str):
    import psycopg2
    from psycopg2.extensions import make_dsn, parse_dsn

    dsn = parse_dsn(ADMIN_URL)
    connection = psycopg2.connect(make_dsn(**{**dsn, "dbname": dbname}))
    connection.autocommit = True
    return connection, dsn


@pytest.fixture(scope="session")
def database():
    """A fresh database with the migrations applied."""
    try:
        connection, dsn = admin_connection("postgres")
    except Exception as e:
        if os.environ.get("REQUIRE_TEST_DB"):  # CI: fail instead of skipping
            raise
        pytest.skip(f"no PostGIS server for database tests ({e}); see make test-db")
    with connection.cursor() as cursor:
        cursor.execute(f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)")
        cursor.execute(f"CREATE DATABASE {DB}")
    connection.close()

    connection, _ = admin_connection(DB)
    with connection.cursor() as cursor:
        for path in sorted((backend_dir / "migration").glob("V*.sql")):
            sql = path.read_text().replace("${user}", USER)
            cursor.execute(sql.replace("${password}", PASSWORD))
    connection.close()

    os.environ["POSTGRES_HOST"] = dsn.get("host", "localhost")
    os.environ["POSTGRES_PORT"] = str(dsn.get("port", 5432))
    yield


@pytest.fixture
def clean(database):
    """Empties the content tables (as admin) before a test."""
    connection, _ = admin_connection(DB)
    with connection.cursor() as cursor:
        cursor.execute(
            """TRUNCATE timestrolls.change_log, timestrolls.relation,
            timestrolls.text, timestrolls.resource_source, timestrolls.file,
            timestrolls.permission, timestrolls.source_record,
            timestrolls.source, timestrolls.slug_alias, timestrolls.place,
            timestrolls.media, timestrolls.tour, timestrolls.resource,
            timestrolls.api_token, timestrolls.party, timestrolls.account
            CASCADE"""
        )
        cursor.execute(
            "INSERT INTO timestrolls.account (kind, name) VALUES ('system', 'admin')"
        )
    connection.close()


@pytest.fixture
def client(clean):
    from fastapi.testclient import TestClient

    from api.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture
def admin(client):
    """A client with the admin's token (API_KEY)."""
    client.headers["Authorization"] = f"Bearer {API_KEY}"
    return client
