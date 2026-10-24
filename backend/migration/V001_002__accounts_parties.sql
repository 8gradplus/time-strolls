-- Who works in Time Strolls (accounts) and who made or owns content (parties).

-- A person or organisation outside the system: a photographer, an owner, an
-- archive, a podcast producer
CREATE TABLE timestrolls.party (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    kind text CHECK (kind IN ('person', 'organisation')),
    name text NOT NULL UNIQUE,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- A person or agent who logs in or holds a token
CREATE TABLE timestrolls.account (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    kind text NOT NULL CHECK (kind IN ('human', 'agent', 'system')),
    name text NOT NULL UNIQUE,
    -- the person responsible for an agent
    operated_by uuid REFERENCES timestrolls.account (id),
    party_id uuid REFERENCES timestrolls.party (id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- The holder of API_KEY (config.yml): all scopes
INSERT INTO timestrolls.account (kind, name) VALUES ('system', 'admin');

-- Logins from an identity provider (OAuth 2.1, later): issuer + subject
CREATE TABLE timestrolls.account_identity (
    issuer text NOT NULL,
    subject text NOT NULL,
    account_id uuid NOT NULL REFERENCES timestrolls.account (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (issuer, subject)
);

-- Bearer tokens, stored as SHA-256 hashes; revoked, never deleted
CREATE TABLE timestrolls.api_token (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    account_id uuid NOT NULL REFERENCES timestrolls.account (id),
    name text NOT NULL,
    hash text NOT NULL UNIQUE,
    scopes text[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    revoked_at timestamptz
);
