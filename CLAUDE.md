# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Time Strolls ("Stroll in space and time") is a map app for historical exploration of the Deutsch Reichenau region (Austria/Czech border). Users see places on a Leaflet map, optionally overlay a georeferenced 1945 US Army map, and open each place for historical images and an audio podcast. Tours are GPS tracks drawn on the map. Production: `https://timestrolls.debtray.com`.

Monorepo layout: `backend/` (FastAPI + SQLModel, Python ≥3.13, managed with `uv`), `frontend/` (Vite, React 19, react-leaflet, MUI), `deployment/` (docker compose + Caddy + Flyway), `resources/` (raw source data: GPX tracks, images, podcasts, TIFs, tiles, Topothek crawl output).

## Commands

### Backend (run from `backend/`)
- `make run-api` — dev server on :8000 with reload. It sources `../deployment/credentials.local` for env vars, and that file must exist.
- `make test` / `uv run pytest` — tests. pytest and ruff are in the `test` extra (`uv sync --extra test`, as in CI). The `dev` extra includes `test` plus the geo/notebook stack.
- `make lint` / `uv run ruff check .` — lint (default rules, notebooks excluded). `make check` runs lint and tests, as in CI.
- Single test: `uv run pytest tests/test_slug.py::TestSlugify::test_slugify_basic`
- `make test-cov` — coverage for `helpers` and `api`.
- `make run-etl` — runs `etl.py`: georeferences `resources/us-army-1945.jpeg` with hardcoded ground control points into a GeoTIFF, then cuts it into map tiles. Needs the geo dev extras (rasterio, titiler, etc.).
- `make run-local-tile-server` — serves tiles locally for inspection.
- API docs: `http://localhost:8000/api/docs`.

### Frontend (run from `frontend/`)
- Vite. `npm start` — dev server on :3000. `vite.config.js` proxies `/api` to the **production** API by default; `API_PROXY=http://127.0.0.1:8000 npm start` uses a local backend.
- `npm test` (Vitest, watch; `npx vitest run` once), `npm run build` (into `build/`), `npm run format` / `format:check` (Prettier). JSX files must use the `.jsx` extension.
- `make check` runs the same checks as CI (format, tests, build).
- The Docker image serves the static build with Caddy on :3000 (`frontend/Caddyfile`).

### CI
- `.github/workflows/ci.yml` on push/PR to `main`: backend ruff + pytest, frontend prettier + vitest + build, and a Docker build of both images (no push).

### Deployment (run from `deployment/`)
- Local full stack: `make run` (`docker compose --env-file credentials.local up -d --build`). This picks up `docker-compose.override.yml` automatically, which adds port mappings and `Caddyfile.local`.
- Production: `deploy_production.sh` SSHes into the DigitalOcean droplet via `doctl`, downloads the `main` branch zip from GitHub, copies `credentials.prod`, and runs `make run-prod` (base compose only, without overrides). There is no image registry, so whatever is on `main` gets deployed.
- Inspect the interpolated compose config: `docker compose --env-file credentials.local config`.
- To develop the API locally against a DB, start the compose stack, stop the `api`/`frontend` services, then run `make run-api` in `backend/`.

## Architecture

**Config:** `backend/config/__init__.py` loads `config.yml` with EnvYAML (`${VAR}` interpolation from env) and validates it against the pydantic `Validator` in `config/validate.py`. The resulting module-level `config` object is imported everywhere (`from config import config`). `backend/config.yml` targets `localhost` for local runs. In Docker, `deployment/api-config.yml` (host `postgres.timestrolls`) is mounted over `/app/config.yml`. Keep both files in sync when adding config keys. Required env vars: `API_KEY`, `POSTGRES_USER`, `POSTGRES_USER_PASSWORD`, `SPACES_KEY`, `SPACES_SECRET` (plus `POSTGRES_ADMIN*` for compose/Flyway).

**API (`backend/api/`):** `main.py` mounts routers from `api/controller/`. Each controller pairs with SQLModel table/DTO classes in `api/model/`. Routes are prefixed with `/api/...`.
- `place`, `image`, `podcast` and the write side of `tour` require the `X-API-Key` header (`api/auth/api_key.py`). They are admin/content-management endpoints.
- `location` (`/api/locations`) is public and is what the frontend uses. It assembles a place together with its podcast and its images (sorted by year, nulls last) into one response (`api/model/location.py`).
- `tour.router_public` (`/api/tours`) exposes tours publicly.
- Places are looked up by **slug or numeric id** (slug first, id as a fallback for backward compatibility). Slugs come from `helpers/slug.py`, which encodes the name plus coordinates (e.g. `test-n48-000-e14-000`). Generation must stay deterministic. `tests/test_slug.py` covers this.

**Database:** PostGIS, schema `timestrolls`. Migrations are Flyway SQL files in `backend/migration/` (`V001_00N__*.sql`), applied by the `migrate-postgres` compose service before the API starts. Migrations create the restricted app user via the `${user}`/`${password}` Flyway placeholders. Every new table or sequence needs explicit `GRANT`s to `"${user}"`. `tour.geom` is a `LineStringZ` (EPSG:4326), and `length` is a generated column in km. Tours are uploaded as GPX (gpxpy/shapely/geoalchemy2).

**Media/CDN:** Images, podcasts and map tiles are stored in DigitalOcean Spaces (S3-compatible, via boto3 in `helpers/cdn.py`, uploaded `public-read`), under the paths in `config.cdn.path`. The DB stores only the `url`/`path` and a content `hash`. Deleting a DB record should also delete the CDN object. Images can be imported from Topothek (`topothek/crawl.py`, `POST /api/images/topothek/`).

**Frontend (`frontend/src/`):** `Map.jsx` is the root view. **The URL query string is the single source of truth for UI state**: `location` (slug of the open info panel), `tour`, `markers`, `year` (historic aerial imagery; an old `historic=true` is rewritten to a year), `track`, `centered`. Change state with `setSearchParams` instead of local state, so that views stay deep-linkable. API paths are centralized in `api.js`. Historic imagery lives in `src/historic/`: `manifest.js` (pure functions, unit-tested), `useManifest.js` and `HistoricLayers.jsx` (tile layers and `ViewBounds`); see "Historic imagery" below. UI strings live in `LanguageContext.jsx` (`de` default, `cz`, `en`); add every new string to all three languages.

## Historic imagery (aerial-timeline tiles, planned frontend work)

Historic aerial imagery now comes from the separate package `../aerial-timeline`.
That package collects the imagery, renders static WebP tiles and publishes them to
the Spaces bucket `timestrolls` behind a CDN. The frontend only displays them: there
is no tile server and no backend involvement. Any logic beyond display (a "best tile"
choice and similar) goes into aerial-timeline or a later API, not into React.

**Entry point:** `https://timestrolls.fra1.cdn.digitaloceanspaces.com/tiles/manifest.json`
- CORS is `*`. The manifest is cached for 5 min; tiles are cached for 1 day and
  never change once rendered.
- The manifest is shared by all aerial-timeline projects, so it also lists Berlin.
  Show only the years whose `bounds` intersect the map view or our region.

```
{ "version": 1, "generated": "<ISO time>",
  "times": {                       // key = year (string), sorted ascending
    "1952": {
      "bounds": [w, s, e, n],      // EPSG:4326, union of the year's layers
      "min_zoom": 10, "max_native_zoom": 17,
      "attribution": "...",        // all layers of the year, joined with " | "
      "layers": [                  // ranked best first (finer gsd, then priority)
        { "id": "cz-cenia-ortho", "title": "...",
          "url": "cz-cenia-ortho/1952/{z}/{x}/{y}.webp",  // RELATIVE to manifest.json
          "datetime": ["1952"],    // real acquisition dates, ISO 8601 (may be intervals)
          "bounds": [w, s, e, n], "min_zoom": 10, "max_native_zoom": 17,
          "gsd": 0.5,              // metres per pixel
          "priority": 0, "licence": "CC-BY-4.0", "attribution": "...",
          "redistribute": true, "enhanced": false, "ai_generated": false } ] } } }
```

**Tile format:** 256 px WebP with alpha, transparent outside coverage. Empty tiles
are not stored, so a 404 is normal outside coverage: no `errorTileUrl`, no retries.

**Live as of 2026-10-20:**

| Year | Layer | Area | Max zoom |
|---|---|---|---|
| 1949, 1952 | `cz-cenia-ortho` | Czech side of the Deutsch Reichenau / Přední Výtoň area; 1949 only a northern strip | 17 |
| 2023 | `at-basemap-ortho` | basemap.at, Austrian side (St. Oswald, Haslach) | 18 |
| 2025 | `cz-cuzk-ortho` | ČÚZK, Czech side; **testing only**, licence of the tile service unconfirmed | 18 |
| 1928, 1953 | Berlin | not our region; 1953 covers ~82% of the city | 17 |

The Šumava box is lon 14.00–14.16, lat 48.58–48.68. The 1945 US Army print is not
in the manifest yet; it will come from another service later (aerial-timeline
roadmap step 6). The frontend uses **only** tiles from the `timestrolls` bucket
(the manifest). Drop the old 1945 URL (`debtray` bucket). Until 1945 is published,
an old `historic=true` link opens the earliest manifest year in the region.

**TODO: move the legacy 1945 pipeline to aerial-timeline.** These files stay here
for now. Don't delete them, and don't build new features on them:
- `backend/etl.py` (ground control points), `backend/transform/`, `backend/helpers/image.py`
- `backend/local_tile_server.py`, `backend/notebooks/transformations.ipynb`
- `make run-etl` / `make run-local-tile-server`, and the geo packages in the `dev` extra

The API doesn't import any of this. Once aerial-timeline has the ground control
points (its roadmap step 6), remove these files in one commit.

**What the frontend needs:**
- Load the manifest once (from the CDN, not via `/api`) and keep it in state.
  Build tile URLs as `new URL(layer.url, manifestUrl)`.
- **Time selection:**
  - Replace the boolean `historic` query parameter with `year=<YYYY>`. The query
    string stays the single source of truth.
  - Map an old `historic=true` link to the earliest manifest year in the region (1945 once
    it is published), so existing deep links keep working.
  - Offer only the years whose `bounds` touch the current view.
- **Layers per year:** until aerial-timeline publishes the `tiles/best/{year}`
  composite (its roadmap step 5), render **all** layers of the year.
  - Use one `TileLayer` per layer, in reverse rank order, so the best is on top and
    the others fill gaps; the alpha channel makes this work.
  - Per layer, set: `maxNativeZoom={layer.max_native_zoom}`,
    `minNativeZoom={layer.min_zoom}`, a map-level `maxZoom` above it (Leaflet upscales),
    and `bounds={[[s, w], [n, e]]}` (avoids requests outside coverage).
  - Also `noWrap`, and `attribution` = layer attribution + licence.
  - Once `best/` exists, use one layer per year: `best/{year}/{z}/{x}/{y}.webp`,
    with the year's `max_native_zoom` and `attribution`.
- **Labels and attribution:**
  - Show the real date (`datetime`, e.g. "June 1953", "1952") rather than just the
    year key.
  - Mark `enhanced` / `ai_generated` layers visibly (none so far).
  - Licences require attribution (CC BY 4.0), so always show it.
  - Add every new UI string to all three languages in `LanguageContext.jsx`.
- **Offline caching** (`OFFLINE_CACHING_STRATEGY.md`): tile URLs are immutable, so
  they cache well. Re-fetch the manifest; don't cache it long.

**Roadmap:** `ROADMAP.md` holds the agreed plan and the status of each step. Read it when asked what's next, and update its status table when a step lands.

**Planned work:** `OFFLINE_CACHING_STRATEGY.md` is a design doc (not yet implemented) for user-initiated, viewport-based offline downloads using the Cache API and a service worker. Read it before working on offline or PWA features.
