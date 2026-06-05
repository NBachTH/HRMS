-- Phase 8.4: Device API key for check-in endpoint authentication
CREATE TABLE api_key
(
    id           VARCHAR(64)  NOT NULL,
    key_hash     VARCHAR(100) NOT NULL,
    device_id    VARCHAR(255) NOT NULL,
    active       BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMP WITHOUT TIME ZONE,
    last_used_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT api_key_pkey PRIMARY KEY (id),
    CONSTRAINT fk_api_key_device FOREIGN KEY (device_id) REFERENCES device (device_id) ON DELETE CASCADE
);

CREATE INDEX idx_api_key_device ON api_key (device_id);
