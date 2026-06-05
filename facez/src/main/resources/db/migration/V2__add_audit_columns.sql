ALTER TABLE employee_info
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE employee_info
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE employee_info
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE employee_info
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE contract
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE contract
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE leave_request
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE leave_request
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE ot_request
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE ot_request
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE payroll
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE payroll
    ADD COLUMN IF NOT EXISTS kpi1score DOUBLE PRECISION;

ALTER TABLE payroll
    ADD COLUMN IF NOT EXISTS kpi2score DOUBLE PRECISION;

ALTER TABLE payroll
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE system_config
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

ALTER TABLE payroll
    ALTER COLUMN kpi1score SET NOT NULL;

ALTER TABLE payroll
    ALTER COLUMN kpi2score SET NOT NULL;

DROP TABLE salary CASCADE;

ALTER TABLE benefit
    DROP COLUMN benefit_id;

ALTER TABLE benefit
    DROP COLUMN base_salary;

ALTER TABLE benefit
    DROP COLUMN salary_rank;

ALTER TABLE payroll
    DROP COLUMN kpi1_score;

ALTER TABLE payroll
    DROP COLUMN kpi2_score;

ALTER TABLE attendance
    ALTER COLUMN late_hour TYPE DECIMAL USING (late_hour::DECIMAL);

ALTER TABLE attendance
    ALTER COLUMN paid_day TYPE DECIMAL USING (paid_day::DECIMAL);

ALTER TABLE attendance
    ALTER COLUMN paid_hour TYPE DECIMAL USING (paid_hour::DECIMAL);

ALTER TABLE user_account
    ALTER COLUMN username TYPE VARCHAR(255) USING (username::VARCHAR(255));

ALTER TABLE user_account
    ALTER COLUMN username DROP NOT NULL;

ALTER TABLE attendance
    ALTER COLUMN working_day TYPE DECIMAL USING (working_day::DECIMAL);

ALTER TABLE attendance
    ALTER COLUMN working_hour TYPE DECIMAL USING (working_hour::DECIMAL);

ALTER TABLE benefit
    ADD CONSTRAINT pk_benefit PRIMARY KEY (benefit_rank);

ALTER TABLE payroll
    ADD CONSTRAINT uk_payroll_employee_period UNIQUE (employee_id);