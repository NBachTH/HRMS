-- Timesheet: add total OT hours for the month.
ALTER TABLE timesheet ADD COLUMN IF NOT EXISTS ot_hours NUMERIC(10, 2);
