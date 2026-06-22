-- Persistent payroll period (run) + link from payroll lines.
CREATE TABLE payroll_run
(
    id               VARCHAR(64) NOT NULL,
    run_year         INTEGER     NOT NULL,
    run_month        INTEGER     NOT NULL,
    status           VARCHAR(20) NOT NULL,
    employee_count   INTEGER     NOT NULL DEFAULT 0,
    total_gross      BIGINT      NOT NULL DEFAULT 0,
    total_net        BIGINT      NOT NULL DEFAULT 0,
    submitted_by     VARCHAR(100),
    approved_by      VARCHAR(100),
    rejection_reason VARCHAR(500),
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    created_by       VARCHAR(100),
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    updated_by       VARCHAR(100),
    CONSTRAINT payroll_run_pkey PRIMARY KEY (id),
    CONSTRAINT uk_payroll_run_period UNIQUE (run_year, run_month)
);

ALTER TABLE payroll ADD COLUMN IF NOT EXISTS payroll_run_id VARCHAR(64);
ALTER TABLE payroll ADD COLUMN IF NOT EXISTS locked         BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_payroll_run_id ON payroll (payroll_run_id);
