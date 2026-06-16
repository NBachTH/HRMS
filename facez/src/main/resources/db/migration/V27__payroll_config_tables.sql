-- Payroll configuration moved out of system_config (JSONB) into typed, effective-dated tables.
-- Model: effective_from + status (DRAFT -> PUBLISHED -> ARCHIVED). The engine picks, per payroll
-- period, the latest PUBLISHED row with effective_from <= period anchor. Maker-checker: FINANCE
-- creates DRAFTs; DIRECTOR/SYSTEM_ADMIN publishes. A partial unique index forbids two PUBLISHED
-- rows of the same type sharing one effective_from.

-- ── SALARY GRADE ───────────────────────────────────────────────────────────────
CREATE TABLE salary_grade_config
(
    id                    VARCHAR(64)  NOT NULL,
    effective_from        DATE         NOT NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    legal_basis           VARCHAR(300),
    unit                  VARCHAR(30)  NOT NULL DEFAULT 'thousand_vnd',
    minimum_wage_region_i INTEGER,
    created_at            TIMESTAMP WITHOUT TIME ZONE,
    created_by            VARCHAR(100),
    updated_at            TIMESTAMP WITHOUT TIME ZONE,
    updated_by            VARCHAR(100),
    CONSTRAINT salary_grade_config_pkey PRIMARY KEY (id)
);

CREATE TABLE salary_grade
(
    id          VARCHAR(64)  NOT NULL,
    config_id   VARCHAR(64)  NOT NULL,
    grade_code  VARCHAR(30)  NOT NULL,
    title       VARCHAR(255),
    track       VARCHAR(30),
    CONSTRAINT salary_grade_pkey PRIMARY KEY (id),
    CONSTRAINT fk_salary_grade_config FOREIGN KEY (config_id)
        REFERENCES salary_grade_config (id) ON DELETE CASCADE,
    CONSTRAINT uk_salary_grade_code UNIQUE (config_id, grade_code)
);

CREATE TABLE salary_grade_step
(
    id                  VARCHAR(64) NOT NULL,
    grade_id            VARCHAR(64) NOT NULL,
    step_no             INTEGER     NOT NULL,
    amount_thousand_vnd BIGINT      NOT NULL,
    CONSTRAINT salary_grade_step_pkey PRIMARY KEY (id),
    CONSTRAINT fk_salary_grade_step_grade FOREIGN KEY (grade_id)
        REFERENCES salary_grade (id) ON DELETE CASCADE,
    CONSTRAINT uk_salary_grade_step UNIQUE (grade_id, step_no),
    CONSTRAINT chk_salary_grade_step_no CHECK (step_no BETWEEN 1 AND 10)
);

-- ── PIT ────────────────────────────────────────────────────────────────────────
CREATE TABLE pit_config
(
    id               VARCHAR(64)   NOT NULL,
    effective_from   DATE          NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    legal_basis      VARCHAR(300),
    resolution       VARCHAR(300),
    personal_relief  BIGINT        NOT NULL,
    dependent_relief BIGINT        NOT NULL,
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    created_by       VARCHAR(100),
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    updated_by       VARCHAR(100),
    CONSTRAINT pit_config_pkey PRIMARY KEY (id)
);

CREATE TABLE pit_bracket
(
    id              VARCHAR(64)  NOT NULL,
    config_id       VARCHAR(64)  NOT NULL,
    seq             INTEGER      NOT NULL,
    income_from     BIGINT       NOT NULL,
    income_to       BIGINT,
    rate            NUMERIC(6, 5) NOT NULL,
    quick_deduction BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT pit_bracket_pkey PRIMARY KEY (id),
    CONSTRAINT fk_pit_bracket_config FOREIGN KEY (config_id)
        REFERENCES pit_config (id) ON DELETE CASCADE,
    CONSTRAINT uk_pit_bracket_seq UNIQUE (config_id, seq),
    CONSTRAINT chk_pit_bracket_rate CHECK (rate BETWEEN 0 AND 1)
);

-- ── INSURANCE ──────────────────────────────────────────────────────────────────
CREATE TABLE insurance_config
(
    id                       VARCHAR(64)   NOT NULL,
    effective_from           DATE          NOT NULL,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    legal_basis              VARCHAR(300),
    government_base_salary    BIGINT,
    insurance_ceiling        BIGINT,
    statutory_min_wage       BIGINT,
    ee_bhxh                  NUMERIC(6, 5) NOT NULL,
    ee_bhyt                  NUMERIC(6, 5) NOT NULL,
    ee_bhtn                  NUMERIC(6, 5) NOT NULL,
    er_bhxh_pension          NUMERIC(6, 5) NOT NULL,
    er_bhxh_sickness_maternity NUMERIC(6, 5) NOT NULL,
    er_bhxh_accident         NUMERIC(6, 5) NOT NULL,
    er_bhyt                  NUMERIC(6, 5) NOT NULL,
    er_bhtn                  NUMERIC(6, 5) NOT NULL,
    probation_exempt         BOOLEAN       NOT NULL DEFAULT true,
    created_at               TIMESTAMP WITHOUT TIME ZONE,
    created_by               VARCHAR(100),
    updated_at               TIMESTAMP WITHOUT TIME ZONE,
    updated_by               VARCHAR(100),
    CONSTRAINT insurance_config_pkey PRIMARY KEY (id),
    CONSTRAINT chk_ins_ee_bhxh CHECK (ee_bhxh BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_ee_bhyt CHECK (ee_bhyt BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_ee_bhtn CHECK (ee_bhtn BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_er_pension CHECK (er_bhxh_pension BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_er_sickness CHECK (er_bhxh_sickness_maternity BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_er_accident CHECK (er_bhxh_accident BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_er_bhyt CHECK (er_bhyt BETWEEN 0 AND 1),
    CONSTRAINT chk_ins_er_bhtn CHECK (er_bhtn BETWEEN 0 AND 1)
);

CREATE TABLE insurance_eligible_contract_type
(
    id            VARCHAR(64) NOT NULL,
    config_id     VARCHAR(64) NOT NULL,
    contract_type VARCHAR(30) NOT NULL,
    CONSTRAINT insurance_eligible_contract_type_pkey PRIMARY KEY (id),
    CONSTRAINT fk_ins_eligible_config FOREIGN KEY (config_id)
        REFERENCES insurance_config (id) ON DELETE CASCADE,
    CONSTRAINT uk_ins_eligible UNIQUE (config_id, contract_type)
);

-- ── ALLOWANCE ──────────────────────────────────────────────────────────────────
CREATE TABLE allowance_config
(
    id                          VARCHAR(64) NOT NULL,
    effective_from              DATE        NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    legal_basis                 VARCHAR(300),
    living_prorated             BOOLEAN     NOT NULL DEFAULT true,
    japanese_prorated           BOOLEAN     NOT NULL DEFAULT false,
    japanese_min_contract_months INTEGER,
    created_at                  TIMESTAMP WITHOUT TIME ZONE,
    created_by                  VARCHAR(100),
    updated_at                  TIMESTAMP WITHOUT TIME ZONE,
    updated_by                  VARCHAR(100),
    CONSTRAINT allowance_config_pkey PRIMARY KEY (id)
);

CREATE TABLE allowance_level
(
    id        VARCHAR(64) NOT NULL,
    config_id VARCHAR(64) NOT NULL,
    level_key VARCHAR(40) NOT NULL,
    meal      BIGINT      NOT NULL DEFAULT 0,
    phone     BIGINT      NOT NULL DEFAULT 0,
    transport BIGINT      NOT NULL DEFAULT 0,
    housing   BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT allowance_level_pkey PRIMARY KEY (id),
    CONSTRAINT fk_allowance_level_config FOREIGN KEY (config_id)
        REFERENCES allowance_config (id) ON DELETE CASCADE,
    CONSTRAINT uk_allowance_level UNIQUE (config_id, level_key)
);

CREATE TABLE japanese_allowance_level
(
    id         VARCHAR(64) NOT NULL,
    config_id  VARCHAR(64) NOT NULL,
    jlpt_level VARCHAR(10) NOT NULL,
    amount     BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT japanese_allowance_level_pkey PRIMARY KEY (id),
    CONSTRAINT fk_jp_allowance_config FOREIGN KEY (config_id)
        REFERENCES allowance_config (id) ON DELETE CASCADE,
    CONSTRAINT uk_jp_allowance_level UNIQUE (config_id, jlpt_level)
);

-- Generic list for allowance rule sets (kind = LIVING_ELIGIBLE / JP_ELIGIBLE /
-- JP_EXCLUDED_POSITION / JP_EXCLUDED_LEVEL).
CREATE TABLE allowance_rule_value
(
    id        VARCHAR(64)  NOT NULL,
    config_id VARCHAR(64)  NOT NULL,
    kind      VARCHAR(40)  NOT NULL,
    value     VARCHAR(60)  NOT NULL,
    CONSTRAINT allowance_rule_value_pkey PRIMARY KEY (id),
    CONSTRAINT fk_allowance_rule_config FOREIGN KEY (config_id)
        REFERENCES allowance_config (id) ON DELETE CASCADE,
    CONSTRAINT uk_allowance_rule UNIQUE (config_id, kind, value)
);

-- ── Indexes: per-type lookup by (status, effective_from) + one PUBLISHED per effective_from ──
CREATE INDEX idx_salary_grade_config_lookup ON salary_grade_config (status, effective_from);
CREATE INDEX idx_pit_config_lookup          ON pit_config (status, effective_from);
CREATE INDEX idx_insurance_config_lookup    ON insurance_config (status, effective_from);
CREATE INDEX idx_allowance_config_lookup    ON allowance_config (status, effective_from);

CREATE UNIQUE INDEX uk_salary_grade_published_eff ON salary_grade_config (effective_from) WHERE status = 'PUBLISHED';
CREATE UNIQUE INDEX uk_pit_published_eff          ON pit_config (effective_from)          WHERE status = 'PUBLISHED';
CREATE UNIQUE INDEX uk_insurance_published_eff    ON insurance_config (effective_from)    WHERE status = 'PUBLISHED';
CREATE UNIQUE INDEX uk_allowance_published_eff    ON allowance_config (effective_from)    WHERE status = 'PUBLISHED';
