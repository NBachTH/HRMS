-- OT Plan module: LEADER creates a plan (employees + planned window),
-- MANAGER approves it, then employees log OT requests against the approved plan.

CREATE TABLE ot_plan
(
    id                 VARCHAR(64)  NOT NULL,
    ot_date            DATE         NOT NULL,
    planned_start_time TIME,
    planned_end_time   TIME,
    department_id      VARCHAR(255),
    reason             VARCHAR(500),
    status             VARCHAR(30)  NOT NULL DEFAULT 'TO_APPROVE',
    rejection_reason   VARCHAR(500),
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    created_by         VARCHAR(100),
    updated_at         TIMESTAMP WITHOUT TIME ZONE,
    updated_by         VARCHAR(100),
    delete_flag        BOOLEAN      NOT NULL DEFAULT false,
    deleted_at         TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ot_plan_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_ot_plan_date   ON ot_plan (ot_date);
CREATE INDEX idx_ot_plan_status ON ot_plan (status);

CREATE TABLE ot_plan_employee
(
    id          VARCHAR(64) NOT NULL,
    ot_plan_id  VARCHAR(64) NOT NULL,
    employee_id VARCHAR(64) NOT NULL,
    CONSTRAINT ot_plan_employee_pkey PRIMARY KEY (id),
    CONSTRAINT uk_ot_plan_employee UNIQUE (ot_plan_id, employee_id),
    CONSTRAINT fk_ope_plan FOREIGN KEY (ot_plan_id)
        REFERENCES ot_plan (id) ON DELETE CASCADE,
    CONSTRAINT fk_ope_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_ope_plan     ON ot_plan_employee (ot_plan_id);
CREATE INDEX idx_ope_employee ON ot_plan_employee (employee_id);

-- Link each OT request to the plan it was logged against.
ALTER TABLE ot_request
    ADD COLUMN ot_plan_id VARCHAR(64);

ALTER TABLE ot_request
    ADD CONSTRAINT fk_ot_request_plan FOREIGN KEY (ot_plan_id)
        REFERENCES ot_plan (id) ON DELETE SET NULL;
