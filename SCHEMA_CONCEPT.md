# Schema concept: content, rights and MCP

A design doc (not implemented yet), agreed in discussion on 2026-10-24. It
covers three pieces of work that build on each other: the Topothek import via
`time-strolls-scraper`, an MCP server next to the REST API, and a new database
schema with languages, authorship, permissions and review.

## Goals
- An LLM agent harvests data via MCP and stores it as preliminary content; a
  person reviews it (via REST, MCP or the admin later) and decides what is
  published. Every write shows who made it: about 5 people and their agents.
- Everything harvested is kept. Nothing is deleted; content is published or
  muted.
- Content is distributed (API, MCP, map) only with permission from its source
  or its author. Permissions come from personal communication and are tracked.
- Texts exist in several languages. The original language is recorded, and
  every translation says who made it and how (human or machine).
- Objects are loosely coupled: places, houses, photos, podcasts and tours stand
  on their own; links between them are encouraged but never required.

## Decisions (2026-10-24)
- **Resources and relations:** every object is a `resource` with a UUIDv7 id
  and one typed table per type (class table inheritance). Objects never point
  at each other; all links are rows in `relation`. A hierarchy (house in a
  village) is a convention, never enforced.
- **Slugs:** a unique column on `place` and `tour`, the readable key for URLs
  and the replay; never a primary or foreign key. Created once from the name
  and coordinates (the current algorithm, so existing deep links survive) and
  then kept; renaming keeps the old slug as an alias.
- **Status:** `new` → `published` / `muted` (with a reason), and `withdrawn`
  when a permission is revoked. Publishing belongs to the resource: a
  published photo shows wherever it is linked.
- **Permissions:** granted per source (e.g. Topothek Deutsch Reichenau) or per
  party (creator or owner, either is enough), with two uses: `show` and `copy`.
  Names and coordinates need none; our own content needs none.
- **Files:** harvesting stores links only. A copy to our CDN is a separate
  step and needs `copy`. An upload (a historian's own photo) records its
  permission with the upload.
- **Languages:** ISO 639 / BCP 47 codes, open-ended (`cs`, not `cz`). Only
  texts are translated (no audio yet). The map shows machine translations;
  the menu's "Quellen" credits them. Translations have no status of their
  own: they follow their resource.
- **Place kinds** are a property (a code), not a text: they are not
  translated.
- **Auth:** bearer tokens with scopes, for REST and MCP alike, built so that
  OAuth 2.1 (JWT) can be added later without touching routes or tools. No
  anonymous MCP for now.
- **Areas:** not now, but possible later without a migration (see below).
- **Clean break:** the current tables and migrations are replaced; production
  is refilled from the replay.
- **Scraper repo:** stays private for now (public later); CI and the release
  build install it with a deploy key.

## Model

```
resource        id uuid (v7) PK, type (place | media | tour), status, status_reason,
                created_by → account, created_at, updated_at,
                published_by → account, published_at
 ├─ place       id → resource, slug unique, kind → place_kind,
 │              geom geometry(Geometry, 4326), attributes jsonb
 ├─ media       id → resource, kind (image | document | audio),
 │              date_text, date_from, date_to,
 │              creator → party, rights_holder → party, attributes jsonb
 │   └─ file    id, media → media, role (original | preview),
 │              storage (external | cdn), url, cdn_path, hash, content_type,
 │              width, height, duration
 └─ tour        id → resource, slug unique, geom geometry(LineStringZ, 4326),
                length (generated, km), attributes jsonb

slug_alias      slug unique, resource → resource       (old slugs, for redirects)
place_kind      code PK (village, house, chapel, church, wayside_shrine, …), map_visible
relation        id, subject → resource, predicate → relation_kind, object → resource,
                position, created_by, created_at      unique (subject, predicate, object)
relation_kind   code PK, subject_types, object_types, ordered   (checked in the service layer)
text            id, resource → resource, field (name | title | description | caption | …),
                lang, body, is_original, translated_from (lang),
                method (original | human | machine), model, translated_by → account,
                source_record → source_record (nullable), created_at
                unique (resource, field, lang)

source          id, code unique ('topothek:deutsch-reichenau'), name, base_url,
                operator → party
source_record   id, source → source, external_id, url, retrieved_at, lang, raw jsonb,
                retrieved_by → account                 unique (source, external_id)
resource_source resource ↔ source_record (many-to-many)

party           id, kind (person | organisation), name, note
permission      id, source → source | party → party (exactly one),
                party_role (creator | owner | operator), show bool, copy bool,
                granted_by → party, granted_at, note, evidence,
                recorded_by → account, recorded_at, revoked_at

account         id, kind (human | agent), name, operated_by → account, party → party
account_identity issuer, subject → account             unique (issuer, subject)
api_token       id, account, name, hash, scopes text[], created_at, last_used_at, revoked_at
change_log      id, account, at, resource, table_name, action, diff jsonb, run jsonb
```

Notes:
- **Why a common parent table:** status, texts, relations, origin and the change
  log are built once, with real foreign keys, for every type. A new type
  (person, event, archive collection) is one more table under `resource`.
- **Lists stand alone:** all podcasts are `media where kind = 'audio'`, all
  tours are `tour`, whatever they are linked to.
- **Kind-specific facts** (house number, former number, house name; a chapel's
  category and state) go into `attributes`, validated by one pydantic model per
  kind in the service layer. New kinds are rows in `place_kind`, not migrations.
- **Duplicates** are prevented by origin, not by structure: a source record is
  unique per (source, external id), a file per hash. Harvesting twice only
  updates `retrieved_at`. Turning a source record into a new resource, or
  attaching it to an existing one, is a deliberate step. The same photo in two
  archives is two media linked by `same_as`.
- **Place names** are `text` rows with `field = 'name'`. A place can have
  several original names ("Oberuresch" `de`, "Horní Ureš" `cs`); they are names,
  not translations, so `is_original` is true for each. One is marked primary
  (for the slug and as the default label).
- **Areas later:** `place.geom` is a generic geometry already (points only for
  now, checked in the service layer). An area becomes a `place_kind` row with a
  polygon, linked by `part_of`; tours and podcasts link to it with `about`.
- **Timestamps** are `timestamptz`, set by the database.

## Relation kinds

| Kind | Subject → object | Meaning |
|---|---|---|
| `part_of` | place → place | a house in a village, a chapel at a village (later: a village in an area) |
| `shows` | media → place | a photo or document shows this place |
| `about` | media, tour → place, tour | a podcast or a tour is about a place |
| `stop` | tour → place | a stop on a tour, ordered by `position` |
| `same_as` | media → media | the same object from two sources |

The allowed pairs live in `relation_kind` and are checked in the service layer.
The admin and the agent tools suggest links (e.g. a photo's place within 100 m)
but never require them. A link is shown publicly when both ends are public.

## Visibility

One database view per type (`public_place`, `public_media`, `public_tour`,
`public_text`), read by the public REST routes and the public MCP tools alike:

- the resource is `published`, and
- it is permitted: our own content (no outside creator, owner or source) needs
  nothing; media and texts from outside need a non-revoked permission with
  `show`, via their source or via their creator or owner;
- a `cdn` file is served only with `copy`; otherwise the `external` file.

Places and their names need no permission (names and coordinates are not
protected). Revoking a permission hides the content at once; without `copy`
our CDN copies are removed and the media becomes `withdrawn`.

## Languages
- Every text row has `lang` and `is_original`; a translation has
  `translated_from`, `method` (`human` or `machine` plus `model`) and
  `translated_by` (an account, human or agent).
- The public API takes `?lang=`: it returns that language if it exists,
  otherwise the original, and says which one it returned and whether it is a
  machine translation.
- The menu's "Quellen" lists the translators and marks machine translations.
- Texts from a source (e.g. a zanikleobce history article) keep their
  `source_record`, so they need the source's permission, and so do their
  translations.

## Files and permissions in practice
- **Harvest:** a media with one `external` file (the archive's URL). Nothing is
  downloaded.
- **Copy:** once a `copy` permission covers it, an admin action or MCP tool
  copies the file to the CDN as a second `cdn` file (with a preview). Offline
  (roadmap step 3) uses only `cdn` files.
- **Upload:** a historian uploads their own photo (admin later, API now): a
  media with a `cdn` file, and a permission recorded in the same step (granted
  by them as owner, recorded by the uploading account).
- **Revoke:** set `revoked_at`; the view hides the content, CDN copies are
  deleted where `copy` is gone.

## Auth
- **Accounts:** one per person and one per agent (`kind = agent`,
  `operated_by` the person responsible).
- **Scopes:** `read` (published data), `read:all` (also new and muted),
  `write` (create drafts, harvest), `review` (publish, mute, links,
  permissions), `scrape`, `admin` (accounts, tokens).
- **Now:** static bearer tokens (`Authorization: Bearer …`), stored hashed in
  `api_token`, each tied to an account and carrying scopes. One function turns
  a token into account + scopes; routes and tools only ask for scopes. The
  `X-API-Key` header goes away (the replay switches to a token).
- **Later (OAuth 2.1):** a second check verifies JWTs from an identity
  provider (issuer, audience, JWKS), maps `iss`/`sub` to `account_identity` and
  the `scope` claim to the same scopes, and the MCP mounts publish the
  protected-resource metadata. No route or tool changes.
- Every write records the account; agents also send a run (model, session) for
  the change log, so a bad batch can be found and muted as a whole.

## API and MCP
- **Service layer** (`backend/service/`): all reads and writes, used by REST
  and MCP alike. Controllers and tools are thin.
- **REST:** public reads stay anonymous on the public views (`/api/locations`
  keeps its shape where possible, plus `?lang=`, several podcasts per place).
  Admin routes need tokens with scopes.
- **MCP**, two mounts in the API process:
  - `/api/mcp` (scope `read`): search places, get a place with its linked
    media and texts, list tours and podcasts; published and permitted only.
    Behind a token for now; can be opened (anonymous or OAuth) later by
    changing only this mount.
  - `/api/mcp/admin`: the scraper tools (mounted from `time-strolls-scraper`,
    scope `scrape`); harvest into `source_record` and create draft resources
    (`write`); list new content, publish, mute, link, add translations, record
    permissions (`review`). External LLMs never see these tools.
- The scraper's polite throttling and cache live in the process: run the API
  with one worker.

## Replay
`replay/places.yml` stays the curated content and is adapted to the new API:
places (with kind and names), media by source URL, podcasts, tours, links and,
new, the known permissions and parties. It stays idempotent: places and tours
by slug, media by (source, external id), files by hash.

## Migration
- The old migrations are replaced by a fresh set; no data migration.
- A new volume `timestrolls_pg17` with PostgreSQL 17 (13 is out of support).
  The old volume `deployment_postgres` stays untouched, so running the release
  workflow with a v0.3.x tag rolls back to the old data.
- On production (done by hand): `docker volume create timestrolls_pg17` on the
  droplet, publish the release, run the replay (with the admin token).
- The migration creates the app user only if it doesn't exist yet.
- Old numeric place links (`?location=5`) are dropped: the ids changed when
  the database was refilled on 2026-10-22. Tours are linked by slug or id.

## Order of work
1. **Scraper switch:** the scraper as a dependency (deploy key in CI and the
   release build), `POST /api/images/topothek/` via `topothek.document`,
   remove `backend/topothek/` and `beautifulsoup4`. Small, on the old schema.
   Merged (#16).
2. **New schema, service layer, tokens**, in three PRs released together:
   2a backend (migrations, models, the service layer, accounts and scoped
   tokens, public views, REST with admin routes under `/api/admin`, database
   tests in CI); 2b the replay; 2c the frontend (`?lang=`, several podcasts,
   credits for translations).
3. **MCP:** both mounts on the service layer, scraper tools in the admin
   mount; harvesting and review tools.
4. **Later:** OAuth 2.1 (roadmap step 5, with the admin UI), areas, more
   types (persons, events), copying permitted files for offline (step 3).

## Feedback for time-strolls-scraper
Collected while building; to be raised in that repo.
- The MCP view of a Topothek document drops `rights`; we need the licence text
  for permissions (the Python function keeps it).
- A stable source key on every record, the same across scrapers (`source` plus
  `id`), so `source_record` needs no per-scraper mapping.

## Open
- The licence of this repo (see `ROADMAP.md`).
