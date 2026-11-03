-- What agents cost (ROADMAP, Next session, 4.5): one row per MCP tool call
-- on the admin server, with the size of the answer the model reads and how
-- long it took. Only names and numbers: no arguments, no answers.
CREATE TABLE timestrolls.tool_call (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    account_id uuid NOT NULL REFERENCES timestrolls.account (id),
    -- the X-Run header (JSON), as in the change log; claude.ai sends none
    run jsonb,
    tool text NOT NULL,
    bytes integer NOT NULL,
    ms integer NOT NULL,
    ok boolean NOT NULL
);
CREATE INDEX ON timestrolls.tool_call (account_id, at);
REVOKE UPDATE ON timestrolls.tool_call FROM "${user}";
