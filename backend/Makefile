run-etl:
	uv run python etl.py

run-api:
	uv run uvicorn main:app --reload

run-local-tile-server:
	uv run uvicorn local_tile_server:app --reload

docker-build:
	docker build -t time-strolls-api .

docker-run:
	docker run -p 8000:8000 -l time-strolls-api time-strolls-api

docker-stop:
	docker rm -f $$(docker ps -q --filter label=time-strolls-api)
