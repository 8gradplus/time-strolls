# Schema concept: content, rights and languages

The rules behind the content model and why it looks the way it does. Agreed on
2026-10-24, built in #17–#20 and #27. What exists and how to use it is in
`CLAUDE.md`; the definitive schema is the migrations in `backend/migration/`.

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

## Decisions
- **Resources and relations:** every object is a `resource` with a UUIDv7 id
  and one typed table per type (class table inheritance). Objects never point
  at each other; all links are rows in `relation`. A hierarchy (house in a
  village) is a convention, never enforced.
- **Slugs:** a unique column on `place` and `tour`, the readable key for URLs
  and the replay; never a primary or foreign key. Created once from the name
  and coordinates and then kept; renaming keeps the old slug as an alias.
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
  OAuth 2.1 (JWT) can be added later without touching routes or tools.
- **Areas:** not now, but possible later without a migration (see below).

## Model in short

```
resource (id, type, status, who/when)
 ├─ place   slug, kind → place_kind, geom, attributes
 ├─ media   kind (image | document | audio), dates, creator/rights holder → party
 │   └─ file   storage (external | cdn), url, hash, …
 └─ tour    slug, geom (LineStringZ), length
relation        subject → predicate → object (+ position)
text            resource, field, lang, body, method (original | human | machine),
                source_record, edited_by/at/note
source → source_record ↔ resource (resource_source)
party, permission (per source or party: show, copy, revoked)
account, account_identity, api_token (scopes), change_log
```

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
  refreshes the record. Turning a source record into a new resource, or
  attaching it to an existing one, is a deliberate step. The same photo in two
  archives is two media linked by `same_as`.
- **Place names** are `text` rows with `field = 'name'`. A place can have
  several original names ("Oberuresch" `de`, "Horní Ureš" `cs`); they are names,
  not translations, so each has `method = 'original'`. One is marked primary
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
`public_text`, …), read by the public REST routes and the public MCP tools alike:

- the resource is `published`, and
- it is permitted: our own content (no outside creator, owner or source) needs
  nothing; media and texts from outside need a non-revoked permission with
  `show`, via their source or via their creator or owner;
- a `cdn` file is served only with `copy`; otherwise the `external` file.

Places and their names need no permission (names and coordinates are not
protected). Revoking a permission hides the content at once; without `copy`
our CDN copies are removed and the media becomes `withdrawn`.

## Languages
- Every text row has `lang` and `method`; a translation has `translated_from`,
  `method` `human` or `machine` (plus `model`) and its author in `created_by`
  (an account, human or agent).
- The public API takes `?lang=`: it returns that language if it exists,
  otherwise the original, and says which one it returned and whether it is a
  machine translation.
- The menu's "Quellen" lists the translators and marks machine translations.
- Texts from a source (e.g. a zanikleobce history article) keep their
  `source_record`, so they need the source's permission, and so do their
  translations.
- **Cleaning up source texts (2026-11-01).** Scrapers send language codes
  with typos and sentences that make no sense in the app ("Wer kennt diese
  Person?").
  - Codes are normalised on every write (`helpers/lang.py`: `DE`, `deu`,
    `ger`, `cz` → `de`, `cs`; anything unreadable is refused). The scraper's
    value stays in `source_record`.
  - A valid but wrong code (a Czech caption as `de`) is moved explicitly
    (`move_text_langs`); translations follow, and the move refuses to
    overwrite.
  - Sentences are removed from the **original**, never inside a
    translation: `edit_texts` marks it (`edited_by`, `edited_at`,
    `edit_note`). A translation renders the whole text, so its credit stays
    true.
  - The verbatim text is in the source record and in the change log;
    `get_resource(full=True)` and `GET /api/admin/resources/{key}` show it
    as `verbatim` (by `field/lang`). Harvesting again doesn't touch texts.
  - A sourced original can't be replaced with `set_texts`, and a
    translation never replaces an original (409).
  - Texts have no status of their own, so editing or moving the texts of a
    resource that isn't `new` needs `review`.
  - Translations made before an edit are named (`retranslate`) and must be
    redone. The public API marks an image `edited` (also when it is
    translated from an edited original), for a later "abridged" label.

## Files and permissions in practice
- **Harvest (built):** a media with one `external` file (the archive's URL).
  Nothing is downloaded.
- **Revoke (built):** set `revoked_at`; the views hide the content at once.
- **Copy (planned):** once a `copy` permission covers it, an admin action or
  MCP tool copies the file to the CDN as a second `cdn` file (with a preview),
  and deletes it again when `copy` is revoked. Offline (ROADMAP §3) uses only
  `cdn` files.
- **Upload (planned):** a historian uploads their own photo: a media with a
  `cdn` file, and a permission recorded in the same step (granted by them as
  owner, recorded by the uploading account).

## Auth
- **Accounts:** one per person and one per agent (`kind = agent`,
  `operated_by` the person responsible).
- **Scopes:** `read` (published data), `read:all` (also new and muted),
  `write` (create drafts, harvest), `review` (publish, mute, permissions),
  `scrape`, `admin` (accounts, tokens).
- One function turns a token into account + scopes; routes and tools only ask
  for scopes.
- **Later (OAuth 2.1):** a second check verifies JWTs from an identity
  provider (issuer, audience, JWKS), maps `iss`/`sub` to `account_identity` and
  the `scope` claim to the same scopes, and the MCP mounts publish the
  protected-resource metadata. No route or tool changes.
- Every write records the account; agents also send a run (model, session) for
  the change log, so a bad batch can be found and muted as a whole.

## Feedback for time-strolls-scraper
Collected while building; to be raised in that repo.
- The MCP view of a Topothek document drops `rights`; we need the licence text
  for permissions (the Python function keeps it).
