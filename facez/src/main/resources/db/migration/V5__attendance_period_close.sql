-- Phase 1.4: HR Attendance Period Close
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
