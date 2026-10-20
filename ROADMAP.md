# Roadmap

Time Strolls should grow from a map web page into an **outdoor museum guide**. It
needs historic imagery from aerial-timeline, a coherent look, an admin area with
real logins, automated deploys, offline use where there is no signal, and later an
Android app.

Drafted and agreed on 2026-10-20. Update the status table whenever a step lands.

## Decisions (2026-10-20)
- Auth: a hosted free OIDC identity provider; the backend only verifies tokens.
- Offline base map: our own PMTiles vector map, rendered with MapLibre.
- App: a PWA first, then Capacitor for Android.
- Order: the foundation comes first (CI, Vite, removing the ETL).
- Logo (2026-10-20): a circle torn by hand from paper painted in Rothko-like
  fields (grey, red, ochre), cut clean. Warm theme: red accent `#b8412f`, warm
  greys; dark mode in warm browns (clay `#6b5a4e` for the dark tile), never black.

## Status

| # | Step | Status |
|---|---|---|
| 0 | CI basics, Vite migration, repo cleanup (ETL out) | CI and Vite done (#7). Removing the ETL waits for aerial-timeline step 6. |
| 1 | CDN years and time selection | Done (#7) |
| 2 | Theme, logo, mobile layout | Done (branch `theme-and-logo`) |
| 3 | Own base map and offline PWA | Open |
| 4 | Release workflow (DOCR, deploy) | Open |
| 5 | Auth (OIDC JWT) and admin (react-admin) | Open |
| 6 | Capacitor Android: geofence notifications, background audio | Open |
| 7 | MCP server on the same auth | Optional, once the admin API is stable |

Work in the sister repo `../aerial-timeline` (its own roadmap in its `CLAUDE.md`)
runs in parallel: step 5 `composite` (`tiles/best/{year}`), step 6 the 1945 print
via ground control points, step 7 enhancement layers.

| # | Why at this position |
|---|---|
| 0 | Foundation; cheap now, expensive later |
| 1 | Spec ready; visible win |
| 2 | Needed before PWA icons and the app |
| 3 | Core museum-guide value |
| 4 | Before more people touch prod |
| 5 | Replaces Swagger and notebooks |
| 6 | Builds on 2 and 3 |
| 7 | Optional |

---

## 1. CDN imagery (aerial-timeline manifest) — done
Specified in `CLAUDE.md` ("Historic imagery"). Implemented in `src/historic/`:
`year=<YYYY>` replaces `historic`, an old `historic=true` maps to the earliest
manifest year in the region (1945 once it is published), one `TileLayer` per
layer until `best/` exists. Once aerial-timeline publishes `best/`, switch
`HistoricLayers.jsx` to one layer per year.

## 2. Logo and UI design — done
The palette and logo below were the starting plan; the result is the warm, red
scheme in the decisions above. Places on the map are small scraps of the logo.

- Take the *feel* from edward-tells, not the exact values:
  - quiet surfaces, one accent, 1 px hairlines, no shadows
  - system font stack, list rows instead of tables
  - a thin progress bar instead of spinners
  - light and dark modes treated as equals
- Adapt the palette to an outdoor museum: a deep forest or moss green accent close
  to `#2f7a60`, warm paper tones instead of cold grey, and maybe one serif for
  headings (place names) for an exhibition-label feel.
- **Implementation:**
  - one MUI `createTheme` with the tokens (light and dark) in `src/theme.js`
  - remove ad-hoc CSS from `index.css` and `App.css`
  - restyle the menu as a bottom sheet on mobile
  - style the place panel like a museum label (title, year, image strip, play button)
- **Logo:** an SVG mark in the edward-tells style, made of simple paths. Possible
  motifs: a footpath crossing a contour or time line, or a map pin with an hourglass.
  Ship it as a favicon (green rounded square), header and PWA icons (192, 512,
  maskable). The Interreg logo stays in the footer or about section, as the funding
  terms require.

## 3. Own base map and offline PWA
Offline is **essential**, not optional: there are dead zones on the border, and
people use the app outdoors. Two corrections to `OFFLINE_CACHING_STRATEGY.md`:
- **The base map is the blocker.** The OSM tile servers (`tile.openstreetmap.de`)
  forbid bulk prefetching and offline downloads under their usage policy.
  - **Solution:** host our own base map, a **Protomaps PMTiles** extract of the
    region. It's one static file on Spaces, free and offline-friendly, rendered with
    MapLibre (`@maplibre/maplibre-gl-leaflet` or a later MapLibre migration).
  - **Alternative:** raster tiles from aerial-timeline (e.g. the 2023 and 2025
    orthophotos).
- **"Download region" beats viewport downloads.** The region is tiny: the Šumava
  box is about 12 × 11 km.
  - A rough estimate for zoom 10–17 is about 4–5k tiles per layer, roughly
    50–100 MB per year layer as WebP. Plus places, images and MP3s.
  - So offer **one "Download Deutsch Reichenau" package** with a size display and a
    choice of years. Optionally offer per-tour packages.
- **Technique:**
  - `vite-plugin-pwa` and Workbox: the app shell is precached.
  - `/api/locations` and `/api/tours`: stale-while-revalidate.
  - CDN tiles and media: cache-first, since they are immutable.
  - The manifest: network-first with a fallback.
- **Behaviour:** prompt for the download on the first visit while on Wi-Fi; show an
  offline indicator; the GPS dot works offline anyway. iOS Safari may evict the
  cache, which is one more argument for the Capacitor app (filesystem storage).

## 4. Deployment automation
Adapted from the pricing-prediction-linear workflows:
- **`ci.yml`** exists (ruff, pytest, prettier, vitest, build, Docker build). Still to
  add: `ruff format --check`.
- **`release.yml`** (GitHub release or `workflow_dispatch`):
  1. Build the `api` and `frontend` images and push them to DOCR
     (`doctl registry login`), tagged `:<version>` and `:latest`.
  2. Deploy: SSH to the droplet (`appleboy/ssh-action` or `doctl compute ssh`), then
     `docker compose pull && up -d`. Flyway runs as before.
- **Compose:** `image:` references with an `IMAGE_TAG` variable instead of `build:`.
  The droplet only keeps compose files, Caddyfile and credentials; no source zip.
- **Notifications:** Slack webhooks on success and failure.
- **Secrets:** `DO_ACCESS_TOKEN`, SSH key, Slack URLs. `credentials.prod` stays on the
  droplet.
- **Rollback:** redeploy an earlier tag.

## 5. Authentication and admin section
**Principle:** the API is an **OAuth 2.1 resource server**. It checks JWT access
tokens against the issuer's JWKS and checks a role or allowlist claim. It never
stores passwords. The React admin and a future MCP server or AI agent use the same
mechanism (the MCP authorization spec builds on protected resource metadata,
`/.well-known/oauth-protected-resource`, plus an external authorization server).

- **Identity provider:** a hosted free tier with Google, Microsoft and Apple login,
  e.g. **Auth0 free** (RBAC, dynamic client registration for MCP clients).
  Self-hosted alternative: Keycloak or Zitadel (heavy for the small droplet).
- **Abstraction:** the backend only knows `ISSUER`, `AUDIENCE` and the JWKS URL, in
  `config.yml` and `deployment/api-config.yml`. Switching providers is config only.
- **Backend:** `api/auth/` gets `get_current_admin` (PyJWT with a JWKS client),
  replacing `get_api_key` on the write routers. Keep the API key for a while as a
  machine credential for scripts and notebooks, then remove it.
- **Frontend:** OIDC PKCE login (`oidc-client-ts` or the provider's SDK), only
  inside `/admin`.
- **Admin:** `/admin` route in the same app, lazy-loaded behind login, built with
  **react-admin** (MIT, on MUI) and our own data provider.
  - Places: map picker for the coordinates; the slug is shown, never edited.
  - Images: sorting, year, Topothek import by URL.
  - Podcasts: upload. Tours: GPX upload with a preview.
- **API gaps:** list endpoints with pagination and `X-Total-Count`; image upload
  (Topothek import only today); consistent CDN deletion on delete.

## 6. App (Android first)
1. **PWA first** (step 3): installable, offline, Android and iOS, no store.
2. **Then Capacitor:** wraps the same Vite build into an Android app (Play Store,
   one-time $25). Native plugins add background GPS, **proximity notifications**
   ("you are near the old school, listen?"), background audio with lock-screen
   controls and durable offline storage. iOS later from the same code ($99 a year).
- **Rejected for now:** React Native or Flutter (a rewrite of map, UI and i18n).
- **UX focus:** big touch targets, a bottom-sheet place panel, a "next stop" card on
  tours, readable outdoors (high contrast mode).

## 7. MCP server
A FastMCP mount at `/mcp` calls the same service layer as the admin API and is
protected by the same tokens.

## Repo structure
- The tile and georeferencing pipeline in `backend/` (`etl.py`, `transform/`, …)
  moves to aerial-timeline (its step 6) and is then deleted here in one commit.
- `resources/` (raw GPX, TIFs, tiles, crawl output): once the admin exists, the
  database and Spaces are the source of truth. Archive it to Spaces or a data repo
  and keep only small test fixtures.
- The Topothek crawler stays (the admin uses it) and moves to `backend/importers/`.
- The monorepo (`backend/`, `frontend/`, `deployment/`) stays. The only contract
  with aerial-timeline is the public `manifest.json`; neither repo imports the other.

## Verification (per step)
- **Backend:** `uv run pytest`, plus tests for JWT auth (mock JWKS) and admin endpoints.
- **Frontend:** `npm test` and `npm run build`; check `?year=1952` and `?historic=true`.
- **Offline:** DevTools offline mode after "Download region": open a place, play
  the audio, pan the map.
- **CI/CD:** a dry release to a test tag; `docker compose ps` on the droplet; `/api/ready`.
- **Android:** a Capacitor debug APK on a real device in airplane mode on site.
