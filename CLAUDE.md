# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Time Strolls ("Stroll in space and time") is a map app for historical exploration of the Deutsch Reichenau region (Austria/Czech border). Users see places on a Leaflet map, optionally overlay a georeferenced 1945 US Army map, and open each place for historical images and an audio podcast. Tours are GPS tracks drawn on the map. Production: `https://timestrolls.debtray.com`.

Monorepo layout: `backend/` (FastAPI + SQLModel, Python ≥3.13, managed with `uv`), `frontend/` (Vite, React 19, react-leaflet, MUI), `deployment/` (docker compose + Caddy + Flyway), `resources/` (raw source data: GPX tracks, images, podcasts, TIFs, tiles, Topothek crawl output).

## Commands

### Backend (run from `backend/`)
- `make run-api` — dev server on :8000 with reload. It sources `../deployment/.env` (the local passwords and keys), and that file must exist.
- `make test` / `uv run pytest` — tests. The database tests need a PostGIS server: `make test-db` starts one on :5433 (as the CI service; `make test-db-stop`), otherwise they are skipped (`tests/conftest.py`: a fresh database `timestrolls_test`, the migrations applied, connected as the restricted app user). pytest and ruff are in the `test` extra (`uv sync --extra test`, as in CI). The `dev` extra includes `test` plus the geo/notebook stack.
- `make lint` / `uv run ruff check .` — lint (default rules). `make check` runs lint and tests, as in CI.
- Single test: `uv run pytest tests/test_slug.py::TestSlugify::test_slugify_basic`
- `make test-cov` — coverage for `helpers`, `api` and `service`.
- `make run-etl` — runs `etl.py`: georeferences `resources/us-army-1945.jpeg` with hardcoded ground control points into a GeoTIFF, then cuts it into map tiles. Needs the geo dev extras (rasterio, titiler, etc.).
- `make run-local-tile-server` — serves tiles locally for inspection.
- API docs: `http://localhost:8000/api/docs`.

### Content replay (run from `replay/`)
- `replay/places.yml` is the curated content: the sources and the permissions to show their content (show only, no copy), places (kind, other original names, `part_of`) with their Topothek image links and podcasts, and the tours (GPX files in `replay/tours/`). An image or podcast may be listed at several places. Edit it by hand; it replaced the notebook `upload_data.ipynb` (the notebooks were removed on 2026-10-22).
- `make local` / `make production` replay it through the admin API (`/api/admin/...`): only what is missing is added (also missing links), nothing is changed or deleted, and what is added is published, so it can run any number of times (an empty database gets everything; a full run harvests about 560 Topothek documents, one per second). Each target has its own bearer token in `replay/.env` (git-ignored, only on your Mac): `API_KEY_LOCAL` (the local stack's `API_KEY`) and `API_KEY_PRODUCTION`. The environment wins over the file. The script is a safety net run by hand on the Mac, never on a server.
- `make check` (production) / `make check-local` only list what would be added and what differs; they need the token too (they read the admin routes, which also see unpublished content). To try changes, replay a small file: `uv run replay.py local --file <subset>.yml`.
- Its own uv project (httpx, pydantic, PyYAML), separate from the backend: it only talks to the HTTP API. `make lint`, `make test`.

### Frontend (run from `frontend/`)
- Vite. `npm start` — dev server on :3000. `vite.config.js` proxies `/api` to the **production** API by default; `API_PROXY=http://127.0.0.1:8000 npm start` uses a local backend.
- `make phone` (with `npm start` running) — a real Android phone over USB opens the dev server as `http://localhost:3000` (`adb reverse`); inspect it in `chrome://inspect`, screenshot with `adb exec-out screencap -p`.
- `npm test` (Vitest, watch; `npx vitest run` once), `npm run build` (into `build/`), `npm run format` / `format:check` (Prettier). JSX files must use the `.jsx` extension.
- `make check` runs the same checks as CI (format, tests, build).
- The Docker image serves the static build with Caddy on :3000 (`frontend/Caddyfile`).

### CI
- `.github/workflows/ci.yml` on push/PR to `main`: backend ruff + pytest, frontend prettier + vitest + build, and a Docker build of both images (no push).

### Deployment (run from `deployment/`)
- Local full stack: `make run` (`docker compose up -d --build`). Compose reads the passwords and keys from `deployment/.env` (git-ignored, your own local values: `POSTGRES_ADMIN_PASSWORD`, `POSTGRES_USER_PASSWORD`, `API_KEY`, `SPACES_KEY`, `SPACES_SECRET`) and picks up `docker-compose.override.yml`, which builds the images from source and adds port mappings, `Caddyfile.local` and a normal local database volume. The API build needs your SSH agent (see "Topothek import"). Stop the Vite dev server first (both use :3000).
- Production is released, not built on the droplet: publishing a GitHub release (tag `vX.Y.Z`) runs `.github/workflows/release.yml`. It builds `timestrolls-api` and `timestrolls-frontend`, pushes them to the DigitalOcean registry (`REGISTRY` in the workflow, `debtray-registry` for now) as `:<version>` and `:latest`, copies `docker-compose.yml` and `Caddyfile.prod` to `~/timestrolls/` on the droplet, writes the passwords and keys from the GitHub secrets into `.env` there, pulls the version and runs `docker compose up -d` (never `down`), waits for `/api/ready` and sends a private Slack message. **Rollback:** run the workflow by hand with an earlier tag; it deploys that version without building. Everything about deploying is in that one file.
- **Secrets** are repository secrets only (no company secrets; moving to a dedicated DigitalOcean account changes only them and `REGISTRY`): `DO_ACCESS_TOKEN` (registry, droplet read), `SSH_KEY`, `KNOWN_HOSTS`, `POSTGRES_ADMIN_PASSWORD`, `POSTGRES_USER_PASSWORD`, `API_KEY`, `SPACES_KEY`, `SPACES_SECRET`, `SLACK_WEBHOOK_URL`, `SCRAPER_DEPLOY_KEY` (read access to the private scraper). Everything else (user names `postgres` and `user`, database, hosts, bucket, domain) is written into `docker-compose.yml` and `backend/config.yml`. GitHub secrets can't be read back; keep the values in a password manager too.
- **The live data** is in the droplet's Docker volume `timestrolls_pg17` (PostgreSQL 17 since v0.4.0; the old `deployment_postgres`, PostgreSQL 13, stays for a rollback to v0.3.x), declared `external` in `docker-compose.yml`, so compose never creates or deletes it and won't start without it. Never run `docker compose down -v` on the droplet. There are no automatic backups until the managed database (roadmap).
- The migrations ship inside the API image: the one-shot service `migration-files` copies them into a volume for Flyway (pinned to 11.9.1), so a release pins code and migrations together.
- Inspect the compose config: `docker compose config` (local) or `docker compose -f docker-compose.yml config` (production, without the override).
- To develop the API locally against a DB, start the compose stack, stop the `api`/`frontend` services, then run `make run-api` in `backend/`.

## Architecture

**Config:** `backend/config/__init__.py` loads `config.yml` with EnvYAML (`${VAR}` interpolation from env, `${VAR|default}` for a default) and validates it against the pydantic `Validator` in `config/validate.py`. The resulting module-level `config` object is imported everywhere (`from config import config`). `backend/config.yml` is the only config, baked into the API image: the database host is `${POSTGRES_HOST|localhost}` (compose sets `postgres.timestrolls`). Required env vars: `API_KEY`, `POSTGRES_USER_PASSWORD`, `SPACES_KEY`, `SPACES_SECRET` (plus `POSTGRES_ADMIN_PASSWORD` for compose/Flyway).

**Content model:** see `SCHEMA_CONCEPT.md`. Every object is a `resource` (UUIDv7 id, status `new`/`published`/`muted`/`withdrawn`) with a table per type (`place`, `media`, `tour`); links between them are rows in `relation` (`part_of`, `shows`, `about`, `stop`, `same_as`), never foreign keys between types. Names, titles and descriptions are `text` rows per language (ISO codes; original or translation with `method` and author). Harvested records stay in `source_record`. Content is never deleted, only muted; the app user has no `DELETE` except on `relation`. Content from others is public only with a `permission` (per source or party; `show`, `copy`).

**Service layer (`backend/service/`):** all reads and writes, for the REST controllers and the MCP tools. Writes take an `Actor` (account, scopes, an agent's run), commit, and write the `change_log`. Errors are `NotFound`/`Conflict`/`Invalid`/`Forbidden`, mapped to 404/409/422/403 in `api/main.py`. New content is `new`; another status needs the `review` scope.

**API (`backend/api/`):** `main.py` mounts the routers from `api/controller/`; tables are in `api/model/tables.py`, the read views in `api/model/views.py`.
- Public (`api/controller/public.py`, what the frontend uses): `/api/locations/` (every place with its `part_of` village, its number of images and a building's facts from the archives, in the archive's language as stored: `number`, `house_name`, `former_number`, `state`, `address`; no translation by mapping, translations go into the database) and `/api/locations/{slug}` (a place with its images and podcasts, its `parent` and its `children` by kind and number, `?lang=`), `/api/tours/` and `/api/tours/{slug|id}`, `/api/credits/` (the content's sources with a permission and the translations, for the menu's sources page). They read only the `public_*` views: published and permitted. Texts come in `?lang=` where they exist, else in the original; each image says its language and `method` (`machine` is marked on the photo's label).
- Admin (`/api/admin/...`, `admin_content.py`, `admin_rights.py`): `Authorization: Bearer <token>` (`api/auth/bearer.py`) with the scope named per route: `read`, `read:all`, `write`, `review`, `scrape`, `admin`. `API_KEY` is the token of the account `admin` with every scope; agents and people get their own tokens (`POST /api/admin/accounts/{name}/tokens`, stored hashed). An agent may send `X-Run` (JSON) for the change log.
- MCP (`api/mcp_server.py`, FastMCP, stateless HTTP so gunicorn's workers can share it), mounted in `main.py` with the same bearer tokens: `/api/mcp` (scope `read`: places, a place, tours, credits; published and permitted only) and `/api/mcp/admin` (the scraper's tools as `scraping_*` with scope `scrape`; resources, history and permissions with `read:all`; places, harvests, media, links and texts with `write`; status and permissions with `review`). A tool the token's scopes don't allow is not listed. The admin tools are built for agents: the writing tools take lists (`create_places`, `set_texts`, `link`, `unlink`, `harvest_topothek`, `set_status`) and report errors per item; answers are compact (`get_resource(full=True)` for everything); `find_places` searches every place by name (normalised: case, accents, "St." = "Sankt") and position. Creating a place that looks like an existing one (`places.duplicates`: a matching name within 1 km, or the same kind within 15 m unless the house numbers differ) is refused (409 `Duplicate`, `duplicate_of` in MCP) unless `force`; the replay sends `force`. `tests/test_mcp.py` measures what an agent reads (calls, bytes, the tool list). Locally an agent connects through a git-excluded `.mcp.json` that passes `${API_KEY}`. Tests: `tests/test_mcp.py`.
- Places and tours are looked up by **slug or id** (and earlier slugs in `slug_alias`). Slugs come from `helpers/slug.py` (the primary name plus coordinates, e.g. `test-n48-000-e14-000`), are created once and then kept. Generation must stay deterministic. `tests/test_slug.py` covers this.

**Database:** PostGIS, schema `timestrolls`. Migrations are Flyway SQL files in `backend/migration/` (`V001_00N__*.sql`), applied by the `migrate-postgres` compose service before the API starts. Migrations create the restricted app user (if missing) via the `${user}`/`${password}` Flyway placeholders; default privileges give it `SELECT, INSERT, UPDATE` on new tables and views, any `DELETE` must be granted explicitly. Ids are UUIDv7 (`helpers/ids.py`, `timestrolls.uuid_generate_v7()`). `tour.geom` is a `LineStringZ` (EPSG:4326), and `length` is a generated column in km. Tours are uploaded as GPX (gpxpy/shapely/geoalchemy2).

**Media/CDN:** Images, podcasts and map tiles are stored in DigitalOcean Spaces (S3-compatible, via boto3 in `helpers/cdn.py`, uploaded `public-read`), under the paths in `config.cdn.path`. The DB stores only the `url`/`path` and a content `hash`. Deleting a DB record should also delete the CDN object. Images can be harvested from Topothek (`POST /api/admin/media/topothek/`, see "Topothek import" below); they are stored as links to the Topothek's file (`file.storage = external`), not copied: we have `show` permissions only.

**Frontend (`frontend/src/`):** `Map.jsx` is the root view. **The URL query string is the single source of truth for UI state**: `location` (slug of the open info panel), `tour`, `markers`, `year` (historic aerial imagery; an old `historic=true` is rewritten to a year), `track`, `centered`. Change state with `setSearchParams` instead of local state, so that views stay deep-linkable. What the map draws of a place is in `LocationMarkers/hierarchy.js` (pure, tested): villages as red dots, churches and chapels as a dark disc with a white cross (a church larger), mills as rings, houses as small hollow dots (filled with photos) only from zoom 17, without names: the house nearest the centre of the map gets the wall label above the dock (`LocationMarkers/WallLabel.jsx`: only its house name and ›, which opens it; live while dragging, snaps the house to the centre when the map comes to rest, follows the GPS position); houses are their own cluster group from zoom 17. Leaflet.markercluster can leave a stale cluster of an earlier zoom behind, so `LocationMarkers.jsx` rebuilds each group once a zoom animation has ended (`useStaleClusterFix`). names next to villages from 15, landmarks from 16; marks that overlap join in a cluster (radius 60 px, 16 px from zoom 17) that splits as you zoom in, and places on the same point (a church on its village's point) spread out around it when the cluster is clicked. The place panel starts with a village's churches, chapels and houses as folded lists and links a house back to its village; choosing one flies the map to it. API paths are centralized in `api.js`. Historic imagery lives in `src/historic/`: `manifest.js` (pure functions, unit-tested), `useManifest.js`, `HistoricLayers.jsx` (tile layers and `ViewBounds`) and `TimeSlider.jsx` (the year timeline in the bottom-right dock, `Components/Dock.jsx`, with "Aus" as the last stop to switch the imagery off). The dock holds the menu button, the time line, (with a mouse) the − + pill and › to fold it, separated by short hairlines (`.dock-section`); the location button (`float`) sits just above its right end. Folded, the dock is a pill with the year and the logo in the same place (stored per device in `localStorage`, not the URL). The menu button opens the dock itself: the menu grows above the row of controls, which stays at the bottom (`Menu.jsx` renders the dock around the other controls). The menu starts with the wordmark (`Components/Wordmark.jsx`, the logo as the point in "Time ● Strolls") with the languages and the appearance button under it, then lists areas (`historic/regions.js`: only the manifest's `regions`, nothing hard-coded; where choosing one lands is ours, `REGION_STARTS`: a spot, zoom and year with full coverage; the toast then shows only "Berlin 1928"; without one, the area's bounds; `HOME_REGION` (the Bohemian Forest) is the one default view: a plain visit opens like choosing it (flies in, its year on, the welcome), and the location button's "whole area" goes back to its start), places and tours ("Auf der Karte"), and a colophon with pages for about (with the Interreg logo), sources and imprint. Motion curves live in `motion` in `theme.js`. Icons come from one self-hosted Material Symbols subset (`Icon` in `icons.jsx`); to add one, put its name in `frontend/design/icons/fetch-icons.sh` and rerun it. Inside the Leaflet map (base map, dots, tooltips, the OSM credit) everything uses the light scheme in both modes (`data-mui-color-scheme="light"` on the wrapper around `MapContainer`); the dock, the buttons and the panels follow the colour mode (decided 2026-10-21); see "Historic imagery" below. Colours and typography live in `src/theme.js` (MUI, light and dark); `Components/Sheet.jsx` is the place panel's frame: full screen on phones (also held sideways, height under 500 px), a 420 px side panel on larger screens. Its photos open in a viewer (`LocationInfo/Images.jsx`, yet-another-react-lightbox): the wall label (year in bold · title, credit) is as wide as the photo and sits under it, or over its bottom edge on a gradient where there is no room (sideways, zoomed in); its `slides` must keep their identity across renders (the library jumps back to `index` on new slides). The viewer closes with ✕, Escape, pulling down or back (it adds a history entry). Hover styles go inside `@media (hover: hover)`: on touch screens `:hover` sticks after a tap. Podcasts play in one app-wide player (`podcast/PlayerContext.jsx`, provider in `App.jsx`): the red button in the place panel (`LocationInfo/Audio.jsx`) plays and pauses, with our own line and 15 s / 30 s skips (no browser controls); closing the panel keeps the story playing in `Components/MiniPlayer.jsx` above the dock; positions are kept per episode in `localStorage` (`podcast/positions.js`), and the Media Session API drives the lock screen. The logo files in `public/` are generated: `frontend/design/logo/build-icons.sh` (seeded, reproducible) — don't edit them by hand. UI strings live in `LanguageContext.jsx` (`de`, `cs`, `en`, ISO codes; the button still says "Cz"; a stored `cz` from before 2026-10 becomes `cs`; the device language if we have it, else `en`); add every new string to all three languages. The language goes to the API as `?lang=` (`api.js`), and the places, the open place and the tours reload when it changes.

## Topothek import: time-strolls-scraper

Topothek documents are fetched by `scrape_time_strolls.scrapers.topothek` from the sibling repo `../time-strolls-scraper` (package `time-strolls-scraping`). `backend/importers/topothek.py` fetches a document; `service/harvest.py` stores it once as a `source_record` (source `topothek:<name>`) and a media (`comment` becomes the description, `author` the creator, `owner` the rights holder); harvesting it again only refreshes the record. `POST /api/admin/media/topothek/` answers 422 for a link without `?doc=`, 404 for an unknown document and 502 when the Topothek can't be reached.

- **Private repo:** the dependency is `git+ssh`, pinned to a release tag in `[tool.uv.sources]` (`pyproject.toml`). To upgrade, change the tag and run `uv lock`. CI and the release build load a read-only deploy key (secret `SCRAPER_DEPLOY_KEY`, its public half under the scraper's Deploy keys) into an SSH agent; the Docker build gets the agent via `RUN --mount=type=ssh` (`ssh: default`), so the key never lands in the image. Locally `make run` forwards your own SSH agent: it must hold a key with access to the scraper (`ssh-add -l`; `ssh-add ~/.ssh/<key>` if empty).
- The scraper paces its requests per process; the API runs several gunicorn workers, which is fine for single imports.
- Places from records (`service/harvest.py`, `importers/suedboehmen.py`, `importers/znicenekostely.py`): the MCP tools `import_suedboehmen_houses` and `import_sacral_buildings` store houses and sacral buildings server-side, so they never pass through the model. Every record is kept once in `source_record` (`keep_record`, keyed by the scraper's record key: `source` plus `id`, `house:<id>`/`object:<id>` as `external_id`) and linked to its place via `resource_source`. Names, numbers and kinds are facts (texts without a source record, public once published); a house's history stays in the record. A place that looks like an existing one is reported, not created.
- The search (`topothek.search("deutsch-reichenau", "Oberuresch")`) can help to curate `replay/places.yml`.
- Changes the scraper needs are collected in `SCHEMA_CONCEPT.md` ("Feedback for time-strolls-scraper") and raised in that repo.

## Historic imagery (aerial-timeline tiles, planned frontend work)

Historic aerial imagery now comes from the separate package `../aerial-timeline`.
That package collects the imagery, renders static WebP tiles and publishes them to
the Spaces bucket `timestrolls` behind a CDN. The frontend only displays them: there
is no tile server and no backend involvement. Any logic beyond display (a "best tile"
choice and similar) goes into aerial-timeline or a later API, not into React.

**Entry point:** `https://timestrolls.fra1.cdn.digitaloceanspaces.com/tiles/manifest.json`
- CORS is `*`. The manifest says `max-age=300`, tiles `max-age=86400`. Tiles are
  meant to be immutable, but widening a region re-renders edge tiles under the
  same URLs (happened 2026-10-20). See "CDN caching" below.
- The manifest is shared by all aerial-timeline projects, so it also lists Berlin.
  Show only the years whose `bounds` intersect the map view or our region.

```
{ "version": 1, "generated": "<ISO time>",
  "times": {                       // key = year (string), sorted ascending
    "1952": {
      "bounds": [w, s, e, n],      // EPSG:4326, union of the year's layers
      "min_zoom": 10, "max_native_zoom": 17,
      "attribution": "...",        // all layers of the year, joined with " | "
      "best": {                    // the one layer to draw (aerial-timeline step 5)
        "url": "cz-cenia-ortho/1952/{z}/{x}/{y}.webp",   // or best/{year}/… once composite
        "bounds": [w, s, e, n], "min_zoom": 10, "max_native_zoom": 17,
        "composite": false, "layers": ["cz-cenia-ortho"],  // ids it is made from
        "redistribute": true, "enhanced": false, "ai_generated": false },
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

**Live as of 2026-10-21** (every year has a `best` entry, all `composite: false`):

| Year | Layer | Area | Max zoom |
|---|---|---|---|
| 1947, 1949, 1952 | `cz-cenia-ortho` | Czech side only. CENIA's 1950s ortho is a patchwork of flight years, split by year: 1952 has a hole around Lipno (≈13.93–14.21 E, 48.70–48.82 N) that 1949 and 1947 fill; 1947 only north of 48.75 | 17 |
| 2023 | `at-basemap-ortho` | basemap.at, Austrian side only | 18 |
| 2025 | `cz-cuzk-ortho` | ČÚZK, Czech side only; **testing only**, licence of the tile service unconfirmed | 18 |
| 1928, 1953 | Berlin | not our region | 17 |

The Šumava region in aerial-timeline is lon 13.74–14.34, lat 48.58–48.85
(Haidmühle to Vyšší Brod, widened 2026-10-20; Bavaria not covered yet). Our own
`REGION_BOUNDS` in `manifest.js` (14.00–14.16, 48.58–48.68) only picks the year
for old `historic=true` links; nothing in the frontend clips the imagery.

**CDN caching (checked 2026-10-21):**
- The CDN endpoint (DO id `476f6986-b8c8-488e-b52a-7001834bf05f`) has an edge
  TTL of 3600 s that overrides `max-age`: after a publish the CDN can serve the
  old manifest for up to an hour.
- Responses carry `Vary: Origin` (CORS), so the CDN keeps one copy per site
  origin. Flush **with wildcards**, an exact path misses the browser copies:
  `doctl compute cdn flush 476f6986-b8c8-488e-b52a-7001834bf05f --files 'tiles/manifest*' 'tiles/<layer>/*'`
  (ask first, it is shared infrastructure).
- Check what browsers get with `curl -H 'Origin: http://localhost:3000' …`, and
  compare with the origin `https://timestrolls.fra1.digitaloceanspaces.com/tiles/manifest.json`.
- Browsers keep tiles for a day; locally use DevTools "Empty Cache and Hard Reload".
- The lasting fix belongs in aerial-timeline: flush after every `publish`. The 1945 US Army print is not
in the manifest yet; it will come from another service later (aerial-timeline
roadmap step 6). The frontend uses **only** tiles from the `timestrolls` bucket
(the manifest). Drop the old 1945 URL (`debtray` bucket). Until 1945 is published,
an old `historic=true` link opens the earliest manifest year in the region.

**TODO: move the legacy 1945 pipeline to aerial-timeline.** These files stay here
for now. Don't delete them, and don't build new features on them:
- `backend/etl.py` (ground control points), `backend/transform/`, `backend/helpers/image.py`
- `backend/local_tile_server.py` (`notebooks/transformations.ipynb` was removed on 2026-10-22)
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
- **Layers per year:** draw the year's `best` entry as one `TileLayer` (its
  `url`, `bounds`, `min_zoom`, `max_native_zoom`; attribution from the layers in
  `best.layers`). Without `best` (older manifests) render **all** layers:
  - Use one `TileLayer` per layer, in reverse rank order, so the best is on top and
    the others fill gaps; the alpha channel makes this work.
  - Per layer, set: `maxNativeZoom={layer.max_native_zoom}`,
    `minNativeZoom={layer.min_zoom}`, a map-level `maxZoom` above it (Leaflet upscales),
    and `bounds={[[s, w], [n, e]]}` (avoids requests outside coverage).
  - Also `noWrap`. No `attribution` on the aerial layers: their sources are
    listed in the menu (`sources()` in `manifest.js`).
  - A new year cross-fades (`HistoricLayers.jsx`): the old year stays until
    the new tiles have loaded.
- **Labels and attribution:**
  - The time slider shows only the year key, no months (decided 2026-10-20);
    the aerial sources are in the menu ("Quellen"), not on the slider or the
    map (decided 2026-10-21; enhanced/AI flags still show above the slider).
    Only a small "© OpenStreetMap" stays on the map, as OSM's attribution
    guideline requires a credit on the map itself.
  - Mark `enhanced` / `ai_generated` layers visibly (none so far).
  - Licences require attribution (CC BY 4.0), so always list it in the menu.
  - Add every new UI string to all three languages in `LanguageContext.jsx`.
- **Offline caching** (`OFFLINE_CACHING_STRATEGY.md`): tile URLs are immutable, so
  they cache well. Re-fetch the manifest; don't cache it long.

**Roadmap:** `ROADMAP.md` holds the agreed plan and the status of each step. Read it when asked what's next, and update its status table when a step lands.

**Planned work:** `OFFLINE_CACHING_STRATEGY.md` is a design doc (not yet implemented) for user-initiated, viewport-based offline downloads using the Cache API and a service worker. Read it before working on offline or PWA features.
