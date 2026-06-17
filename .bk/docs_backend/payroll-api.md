# Payroll Module — Frontend Integration Guide

**Base URL:** `http://localhost:8084/face-z`  
**All monetary values:** Vietnamese Dong (VND), integer (no decimals)  
**All timestamps:** ISO-8601 local datetime string, e.g. `"2026-03-26T06:00:00"`  
**Authentication:** All endpoints require `Authorization: Bearer <accessToken>`

---

## Table of Contents

1. [Common Response Shapes](#1-common-response-shapes)
2. [Payroll Status Lifecycle](#2-payroll-status-lifecycle)
3. [Endpoint Reference](#3-endpoint-reference)
   - [POST /calculate — Single employee](#31-post-apipayrollscalculate)
   - [POST /batch-calculate — All employees (async)](#32-post-apipayrollsbatch-calculate)
   - [GET /jobs/{jobId} — Poll batch job status](#33-get-apipayrollsjobsjobid)
   - [GET / — List all payrolls](#34-get-apipayrolls)
   - [GET /period — List by month](#35-get-apipayrollsperiod)
   - [GET /employee/{id} — List for one employee (HR)](#36-get-apipayrollsemployeeemployeeid)
   - [GET /my — My own payroll history](#37-get-apipayrollsmy)
   - [GET /{id} — Get single record](#38-get-apipayrollsid)
   - [PATCH /{id}/approve — Approve DRAFT](#39-patch-apipayrollsidapprove)
   - [PATCH /{id}/mark-paid — Mark PAID](#310-patch-apipayrollsidmark-paid)
   - [DELETE /{id} — Delete DRAFT](#311-delete-apipayrollsid)
4. [Batch Calculate Workflow](#4-batch-calculate-workflow)
5. [Payslip Field Reference](#5-payslip-field-reference)
6. [Error Reference](#6-error-reference)
7. [Role Access Summary](#7-role-access-summary)

---

## 1. Common Response Shapes

Every endpoint wraps its payload in `ApiResponse<T>`:

```jsonc
{
  "success": true,
  "message": "Success",
  "timestamp": "2026-03-26T06:00:00.000Z",
  "data": { /* T */ }
}
```

Paginated list endpoints return `ApiResponse<PageResponse<T>>`:

```jsonc
{
  "success": true,
  "message": "Success",
  "timestamp": "...",
  "data": {
    "content": [ /* array of T */ ],
    "page": 0,          // 0-indexed current page
    "size": 20,         // items per page
    "totalElements": 95,
    "totalPages": 5,
    "last": false
  }
}
```

**Error response:**

```jsonc
{
  "success": false,
  "message": "Payroll record already exists for employee ...",
  "timestamp": "..."
  // "data" is omitted on errors
}
```

Pagination query parameters (all optional):

| Param | Default | Description |
|---|---|---|
| `page` | `0` | 0-indexed page number |
| `size` | `20` | Items per page |
| `sort` | varies | e.g. `payrollYear,desc` |

---

## 2. Payroll Status Lifecycle

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   [POST /calculate]          [PATCH /approve]   [PATCH /mark-paid]
  │   [POST /batch-calculate]         │                    │
  │          │                        │                    │
  │          ▼                        ▼                    ▼
  │       DRAFT  ──────────────► APPROVED ────────────► PAID
  │          │
  │          │  [DELETE /{id}]
  │          ▼
  │       (deleted)
  │
  │  Rules:
  │  - Only DRAFT can be deleted or approved
  │  - Only APPROVED can be marked as paid
  │  - Any status can be viewed
  └─────────────────────────────────────────────────────────────────┘
```

| Status | Meaning | Allowed transitions |
|---|---|---|
| `DRAFT` | Calculated, pending HR review | → `APPROVED` (approve), → deleted |
| `APPROVED` | Locked by HR for payment | → `PAID` (mark-paid) |
| `PAID` | Salary disbursed | (terminal) |

---

## 3. Endpoint Reference

### 3.1 POST /api/payrolls/calculate

Calculate and save payroll for **one employee** in a given period. Saves as `DRAFT`.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**Request body:**

```jsonc
{
  "employeeId": "emp-001",          // required — target employee
  "payrollYear": 2026,              // required — integer 2020–2100
  "payrollMonth": 3,                // required — integer 1–12
  "kpi1Rating": "B",                // optional — "A" | "B" | "C", default "B"
                                    //   A=1.04, B=1.00, C=0.98
  "kpi2Rating": null,               // optional — "A" | "B" | "C"
                                    //   if omitted, auto-computed from attendance violations
  "standardWorkingDays": 26,        // optional — defaults to 26
  "bonus": 0,                       // optional — extra bonus in VND, default 0
  "japaneseLevel": "N1",            // optional — "N1" | "N2" | null (no language allowance)
  "odcAllowance": 500000,           // optional — ODC project allowance in VND, default 0
  "notes": "March payroll"          // optional — free text
}
```

**Validation rules:**

| Field | Rule |
|---|---|
| `employeeId` | Must not be blank; employee must have an active contract |
| `payrollYear` | 2020–2100 |
| `payrollMonth` | 1–12 |
| `bonus` | ≥ 0 |
| `odcAllowance` | ≥ 0 |
| Duplicate guard | Returns `400` if a DRAFT/APPROVED/PAID record already exists for this employee + year + month |

**Response:** `200 OK` — `ApiResponse<PayrollResponse>`

```jsonc
{
  "success": true,
  "message": "Payroll calculated and saved as DRAFT",
  "timestamp": "2026-03-26T10:00:00.000Z",
  "data": {
    "payrollId": "d3f1a2b4-...",
    "employeeId": "emp-001",
    "employeeName": "Nguyen Van A",
    "payrollYear": 2026,
    "payrollMonth": 3,

    // ── Earnings inputs ────────────────────────────────────────────
    "performanceSalary": 15000000,    // Lhq — base performance salary
    "positionCoefficient": 3200000,   // Li — position grade amount
    "livingAllowance": 1538461,       // HT2 — prorated living allowance
    "languageAllowance": 3000000,     // HT1 — Japanese N1 allowance
    "odcAllowance": 500000,           // HT3 — ODC project allowance
    "kpi1Score": 1.00,                // KPI1 multiplier
    "kpi2Score": 1.04,                // KPI2 multiplier
    "kpiAverage": 1.02,               // (KPI1 + KPI2) / 2
    "actualWorkingDays": 24,          // NCtt — paid days counted from attendance
    "standardWorkingDays": 26,        // Nt
    "otPay": 750000,                  // approved OT pay
    "bonus": 0,

    // ── Computed gross ────────────────────────────────────────────
    "baseGross": 19076923,            // [(Lhq×KPItb) + Li + HTi] × (NCtt/Nt)
    "totalGross": 19826923,           // baseGross + otPay + bonus

    // ── Deductions ────────────────────────────────────────────────
    "insuranceBase": 15000000,        // LCB capped at 46,800,000
    "bhxhEmployee": 1200000,          // BHXH 8%
    "bhytEmployee": 225000,           // BHYT 1.5%
    "bhtnEmployee": 150000,           // BHTN 1%
    "dependentCount": 1,
    "taxableIncome": 2451923,         // gross − insurance − personal/dependent relief
    "pit": 245192,                    // Personal Income Tax

    // ── Net ───────────────────────────────────────────────────────
    "netSalary": 18006731,

    "status": "DRAFT",
    "notes": "March payroll",
    "createdAt": "2026-03-26T10:00:00",
    "updatedAt": "2026-03-26T10:00:00"
  }
}
```

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | Duplicate record exists for this employee + period |
| `400` | Contract missing `baseSalary`, `positionCode`, or `salaryStep` |
| `400` | Validation failure (invalid year/month/negative bonus) |
| `404` | Employee has no contract |

---

### 3.2 POST /api/payrolls/batch-calculate

Calculate DRAFT payroll for **all active employees** in a period, asynchronously.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**Request body:**

```jsonc
{
  "payrollYear": 2026,          // required
  "payrollMonth": 3,            // required
  "standardWorkingDays": 26,    // optional — defaults to 26
  "kpi1Rating": "B"             // optional — default KPI1 applied to all employees
                                //   Individual overrides: delete DRAFT + POST /calculate
}
```

**Response:** `202 Accepted` — `ApiResponse<PayrollJobResponse>`

The job is queued immediately. The response body contains the initial job snapshot (state will be `PENDING` or already `RUNNING`):

```jsonc
{
  "success": true,
  "message": "Batch payroll job submitted. Poll /api/payrolls/jobs/<jobId> for status.",
  "timestamp": "2026-03-26T06:00:00.000Z",
  "data": {
    "jobId": "7e3a1f92-...",
    "state": "PENDING",         // PENDING | RUNNING | COMPLETED | FAILED
    "year": 2026,
    "month": 3,
    "standardWorkingDays": 26,
    "startedAt": null,
    "completedAt": null,
    "total": 0,                 // populated once the job starts
    "succeeded": 0,
    "skipped": 0,
    "failed": 0,
    "errors": [],
    "failureReason": null
  }
}
```

**Important notes:**
- Employees who already have a record for the period are **skipped** (not an error).
- Per-employee calculation errors (missing contract, etc.) are captured in `errors[]` but do not stop the batch — other employees continue.
- `failureReason` is only set when the entire job crashes fatally (e.g. database unreachable).
- Batch creates DRAFTs with default KPI1 (`B`), KPI2 auto-computed, no language/ODC allowance, no bonus. Use `POST /calculate` to recalculate individual employees with specific values.

---

### 3.3 GET /api/payrolls/jobs/{jobId}

Poll the status of a batch job. Call this repeatedly until `state` is `COMPLETED` or `FAILED`.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**Path parameter:** `jobId` — string UUID returned by `/batch-calculate`

**Response:** `200 OK` — `ApiResponse<PayrollJobResponse>`

```jsonc
{
  "success": true,
  "message": "Success",
  "data": {
    "jobId": "7e3a1f92-...",
    "state": "COMPLETED",       // PENDING | RUNNING | COMPLETED | FAILED
    "year": 2026,
    "month": 3,
    "standardWorkingDays": 26,
    "startedAt": "2026-03-26T06:00:01",
    "completedAt": "2026-03-26T06:00:04",
    "total": 87,                // total active employees found
    "succeeded": 82,            // payroll records created
    "skipped": 3,               // already had a record for this period
    "failed": 2,                // per-employee errors
    "errors": [
      "emp-045: missing or invalid contract",
      "emp-071: Salary step 5 out of range for TL3"
    ],
    "failureReason": null       // non-null only when state=FAILED
  }
}
```

**Polling strategy (recommended):**

```typescript
async function pollJobUntilDone(jobId: string, intervalMs = 1500): Promise<PayrollJobResponse> {
  while (true) {
    const res = await api.get(`/api/payrolls/jobs/${jobId}`);
    const job = res.data.data;
    if (job.state === 'COMPLETED' || job.state === 'FAILED') return job;
    await sleep(intervalMs);
  }
}
```

**Error cases:**

| HTTP | Condition |
|---|---|
| `404` | `jobId` not found (jobs are in-memory; lost on server restart) |

---

### 3.4 GET /api/payrolls

List all payroll records, paginated.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**Query parameters:**

| Param | Default | Description |
|---|---|---|
| `page` | `0` | Page index (0-based) |
| `size` | `20` | Items per page |
| `sort` | `payrollYear,desc` | Sort field and direction |

**Response:** `200 OK` — `ApiResponse<PageResponse<PayrollResponse>>`

---

### 3.5 GET /api/payrolls/period

List payroll records for a specific month.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `year` | integer | yes | e.g. `2026` |
| `month` | integer | yes | 1–12 |
| `page` | integer | no | default `0` |
| `size` | integer | no | default `20` |

**Example request:**
```
GET /api/payrolls/period?year=2026&month=3&size=50
```

**Response:** `200 OK` — `ApiResponse<PageResponse<PayrollResponse>>`

**Typical use:** HR overview page — list all employees' payroll for a given month, show totals, bulk approve.

---

### 3.6 GET /api/payrolls/employee/{employeeId}

List all payroll records for a specific employee.

**Required role:** `HR_ADMIN`, `SYSTEM_ADMIN`, or `MANAGER`

**Path parameter:** `employeeId`

**Query parameters:** `page`, `size`, `sort` (default: `payrollYear,desc`)

**Response:** `200 OK` — `ApiResponse<PageResponse<PayrollResponse>>`

---

### 3.7 GET /api/payrolls/my

List the **calling user's own** payroll history. Employee ID is resolved from the JWT — no path parameter.

**Required role:** Any authenticated user

**Query parameters:** `page`, `size`, `sort` (default: `payrollYear,desc`)

**Response:** `200 OK` — `ApiResponse<PageResponse<PayrollResponse>>`

**Typical use:** Employee self-service page — "My Payslips".

---

### 3.8 GET /api/payrolls/{id}

Get a single payroll record by its UUID.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**Path parameter:** `id` — `payrollId` UUID string

**Response:** `200 OK` — `ApiResponse<PayrollResponse>`

**Error cases:**

| HTTP | Condition |
|---|---|
| `404` | Payroll record not found |

---

### 3.9 PATCH /api/payrolls/{id}/approve

Approve a `DRAFT` payroll. Status transitions `DRAFT → APPROVED`. The record is locked — no further edits are possible.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**No request body.**

**Response:** `200 OK` — `ApiResponse<PayrollResponse>` (updated record with `status: "APPROVED"`)

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | Record is not in `DRAFT` status |
| `404` | Payroll record not found |

---

### 3.10 PATCH /api/payrolls/{id}/mark-paid

Mark an `APPROVED` payroll as `PAID`. Status transitions `APPROVED → PAID`.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**No request body.**

**Response:** `200 OK` — `ApiResponse<PayrollResponse>` (updated record with `status: "PAID"`)

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | Record is not in `APPROVED` status |
| `404` | Payroll record not found |

---

### 3.11 DELETE /api/payrolls/{id}

Delete a payroll record. Only allowed on `DRAFT` status.

**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`

**No request body.**

**Response:** `200 OK`

```jsonc
{
  "success": true,
  "message": "Payroll deleted",
  "data": null
}
```

**Error cases:**

| HTTP | Condition |
|---|---|
| `400` | Record is not in `DRAFT` status |
| `404` | Payroll record not found |

---

## 4. Batch Calculate Workflow

This is the recommended flow for end-of-month payroll processing.

```
HR clicks "Run Payroll for March 2026"
        │
        ▼
POST /api/payrolls/batch-calculate
{ "payrollYear": 2026, "payrollMonth": 3 }
        │
        │ response: 202 + { jobId: "7e3a..." }
        │
        ▼
Poll every 1-2 seconds:
GET /api/payrolls/jobs/7e3a...
        │
        │ state: "RUNNING"  →  keep polling
        │ state: "COMPLETED" → stop polling, show summary
        │ state: "FAILED"    → show failureReason, retry
        │
        ▼
Show HR: "82 payrolls created, 3 skipped, 2 failed"
Show errors list for failed employees
        │
        ▼
HR reviews employees with errors → fix contracts → POST /calculate individually
        │
        ▼
HR reviews all DRAFTs:
GET /api/payrolls/period?year=2026&month=3
        │
        ▼
For employees needing adjustment (wrong KPI, bonus, etc.):
  DELETE /api/payrolls/{id}  →  POST /calculate (with correct values)
        │
        ▼
Bulk approve: PATCH /api/payrolls/{id}/approve  (per record)
        │
        ▼
After salary transfer: PATCH /api/payrolls/{id}/mark-paid
```

---

## 5. Payslip Field Reference

All amounts are in **VND** (integer). The gross formula is:

```
GROSS = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt) + OT_Pay + Bonus
NET   = GROSS − BHXH − BHYT − BHTN − PIT
```

| Field | Vietnamese name | Description |
|---|---|---|
| `performanceSalary` | Lhq — lương hợp đồng | Contract base salary |
| `positionCoefficient` | Li — hệ số chức danh | Position grade coefficient amount |
| `livingAllowance` | HT2 — phụ cấp sinh hoạt | Living allowance, prorated by (NCtt/Nt) |
| `languageAllowance` | HT1 — phụ cấp tiếng Nhật | Japanese language allowance (N1/N2), not prorated |
| `odcAllowance` | HT3 — phụ cấp ODC | ODC project allowance, not prorated |
| `kpi1Score` | KPI1 | Performance KPI multiplier (0.98 / 1.00 / 1.04) |
| `kpi2Score` | KPI2 | Attendance KPI multiplier (1.00 / 1.02 / 1.04) |
| `kpiAverage` | KPItb | (KPI1 + KPI2) / 2 |
| `actualWorkingDays` | NCtt | Paid working days counted from attendance |
| `standardWorkingDays` | Nt | Standard working days in the month (default 26) |
| `otPay` | Lương OT | Approved overtime pay |
| `bonus` | Thưởng | Variable bonus |
| `baseGross` | Lương cơ bản tính | Formula result before OT/bonus |
| `totalGross` | Tổng lương gộp | baseGross + otPay + bonus |
| `insuranceBase` | LCB | Insurance base salary, capped at 46,800,000 VND |
| `bhxhEmployee` | BHXH NLĐ | Social insurance 8% |
| `bhytEmployee` | BHYT NLĐ | Health insurance 1.5% |
| `bhtnEmployee` | BHTN NLĐ | Unemployment insurance 1% |
| `dependentCount` | Người phụ thuộc | Number of registered dependents |
| `taxableIncome` | Thu nhập chịu thuế | Gross − insurance − personal/dependent relief |
| `pit` | Thuế TNCN | Personal income tax (progressive brackets) |
| `netSalary` | Lương thực nhận | Take-home pay |

---

## 6. Error Reference

### HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `202` | Accepted (async job submitted) |
| `400` | Bad request — validation failure, business rule violation |
| `401` | Unauthenticated — missing or expired access token |
| `403` | Forbidden — authenticated but insufficient role |
| `404` | Resource not found |
| `500` | Internal server error |

### Common 400 error messages

| Message | Cause | Fix |
|---|---|---|
| `Payroll record already exists for employee X in Y/Z (status: DRAFT). Delete the existing DRAFT first.` | Duplicate calculation | Delete the existing DRAFT first, then recalculate |
| `Contract is missing baseSalary for employee: X` | Employee contract not fully configured | Update the employee's contract via the contract API |
| `Contract is missing positionCode or salaryStep for employee: X` | Contract lacks grade info | Update contract's `positionCode` and `salaryStep` |
| `Only DRAFT payrolls can be approved.` | Tried to approve a non-DRAFT | Check current status first |
| `Only APPROVED payrolls can be marked as paid.` | Tried to mark-paid a non-APPROVED | Must approve before marking paid |
| `Only DRAFT payrolls can be deleted.` | Tried to delete non-DRAFT | Cannot delete APPROVED or PAID records |

---

## 7. Role Access Summary

| Endpoint | SYSTEM_ADMIN | HR_ADMIN | MANAGER | EMPLOYEE |
|---|---|---|---|---|
| POST /calculate | — | ✓ | — | — |
| POST /batch-calculate | — | ✓ | — | — |
| GET /jobs/{jobId} | — | ✓ | — | — |
| GET / | — | ✓ | — | — |
| GET /period | — | ✓ | — | — |
| GET /employee/{id} | — | ✓ | ✓ | — |
| GET /my | ✓ | ✓ | ✓ | ✓ |
| GET /{id} | — | ✓ | — | — |
| PATCH /{id}/approve | — | ✓ | — | — |
| PATCH /{id}/mark-paid | — | ✓ | — | — |
| DELETE /{id} | — | ✓ | — | — |
