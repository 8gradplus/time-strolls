run-etl:
	uv run python etl.py

run-api:
	# source and export (set) env variables from file
	set -a && source ../deployment/.env && set +a &&  uv run uvicorn api.main:app --host 0.0.0.0  --reload

run-local-tile-server:
	uv run uvicorn local_tile_server:app --reload

docker-build:
	docker build -t time-strolls-api .

docker-run:
	docker run --env-file ../deployment/.env -p 8000:8000 -l time-strolls-api time-strolls-api

docker-stop:
	docker rm -f $$(docker ps -q --filter label=time-strolls-api)

lint:
	uv run ruff check .

# Same checks as CI
check: lint test

# Testing. The database tests need a PostGIS server (else they are skipped):
# make test-db starts one on :5433 (as in CI), make test-db-stop removes it.
test:
	uv run pytest

test-db:
	docker run -d --rm --name timestrolls-test-db -p 5433:5432 \
		-e POSTGRES_PASSWORD=postgres postgis/postgis:17-3.5

test-db-stop:
	docker rm -f timestrolls-test-db

test-verbose:
	uv run pytest -vv

test-cov:
	uv run pytest --cov=helpers --cov=api --cov=service --cov-report=term-missing --cov-report=html

test-watch:
	uv run pytest --watch

test-slug:
	uv run pytest tests/test_slug.py -v
