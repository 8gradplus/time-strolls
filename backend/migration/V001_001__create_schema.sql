CREATE SCHEMA IF NOT EXISTS timestrolls;

CREATE TABLE IF NOT EXISTS timestrolls.place
(
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Place',
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timestrolls.image
(
    id SERIAL PRIMARY KEY,
    content_type TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    description TEXT,
    hash TEXT,
    owner TEXT,
    path TEXT,
    place_id INTEGER REFERENCES timestrolls.place (id) ON DELETE CASCADE,
    source_id TEXT,
    source_url TEXT,
    title TEXT,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    url TEXT UNIQUE,
    year INTEGER

);

CREATE TABLE IF NOT EXISTS timestrolls.podcast
(
    id SERIAL PRIMARY KEY,
    content_type TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    hash TEXT,
    owner TEXT,
    place_id INTEGER REFERENCES timestrolls.place (id) ON DELETE CASCADE,
    path TEXT,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
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
