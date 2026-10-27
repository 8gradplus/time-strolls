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
  fields (grey, red, ochre), cut clean.
- Look (2026-10-20, replaces the warm theme): "Wall label", like a gallery.
  Near-white `#fbfbfa` / near-black `#1d1c1b` surfaces, the logo red slightly
  deeper as the only accent (`#a8231b`, dark `#e3574b`), Cormorant Garamond
  (600) for names, Jost for everything else. The historic photos are mostly
  black and white, so the surfaces stay neutral. Light and dark are equals:
  the device setting by default, overridable in the menu ("Darstellung").
  Directions compared: https://claude.ai/artifact/TWELJnNxYqrj2zEsLGv9ac
- Order (2026-10-20, replaces the numeric order): 2c calm map, then 4 release
  workflow (small, so the new look reaches prod), 5 admin, 3 offline PWA,
  6 Android.
- Offline vs. app (2026-10-20): an app doesn't make offline much easier. The
  base map licence, the download package and seekable cached audio are the
  same work either way; the app only adds durable storage on iOS and
  background GPS and audio. So offline lands as a PWA, and Capacitor wraps
  the same build later.

## Next session (state on 2026-10-24)
Production runs v0.3.2 from the release workflow. Since the last hand-off:
the phone test on a Pixel over USB (`make phone`) with the mobile polish and
photo viewer (#12, v0.3.0), the area welcome and one default view (#13,
v0.3.1), and the fix for the map flying back home on every GPS update (#14,
v0.3.2, with a "Contribute" section on the About page).
0. **Where we stopped (2026-10-27):** 2c (#19) and the first MCP server
   (#20) are merged, not released. Now making the curation MCP cheaper
   before the release: A0 scraper v0.4.0 (record key, optional compact
   views; released), A1 batch tools, `find_places`, duplicate guard,
   compact answers (#21), A2 server-side imports from the scrapers; then a
   frontend round for houses and chapels (B). The local stack holds an agent test (Oberuresch, ~130 places from the
   agent; a local, git-excluded `.mcp.json` uses `${API_KEY}`). Findings:
   the agent was slow and token-heavy (114 single calls) -> bulk tools and
   compact answers; it created "St. Thoma" beside the replay's "Sankt
   Thoma" -> a tool to find existing places; houses crowd the map -> maybe
   `map_visible = false` for houses.
1. **Next:** the new content model of `SCHEMA_CONCEPT.md` ("Order of
   work"). PR 1 (Topothek via `time-strolls-scraper`, #16) is merged. PR 2
   comes in three parts, released together once it feels right: 2a backend
   (schema on PostgreSQL 17, service layer, scoped tokens, admin routes under
   `/api/admin`, #17), 2b the replay (sources, permissions, kinds, links,
   #18), 2c the frontend (`?lang=`, `cs`, several podcasts, credits). Then
   the release with the switch-over (`SCHEMA_CONCEPT.md`, "Migration"), then
   MCP (PR 3). This overlaps step 5.
2. **Still to test by hand:** audio with the screen locked, the lock-screen
   and headphone controls (Media Session), resuming an episode the next day,
   and an iPhone (Safari).
3. **Open points:** the repo has no LICENSE although the About page says
   "open source" (deferred); place names next to the dots from zoom 15 on
   (keep or hide); the about text is a first draft; the Czech UI strings
   (player, dock) should be checked by a native speaker; in a desktop window
   narrower than ~360 px the zoom pill squeezes the years (accepted for now);
   the droplet keeps old unused images (`docker image prune`).
4. Then go on in the agreed order: 5 admin, 3 offline PWA, 6 Android.
5. **For aerial-timeline (not this repo):** `publish` must flush the CDN with
   wildcards after every upload (see `CLAUDE.md`, "CDN caching"); widening a
   region re-renders tiles under the same URLs.

## Status

| # | Step | Status |
|---|---|---|
| 0 | CI basics, Vite migration, repo cleanup (ETL out) | CI and Vite done (#7). Removing the ETL waits for aerial-timeline step 6. |
| 1 | CDN years and time selection | Done (#7) |
| 2 | Theme, logo, mobile layout | Done (#8) |
| 2b | Styling polish: base map, colours on map and imagery, fonts, usability, time slider | Done (#8) |
| 2c | Calm map: only map and time line, the rest in the menu | Done (#9) |
| 2d | Phone test and mobile polish, area start views | Done (#12, #13, #14) |
| 3 | Own base map and offline PWA | Open |
| 4 | Release workflow (DOCR, deploy) | Done (#10, #11) |
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
| 2b | The look has to hold on the real map and imagery before offline and the app |
| 2c | Too many buttons confused people; usability before new features |
| 3 | Core museum-guide value |
| 4 | Before more people touch prod |
| 5 | Replaces Swagger and notebooks |
| 6 | Builds on 2 and 3 |
| 7 | Optional |

---

## 2c. Calm map
The map was too busy (three round buttons, the full attribution strip). The
map now shows only the map, the places and the time line; everything else is
in the menu. This is the normal view, not a separate mode.
- **One dock at the bottom right**, within thumb reach (`Components/Dock.jsx`):
  the menu button, the time line (its line is the dock's vertical centre)
  and, with a mouse, − and + as one pill split by a hairline; › at the end
  folds the dock; short hairlines separate the sections. The time line ends in an "Aus" stop that switches the imagery off
  (replaces the red "Aus" button; "Heute" until 2026-10-21); enhanced/AI flags still show above it.
  Without imagery in view the dock shrinks to the buttons. Touch screens pinch.
- **Location button** on its own, just above the dock's right end: follows the
  user, a second tap goes back to the whole area.
- **Folded dock (2026-10-21):** › folds the dock into a pill with the year and
  the logo in the same corner, as high as the location button (without a year
  a circle of its size); the logo sits right under it. The location button
  sits at a fixed height (8 px above the dock's 62 px row), so it doesn't move
  when the dock folds. Only the pill unfolds it. The fold › and the
  appearance glyphs (circles: half, open, filled) are drawn in the menu
  button's 1.6 px line, not taken from Material Symbols. Kept
  per device in `localStorage` (`dockFolded`), not in the URL.
- **Colour mode (2026-10-21, replaces "always light on the map"):** the base
  map, the dots, the tooltips and the OSM credit stay light in both modes; the
  dock, the buttons, the menu and the place panel follow the colour mode.
- **The menu opens the dock** (redesign 2026-10-21, replaces the first
  version): the menu grows above the row of controls, which stays at the
  bottom and opens into a portrait sheet, √2 times as high as the dock is
  wide (a sheet of paper), capped so some map stays visible above; the
  colophon stands at its foot and the sub-pages keep the same height;
  ☰ turns into a drawn ⌄ (replaces ✕, 2026-10-21); a tap outside, Escape or
  the handle closes it.
- **In the menu** (refined 2026-10-21): the wordmark "Time ● Strolls" with
  the logo as the point between the words (`Components/Wordmark.jsx`; it rolls
  in once each time the menu opens), under it the languages and one
  appearance button (Automatisch → Hell → Dunkel); then Gebiete (replaces
  "Gebiet zeigen"), "Auf der Karte" (Orte, then the tours); 24 px between
  sections. Following the user is only the location button. A quiet colophon
  links the pages "Über das Projekt" (with the Interreg logo), "Quellen"
  (OpenStreetMap and the sources of the selected aerial year) and
  "Impressum", which open inside the dock.
- **Podcast player (2026-10-21):** the red button plays and pauses (no
  browser controls, never faded); a line like the time line with the red dot
  as handle, the times, 15 s back and 30 s ahead (drawn like the dock icons).
  The story keeps playing when the panel closes: a pill above the dock, left
  of the location button (pause, open the place, ✕ when paused); paused in
  the panel and then left, listening just ends. Positions per
  episode are kept on the device; lock screen and headphones via Media Session.
- **Attribution:** on the map only a small "© OpenStreetMap" (bottom left,
  top right on touch screens), as OSM's guideline wants a credit on the map;
  the aerial sources (CC BY 4.0) are in the menu. `viewport-fit=cover` plus
  safe-area insets keep the controls clear of notch and home indicator.
- Page translators (Chrome) leave icons, the wordmark, the language switch and
  the sources alone (`translate="no"`); the icon font broke under translation.
- Still to test on a real phone: the OSM credit top right, the dock and the
  button column above the home indicator, the menu card's height, and
  dragging the slider inside the dock.
- Open: place names next to the dots from zoom 15 on (keep or hide).

## 2b. Styling polish — done (#8)
All styling work, on top of step 2; merged into `main` as #8 on 2026-10-20.
Merging did not deploy then: production was deployed by hand (since step 4,
a GitHub release deploys).

**State:** the theme lives in `frontend/src/theme.js` ("Wall label": MUI
light/dark, one accent red `#c8372b`, neutral surfaces). The menu and the place
panel share `Components/Sheet.jsx` (bottom sheet on phones). Places are plain
red dots (`.place-dot` in `index.css`). The logo is only the favicon (white
tile) and the README image; see `frontend/design/logo/`.

1. **Underlying map design.** Today the base map is the stock OSM raster
   (`tile.openstreetmap.de`), whose saturated greens fight the warm theme.
   Options: a calmer raster style now (e.g. a muted/grey provider, or a CSS
   filter as a quick test), or design our own vector style right away as part of
   step 3 (Protomaps PMTiles + MapLibre), which offline needs anyway.
   **Done (2026-10-20):** a CSS filter on the OSM layer only (`.base-map` in
   `index.css`): a light, neutral grey in both colour modes (the user wants it
   quiet and light, not warm or dark), with a slight emboss relief (SVG filter
   `#base-map-relief` in `index.html`) on mouse/trackpad devices only; SVG
   filters render on the CPU, so touch devices get the plain grey (no pinch-zoom
   stutter). Historic imagery is unfiltered. Possible later: test the relief on
   a real phone and enable it there if it stays smooth. Our own vector style stays in
   step 3.
2. **Colour theme on map and imagery.** Accent, dots, clusters, tour line, map
   buttons and tooltips must read on the base map *and* on the grey historic
   aerial images (1949/1952) and the colour orthophotos (2023/2025). Check light
   and dark mode.
   **Done (2026-10-20):** everything on the map is the same in both modes (the
   map is always light grey): the accent red with a white ring and a thin dark
   edge for places and clusters, a halo for the open
   place, the tour line on a white casing. Leaflet's zoom buttons and
   attribution use the theme; the backdrop behind open panels is a light veil.
3. **Fonts.** **Done (2026-10-20):** Cormorant Garamond for names and the
   wordmark, Jost for UI, self-hosted via `@fontsource` (bundled by Vite,
   Latin and Latin Extended loaded on demand). Merriweather is gone. Still on
   Google: the Material Symbols icon font in `index.css` (move it in step 3).
   **Place panel:** laid out as a wall label: coordinates, name, dates, then
   "Hören" (one row per podcast, ready for several) and "Bilder" (one column,
   the year inside each photo, no captions). Tapping a photo opens the viewer
   in the app's light or dark surface; on phones the photo gets the whole
   screen and the wall label (year, title, credit, Topothek link) lies over its
   bottom edge, a tap leaves only the photo; pinch or double-tap zooms. Mockups:
   https://claude.ai/artifact/S2FeBzpxubnHXxvdJBgm63
   One accent red (`#c8372b`) for the UI and the map in both modes; the time
   slider shows only years.
4. **Usability.** Touch targets and thumb reach on phones; how people discover
   the menu and the time travel; marker visibility outdoors (dots are 18 px);
   hover-only behaviour (tooltips do not work on touch); readable attribution;
   loading and empty states; the chosen language is not remembered yet.
   **Done (2026-10-20):** the language is remembered on the device and
   defaults to the device language (cs → cz, en, else de); places have a 44 px
   tap area around a 20 px dot, hover is CSS only; the +/– zoom buttons are
   hidden on touch screens. From zoom 15 on, place names show next to the dots
   on every device. A failed `/api/locations` shows a notice with "Erneut
   versuchen"; a place that fails to load says so in its panel. The time
   travel is found through the slider (item 5).
5. **Time slider instead of the year radio list.** Replace the per-year rows in
   the menu with a slider (or slider-like strip) over the years whose `bounds`
   touch the *current view* (`yearsInBounds`, already computed in `Map.jsx`),
   plus "today" (no overlay). `year=` in the URL stays the single source of
   truth. Keep the real date labels (`yearLabel`), the enhanced/AI flags and the
   attribution. Mockup idea: a compact strip at the bottom of the map with the
   chosen year as a red chip.
   **Done (2026-10-20):** `src/historic/TimeSlider.jsx`, variant B of
   https://claude.ai/artifact/HhvdAusywgkszurx89MmkG: the years in view as stops
   on a line (tap or drag), only years (no months), the sources above it, and
   a separate "Aus" button at the end that switches the imagery off. No gap
   labels (the user's call). The year list in the menu is gone.

**Open questions for the user:**
- Home-screen/PWA icons (`logo192.png`, `logo512.png`, maskable,
  `apple-touch-icon.png`) still show the logo on a paper tile. Keep, or change?
- `public/logo-tile.svg` and `logo-tile-dark.svg` are no longer used. Remove or
  keep as sources?
- Still to test on a real phone: pinch zoom and tap vs. double-tap in the photo
  viewer, dragging the time slider, the base-map relief (off on touch today).

## 1. CDN imagery (aerial-timeline manifest) — done
Specified in `CLAUDE.md` ("Historic imagery"). Implemented in `src/historic/`:
`year=<YYYY>` replaces `historic`, an old `historic=true` maps to the earliest
manifest year in the region (1945 once it is published), one `TileLayer` per
layer until `best` exists. The manifest now has a `best` entry per year; the
switch to one layer per year is in the working tree (see "Next session").

## 2. Logo and UI design — done
The palette and logo below were the starting plan; the result is the logo and
the "Wall label" look in the decisions above (reworked in 2b). Places on the
map are plain red dots; the logo is only the favicon.

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
- **`ci.yml`** exists (ruff check and format, pytest, prettier, vitest, build,
  Docker build).
- **Two parts (2026-10-22):** first only building and pushing the images
  (`release.yml`, repo secrets, Slack privately to the user); deploying them
  to the droplet is a separate step afterwards. Images go to
  `debtray-registry` for now, configured only through this repo's secrets.
- **Deploying (agreed 2026-10-22):** everything in `release.yml`, no
  scripts: copy `docker-compose.yml` and `Caddyfile.prod`, write `.env` from
  the secrets, `pull` and `up -d` (never `down`). Rollback = manual run with
  an earlier tag. One API config (`backend/config.yml`), user names written
  into the files; only passwords and keys are secrets. Locally one
  `deployment/.env`. `deploy_production.sh`, `api-config.yml` and the
  `credentials.*` files are gone.
- **Database until the managed one:** the live data stays in the droplet's
  volume `deployment_postgres`; the only protection is that the workflow
  never runs `down` and the volume is `external` (compose can't delete it).
  No backup code for this stopgap: review backups when moving to a managed
  database, which brings daily backups and point-in-time restore.
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
- The notebooks in `backend/notebooks/` were removed (2026-10-22). The
  content they uploaded is now `replay/places.yml`, replayed through the API
  with `make local` / `make production` in `replay/` (the safety net until
  the admin, step 5).
- The tile and georeferencing pipeline in `backend/` (`etl.py`, `transform/`, …)
  moves to aerial-timeline (its step 6) and is then deleted here in one commit.
- `resources/` (raw GPX, TIFs, tiles, crawl output): once the admin exists, the
  database and Spaces are the source of truth. Archive it to Spaces or a data repo
  and keep only small test fixtures.
- The Topothek import uses `time-strolls-scraper` (`backend/importers/topothek.py`).
- The monorepo (`backend/`, `frontend/`, `deployment/`) stays. The only contract
  with aerial-timeline is the public `manifest.json`; neither repo imports the other.

## Verification (per step)
- **Backend:** `uv run pytest`, plus tests for JWT auth (mock JWKS) and admin endpoints.
- **Frontend:** `npm test` and `npm run build`; check `?year=1952` and `?historic=true`.
- **Offline:** DevTools offline mode after "Download region": open a place, play
  the audio, pan the map.
- **CI/CD:** a dry release to a test tag; `docker compose ps` on the droplet; `/api/ready`.
- **Android:** a Capacitor debug APK on a real device in airplane mode on site.
