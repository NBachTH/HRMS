-- Phase 7.5: PIT progressive tax bracket config seeded into system_config
INSERT INTO system_config (id, config_type, version, effective_date, config_data, active, legal_basis, created_at, updated_at, updated_by)
VALUES (
    'pit-brackets-2026',
    'PIT_BRACKETS',
    '2026',
    '2026-01-01',
    '{
      "brackets": [
        {"fromVnd": 0,         "toVnd": 5000000,   "rate": 0.05},
        {"fromVnd": 5000000,   "toVnd": 10000000,  "rate": 0.10},
        {"fromVnd": 10000000,  "toVnd": 18000000,  "rate": 0.15},
        {"fromVnd": 18000000,  "toVnd": 32000000,  "rate": 0.20},
        {"fromVnd": 32000000,  "toVnd": 52000000,  "rate": 0.25},
        {"fromVnd": 52000000,  "toVnd": 80000000,  "rate": 0.30},
        {"fromVnd": 80000000,  "toVnd": null,       "rate": 0.35}
      ],
      "personalDeduction": 11000000,
      "dependentDeduction": 4400000
    }',
    true,
    'Circular 111/2013/TT-BTC, amended 2026',
    NOW(),
    NOW(),
    'system'
);
