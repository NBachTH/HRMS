-- Phase 4.2: Leave balance with pending days (two-stage deduction)
CREATE TABLE leave_balance
(
    id               VARCHAR(64)    NOT NULL,
    employee_id      VARCHAR(64)    NOT NULL,
    leave_year       INTEGER        NOT NULL,
    leave_type       VARCHAR(30)    NOT NULL,
    entitlement_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carried_over_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
    pending_days     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    used_days        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    remaining_days   NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carry_over_cap   NUMERIC(10, 2) NOT NULL DEFAULT 5,
    CONSTRAINT leave_balance_pkey PRIMARY KEY (id),
    CONSTRAINT uk_leave_balance_employee_year_type UNIQUE (employee_id, leave_year, leave_type),
    CONSTRAINT fk_leave_balance_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_leave_balance_employee ON leave_balance (employee_id, leave_year);
