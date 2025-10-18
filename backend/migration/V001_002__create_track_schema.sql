CREATE TABLE IF NOT EXISTS timestrolls.track (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    geom GEOMETRY(LineStringZ, 4326)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE timestrolls.track TO "${user}";
GRANT USAGE, SELECT ON SEQUENCE timestrolls.track_id_seq TO "${user}";
