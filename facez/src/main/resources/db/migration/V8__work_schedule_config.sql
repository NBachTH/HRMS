-- Phase 3.2: Seed default work schedule config
INSERT INTO system_config (id, config_type, version, effective_date, config_data, active, legal_basis, created_at, updated_at, updated_by)
VALUES (
    'work-schedule-default',
    'WORK_SCHEDULE',
    '2026',
    '2026-01-01',
    '{"workStartTime":"08:30","workHoursPerDay":8,"timezone":"Asia/Ho_Chi_Minh"}',
    true,
    'Company policy',
    NOW(),
    NOW(),
    'system'
);
