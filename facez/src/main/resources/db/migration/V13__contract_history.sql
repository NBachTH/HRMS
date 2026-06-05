-- Phase 5.2: Contract history (one-to-many, effectiveFrom/effectiveTo)
-- Drop the unique constraint on employee_id so one employee can have multiple contract records
ALTER TABLE contract
    DROP CONSTRAINT IF EXISTS uk8r7vipw0kqy3og4a1wqux5m6q;

-- Also try the alternate constraint name that may be used
ALTER TABLE contract
    DROP CONSTRAINT IF EXISTS contract_employee_id_key;

-- Add history tracking columns
ALTER TABLE contract
    ADD COLUMN effective_from DATE,
    ADD COLUMN effective_to   DATE,
    ADD COLUMN current_contract BOOLEAN NOT NULL DEFAULT true;

-- Set existing records as current
UPDATE contract SET effective_from = start_date, current_contract = true WHERE effective_from IS NULL;

CREATE INDEX idx_contract_employee_current ON contract (employee_id, current_contract);
