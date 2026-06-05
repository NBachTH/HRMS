ALTER TABLE payroll
    ADD rejection_reason VARCHAR(500);

ALTER TABLE payroll
    ADD CONSTRAINT uk_payroll_employee_period UNIQUE (employee_id);