CREATE TABLE attendance
(
    attendance_id   VARCHAR(255)              NOT NULL,
    check_in        TIMESTAMP WITHOUT TIME ZONE,
    check_out       TIMESTAMP WITHOUT TIME ZONE,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    paid_day        numeric(38, 2),
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    working_day     numeric(38, 2),
    working_hour    numeric(38, 2),
    employee_id     VARCHAR(64),
    delete_flag     BOOLEAN                   NOT NULL,
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    late_hour       numeric(38, 2),
    paid_hour       numeric(38, 2),
    violate         BOOLEAN                   NOT NULL,
    attendance_date date DEFAULT '2024-01-01' NOT NULL,
    CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id)
);

CREATE TABLE benefit
(
    benefit_id      VARCHAR(255)                      NOT NULL,
    base_salary     VARCHAR(255),
    employee_level  VARCHAR(255),
    housing_benefit VARCHAR(255),
    meal_benefit    VARCHAR(255),
    salary_rank     INTEGER                           NOT NULL,
    vehicle_benefit VARCHAR(255),
    delete_flag     BOOLEAN                           NOT NULL,
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    phone_benefit   VARCHAR(255),
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    benefit_rank    VARCHAR(255) DEFAULT '2024-01-01' NOT NULL,
    CONSTRAINT benefit_pkey PRIMARY KEY (benefit_id)
);

CREATE TABLE check_in_log
(
    log_id      VARCHAR(255) NOT NULL,
    delete_flag BOOLEAN      NOT NULL,
    log_time    TIMESTAMP WITHOUT TIME ZONE,
    log_type    VARCHAR(255),
    device_id   VARCHAR(255),
    employee_id VARCHAR(64),
    deleted_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT check_in_log_pkey PRIMARY KEY (log_id)
);

CREATE TABLE contract
(
    id              VARCHAR(255) NOT NULL,
    attachment      BYTEA,
    contract_type   VARCHAR(255),
    created_at      TIMESTAMP WITHOUT TIME ZONE,
    delete_flag     BOOLEAN      NOT NULL,
    end_date        VARCHAR(255),
    salary_rank     VARCHAR(255),
    start_date      VARCHAR(255),
    status          VARCHAR(255),
    terms           VARCHAR(255),
    updated_at      TIMESTAMP WITHOUT TIME ZONE,
    employee_id     VARCHAR(64),
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    base_salary     BIGINT,
    dependent_count INTEGER,
    insurance_base  BIGINT,
    position_code   VARCHAR(10),
    salary_step     INTEGER,
    CONSTRAINT contract_pkey PRIMARY KEY (id)
);

CREATE TABLE department
(
    department_id   VARCHAR(255) NOT NULL,
    delete_flag     BOOLEAN      NOT NULL,
    department_name VARCHAR(255),
    manager_id      VARCHAR(64),
    deleted_at      TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT department_pkey PRIMARY KEY (department_id)
);

CREATE TABLE device
(
    device_id   VARCHAR(255) NOT NULL,
    delete_flag BOOLEAN      NOT NULL,
    device_name VARCHAR(255),
    log_type    VARCHAR(255),
    deleted_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT device_pkey PRIMARY KEY (device_id)
);

CREATE TABLE employee_info
(
    employee_id       VARCHAR(64)  NOT NULL,
    address           VARCHAR(500),
    date_of_joining   date,
    delete_flag       BOOLEAN      NOT NULL,
    email             VARCHAR(150),
    emergency_contact VARCHAR(200),
    name              VARCHAR(200) NOT NULL,
    phone_number      VARCHAR(50),
    profile_picture   OID,
    role              VARCHAR(30)  NOT NULL,
    status            VARCHAR(30)  NOT NULL,
    department_id     VARCHAR(255),
    deleted_at        TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT employee_info_pkey PRIMARY KEY (employee_id)
);

CREATE TABLE leave_request
(
    leave_request_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMP WITHOUT TIME ZONE,
    end_time         TIMESTAMP WITHOUT TIME ZONE,
    reason           VARCHAR(255),
    start_time       TIMESTAMP WITHOUT TIME ZONE,
    status           VARCHAR(255),
    updated_at       TIMESTAMP WITHOUT TIME ZONE,
    employee_id      VARCHAR(64),
    delete_flag      BOOLEAN      NOT NULL,
    deleted_at       TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT leave_request_pkey PRIMARY KEY (leave_request_id)
);

CREATE TABLE ot_request
(
    ot_request_id VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP WITHOUT TIME ZONE,
    end_time      TIMESTAMP WITHOUT TIME ZONE,
    start_time    TIMESTAMP WITHOUT TIME ZONE,
    status        VARCHAR(255),
    updated_at    TIMESTAMP WITHOUT TIME ZONE,
    employee_id   VARCHAR(64),
    delete_flag   BOOLEAN      NOT NULL,
    deleted_at    TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ot_request_pkey PRIMARY KEY (ot_request_id)
);

CREATE TABLE payroll
(
    payroll_id            VARCHAR(64)      NOT NULL,
    actual_working_days   INTEGER          NOT NULL,
    base_gross            BIGINT           NOT NULL,
    bhtn_employee         BIGINT           NOT NULL,
    bhxh_employee         BIGINT           NOT NULL,
    bhyt_employee         BIGINT           NOT NULL,
    bonus                 BIGINT           NOT NULL,
    created_at            TIMESTAMP WITHOUT TIME ZONE,
    dependent_count       INTEGER          NOT NULL,
    insurance_base        BIGINT           NOT NULL,
    kpi1_score            DOUBLE PRECISION NOT NULL,
    kpi2_score            DOUBLE PRECISION NOT NULL,
    kpi_average           DOUBLE PRECISION NOT NULL,
    language_allowance    BIGINT           NOT NULL,
    living_allowance      BIGINT           NOT NULL,
    net_salary            BIGINT           NOT NULL,
    notes                 VARCHAR(500),
    odc_allowance         BIGINT           NOT NULL,
    ot_pay                BIGINT           NOT NULL,
    payroll_month         INTEGER          NOT NULL,
    payroll_year          INTEGER          NOT NULL,
    performance_salary    BIGINT           NOT NULL,
    pit                   BIGINT           NOT NULL,
    position_coefficient  BIGINT           NOT NULL,
    standard_working_days INTEGER          NOT NULL,
    status                VARCHAR(20)      NOT NULL,
    taxable_income        BIGINT           NOT NULL,
    total_gross           BIGINT           NOT NULL,
    updated_at            TIMESTAMP WITHOUT TIME ZONE,
    employee_id           VARCHAR(64)      NOT NULL,
    CONSTRAINT payroll_pkey PRIMARY KEY (payroll_id)
);

CREATE TABLE salary
(
    id           VARCHAR(255) NOT NULL,
    config_file  VARCHAR(255),
    config_type  VARCHAR(255),
    created_date TIMESTAMP WITHOUT TIME ZONE,
    is_active    BOOLEAN,
    start_date   date,
    version      VARCHAR(255),
    CONSTRAINT salary_pkey PRIMARY KEY (id)
);

CREATE TABLE system_config
(
    id             VARCHAR(64) NOT NULL,
    active         BOOLEAN     NOT NULL,
    config_data    JSONB       NOT NULL,
    config_type    VARCHAR(30) NOT NULL,
    created_at     TIMESTAMP WITHOUT TIME ZONE,
    effective_date date,
    legal_basis    VARCHAR(300),
    updated_at     TIMESTAMP WITHOUT TIME ZONE,
    updated_by     VARCHAR(100),
    version        VARCHAR(30) NOT NULL,
    CONSTRAINT system_config_pkey PRIMARY KEY (id)
);

CREATE TABLE user_account
(
    employee_id        VARCHAR(64)  NOT NULL,
    created_at         TIMESTAMP WITHOUT TIME ZONE,
    last_password_hash VARCHAR(255),
    password_hash      VARCHAR(100) NOT NULL,
    role               VARCHAR(30)  NOT NULL,
    updated_at         TIMESTAMP WITHOUT TIME ZONE,
    username           VARCHAR(100) NOT NULL,
    deleted_at         TIMESTAMP WITHOUT TIME ZONE,
    delete_flag        BOOLEAN      NOT NULL,
    CONSTRAINT user_account_pkey PRIMARY KEY (employee_id)
);

ALTER TABLE contract
    ADD CONSTRAINT uk8r7vipw0kqy3og4a1wqux5m6q UNIQUE (employee_id);

ALTER TABLE attendance
    ADD CONSTRAINT uk_attendance_employee_date UNIQUE (employee_id, attendance_date);

ALTER TABLE payroll
    ADD CONSTRAINT uk_payroll_employee_period UNIQUE (employee_id, payroll_year, payroll_month);

ALTER TABLE user_account
    ADD CONSTRAINT ukcastjbvpeeus0r8lbpehiu0e4 UNIQUE (username);

ALTER TABLE department
    ADD CONSTRAINT ukg9435hkqyjp3h3qsaslcmk4rw UNIQUE (manager_id);

CREATE INDEX idx_syscfg_type_active ON system_config (config_type, active);

CREATE INDEX idx_syscfg_type_version ON system_config (config_type, version);

ALTER TABLE contract
    ADD CONSTRAINT fk1dmujq2jh5296v0pxhvnnvy5y FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE user_account
    ADD CONSTRAINT fk4vdr67wesovshcpvdjfodja4g FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE ot_request
    ADD CONSTRAINT fk5lug52hu9kdrthrq2miaev52q FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE employee_info
    ADD CONSTRAINT fkch4y1l5f8rdi93uu4g7otwbga FOREIGN KEY (department_id) REFERENCES department (department_id) ON DELETE NO ACTION;

ALTER TABLE check_in_log
    ADD CONSTRAINT fkgyjk2hit7f6sgwbr1xtd6ckdv FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE payroll
    ADD CONSTRAINT fki5uqogl962povr96jcpmdsl9d FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE check_in_log
    ADD CONSTRAINT fkkl69a6b5b6km02r4k24tusgwb FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE NO ACTION;

ALTER TABLE department
    ADD CONSTRAINT fkmeq2tiy169g9i5i2q88cysjy9 FOREIGN KEY (manager_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE attendance
    ADD CONSTRAINT fkna0i2tr995yjoatyscckbhxx4 FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;

ALTER TABLE leave_request
    ADD CONSTRAINT fkry7e5bhin3g7w1hc1s918i8m0 FOREIGN KEY (employee_id) REFERENCES employee_info (employee_id) ON DELETE NO ACTION;