-- Phase 7.1: Employer-side insurance contribution fields on payroll
ALTER TABLE payroll
    ADD COLUMN bhxh_employer              BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN bhyt_employer              BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN bhtn_employer              BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN workplace_accident_insurance BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN total_employer_contributions BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN total_employment_cost      BIGINT NOT NULL DEFAULT 0;
