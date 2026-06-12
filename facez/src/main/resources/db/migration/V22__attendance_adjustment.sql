-- Attendance adjustment request: employee asks to add/correct a day's check times;
-- on approval the times are written into attendance + work_day.
CREATE TABLE attendance_adjustment
(
    id                  VARCHAR(64) NOT NULL,
    employee_id         VARCHAR(64) NOT NULL,
    work_date           DATE        NOT NULL,
    requested_check_in  TIMESTAMP WITHOUT TIME ZONE,
    requested_check_out TIMESTAMP WITHOUT TIME ZONE,
    reason              VARCHAR(500),
    status              VARCHAR(30) NOT NULL DEFAULT 'TO_APPROVE',
    rejection_reason    VARCHAR(500),
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    created_by          VARCHAR(100),
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_by          VARCHAR(100),
    delete_flag         BOOLEAN     NOT NULL DEFAULT false,
    deleted_at          TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT attendance_adjustment_pkey PRIMARY KEY (id),
    CONSTRAINT fk_attadj_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_attadj_employee ON attendance_adjustment (employee_id);
CREATE INDEX idx_attadj_status   ON attendance_adjustment (status);
