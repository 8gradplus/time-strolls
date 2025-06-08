# Titiler does not run on this image! see
# Ref: https://github.com/developmentseed/titiler/blob/main/dockerfiles/Dockerfile

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


# Install uv and add it to path
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin/:$PATH"

# Copy application code
ADD . /app
WORKDIR /app
RUN uv sync --no-dev
EXPOSE 8000

# Start the FastAPI server
#CMD uv run gunicorn -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:8000 --workers 4 --log-level info   --access-logfile - --error-logfile -

CMD uv run gunicorn -k uvicorn.workers.UvicornWorker api.main:app \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --log-level info \
    --access-logfile - \
    --error-logfile -
