-- V30: per-payslip OT hour breakdown (weekday / weekend / holiday, plus the night-overlap subset).
-- Lets the payslip show how the OT pay was made up. Night hours overlap with the other three.
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS ot_weekday_hours NUMERIC(7,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS ot_weekend_hours NUMERIC(7,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS ot_holiday_hours NUMERIC(7,2) NOT NULL DEFAULT 0;
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS ot_night_hours   NUMERIC(7,2) NOT NULL DEFAULT 0;
