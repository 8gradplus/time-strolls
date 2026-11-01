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

## Next session (state on 2026-11-01)
**v0.4.0 is live (2026-11-01).** The release brought the new content model
(2a #17, 2b #18, 2c #19), the MCP server (#20–#22), houses and chapels on
the map (#24, #25), the text cleanup (#27), the release prep (#30) and #31
(tours drawn again, linked by slug; menu toggles "Dörfer" and "Kirchen und
Kapellen", URL `sacral=true`). Production got its content from the local
database (`make push` in `../time-strolls-backup`, which runs from the Mac);
both sides run migrations 001.001–001.006, so `make pull`/`make push` work.
On the droplet the old volume `deployment_postgres` (PostgreSQL 13), unused
images and the build cache were removed (about 6.8 GB): **a rollback to
v0.3.x is no longer possible** with the release workflow alone; the old data
is only in `backup/db/production/20261101_084202.dump`.

**Release prep, 2026-11-01 (local DB is the content for production):**
local was replayed in full (564 images; the replay no longer has podcasts
or the podcast owner's permission, revoked locally), houses imported for
Deutsch Reichenau, Obermarkschlag, Asang, Untermarkschlag, Rosenhügel and
Muckenschlag (137 published), 6 chapels added, 39 image titles cleaned of
requests for help ("Wer kennt …?"), image titles and sacral names
machine-translated into cs/en. Production gets this by `make push` in
`../time-strolls-backup` after the release, not by replaying. Left open
(after step 5, see item 0):
- Descriptions still contain requests for help (88+ of 548): needs a
  server-side "remove sentences" edit; rewriting whole bodies through
  `edit_texts` is too costly.
- Sankt Oswald and Unterurasch (Austrian side) have no houses: the
  Südböhmen-Archiv covers Bohemia only.
- Obermarkschlag 26 (lon = lat in the archive) and Rosenhügel 6 (3 km off)
  stay `new`.
- The duplicate guard refuses chapels that are all named "kaple" within
  1 km; they were created with `force` (no source record). Better: ignore
  the name when the record keys differ.
- Slugs collide for same-name places within ~100 m (3 decimals): one chapel
  in Deutsch Reichenau (znicenekostely 19688) couldn't be created.
0. **Start here: step 5, auth and admin UI** (decided 2026-11-01: more
   impact on the product than the small points). Planned on 2026-11-01:
   OAuth through FastMCP with Google login, roles in our database; see
   section 5 and its PR table. **Live since v0.5.1 (2026-11-01):** invited
   editors sign in with Google; claude.ai lists the admin tools. Next:
   PR 5, the admin UI (own MUI pages; 5a API in review, then 5b shell and sign-in, 5c review queue).
   After step 5: the open points of the release
   prep above and items 1, 4, 6 and the leftovers of round B below, then
   the agreed order (item 5). Round B (houses and chapels) is done: villages and mills at every zoom,
   houses, churches and chapels from zoom 17 (kind marks, their own
   clusters, a leader line where a mark covers its village), the village
   panel's folded lists, on touch screens a tap names a mark in the wall
   label and a second tap opens it, three pips for "more to see". Left
   from round B:
   - Kind labels (Haus, Kapelle, Dorf) as UI strings in de, cs, en: not
     decided.
   - Spiderfied marks show no names; an open place inside a cluster isn't
     highlighted.
   - Data: two Reiterschlag chapels are both "kaple"; Oberuresch 14 has
     coordinates in Reiterschlag (48.6083, 14.109).
   - To reconsider: the village gives way close up instead of the leader
     line (`CLAUDE.md`, frontend).

   **Local setup without SSH** (the API image needs the private scraper
   over SSH; the local venv already has it): in `deployment/`
   `docker compose up -d --no-deps --wait postgres` and
   `docker compose run --rm --no-deps migrate-postgres` (the override
   mounts `backend/migration`); in `backend/` `make run-api` (:8000); in
   `frontend/` `API_PROXY=http://127.0.0.1:8000 npm start` (:3000). The
   data is in the local volume `timestrolls_pg17` (never `down -v`).
1. **MCP, still to improve** (measured 2026-10-27 against 2026-10-24, the
   same prompts: 281 → 81 calls, 314 → 145 KB of answers, 1.41 M → 139 k
   output tokens, 77 M → 21 M cached input; script and numbers in the PRs
   #21/#22):
   - **zanikleobce.cz is the largest remaining cost:** 18 calls, 86 of the
     145 KB, and 10 s per request (the site's crawl delay). In the scraper,
     an optional brief view for `scrape_zanikleobce_place` (name, German
     name, type, coordinates; complete stays the default, as in v0.4.0).
   - Translating the villages (25 calls, 74 KB) fetched the Czech names one
     village at a time from zanikleobce: a server-side import of other
     names, or a scraper tool for several names at once.
   - Finding chapels and churches (22 calls, 34 KB) is search across
     sources: the combined lookup from the scraper's `docs/limitations.md`
     (#5).
   - The admin tool list is 11 KB, read on every turn: shorten the
     docstrings and item schemas.
   - The other scrapers (zanikleobce, boehmerwald) become imports like
     houses and sacral buildings once there's a need.
   - Rights: names, numbers and kinds from the archives are stored as facts
     (public without the archive's permission; #22). Confirm or change.
   - **Texts (after #27):** try `edit_texts` and `move_text_langs` with the
     agent on a few Topothek captions (gentle scraping). Next is the
     `source_changed` report on a new harvest (§7 below). A discreet
     "gekürzt / zkráceno / abridged" on the photo label uses the public
     `edited` flag (frontend, not started).
2. **The switch-over is done** (v0.4.0, 2026-11-01). The agent now curates
   locally with the MCP and the skill `.claude/skills/scrape-places`
   (git-excluded); production gets the content by `make push`, run by the
   user. Push only when no one changed production since the last pull.
   Later the agent curates on production with its own token (not `API_KEY`).
   Old numeric place links (`?location=5`) no longer work.
3. **Still to test by hand:** audio with the screen locked, the lock-screen
   and headphone controls (Media Session), resuming an episode the next day,
   and an iPhone (Safari).
4. **Open points:** the repo has no LICENSE although the About page says
   "open source" (deferred); place names next to the dots from zoom 15 on
   (keep or hide; part of round B); the about text is a first draft; the
   Czech UI strings (player, dock) should be checked by a native speaker; in
   a desktop window narrower than ~360 px the zoom pill squeezes the years
   (accepted for now).
5. The agreed order (changed 2026-11-01): 5 auth and admin (now, item 0),
   then the small points (release prep, items 1, 4, 6, round B leftovers),
   then 3 offline PWA, 6 Android.
6. **Backend, "has more" (2026-10-29):** the map marks a place worth
   opening with three pips (hover name, wall label, the village panel's
   lists) and a filled house dot, for now only when it has photos
   (`hasMore` in `frontend/src/LocationMarkers/hierarchy.js`).
   `/api/locations/` (and a place's `children`) should also say whether it
   has podcasts or a description text in any language (names and archive
   facts don't count), e.g. one field `more: bool`; `hasMore` and the
   filled dot then use it.
7. **For aerial-timeline (not this repo):** `publish` must flush the CDN with
   wildcards after every upload (see `CLAUDE.md`, "CDN caching"); widening a
   region re-renders tiles under the same URLs.

## Status

| # | Step | Status |
|---|---|---|
| 0 | CI basics, Vite migration, repo cleanup (ETL out) | Done: CI and Vite (#7), the legacy 1945 ETL removed (#33, now in aerial-timeline) |
| 1 | CDN years and time selection | Done (#7) |
| 2 | Theme, logo, mobile layout | Done (#8) |
| 2b | Styling polish: base map, colours on map and imagery, fonts, usability, time slider | Done (#8) |
| 2c | Calm map: only map and time line, the rest in the menu | Done (#9) |
| 2d | Phone test and mobile polish, area start views | Done (#12, #13, #14) |
| 2e | Houses and chapels on the map (round B), tap label and pips | Done (#24, #25) |
| 3 | Own base map and offline PWA | Open |
| 4 | Release workflow (DOCR, deploy) | Done (#10, #11) |
| 5 | Auth (OIDC JWT) and admin (react-admin) | Next (decided 2026-11-01); plan first |
| 6 | Capacitor Android: geofence notifications, background audio | Open |
| 7 | MCP server on the same auth | First version for agents done (#20, #21, #22, scraper v0.4.0); bearer tokens for now, OAuth with step 5; text cleanup (#27); live since v0.4.0 (2026-11-01) |

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
| 2e | The agent's houses would have buried the map in red dots |
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
people use the app outdoors. Two corrections to the first offline design (a
viewport download with the Cache API and a service worker; the document was
removed on 2026-11-01, it's in git history):
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
**Decided 2026-11-01** (replaces the plan written before v0.4.0): the API is
its own **OAuth 2.1 authorization server** for the MCP clients (claude.ai,
ChatGPT, Gemini), through FastMCP's `OAuthProxy` (`GoogleProvider`, already a
dependency), with **Google** as the login. No vendor, no extra service, no
cost. A hosted IdP (WorkOS, Auth0) and Keycloak were weighed and rejected
(vendor and pricing risk; RAM and admin effort on the droplet). Bearer
tokens alone don't work: claude.ai and ChatGPT connectors only speak the MCP
authorization spec (OAuth 2.1 + PKCE, RFC 9728/8414 metadata, DCR or CIMD).

**The app itself needs no login (decided 2026-11-01).** The map, the place
panels, the tours and the public REST routes (`/api/locations`, `/api/tours`,
`/api/credits`) stay open, with no login button and no auth code in the main
bundle. Only people who change content sign in: the `/admin` section (its
own lazy chunk, which alone loads the OAuth client), the admin routes and
the admin MCP.

**Who may do what (decided 2026-11-01):**
- **Public, no login:** the app, the public REST routes and the public MCP
  (`/api/mcp`).
- **Editors:** every admin tool and route: scraping, imports, changing
  content, publishing and muting.
- **Admins:** in addition, accounts, invites and roles.
- Only these two roles for now; finer roles and areas come later.

**Invite only.** Nobody can create an account. Google proves the email; our
database decides. An admin invites an email address with a role. At the
first Google login with that verified email, the identity is linked to the
invited account. Anyone else is refused right after the Google step ("not
invited"), and no token is issued. Revoking a role or blocking an account
works at once, since every request checks the database. Google's own "test
users" list is not used for this (100 users at most, logins expire after 7
days). The first admin is invited through the admin API with `API_KEY`.

**Identity from Google, permissions in our database.**
- `MultiAuth(server=GoogleProvider, verifiers=[Tokens])`. One instance serves
  both MCP servers and REST. `API_KEY` and the personal tokens (`api_token`)
  keep working for the replay, scripts and CI.
- Two fixes to FastMCP's defaults:
  - The OAuth store goes into our Postgres (key-value store, `asyncpg`),
    not the per-container file store, which is lost on every release.
  - Google's token check is cached for 10 min per worker; uncached, every
    MCP call makes 2 HTTPS calls to Google (+100–250 ms). Compute otherwise:
    under 5 % of a core for 100 users.
- The login (`sub`, verified email) maps to an account through
  `account_identity (issuer, subject)`, made at the first login from an
  invite with the same verified email; without an invite the login is refused.
- Roles in `grant` (never deleted, only revoked) map to today's scopes, so
  routes, tools and `Actor.can()` stay as they are:
  - `editor` → `scrape`, `read:all`, `write`, `review`
  - `admin` → everything (`admin` covers every scope)
  - `read` is no longer needed for the public MCP, which becomes open.
  - Later: finer roles (e.g. a reviewer apart from editors) only add
    rows to the role → scopes map.
- Each grant has an optional `area` (a place: a village or region). It is
  stored but not enforced yet; later the service layer checks it via `part_of`.
- **Locally no login:** `auth.mode` = `${AUTH_MODE|oauth}`. The override and
  `make run-api` set `local`: a request without a token is `admin`, and no
  Google credentials are needed. Production never sets it.
- URLs: `/api/authorize`, `/api/token`, `/api/register`, `/api/auth/callback`;
  metadata under `/.well-known/oauth-*` (Caddy routes it to the API).
- New secrets: the Google client id and secret, and a JWT signing key. The
  Google app: consent screen "External", scopes `openid email profile`,
  published "In production" ("Testing" caps it at 100 users and expires
  refresh tokens after 7 days).

**Spike (2026-11-01, fastmcp 3.4.0, offline with dummy Google credentials):**
- Mounting `http_app(path="/")` with the provider inside the mount puts the
  OAuth endpoints at `/api/mcp/authorize` while the metadata advertises
  `/api/authorize`. Wiring that works (tested: metadata, DCR 201, 401 with
  `resource_metadata`, PAT 200):
  - **One provider per MCP server**, because the resource URL is state on
    the provider (`set_mcp_path`). Both use
    `base_url=https://…/api` (the shared issuer),
    `resource_base_url=https://…/api/mcp[/admin]`, the same store and the same
    JWT key.
  - Each server is still mounted at `/api/mcp[/admin]`, as today.
  - The provider's `get_well_known_routes()` (both servers, deduplicated) are
    added to the root app.
  - The authorization-server routes (`/authorize`, `/token`, `/register`,
    `/auth/callback`, `/consent`) are a Starlette app mounted at `/api`
    *after* the FastAPI routers.
- `MultiAuth(..., required_scopes=[])`: otherwise Google's `openid` is
  required of every token and a PAT gets 403.
- The resource URLs end in `/` (`/api/mcp/`). PR 3 adds well-known aliases
  without the slash and checks the token audience for a client configured
  as `/api/mcp`.
- OAuth tokens carry Google scopes. A `MultiAuth` subclass maps their claims
  through `login` to our scopes (and the DB), so the tools' `scope()` checks
  stay as they are.
- Postgres store (`key_value.aio.stores.postgresql`): `url` or an `asyncpg`
  pool, `table_name`, `auto_create=False`. The table (`collection`, `key`,
  `value jsonb`, `ttl`, `created_at`, `expires_at`, PK `collection, key`)
  comes from our migration, with an explicit `DELETE` grant for the app user.
  The search path is `timestrolls`. New dependency: `asyncpg`.

**PRs:**

| # | Step | Status |
|---|---|---|
| 1 | This plan + spike (wiring under the FastAPI mounts, shared provider, Postgres store) | done |
| 2 | Schema and roles (`V001_007`): `account.email`, `account_role` (`grant` is a reserved word), `oauth_store`; `invite`, `login`, `grant_role`, `revoke_role`; `/api/admin/invites/`, `/accounts/{name}/roles`, `/roles/{id}/revoke` | done (#36) |
| 3 | OAuth on the admin MCP and REST (`api/auth/oauth.py`), the public MCP open, `GET /api/admin/me`, config `auth`, Caddy, release secrets. Google sign-in is on only once `GOOGLE_CLIENT_ID` is set, so releasing it changes nothing until then | done (#37) |
| 4 | Google app and secrets (by hand), release, connect claude.ai; docs | done (v0.5.1, #38, #39, this) |
| 5a | Admin API for the UI: `GET /api/admin/review/` (one type's rows with kind, picture, source, places, author; `total` for paging) and `POST /api/admin/resources/status` (several at once; `each()` moved into the service, shared with MCP) | in review |
| 5b | Admin shell and sign-in: `/admin` as a lazy chunk, OAuth 2.1 public client (`oauth4webapi`, dynamic registration, PKCE; tokens in memory and `sessionStorage`), local mode when `/api/admin/me` answers without a token, the not-invited screen, de/cs/en | |
| 5c | Review queue: type tabs, filters, batch publish/mute with undo, detail panel (photo, texts per language, sources, permission, history), phone layout | |
| 6 | Admin UI 2: places (map picker, texts), Topothek import, accounts and roles, personal tokens (planned separately) | |

**Admin UI decisions (2026-11-01):** our own MUI pages in the app's look (not
react-admin: our API isn't a standard REST shape, and the screens such as the
map picker and texts per language are our own), strings in de/cs/en, desktop
first but usable on phones. The app never loads the admin code.

**Rollout (2026-11-01):**
- v0.5.0 took the site down for about 10 minutes. The OAuth server was
  mounted at `/api` and answered `/api/ready`, the health check, with 404
  (fixed in #38, single routes; a test now calls `/api/ready` with Google on).
  CI runs without the Google secrets, so only production had sign-in on.
- The release never recreated Caddy, so Caddyfile changes never took effect
  (`/.well-known/oauth-*` served the app). Since #39 the deploy recreates
  Caddy when the Caddyfile differs.
- The Google client is in **"Testing"**: every editor must also be a test user
  (100 at most), and sign-ins expire after 7 days. Switch it to "In
  production" before inviting others (no Google review for `openid email`).
- Checked: claude.ai (custom connector, OAuth) lists the admin tools for the
  invited admin `viktor.atalla@gmail.com`. Not tried yet: ChatGPT, Gemini CLI.

**Connecting** (the URL is always `https://timestrolls.debtray.com/api/mcp/admin`;
the public `/api/mcp` needs nothing):
- First, invite the person: `POST /api/admin/invites/` with `{"email", "role"}`
  (`editor` or `admin`), bearer `API_KEY`. In "Testing", also add the address
  as a Google test user.
- claude.ai: Settings → Connectors → Add custom connector, the URL, no client
  id. Then our consent page, then Google.
- ChatGPT: developer mode (paid plans), create a connector with the URL and
  OAuth.
- Gemini CLI: `~/.gemini/settings.json`
  `{"mcpServers": {"timestrolls": {"httpUrl": "<URL>"}}}`, then
  `/mcp auth timestrolls`.
- Postman (debugging): register a client at `POST /api/register` with the
  redirect URI `https://oauth.pstmn.io/v1/callback` and
  `token_endpoint_auth_method: none`. Then OAuth 2.0 "Authorization Code
  (With PKCE)", `/api/authorize`, `/api/token`, scope
  `openid https://www.googleapis.com/auth/userinfo.email`.
- Scripts and the replay keep using bearer tokens.

Left from PR 3: a person without an invitation still completes the Google
step and gets a token from our server that every request then refuses (401);
refusing already at the token exchange (`_extract_upstream_claims`) would be
clearer for them. Not checked with a real client yet (needs a second Google
test user who isn't invited).

Later: GitHub/Microsoft login (`OAuthProxy` has one upstream: a chooser or
a broker); enforcing areas. Apple login needs a paid developer account, so
it is not planned.

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

**Open: notice when a source changes a text (noted 2026-11-01).** Harvesting
again refreshes the source record but never our texts, so a caption the
archive updates later (someone answers "Wer kennt diese Person?") goes
unnoticed, and an edit that removed the question hides it twice over.
Proposal:
- When a harvest finds that the record's caption differs from the wording we
  stored, report it (`source_changed: [field]` per document in
  `harvest_topothek`, also in the replay's `check`) and change no text.
- Store that wording: the text itself, or `verbatim` for an edited text
  (`resources.verbatim`).
- A person or agent then decides: take the new wording, or edit it again.
- Map the record's keys to fields per source (Topothek: `title`, `comment`
  → description).

## Repo structure
- The notebooks in `backend/notebooks/` were removed (2026-10-22). The
  content they uploaded is now `replay/places.yml`, replayed through the API
  with `make local` / `make production` in `replay/` (the safety net until
  the admin, step 5).
- ~~The tile and georeferencing pipeline in `backend/` (`etl.py`, `transform/`, …)
  moves to aerial-timeline (its step 6) and is then deleted here in one commit.~~
  Done 2026-11-01 (aerial-timeline source kind `gcp`). Still unused afterwards:
  `backend/helpers/fs.py` and `backend/helpers/cdn.py` (nothing imports them); to be
  decided when the admin uploads media (step 5).
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
