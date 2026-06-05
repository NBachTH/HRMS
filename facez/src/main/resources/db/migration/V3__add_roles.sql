ALTER TABLE payroll
    ADD CONSTRAINT uk_payroll_employee_period UNIQUE (employee_id);