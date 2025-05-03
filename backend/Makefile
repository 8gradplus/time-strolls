run:
	uv run uvicorn api.main:app --reload

docker-build:
	DOCKER_DEFAULT_PLATFORM=linux/amd64  docker build -t time-strolls-api .

docker-run:
	DOCKER_DEFAULT_PLATFORM=linux/amd64 docker run -p 8000:8000 -l time-strolls-api time-strolls-api

docker-stop:
	docker rm -f $$(docker ps -q --filter label=time-strolls-api)
