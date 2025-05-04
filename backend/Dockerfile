# Ref: https://github.com/developmentseed/titiler/blob/main/dockerfiles/Dockerfile
# Currently uv installs and runs don't work
# FROM python:3.12-slim
FROM bitnami/python:3.12
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
# RUN pip install --no-cache-dir uv
RUN python -m pip install -U pip
RUN python -m pip install gunicorn uvicorn fastapi "titiler.core"

COPY . .

EXPOSE 8000
# Start the FastAPI server
CMD gunicorn -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:8000 --workers 4
