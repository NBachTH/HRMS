-- Device management: add location / active / created_at so HR can manage check-in terminals.
ALTER TABLE device ADD COLUMN IF NOT EXISTS location   VARCHAR(255);
ALTER TABLE device ADD COLUMN IF NOT EXISTS active     BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE device ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now();
