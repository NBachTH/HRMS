# System Config API — Frontend Integration Guide

**Base URL:** `http://localhost:8084/face-z`  
**Authentication:** All endpoints require `Authorization: Bearer <accessToken>`  
**Required role:** `SYSTEM_ADMIN` for all endpoints

This API manages versioned payroll configuration records stored in the `system_config` table.
Admins create new config versions, activate one per type, and the calculation engine picks up
changes immediately. All monetary values are in **VND** (integer).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Config Types & JSON Schemas](#2-config-types--json-schemas)
   - [SALARY_GRADE](#21-salary_grade)
   - [ALLOWANCE](#22-allowance)
   - [PIT](#23-pit)
   - [INSURANCE](#24-insurance)
3. [Common Response Shapes](#3-common-response-shapes)
4. [Endpoint Reference](#4-endpoint-reference)
   - [GET / — List versions by type](#41-get-apisystem-configs)
   - [GET /{id} — Get one record](#42-get-apisystem-configsid)
   - [POST / — Create new version](#43-post-apisystem-configs)
   - [PATCH /{id}/activate — Activate a version](#44-patch-apisystem-configsidactivate)
   - [DELETE /{id} — Delete inactive version](#45-delete-apisystem-configsid)
5. [Typical Workflow](#5-typical-workflow)
6. [Error Reference](#6-error-reference)

---

## 1. Overview

Each config type has exactly **one active version** at a time. The active version is what the
payroll engine reads during every calculation.

```
Config type lifecycle:

  POST /            POST /            PATCH /{id}/activate
  (version A)  →   (version B)  →   (activate B)
                                           │
                                           ▼
                              version A: active=false
                              version B: active=true
                              payroll cache reloaded ✓
```

**The four config types:**

| Type | Controls |
|---|---|
| `SALARY_GRADE` | Position codes and 10-step salary ladders (VND/month) |
| `ALLOWANCE` | Living allowance (HT2) and Japanese language allowance (HT1) amounts |
| `PIT` | Personal income tax brackets and personal/dependent relief amounts per year |
| `INSURANCE` | BHXH/BHYT/BHTN employee rates and insurance salary ceiling |

**Key rule:** You cannot delete an active config. To replace it, create a new version and activate
that version first. The old version then becomes deletable.

---

## 2. Config Types & JSON Schemas

The `configData` field is a freeform JSON object whose structure must match the schema expected
by the payroll engine. The schemas are described below with the 2026 production values as examples.

### 2.1 SALARY_GRADE

Maps position codes to a 10-step salary ladder. Values are in **thousand VND** — the engine
multiplies by 1,000 before using them.

```jsonc
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "legal_basis": "Salary Regulation v4.0",
  "unit": "thousand_vnd",
  "minimum_wage_region_I": 5310,
  "grades": {
    "BOD": {
      "title": "Director / Deputy Director (Company level)",
      "track": "management",
      "steps": [12000, 13500, 15000, 17000, 19000, 21500, 24000, 27000, 31000, 36000]
    },
    "TL1": {
      "title": "Team Lead: Technical, QA, SA, PM",
      "track": "management",
      "steps": [8000, 8500, 9200, 10000, 11200, 13000, 14500, 16500, 18500, 21000]
    },
    "NV1": {
      "title": "Developer, BA, QA Engineer",
      "track": "employee",
      "steps": [6500, 7200, 7800, 8500, 9200, 10000, 10800, 11800, 12800, 14000]
    }
    // ... more position codes
  }
}
```

**Position codes in the 2026 config:**

| Code | Title |
|---|---|
| `BOD` | Director / Deputy Director (Company level) |
| `BOD2` | Functional Unit Director |
| `DL` | Deputy Unit Director / Dept Head / Chief Accountant |
| `TL1` | Team Lead: Technical, QA, Solution Architect, PM |
| `TL2` | Team Lead: HR, Admin, Recruitment, Training, IT |
| `NV1` | Developer, BA, QA Engineer, Tester, Translator |
| `NV2` | HR, Accountant, Admin, Designer, Marketing, Lecturer |
| `NV3` | Support, Warehouse, Receptionist |

Each `steps` array must have exactly 10 elements (salary steps 1–10).

---

### 2.2 ALLOWANCE

Controls HT2 (living allowance) and HT1 (Japanese language allowance).

```jsonc
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "living_allowance": {
    "prorated": true,
    "eligible_contracts": ["PROBATION", "FIXED_TERM", "INDEFINITE"],
    "levels": {
      "DIRECTOR":         { "meal": 1500000, "phone": 1000000, "transport": 1500000, "housing": 5000000 },
      "DEPUTY_DIRECTOR":  { "meal": 1400000, "phone":  800000, "transport": 1000000, "housing": 3000000 },
      "DEPT_HEAD":        { "meal": 1300000, "phone":  500000, "transport":  700000, "housing": 2500000 },
      "SENIOR_STAFF_NV1": { "meal": 1000000, "phone":  300000, "transport":  500000, "housing": 2000000 },
      "NV2":              { "meal":  770000, "phone":  200000, "transport":  300000, "housing":       0 }
    }
  },
  "japanese_allowance": {
    "prorated": false,
    "eligible_contracts": ["FIXED_TERM", "INDEFINITE"],
    "min_contract_months": 12,
    "excluded_positions": ["JAPANESE_TRANSLATOR"],
    "excluded_levels": ["DEPT_HEAD", "DEPUTY_DIRECTOR", "DIRECTOR"],
    "levels": {
      "N1": 5000000,
      "N2": 2000000
    }
  }
}
```

**Level keys used by the engine:**

`DIRECTOR` · `DEPUTY_DIRECTOR` · `DEPT_HEAD` · `SENIOR_STAFF_NV1` · `NV2`

> The engine calls `getLivingAllowance(levelKey)` which sums `meal + phone + transport + housing`
> for the matched level key. The level key is derived from the employee's contract level field.

---

### 2.3 PIT

Personal income tax brackets per tax year. Multiple years can coexist in one config record —
the engine selects by `payrollYear`.

```jsonc
{
  "configs": {
    "2026": {
      "legal_basis": "Law 109/2025/QH15",
      "resolution": "Resolution 110/2025/UBTVQH15",
      "personal_relief": 15500000,
      "dependent_relief": 6200000,
      "brackets": [
        { "from": 0,         "to": 10000000,  "rate": 0.05, "quick_deduction": 0        },
        { "from": 10000001,  "to": 30000000,  "rate": 0.10, "quick_deduction": 500000   },
        { "from": 30000001,  "to": 60000000,  "rate": 0.20, "quick_deduction": 3500000  },
        { "from": 60000001,  "to": 100000000, "rate": 0.30, "quick_deduction": 9500000  },
        { "from": 100000001, "to": null,       "rate": 0.35, "quick_deduction": 14500000 }
      ]
    }
  }
}
```

The engine uses the **quick-deduction formula**: `PIT = taxableIncome × rate − quick_deduction`,
iterating from the highest bracket down until `taxableIncome >= from`.

**Fields:**

| Field | Description |
|---|---|
| `personal_relief` | Monthly self-deduction before PIT (VND) |
| `dependent_relief` | Per-dependent monthly deduction (VND) |
| `brackets[].from` | Lower bound of bracket (VND, inclusive) |
| `brackets[].rate` | Marginal tax rate (decimal, e.g. `0.10` = 10%) |
| `brackets[].quick_deduction` | Pre-computed constant deducted from `income × rate` |

---

### 2.4 INSURANCE

Employee-side BHXH/BHYT/BHTN contribution rates and the insurance salary ceiling.

```jsonc
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "legal_basis": "Law 41/2024/QH15 + Decree 188/2025/NĐ-CP",
  "government_base_salary": 2340000,
  "insurance_ceiling": 46800000,
  "employee_rates": {
    "bhxh": 0.08,
    "bhyt": 0.015,
    "bhtn": 0.01,
    "total": 0.105
  },
  "employer_rates": {
    "bhxh_pension": 0.14,
    "bhxh_sickness_maternity": 0.03,
    "bhxh_accident": 0.005,
    "bhyt": 0.03,
    "bhtn": 0.01,
    "total": 0.215
  },
  "eligible_contract_types": ["FIXED_TERM", "INDEFINITE"],
  "probation_exempt": true
}
```

**Fields read by the engine:**

| Field | Description |
|---|---|
| `insurance_ceiling` | Max insurance base salary (VND). Default fallback: 46,800,000 |
| `employee_rates.bhxh` | Social insurance rate — employee share (default 8%) |
| `employee_rates.bhyt` | Health insurance rate — employee share (default 1.5%) |
| `employee_rates.bhtn` | Unemployment insurance rate — employee share (default 1%) |
| `eligible_contract_types` | Contract types subject to insurance deduction |

---

## 3. Common Response Shapes

Every endpoint wraps its payload in `ApiResponse<T>`:

```jsonc
{
  "success": true,
  "message": "Success",
  "timestamp": "2026-04-09T10:00:00.000Z",
  "data": { /* T */ }
}
```

**Error response:**

```jsonc
{
  "success": false,
  "message": "Cannot delete an active config. Activate another version first.",
  "timestamp": "2026-04-09T10:00:00.000Z"
}
```

**SystemConfigResponse shape** (returned by all endpoints):

```jsonc
{
  "id": "a1b2c3d4-...",          // UUID string
  "configType": "SALARY_GRADE",  // SALARY_GRADE | ALLOWANCE | PIT | INSURANCE
  "version": "2026",             // human-readable label
  "effectiveDate": "2026-01-01", // ISO date, nullable
  "legalBasis": "Salary Regulation v4.0",  // nullable
  "configData": { /* JSON object — structure depends on configType */ },
  "active": true,                // whether this is the version used by the engine
  "updatedBy": "admin",          // username of last editor
  "createdAt": "2026-04-01T08:00:00",
  "updatedAt": "2026-04-09T10:00:00"
}
```

---

## 4. Endpoint Reference

### 4.1 GET /api/system-configs

List all versions of a given config type, ordered newest-first.

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `type` | string | yes | `SALARY_GRADE` \| `ALLOWANCE` \| `PIT` \| `INSURANCE` |

**Example request:**
```
GET /api/system-configs?type=SALARY_GRADE
```

**Response:** `200 OK` — `ApiResponse<List<SystemConfigResponse>>`

```jsonc
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "a1b2c3d4-...",
      "configType": "SALARY_GRADE",
      "version": "2026-v2",
      "effectiveDate": "2026-07-01",
      "legalBasis": "Salary Regulation v4.1",
      "configData": { /* ... */ },
      "active": false,
      "updatedBy": "admin",
      "createdAt": "2026-04-09T10:00:00",
      "updatedAt": "2026-04-09T10:00:00"
    },
    {
      "id": "e5f6a7b8-...",
      "configType": "SALARY_GRADE",
      "version": "2026",
      "effectiveDate": "2026-01-01",
      "legalBasis": "Salary Regulation v4.0",
      "configData": { /* ... */ },
      "active": true,
      "updatedBy": "admin",
      "createdAt": "2026-01-01T00:00:00",
      "updatedAt": "2026-01-01T00:00:00"
    }
  ]
}
```

**Typical use:** Config management page — show a table of all versions with their active status,
so admin can see history and choose which to activate.

---

### 4.2 GET /api/system-configs/{id}

Get a single config record by UUID.

**Path parameter:** `id` — UUID string

**Response:** `200 OK` — `ApiResponse<SystemConfigResponse>`

**Error cases:**

| HTTP | Condition |
|---|---|
| `404` | Config record not found |

---

### 4.3 POST /api/system-configs

Create a new config version. The new record is **inactive** by default — it does not affect
payroll calculations until you activate it via `PATCH /{id}/activate`.

**Request body:**

```jsonc
{
  "configType": "SALARY_GRADE",        // required — one of the four types
  "version": "2026-v2",                // required — free text label, e.g. "2026", "v4.1"
  "effectiveDate": "2026-07-01",       // optional — ISO date
  "legalBasis": "Salary Regulation v4.1 — mid-year revision",  // optional
  "configData": {                      // required — JSON object matching the type's schema
    "version": "2026-v2",
    "unit": "thousand_vnd",
    "grades": {
      "NV1": { "title": "...", "track": "employee", "steps": [6800, 7500, ...] }
      // ...
    }
  }
}
```

**Validation rules:**

| Field | Rule |
|---|---|
| `configType` | Must be one of: `SALARY_GRADE`, `ALLOWANCE`, `PIT`, `INSURANCE` |
| `version` | Must not be blank |
| `configData` | Must not be null; must be a valid JSON object |

> **Note:** The API does not validate the internal structure of `configData` against the schema —
> that is the admin's responsibility. Activating a config with incorrect structure will cause
> payroll calculation errors at runtime.

**Response:** `201 Created` — `ApiResponse<SystemConfigResponse>`

```jsonc
{
  "success": true,
  "message": "Config created. Use PATCH /{id}/activate to make it active.",
  "data": {
    "id": "a1b2c3d4-...",
    "configType": "SALARY_GRADE",
    "version": "2026-v2",
    "effectiveDate": "2026-07-01",
    "legalBasis": "Salary Regulation v4.1 — mid-year revision",
    "configData": { /* ... */ },
    "active": false,
    "updatedBy": "admin",
    "createdAt": "2026-04-09T10:00:00",
    "updatedAt": "2026-04-09T10:00:00"
  }
}
```

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | `configType` is not one of the four allowed values |
| `400` | `version` is blank or `configData` is null |

---

### 4.4 PATCH /api/system-configs/{id}/activate

Activate a config version. This does three things atomically:

1. Sets `active = false` on all other versions of the same `configType`
2. Sets `active = true` on the target record
3. Calls `PayrollConfigService.reload()` — the in-memory cache is refreshed immediately

**No request body.**

**Path parameter:** `id` — UUID of the config to activate

**Response:** `200 OK` — `ApiResponse<SystemConfigResponse>` (the activated record)

```jsonc
{
  "success": true,
  "message": "Config activated and payroll cache reloaded.",
  "data": {
    "id": "a1b2c3d4-...",
    "configType": "SALARY_GRADE",
    "version": "2026-v2",
    "active": true,
    "updatedBy": "admin",
    "updatedAt": "2026-04-09T10:05:00"
    // ...
  }
}
```

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | Config is already active |
| `404` | Config record not found |

> **Warning:** Activating a new config takes effect on the **next payroll calculation**. Existing
> `DRAFT` or `APPROVED` payroll records are not retroactively recalculated. To recalculate an
> existing DRAFT with the new config, delete it and recalculate via `POST /api/payrolls/calculate`.

---

### 4.5 DELETE /api/system-configs/{id}

Delete a config version. Only **inactive** versions can be deleted.

**No request body.**

**Path parameter:** `id` — UUID of the config to delete

**Response:** `200 OK`

```jsonc
{
  "success": true,
  "message": "Config deleted.",
  "data": null
}
```

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | Config is currently active — activate another version first |
| `404` | Config record not found |

---

## 5. Typical Workflow

### Updating a config (e.g. mid-year salary raise)

```
Admin opens "Payroll Config" settings page
          │
          ▼
GET /api/system-configs?type=SALARY_GRADE
  → shows current active version (e.g. "2026") + any drafts
          │
          ▼
Admin copies active configData, edits the relevant grades/steps
          │
          ▼
POST /api/system-configs
{ "configType": "SALARY_GRADE", "version": "2026-v2", "configData": { ... } }
  → returns new record with active=false
          │
          ▼
Admin reviews the new version in the UI (GET /{id})
          │
          ▼
Admin confirms → PATCH /api/system-configs/{id}/activate
  → old "2026" version becomes active=false
  → new "2026-v2" version becomes active=true
  → payroll engine cache reloaded immediately
          │
          ▼
Next payroll calculation uses the new salary grades
```

### Updating PIT brackets for a new tax year

```
POST /api/system-configs
{
  "configType": "PIT",
  "version": "2027",
  "effectiveDate": "2027-01-01",
  "legalBasis": "New PIT law ...",
  "configData": {
    "configs": {
      "2026": { /* keep old brackets */ },
      "2027": { "personal_relief": 17000000, "dependent_relief": 7000000, "brackets": [...] }
    }
  }
}
→ PATCH /{id}/activate before running January 2027 payroll
```

> Tip: include all previous years inside `configs` when creating a new PIT version, since the
> engine looks up brackets by `payrollYear`. A config with only `"2027"` will fail for any
> recalculation of past payroll records.

---

## 6. Error Reference

### HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request — validation failure or business rule violation |
| `401` | Unauthenticated — missing or expired access token |
| `403` | Forbidden — role is not `SYSTEM_ADMIN` |
| `404` | Resource not found |
| `500` | Internal server error |

### Common 400 error messages

| Message | Cause | Fix |
|---|---|---|
| `configType must be one of: SALARY_GRADE, ALLOWANCE, PIT, INSURANCE` | Invalid type value in request | Use one of the four allowed values |
| `Config {id} is already active.` | Tried to activate the current active version | Nothing to do — it is already active |
| `Cannot delete an active config. Activate another version first.` | Tried to delete active version | Activate a different version, then delete this one |

### Runtime errors from bad `configData`

If a config is activated with an incorrect `configData` structure, the payroll engine will throw
errors during calculation (not at activation time). Symptoms:

| Engine error | Likely cause |
|---|---|
| `Unknown position code: NV1` | `grades.NV1` is missing from `SALARY_GRADE` configData |
| `Salary step 5 out of range for TL1` | `grades.TL1.steps` has fewer than 5 elements |
| `No active payroll config found in DB for type: PIT` | No active PIT config exists (startup failure) |
| `NullPointerException` in `calculatePit` | `brackets` array is missing or empty in PIT configData |

Always validate the structure of `configData` against the schemas in [Section 2](#2-config-types--json-schemas)
before activating.
