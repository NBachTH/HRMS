-- OT request: store the pay coefficient (weekday 1.5 / weekend 2.0 / holiday 3.0).
ALTER TABLE ot_request ADD COLUMN IF NOT EXISTS coefficient DOUBLE PRECISION NOT NULL DEFAULT 1.5;
