CREATE SCHEMA IF NOT EXISTS timestrolls;

CREATE TABLE IF NOT EXISTS timestrolls.place
(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Place',
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL
);

-- Create user
CREATE USER "${user}" WITH PASSWORD '${password}';
GRANT USAGE ON SCHEMA timestrolls TO "${user}";

-- Grant privileges to the application user
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE timestrolls.place TO "${user}";
GRANT USAGE, SELECT ON SEQUENCE timestrolls.place_id_seq TO "${user}";
