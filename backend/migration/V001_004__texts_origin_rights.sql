-- Texts in several languages, where content came from, permissions to
-- distribute it, and the history of every change.

-- An archive or website we harvest from, e.g. topothek:deutsch-reichenau
CREATE TABLE timestrolls.source (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    base_url text,
    operator_id uuid REFERENCES timestrolls.party (id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- One record as harvested, kept for good; harvesting it again updates it
CREATE TABLE timestrolls.source_record (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    source_id uuid NOT NULL REFERENCES timestrolls.source (id),
    external_id text NOT NULL,
    url text,
    lang text,
    retrieved_at timestamptz,
    raw jsonb NOT NULL DEFAULT '{}',
    retrieved_by uuid NOT NULL REFERENCES timestrolls.account (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    UNIQUE (source_id, external_id)
);

CREATE TABLE timestrolls.resource_source (
    resource_id uuid NOT NULL REFERENCES timestrolls.resource (id),
    source_record_id uuid NOT NULL REFERENCES timestrolls.source_record (id),
    PRIMARY KEY (resource_id, source_record_id)
);
CREATE INDEX ON timestrolls.resource_source (source_record_id);

-- A text of a resource in one language: an original (a place may have
-- several original names, e.g. de and cs) or a translation, with its author
CREATE TABLE timestrolls.text (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    resource_id uuid NOT NULL REFERENCES timestrolls.resource (id),
    field text NOT NULL,                 -- name, title, description, ...
    lang text NOT NULL,                  -- ISO 639 / BCP 47: de, cs, en, ...
    body text NOT NULL,
    method text NOT NULL DEFAULT 'original'
        CHECK (method IN ('original', 'human', 'machine')),
    translated_from text,
    model text,                          -- for machine translations
    -- the primary name (slug, default label); names only
    is_primary boolean NOT NULL DEFAULT false,
    -- set for texts from a source, also on their translations
    source_record_id uuid REFERENCES timestrolls.source_record (id),
    created_by uuid NOT NULL REFERENCES timestrolls.account (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    UNIQUE (resource_id, field, lang),
    CHECK ((method = 'original') = (translated_from IS NULL))
);
CREATE UNIQUE INDEX ON timestrolls.text (resource_id, field) WHERE is_primary;

-- A permission to distribute content, from a source (all its records) or a
-- party (as creator or owner of media). Granted by personal communication;
-- revoked, never deleted. show: in our app, API and MCP (the file comes from
-- the source); copy: also stored on our CDN, offline, in the app.
CREATE TABLE timestrolls.permission (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    source_id uuid REFERENCES timestrolls.source (id),
    party_id uuid REFERENCES timestrolls.party (id),
    party_role text CHECK (party_role IN ('creator', 'owner', 'operator')),
    show boolean NOT NULL,
    copy boolean NOT NULL,
    granted_by uuid REFERENCES timestrolls.party (id),
    granted_at date,
    note text,
    evidence text,
    recorded_by uuid NOT NULL REFERENCES timestrolls.account (id),
    recorded_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CHECK ((source_id IS NULL) <> (party_id IS NULL)),
    CHECK (show OR NOT copy)
);

-- Every write: who, when, what (written by the service layer, never changed)
CREATE TABLE timestrolls.change_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id uuid NOT NULL REFERENCES timestrolls.account (id),
    at timestamptz NOT NULL DEFAULT now(),
    resource_id uuid REFERENCES timestrolls.resource (id),
    table_name text NOT NULL,
    row_id text,
    action text NOT NULL,
    diff jsonb NOT NULL DEFAULT '{}',
    -- for agents: model, session, ...
    run jsonb
);
CREATE INDEX ON timestrolls.change_log (resource_id);
REVOKE UPDATE ON timestrolls.change_log FROM "${user}";
