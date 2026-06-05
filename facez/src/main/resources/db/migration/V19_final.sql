-- ================================================================
-- V19_final.sql  —  FaceZ HRMS  ·  Complete schema (consolidated)
-- ================================================================
-- PURPOSE  : Standalone script that recreates the entire database
--            from scratch on a fresh PostgreSQL instance.
--            Consolidates V1 → V18 into a single, clean DDL.
-- USAGE    : psql -U postgres -d postgres -f V19_final.sql
-- NOTE     : This file uses a single underscore after the version
--            number so Flyway does NOT pick it up as a migration.
--            If you are using Flyway, keep running V1–V18 in order.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 0.  TEAR DOWN  (reverse dependency order)
-- ────────────────────────────────────────────────────────────────

DROP VIEW  IF EXISTS ot_monthly_summary              CASCADE;

DROP TABLE IF EXISTS notification                    CASCADE;
DROP TABLE IF EXISTS api_key                         CASCADE;
DROP TABLE IF EXISTS leave_balance                   CASCADE;
DROP TABLE IF EXISTS public_holiday                  CASCADE;
DROP TABLE IF EXISTS tax_dependent                   CASCADE;
DROP TABLE IF EXISTS attendance_period_close         CASCADE;
DROP TABLE IF EXISTS system_config                   CASCADE;
DROP TABLE IF EXISTS payroll                         CASCADE;
DROP TABLE IF EXISTS ot_request                      CASCADE;
DROP TABLE IF EXISTS leave_request                   CASCADE;
DROP TABLE IF EXISTS check_in_log                    CASCADE;
DROP TABLE IF EXISTS attendance                      CASCADE;
DROP TABLE IF EXISTS contract                        CASCADE;
DROP TABLE IF EXISTS user_account                    CASCADE;
DROP TABLE IF EXISTS benefit                         CASCADE;
DROP TABLE IF EXISTS employee_info                   CASCADE;
DROP TABLE IF EXISTS department                      CASCADE;
DROP TABLE IF EXISTS device                          CASCADE;

-- ────────────────────────────────────────────────────────────────
-- 1.  LEAF TABLES  (no FK dependencies)
-- ────────────────────────────────────────────────────────────────

-- 1.1  Device (physical check-in terminal)
CREATE TABLE device
(
    device_id   VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    log_type    VARCHAR(255),
    delete_flag BOOLEAN      NOT NULL DEFAULT false,
    deleted_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT device_pkey PRIMARY KEY (device_id)
);

-- 1.2  Benefit table (salary-grade lookup; PK is benefit_rank after V2 rework)
CREATE TABLE benefit
(
    benefit_rank    VARCHAR(255) NOT NULL,
    employee_level  VARCHAR(255),
    housing_benefit VARCHAR(255),
    meal_benefit    VARCHAR(255),
    vehicle_benefit VARCHAR(255),
    phone_benefit   VARCHAR(255),
    delete_flag     BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_benefit PRIMARY KEY (benefit_rank)
);

-- 1.3  System configuration (versioned payroll rule tables stored as JSONB)
CREATE TABLE system_config
(
    id             VARCHAR(64)  NOT NULL,
    config_type    VARCHAR(30)  NOT NULL,
    version        VARCHAR(30)  NOT NULL,
    effective_date DATE,
    legal_basis    VARCHAR(300),
    config_data    JSONB        NOT NULL,
    active         BOOLEAN      NOT NULL DEFAULT false,
    created_at     TIMESTAMP WITHOUT TIME ZONE,
    created_by     VARCHAR(100),
    updated_at     TIMESTAMP WITHOUT TIME ZONE,
    updated_by     VARCHAR(100),
    CONSTRAINT system_config_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_syscfg_type_active   ON system_config (config_type, active);
CREATE INDEX idx_syscfg_type_version  ON system_config (config_type, version);

-- 1.4  Attendance period close (prevents recalculation after HR closes a month)
CREATE TABLE attendance_period_close
(
    id          VARCHAR(64) NOT NULL,
    close_year  INTEGER     NOT NULL,
    close_month INTEGER     NOT NULL,
    closed_by   VARCHAR(100),
    closed_at   TIMESTAMP WITHOUT TIME ZONE,
    notes       VARCHAR(500),
    CONSTRAINT attendance_period_close_pkey PRIMARY KEY (id),
    CONSTRAINT uk_period_close_year_month UNIQUE (close_year, close_month)
);

-- 1.5  Public holiday calendar (used in OT/leave calculations)
CREATE TABLE public_holiday
(
    id               VARCHAR(64)  NOT NULL,
    holiday_year     INTEGER      NOT NULL,
    holiday_date     DATE         NOT NULL,
    name             VARCHAR(200) NOT NULL,
    compensatory_day DATE,                   -- nullable; set when a make-up day is declared
    CONSTRAINT public_holiday_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_public_holiday_date ON public_holiday (holiday_date);
CREATE INDEX idx_public_holiday_year ON public_holiday (holiday_year);

-- ────────────────────────────────────────────────────────────────
-- 2.  CORE HR TABLES
--     department ↔ employee_info have a circular FK.
--     Both are created first without their cross-FK constraints;
--     the constraints are added in section 4.
-- ────────────────────────────────────────────────────────────────

-- 2.1  Department
CREATE TABLE department
(
    department_id   VARCHAR(255) NOT NULL,
    department_name VARCHAR(255),
    manager_id      VARCHAR(64),              -- FK → employee_info (added in §4)
    parent_id       VARCHAR(255),             -- FK → department (self-referential, optional)
    delete_flag     BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT department_pkey PRIMARY KEY (department_id)
);

-- 2.2  Employee info
CREATE TABLE employee_info
(
    employee_id              VARCHAR(64)  NOT NULL,
    name                     VARCHAR(200) NOT NULL,
    role                     VARCHAR(30)  NOT NULL,
    status                   VARCHAR(30)  NOT NULL,
    email                    VARCHAR(150),
    phone_number             VARCHAR(50),
    address                  VARCHAR(500),
    date_of_joining          DATE,
    emergency_contact        VARCHAR(200),
    profile_picture          OID,
    profile_picture_url      VARCHAR(500),
    -- Statutory fields (V6)
    national_id              VARCHAR(20),
    national_id_issue_date   DATE,
    national_id_issue_place  VARCHAR(200),
    tax_code                 VARCHAR(20),
    social_insurance_code    VARCHAR(20),
    bank_account_number      VARCHAR(30),
    bank_name                VARCHAR(100),
    bank_branch              VARCHAR(200),
    date_of_birth            DATE,
    gender                   VARCHAR(10),
    hometown                 VARCHAR(200),
    -- Audit
    department_id            VARCHAR(255),     -- FK → department (added in §4)
    created_at               TIMESTAMP WITHOUT TIME ZONE,
    created_by               VARCHAR(100),
    updated_at               TIMESTAMP WITHOUT TIME ZONE,
    updated_by               VARCHAR(100),
    delete_flag              BOOLEAN NOT NULL DEFAULT false,
    deleted_at               TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT employee_info_pkey PRIMARY KEY (employee_id),
    CONSTRAINT uk_employee_national_id UNIQUE (national_id),
    CONSTRAINT uk_employee_tax_code    UNIQUE (tax_code),
    CONSTRAINT uk_employee_si_code     UNIQUE (social_insurance_code)
);

-- 2.3  User account  (1:1 with employee_info; implements UserDetails)
CREATE TABLE user_account
(
    employee_id         VARCHAR(64)  NOT NULL,
    username            VARCHAR(255),
    password_hash       VARCHAR(100) NOT NULL,
    last_password_hash  VARCHAR(255),
    role                VARCHAR(30)  NOT NULL,
    created_at          TIMESTAMP WITHOUT TIME ZONE,
    created_by          VARCHAR(100),
    updated_at          TIMESTAMP WITHOUT TIME ZONE,
    updated_by          VARCHAR(100),
    delete_flag         BOOLEAN NOT NULL DEFAULT false,
    deleted_at          TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT user_account_pkey   PRIMARY KEY (employee_id),
    CONSTRAINT uk_user_account_username UNIQUE (username),
    CONSTRAINT fk_user_account_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION
);

-- ────────────────────────────────────────────────────────────────
-- 3.  TRANSACTIONAL TABLES
-- ────────────────────────────────────────────────────────────────

-- 3.1  Employment contract (one employee can have multiple historical contracts)
CREATE TABLE contract
(
    id               VARCHAR(255) NOT NULL,
    contract_type    VARCHAR(255),
    status           VARCHAR(255),
    start_date       DATE,
    end_date         DATE,
    effective_from   DATE,
    effective_to     DATE,
    current_contract BOOLEAN NOT NULL DEFAULT true,
    salary_rank      VARCHAR(255),
    base_salary      BIGINT,
    insurance_base   BIGINT,
    position_code    VARCHAR(10),
    salary_step      INTEGER,
    dependent_count  INTEGER,
    terms            VARCHAR(255),
    notes            VARCHAR(500),
    attachment       BYTEA,
    employee_id      VARCHAR(64),
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    created_by       VARCHAR(100),
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    updated_by       VARCHAR(100),
    delete_flag      BOOLEAN NOT NULL DEFAULT false,
    deleted_at       TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT contract_pkey PRIMARY KEY (id),
    CONSTRAINT fk_contract_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION
);

CREATE INDEX idx_contract_employee_current ON contract (employee_id, current_contract);

-- 3.2  Daily attendance record (one per employee per date)
CREATE TABLE attendance
(
    attendance_id   VARCHAR(255) NOT NULL,
    attendance_date DATE         NOT NULL DEFAULT '2024-01-01',
    check_in        TIMESTAMP WITHOUT TIME ZONE,
    check_out       TIMESTAMP WITHOUT TIME ZONE,
    late_hour       DECIMAL(38, 2),
    working_hour    DECIMAL(38, 2),
    paid_hour       DECIMAL(38, 2),
    working_day     DECIMAL(38, 2),
    paid_day        DECIMAL(38, 2),
    violate         BOOLEAN NOT NULL DEFAULT false,
    employee_id     VARCHAR(64),
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    created_by      VARCHAR(100),
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    updated_by      VARCHAR(100),
    delete_flag     BOOLEAN NOT NULL DEFAULT false,
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id),
    CONSTRAINT uk_attendance_employee_date UNIQUE (employee_id, attendance_date),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION
);

-- 3.3  Raw check-in event log from physical devices
CREATE TABLE check_in_log
(
    log_id      VARCHAR(255) NOT NULL,
    log_time    TIMESTAMP WITHOUT TIME ZONE,
    log_type    VARCHAR(255),
    device_id   VARCHAR(255),
    employee_id VARCHAR(64),
    delete_flag BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT check_in_log_pkey PRIMARY KEY (log_id),
    CONSTRAINT fk_checkin_log_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION,
    CONSTRAINT fk_checkin_log_device FOREIGN KEY (device_id)
        REFERENCES device (device_id) ON DELETE NO ACTION
);

-- 3.4  Leave request (multi-level approval workflow)
CREATE TABLE leave_request
(
    leave_request_id VARCHAR(255) NOT NULL,
    leave_type       VARCHAR(30)  NOT NULL DEFAULT 'ANNUAL',
    reason           VARCHAR(255),
    start_time       TIMESTAMP WITHOUT TIME ZONE,
    end_time         TIMESTAMP WITHOUT TIME ZONE,
    duration_hours   NUMERIC(10, 2),
    balance_deducted BOOLEAN NOT NULL DEFAULT false,
    status           VARCHAR(255),
    employee_id      VARCHAR(64),
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    created_by       VARCHAR(100),
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    updated_by       VARCHAR(100),
    delete_flag      BOOLEAN NOT NULL DEFAULT false,
    deleted_at       TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT leave_request_pkey PRIMARY KEY (leave_request_id),
    CONSTRAINT fk_leave_request_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION
);

-- 3.5  Overtime request (multi-level approval workflow)
CREATE TABLE ot_request
(
    ot_request_id VARCHAR(255) NOT NULL,
    start_time    TIMESTAMP WITHOUT TIME ZONE,
    end_time      TIMESTAMP WITHOUT TIME ZONE,
    status        VARCHAR(255),
    employee_id   VARCHAR(64),
    created_at    TIMESTAMP WITHOUT TIME ZONE,
    created_by    VARCHAR(100),
    updated_at    TIMESTAMP WITHOUT TIME ZONE,
    updated_by    VARCHAR(100),
    delete_flag   BOOLEAN NOT NULL DEFAULT false,
    deleted_at    TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ot_request_pkey PRIMARY KEY (ot_request_id),
    CONSTRAINT fk_ot_request_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION
);

-- 3.6  Monthly payroll record (one per employee per year/month)
CREATE TABLE payroll
(
    payroll_id                   VARCHAR(64)      NOT NULL,
    payroll_year                 INTEGER          NOT NULL,
    payroll_month                INTEGER          NOT NULL,
    -- Attendance inputs
    actual_working_days          INTEGER          NOT NULL DEFAULT 0,
    standard_working_days        INTEGER          NOT NULL DEFAULT 0,
    -- KPI scores (renamed from kpi1_score/kpi2_score in V2)
    kpi1score                    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    kpi2score                    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    kpi_average                  DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    -- Earnings components
    performance_salary           BIGINT           NOT NULL DEFAULT 0,
    position_coefficient         BIGINT           NOT NULL DEFAULT 0,
    living_allowance             BIGINT           NOT NULL DEFAULT 0,
    language_allowance           BIGINT           NOT NULL DEFAULT 0,
    odc_allowance                BIGINT           NOT NULL DEFAULT 0,
    ot_pay                       BIGINT           NOT NULL DEFAULT 0,
    bonus                        BIGINT           NOT NULL DEFAULT 0,
    -- Computed salary
    base_gross                   BIGINT           NOT NULL DEFAULT 0,
    total_gross                  BIGINT           NOT NULL DEFAULT 0,
    -- Employee deductions
    insurance_base               BIGINT           NOT NULL DEFAULT 0,
    bhxh_employee                BIGINT           NOT NULL DEFAULT 0,
    bhyt_employee                BIGINT           NOT NULL DEFAULT 0,
    bhtn_employee                BIGINT           NOT NULL DEFAULT 0,
    dependent_count              INTEGER          NOT NULL DEFAULT 0,
    taxable_income               BIGINT           NOT NULL DEFAULT 0,
    pit                          BIGINT           NOT NULL DEFAULT 0,
    -- Employer contributions (V14b)
    bhxh_employer                BIGINT           NOT NULL DEFAULT 0,
    bhyt_employer                BIGINT           NOT NULL DEFAULT 0,
    bhtn_employer                BIGINT           NOT NULL DEFAULT 0,
    workplace_accident_insurance BIGINT           NOT NULL DEFAULT 0,
    total_employer_contributions BIGINT           NOT NULL DEFAULT 0,
    total_employment_cost        BIGINT           NOT NULL DEFAULT 0,
    -- Net
    net_salary                   BIGINT           NOT NULL DEFAULT 0,
    -- Workflow
    status                       VARCHAR(20)      NOT NULL DEFAULT 'DRAFT',
    rejection_reason             VARCHAR(500),
    notes                        VARCHAR(500),
    -- Relations & audit
    employee_id                  VARCHAR(64)      NOT NULL,
    created_at                   TIMESTAMP WITHOUT TIME ZONE,
    created_by                   VARCHAR(100),
    updated_at                   TIMESTAMP WITHOUT TIME ZONE,
    updated_by                   VARCHAR(100),
    CONSTRAINT payroll_pkey PRIMARY KEY (payroll_id),
    -- One payroll record per employee per calendar month
    CONSTRAINT uk_payroll_employee_period UNIQUE (employee_id, payroll_year, payroll_month),
    CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION
);

-- ────────────────────────────────────────────────────────────────
-- 4.  EXTENSION TABLES  (added in later migration phases)
-- ────────────────────────────────────────────────────────────────

-- 4.1  Tax dependents (Form 02/CK-TNCN — reduces PIT base)
CREATE TABLE tax_dependent
(
    id                VARCHAR(64)  NOT NULL,
    full_name         VARCHAR(200) NOT NULL,
    national_id       VARCHAR(20),
    date_of_birth     DATE,
    relationship      VARCHAR(100),
    registration_date DATE,
    active            BOOLEAN NOT NULL DEFAULT true,
    employee_id       VARCHAR(64) NOT NULL,
    CONSTRAINT tax_dependent_pkey PRIMARY KEY (id),
    CONSTRAINT fk_tax_dependent_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_tax_dependent_employee ON tax_dependent (employee_id);

-- 4.2  Leave balance ledger (entitlement, pending, used, remaining)
CREATE TABLE leave_balance
(
    id                VARCHAR(64)    NOT NULL,
    leave_year        INTEGER        NOT NULL,
    leave_type        VARCHAR(30)    NOT NULL,
    entitlement_days  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carried_over_days NUMERIC(10, 2) NOT NULL DEFAULT 0,
    pending_days      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    used_days         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    remaining_days    NUMERIC(10, 2) NOT NULL DEFAULT 0,
    carry_over_cap    NUMERIC(10, 2) NOT NULL DEFAULT 5,
    employee_id       VARCHAR(64)    NOT NULL,
    CONSTRAINT leave_balance_pkey PRIMARY KEY (id),
    CONSTRAINT uk_leave_balance_employee_year_type UNIQUE (employee_id, leave_year, leave_type),
    CONSTRAINT fk_leave_balance_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_leave_balance_employee ON leave_balance (employee_id, leave_year);

-- 4.3  Device API key (SHA-256 hash stored; used to authenticate check-in devices)
CREATE TABLE api_key
(
    id           VARCHAR(64)  NOT NULL,
    key_hash     VARCHAR(100) NOT NULL,
    active       BOOLEAN NOT NULL DEFAULT true,
    device_id    VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP WITHOUT TIME ZONE,
    last_used_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT api_key_pkey PRIMARY KEY (id),
    CONSTRAINT fk_api_key_device FOREIGN KEY (device_id)
        REFERENCES device (device_id) ON DELETE CASCADE
);

CREATE INDEX idx_api_key_hash   ON api_key (key_hash) WHERE active = true;
CREATE INDEX idx_api_key_device ON api_key (device_id);

-- 4.4  In-app notification
CREATE TABLE notification
(
    id          VARCHAR(64)  NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     VARCHAR(500) NOT NULL,
    type        VARCHAR(50)  NOT NULL DEFAULT 'INFO',
    read_flag   BOOLEAN      NOT NULL DEFAULT false,
    employee_id VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT notification_pkey PRIMARY KEY (id),
    CONSTRAINT fk_notification_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_employee ON notification (employee_id, read_flag);

-- ────────────────────────────────────────────────────────────────
-- 5.  DEFERRED CROSS-FOREIGN KEYS
--     (department ↔ employee_info circular reference)
-- ────────────────────────────────────────────────────────────────

ALTER TABLE department
    ADD CONSTRAINT fk_department_manager FOREIGN KEY (manager_id)
        REFERENCES employee_info (employee_id) ON DELETE NO ACTION,
    ADD CONSTRAINT fk_department_parent FOREIGN KEY (parent_id)
        REFERENCES department (department_id) ON DELETE NO ACTION;

-- One department, one manager (optional — comment out if you allow
-- the same employee to manage multiple departments)
ALTER TABLE department
    ADD CONSTRAINT uk_department_manager UNIQUE (manager_id);

ALTER TABLE employee_info
    ADD CONSTRAINT fk_employee_department FOREIGN KEY (department_id)
        REFERENCES department (department_id) ON DELETE NO ACTION;

-- ────────────────────────────────────────────────────────────────
-- 6.  VIEWS
-- ────────────────────────────────────────────────────────────────

-- OT monthly summary — pre-aggregates approved OT minutes for limit queries
CREATE OR REPLACE VIEW ot_monthly_summary AS
SELECT
    ot.employee_id,
    EXTRACT(YEAR  FROM ot.start_time)::INTEGER AS ot_year,
    EXTRACT(MONTH FROM ot.start_time)::INTEGER AS ot_month,
    SUM(EXTRACT(EPOCH FROM (ot.end_time - ot.start_time)) / 60) AS approved_minutes
FROM ot_request ot
WHERE ot.status      = 'APPROVED'
  AND ot.delete_flag = false
GROUP BY ot.employee_id, ot_year, ot_month;

-- ────────────────────────────────────────────────────────────────
-- 7.  SEED DATA
-- ────────────────────────────────────────────────────────────────

-- 7.1  Default work-schedule configuration
INSERT INTO system_config
    (id, config_type, version, effective_date, config_data, active, legal_basis, created_at, updated_at, updated_by)
VALUES
    (
        'work-schedule-default',
        'WORK_SCHEDULE',
        '2026',
        '2026-01-01',
        '{"workStartTime":"08:30","workHoursPerDay":8,"timezone":"Asia/Ho_Chi_Minh"}',
        true,
        'Company policy',
        NOW(), NOW(), 'system'
    )
ON CONFLICT (id) DO NOTHING;

-- 7.2  PIT progressive tax brackets (Circular 111/2013/TT-BTC)
INSERT INTO system_config
    (id, config_type, version, effective_date, config_data, active, legal_basis, created_at, updated_at, updated_by)
VALUES
    (
        'pit-brackets-2026',
        'PIT_BRACKETS',
        '2026',
        '2026-01-01',
        '{
          "brackets": [
            {"fromVnd":        0, "toVnd":   5000000, "rate": 0.05},
            {"fromVnd":  5000000, "toVnd":  10000000, "rate": 0.10},
            {"fromVnd": 10000000, "toVnd":  18000000, "rate": 0.15},
            {"fromVnd": 18000000, "toVnd":  32000000, "rate": 0.20},
            {"fromVnd": 32000000, "toVnd":  52000000, "rate": 0.25},
            {"fromVnd": 52000000, "toVnd":  80000000, "rate": 0.30},
            {"fromVnd": 80000000, "toVnd":       null, "rate": 0.35}
          ],
          "personalDeduction":  11000000,
          "dependentDeduction":  4400000
        }',
        true,
        'Circular 111/2013/TT-BTC, amended 2026',
        NOW(), NOW(), 'system'
    )
ON CONFLICT (id) DO NOTHING;

-- 7.3  Vietnamese public holidays for 2026
INSERT INTO public_holiday (id, holiday_year, holiday_date, name, compensatory_day) VALUES
('ph-2026-01', 2026, '2026-01-01', 'Tết Dương Lịch (New Year)',                          NULL),
('ph-2026-02', 2026, '2026-01-28', 'Tết Nguyên Đán — Mùng 1',                            NULL),
('ph-2026-03', 2026, '2026-01-29', 'Tết Nguyên Đán — Mùng 2',                            NULL),
('ph-2026-04', 2026, '2026-01-30', 'Tết Nguyên Đán — Mùng 3',                            NULL),
('ph-2026-05', 2026, '2026-01-31', 'Tết Nguyên Đán — Mùng 4',                            NULL),
('ph-2026-06', 2026, '2026-02-01', 'Tết Nguyên Đán — Mùng 5',                            NULL),
('ph-2026-07', 2026, '2026-04-07', 'Giỗ Tổ Hùng Vương (Hung Kings Festival)',            NULL),
('ph-2026-08', 2026, '2026-04-30', 'Ngày Giải Phóng Miền Nam (Liberation Day)',          NULL),
('ph-2026-09', 2026, '2026-05-01', 'Ngày Quốc Tế Lao Động (International Labour Day)',  NULL),
('ph-2026-10', 2026, '2026-09-02', 'Ngày Quốc Khánh (National Day)',                     NULL),
('ph-2026-11', 2026, '2026-09-03', 'Ngày Quốc Khánh — bù'  ,                            NULL)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 8.  ADMIN ACCOUNT BOOTSTRAP
--     The default admin is created programmatically by
--     DataInitializerConfig on first application startup:
--       username : admin
--       password : admin123
--     No raw BCrypt hash is hard-coded here to avoid leaking
--     credentials in version control.
-- ────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────
-- END OF V19_final.sql
-- ────────────────────────────────────────────────────────────────
