#!/bin/sh
# Deploys one released version on the droplet (called by the release
# workflow, .github/workflows/release.yml): backs up the database, pulls
# the images of that version and restarts what changed. Never runs
# "down", so the containers are replaced and the volumes stay untouched.
# Usage: sh deploy.sh <version> <registry>, e.g. sh deploy.sh 0.2.0 debtray-registry
# The workflow puts a short-lived, read-only registry login (config.json)
# next to this script; it is removed again at the end.
set -eu
cd "$(dirname "$0")"
trap 'rm -f config.json' EXIT

export IMAGE_TAG="$1"
export DO_REGISTRY="$2"
compose="docker compose -f docker-compose.yml --env-file credentials.prod"

sh backup.sh "$IMAGE_TAG"
DOCKER_CONFIG="$PWD" $compose pull api frontend
$compose up -d --remove-orphans
docker image prune -f
$compose ps
