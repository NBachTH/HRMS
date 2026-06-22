-- KPI1 (performance) rating entered monthly by an employee's direct superior.
CREATE TABLE kpi1_rating
(
    id           VARCHAR(64) NOT NULL,
    employee_id  VARCHAR(64) NOT NULL,
    kpi_year     INTEGER     NOT NULL,
    kpi_month    INTEGER     NOT NULL,
    rating       VARCHAR(2)  NOT NULL,
    evaluator_id VARCHAR(64),
    note         VARCHAR(300),
    created_at   TIMESTAMP WITHOUT TIME ZONE,
    created_by   VARCHAR(100),
    updated_at   TIMESTAMP WITHOUT TIME ZONE,
    updated_by   VARCHAR(100),
    CONSTRAINT kpi1_rating_pkey PRIMARY KEY (id),
    CONSTRAINT uk_kpi1_employee_period UNIQUE (employee_id, kpi_year, kpi_month),
    CONSTRAINT fk_kpi1_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);
CREATE INDEX idx_kpi1_period ON kpi1_rating (kpi_year, kpi_month);
