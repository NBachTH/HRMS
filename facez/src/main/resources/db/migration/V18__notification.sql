-- Phase 8.1: In-app notification system
CREATE TABLE notification
(
    id          VARCHAR(64)  NOT NULL,
    employee_id VARCHAR(64)  NOT NULL,
    message     VARCHAR(500) NOT NULL,
    read_flag   BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT notification_pkey PRIMARY KEY (id),
    CONSTRAINT fk_notification_employee FOREIGN KEY (employee_id)
        REFERENCES employee_info (employee_id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_employee ON notification (employee_id, read_flag);
