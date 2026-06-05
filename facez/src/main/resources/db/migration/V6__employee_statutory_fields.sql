-- Phase 2.1: Statutory employee fields for insurance, tax, and payroll
ALTER TABLE employee_info
    ADD COLUMN national_id            VARCHAR(20),
    ADD COLUMN national_id_issue_date DATE,
    ADD COLUMN national_id_issue_place VARCHAR(200),
    ADD COLUMN tax_code               VARCHAR(20),
    ADD COLUMN social_insurance_code  VARCHAR(20),
    ADD COLUMN bank_account_number    VARCHAR(30),
    ADD COLUMN bank_name              VARCHAR(100),
    ADD COLUMN bank_branch            VARCHAR(200),
    ADD COLUMN date_of_birth          DATE,
    ADD COLUMN gender                 VARCHAR(10),
    ADD COLUMN hometown               VARCHAR(200);

ALTER TABLE employee_info
    ADD CONSTRAINT uk_employee_national_id UNIQUE (national_id),
    ADD CONSTRAINT uk_employee_tax_code    UNIQUE (tax_code),
    ADD CONSTRAINT uk_employee_si_code     UNIQUE (social_insurance_code);
