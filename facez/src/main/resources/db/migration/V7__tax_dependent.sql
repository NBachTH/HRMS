-- Phase 2.2: Tax dependent registration (Form 02/CK-TNCN)
CREATE TABLE tax_dependent
(
    id                VARCHAR(64)  NOT NULL,
    employee_id       VARCHAR(64)  NOT NULL,
    full_name         VARCHAR(200) NOT NULL,
    national_id       VARCHAR(20),
    date_of_birth     DATE,
    relationship      VARCHAR(100),
    registration_date DATE,
    active            BOOLEAN      NOT NULL DEFAULT true,
    CONSTRAINT tax_dependent_pkey PRIMARY KEY (id),
    CONSTRAINT fk_tax_dependent_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_tax_dependent_employee ON tax_dependent (employee_id);
