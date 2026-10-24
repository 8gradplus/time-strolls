-- Every object is a resource (shared status, texts, links, origin, history)
-- with one table per type. Types never point at each other; links between
-- them are rows in relation.

CREATE TABLE timestrolls.resource (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    type text NOT NULL CHECK (type IN ('place', 'media', 'tour')),
    status text NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'published', 'muted', 'withdrawn')),
    status_reason text,
    created_by uuid NOT NULL REFERENCES timestrolls.account (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    published_by uuid REFERENCES timestrolls.account (id),
    published_at timestamptz
);
CREATE INDEX ON timestrolls.resource (type, status);

-- Kinds of places; a new kind is a row, not a migration
CREATE TABLE timestrolls.place_kind (
    code text PRIMARY KEY,
    map_visible boolean NOT NULL DEFAULT true
);
INSERT INTO timestrolls.place_kind (code) VALUES
    ('village'), ('hamlet'), ('house'), ('farm'), ('chapel'), ('church'),
    ('wayside_shrine'), ('mill'), ('ruin'), ('landmark');

CREATE TABLE timestrolls.place (
    id uuid PRIMARY KEY REFERENCES timestrolls.resource (id),
    -- created once from the primary name and the coordinates, then kept
    slug text NOT NULL UNIQUE,
    kind text NOT NULL REFERENCES timestrolls.place_kind (code),
    -- a point for now; any geometry, so areas (polygons) need no migration
    geom geometry(Geometry, 4326) NOT NULL,
    -- facts of the kind: house number, former number, category, state, ...
    attributes jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX ON timestrolls.place USING gist (geom);

CREATE TABLE timestrolls.media (
    id uuid PRIMARY KEY REFERENCES timestrolls.resource (id),
    kind text NOT NULL CHECK (kind IN ('image', 'document', 'audio')),
    date_text text,
    date_from date,
    date_to date,
    creator_id uuid REFERENCES timestrolls.party (id),
    rights_holder_id uuid REFERENCES timestrolls.party (id),
    attributes jsonb NOT NULL DEFAULT '{}'
);

-- Where the bytes of a media are: the source's own file (external) or our
-- copy on the CDN (only with a copy permission)
CREATE TABLE timestrolls.file (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    media_id uuid NOT NULL REFERENCES timestrolls.media (id),
    role text NOT NULL DEFAULT 'original' CHECK (role IN ('original', 'preview')),
    storage text NOT NULL CHECK (storage IN ('external', 'cdn')),
    url text NOT NULL UNIQUE,
    cdn_path text,
    hash text,
    content_type text,
    width integer,
    height integer,
    duration real,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON timestrolls.file (media_id);

CREATE TABLE timestrolls.tour (
    id uuid PRIMARY KEY REFERENCES timestrolls.resource (id),
    slug text NOT NULL UNIQUE,
    geom geometry(LineStringZ, 4326) NOT NULL,
    -- in km
    length double precision GENERATED ALWAYS AS (
        ST_LengthSpheroid(geom, 'SPHEROID["WGS 84",6378137,298.257223563]') / 1000
    ) STORED,
    attributes jsonb NOT NULL DEFAULT '{}'
);

-- Earlier slugs of a place or tour, so that old links keep working
CREATE TABLE timestrolls.slug_alias (
    slug text PRIMARY KEY,
    resource_id uuid NOT NULL REFERENCES timestrolls.resource (id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Kinds of links and which types they connect (checked by the service layer)
CREATE TABLE timestrolls.relation_kind (
    code text PRIMARY KEY,
    subject_types text[] NOT NULL,
    object_types text[] NOT NULL,
    ordered boolean NOT NULL DEFAULT false
);
INSERT INTO timestrolls.relation_kind (code, subject_types, object_types, ordered) VALUES
    ('part_of', '{place}', '{place}', false),
    ('shows', '{media}', '{place}', true),
    ('about', '{media,tour}', '{place,tour}', false),
    ('stop', '{tour}', '{place}', true),
    ('same_as', '{media}', '{media}', false);

CREATE TABLE timestrolls.relation (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    subject_id uuid NOT NULL REFERENCES timestrolls.resource (id),
    predicate text NOT NULL REFERENCES timestrolls.relation_kind (code),
    object_id uuid NOT NULL REFERENCES timestrolls.resource (id),
    position integer,
    created_by uuid NOT NULL REFERENCES timestrolls.account (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (subject_id, predicate, object_id),
    CHECK (subject_id <> object_id)
);
CREATE INDEX ON timestrolls.relation (object_id, predicate);

-- Links are not content: they may be removed (the change log keeps them)
GRANT DELETE ON timestrolls.relation TO "${user}";
