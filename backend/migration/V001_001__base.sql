-- Schema, app user and defaults. The app user may read, add and change, but
-- delete only where a later migration grants it: content is never deleted,
-- it is muted (see SCHEMA_CONCEPT.md).

CREATE SCHEMA IF NOT EXISTS timestrolls;
CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${user}') THEN
        CREATE ROLE "${user}" LOGIN PASSWORD '${password}';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA timestrolls TO "${user}";
ALTER DEFAULT PRIVILEGES IN SCHEMA timestrolls
    GRANT SELECT, INSERT, UPDATE ON TABLES TO "${user}";
ALTER DEFAULT PRIVILEGES IN SCHEMA timestrolls
    GRANT USAGE, SELECT ON SEQUENCES TO "${user}";

-- UUID version 7: 48 bits of Unix time in milliseconds, then random bits, so
-- ids sort by creation time. A random (version 4) UUID with the time written
-- over its first 6 bytes and the version bits turned from 4 into 7.
CREATE FUNCTION timestrolls.uuid_generate_v7() RETURNS uuid AS $$
    SELECT encode(
        set_bit(
            set_bit(
                overlay(
                    uuid_send(gen_random_uuid())
                    PLACING substring(
                        int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
                        FROM 3
                    )
                    FROM 1 FOR 6
                ),
                52, 1
            ),
            53, 1
        ),
        'hex'
    )::uuid
$$ LANGUAGE sql VOLATILE;
