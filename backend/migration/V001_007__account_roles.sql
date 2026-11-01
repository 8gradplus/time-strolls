-- Sign-in by invitation (ROADMAP.md, step 5): an admin invites an email
-- address with a role; the first login with that verified email links the
-- identity (account_identity, V001_002) to the account. Without an invitation
-- the login is refused.

-- The invited address, lower case
ALTER TABLE timestrolls.account ADD COLUMN email text UNIQUE
    CHECK (email = lower(email));

-- Roles of an account: revoked, never deleted. 'area' (a place) is stored for
-- later, when a role can be limited to a village or region; not enforced yet.
CREATE TABLE timestrolls.account_role (
    id uuid PRIMARY KEY DEFAULT timestrolls.uuid_generate_v7(),
    account_id uuid NOT NULL REFERENCES timestrolls.account (id),
    role text NOT NULL CHECK (role IN ('editor', 'admin')),
    area uuid REFERENCES timestrolls.resource (id),
    granted_by uuid REFERENCES timestrolls.account (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);
CREATE UNIQUE INDEX account_role_active ON timestrolls.account_role
    (account_id, role, coalesce(area, '00000000-0000-0000-0000-000000000000'))
    WHERE revoked_at IS NULL;

-- The OAuth server's state (registered clients, codes, tokens), written by
-- FastMCP's key-value store (key_value.aio.stores.postgresql) in its own
-- layout. It expires and deletes its rows itself.
CREATE TABLE timestrolls.oauth_store (
    collection text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    ttl double precision,
    created_at timestamptz,
    expires_at timestamptz,
    PRIMARY KEY (collection, key)
);
CREATE INDEX oauth_store_expires_at ON timestrolls.oauth_store (expires_at)
    WHERE expires_at IS NOT NULL;
GRANT DELETE ON timestrolls.oauth_store TO "${user}";
