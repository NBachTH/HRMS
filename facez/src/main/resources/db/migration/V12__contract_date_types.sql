-- Phase 5.1: Fix contract date types VARCHAR -> DATE (safe parallel-column approach)
-- Step 1: Add new DATE columns alongside old VARCHAR columns
ALTER TABLE contract
    ADD COLUMN start_date_new DATE,
    ADD COLUMN end_date_new   DATE;

-- Step 2: Migrate rows with standard ISO format; non-parseable values remain NULL
UPDATE contract
SET start_date_new = start_date::date
WHERE start_date ~ '^\d{4}-\d{2}-\d{2}$';

UPDATE contract
SET end_date_new = end_date::date
WHERE end_date ~ '^\d{4}-\d{2}-\d{2}$';

-- Step 3: Drop old VARCHAR columns and rename new DATE columns
ALTER TABLE contract
    DROP COLUMN start_date,
    DROP COLUMN end_date;

ALTER TABLE contract
    RENAME COLUMN start_date_new TO start_date;

ALTER TABLE contract
    RENAME COLUMN end_date_new TO end_date;
