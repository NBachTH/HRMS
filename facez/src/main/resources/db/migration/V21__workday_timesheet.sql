-- WorkDay: single source of truth for an employee's status per day.
-- Timesheet: monthly aggregate produced when HR closes the period.

CREATE TABLE work_day
(
    id               VARCHAR(64)    NOT NULL,
    employee_id      VARCHAR(64)    NOT NULL,
    work_date        DATE           NOT NULL,
    type             VARCHAR(20)    NOT NULL,
    source           VARCHAR(20)    NOT NULL,
    leave_type       VARCHAR(30),
    check_in         TIMESTAMP WITHOUT TIME ZONE,
    check_out        TIMESTAMP WITHOUT TIME ZONE,
    late_hour        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    working_hour     NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ot_minutes       INTEGER        NOT NULL DEFAULT 0,
    paid_day         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    working_day      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    violation        BOOLEAN        NOT NULL DEFAULT false,
    locked           BOOLEAN        NOT NULL DEFAULT false,
    attendance_id    VARCHAR(64),
    leave_request_id VARCHAR(64),
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    created_by       VARCHAR(100),
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    updated_by       VARCHAR(100),
    CONSTRAINT work_day_pkey PRIMARY KEY (id),
    CONSTRAINT uk_workday_employee_date UNIQUE (employee_id, work_date),
    CONSTRAINT fk_workday_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_workday_employee_date ON work_day (employee_id, work_date);
CREATE INDEX idx_workday_date_source   ON work_day (work_date, source);
CREATE INDEX idx_workday_locked        ON work_day (locked, work_date);

CREATE TABLE timesheet
(
    id                          VARCHAR(64)    NOT NULL,
    employee_id                 VARCHAR(64)    NOT NULL,
    ts_year                     INTEGER        NOT NULL,
    ts_month                    INTEGER        NOT NULL,
    standard_working_days       INTEGER,
    actual_working_days         NUMERIC(10, 2),
    holiday_leave_days          NUMERIC(10, 2),
    annual_leave_days           NUMERIC(10, 2),
    comp_leave_days             NUMERIC(10, 2),
    bereavement_marriage_days   NUMERIC(10, 2),
    insurance_leave_days        NUMERIC(10, 2),
    unpaid_leave_days           NUMERIC(10, 2),
    old_rate_paid_days          NUMERIC(10, 2),
    new_rate_paid_days          NUMERIC(10, 2),
    total_paid_days             NUMERIC(10, 2),
    carry_over_prev_month       NUMERIC(10, 2),
    business_go_out_days        NUMERIC(10, 2),
    wfh_days                    NUMERIC(10, 2),
    unexplained_absence_days    NUMERIC(10, 2),
    late_early_total_hours      NUMERIC(10, 2),
    violation_to_comp           NUMERIC(10, 2),
    violation_to_leave          NUMERIC(10, 2),
    violation_to_unpaid         NUMERIC(10, 2),
    unnotified_absence_count    INTEGER,
    under8h_count               INTEGER,
    attendance_request_errors   INTEGER,
    kpi2_deduction              BIGINT,
    kpi2_index                  NUMERIC(10, 2),
    prev_month_violation_adjust NUMERIC(10, 2),
    notes                       VARCHAR(1000),
    created_at                  TIMESTAMP WITHOUT TIME ZONE,
    created_by                  VARCHAR(100),
    updated_at                  TIMESTAMP WITHOUT TIME ZONE,
    updated_by                  VARCHAR(100),
    CONSTRAINT timesheet_pkey PRIMARY KEY (id),
    CONSTRAINT uk_timesheet_employee_period UNIQUE (employee_id, ts_year, ts_month),
    CONSTRAINT fk_timesheet_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_timesheet_period ON timesheet (ts_year, ts_month);
