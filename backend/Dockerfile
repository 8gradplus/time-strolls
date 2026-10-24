# syntax=docker/dockerfile:1
# Titiler does not run on this image! see
# Ref: https://github.com/developmentseed/titiler/blob/main/dockerfiles/Dockerfile

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


# Install uv and add it to path
# git and ssh fetch time-strolls-scraper, a private repository (deploy key)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git openssh-client
RUN mkdir -p ~/.ssh && echo "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl" > ~/.ssh/known_hosts
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin/:$PATH"

# Copy application code
ADD . /app
WORKDIR /app
# The key comes from the build's SSH agent (ssh: default) and stays out of the image
RUN --mount=type=ssh uv sync --no-dev
EXPOSE 8000

# Start the FastAPI server
#CMD uv run gunicorn -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:8000 --workers 4 --log-level info   --access-logfile - --error-logfile -

CMD uv run gunicorn -k uvicorn.workers.UvicornWorker api.main:app \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --log-level info \
    --access-logfile - \
    --error-logfile -
