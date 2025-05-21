CREATE SCHEMA IF NOT EXISTS timestrolls;

CREATE TABLE IF NOT EXISTS timestrolls.place
(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Place',
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timestrolls.image
(
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES timestrolls.place (id) ON DELETE CASCADE,
    title TEXT,
    url TEXT,
    hash TEXT,
    content_type TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timestrolls.podcast
(
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES timestrolls.place (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    path TEXT,
    hash TEXT,
    content_type TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_place_id ON timestrolls.place (id);
CREATE INDEX IF NOT EXISTS idx_image_place_id ON timestrolls.image (place_id);
CREATE INDEX IF NOT EXISTS idx_podcast_place_id ON timestrolls.podcast (place_id);

-- Create user
CREATE USER "${user}" WITH PASSWORD '${password}';
GRANT USAGE ON SCHEMA timestrolls TO "${user}";

-- Grant privileges to the application user
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE timestrolls.place TO "${user}";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE timestrolls.image TO "${user}";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE timestrolls.podcast TO "${user}";

GRANT USAGE, SELECT ON SEQUENCE timestrolls.place_id_seq TO "${user}";
GRANT USAGE, SELECT ON SEQUENCE timestrolls.image_id_seq TO "${user}";
GRANT USAGE, SELECT ON SEQUENCE timestrolls.podcast_id_seq TO "${user}";
