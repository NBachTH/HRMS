-- Phase 4.1: Leave type and balance tracking
ALTER TABLE leave_request
    ADD COLUMN leave_type       VARCHAR(30),
    ADD COLUMN duration_hours   NUMERIC(10, 2),
    ADD COLUMN balance_deducted BOOLEAN NOT NULL DEFAULT false;

-- Default existing rows to ANNUAL leave type
UPDATE leave_request SET leave_type = 'ANNUAL' WHERE leave_type IS NULL;

ALTER TABLE leave_request
    ALTER COLUMN leave_type SET NOT NULL;
