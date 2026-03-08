run-etl:
	uv run python etl.py

run-api:
	# source and export (set) env variables from file
	set -a && source ../deployment/credentials.local && set +a &&  uv run uvicorn api.main:app --host 0.0.0.0  --reload

run-local-tile-server:
	uv run uvicorn local_tile_server:app --reload

docker-build:
	docker build -t time-strolls-api .

docker-run:
	docker run --env-file ../deployment/credentials.local -p 8000:8000 -l time-strolls-api time-strolls-api

docker-stop:
	docker rm -f $$(docker ps -q --filter label=time-strolls-api)

# Testing
test:
	uv run pytest

test-verbose:
	uv run pytest -vv

test-cov:
	uv run pytest --cov=helpers --cov=api --cov-report=term-missing --cov-report=html

test-watch:
	uv run pytest --watch

test-slug:
	uv run pytest tests/test_slug.py -v
