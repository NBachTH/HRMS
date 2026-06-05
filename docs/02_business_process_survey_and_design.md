# FaceZ HRMS — Business Process Survey & Design Document
### Practical Process Mapping and Design Specifications
**Version:** 2.0 | **Date:** 2026-05-21 | **Analyst:** Claude Code
**Supersedes:** v1.0 (2026-04-10)

> **v2.0 scope:** All 16 processes surveyed in v1.0 have been re-assessed against the current codebase. Thirteen business rules have changed status (Fixed/Changed). Six new processes are documented. Business rule numbering is preserved from v1.0 for traceability; new rules are appended.

---

## 1. Scope and Methodology

This document surveys each business process implemented in FaceZ, describes it in business terms, and provides design specifications including inputs, outputs, business rules, and data flows. The survey is drawn from direct inspection of the source code and the Flyway migration sequence (V1–V19).

---

## 2. Process Inventory

| # | Process Area | Process Name | Owner Role | Automated? | Status vs v1.0 |
|---|-------------|--------------|------------|:----------:|----------------|
| 1 | Identity | Employee Registration | HR_ADMIN | Partial | Updated |
| 2 | Identity | Employee Profile Update | HR_ADMIN | No | Updated |
| 3 | Identity | Employee Offboarding | HR_ADMIN | No | Unchanged |
| 4 | Identity | Password Change | EMPLOYEE | Yes | Unchanged |
| 5 | Organisation | Department Management | HR_ADMIN | No | Updated |
| 6 | Attendance | Biometric Check-in / Check-out | Device | **Yes** | **Fixed** |
| 7 | Attendance | Attendance Record Correction | HR_ADMIN | No | Updated |
| 8 | Leave | Leave Request Submission | EMPLOYEE | No | **Major update** |
| 9 | Leave | Leave Approval Workflow | Multi-role | No | Updated |
| 10 | Overtime | OT Request Submission | EMPLOYEE | No | Updated |
| 11 | Overtime | OT Approval Workflow | Multi-role | No | Unchanged |
| 12 | Contract | Contract Creation / Update | HR_ADMIN | No | **Fixed** |
| 13 | Payroll | Individual Payroll Calculation | **FINANCE_ADMIN** | Partial | **Major update** |
| 14 | Payroll | Batch Payroll Processing | **FINANCE_ADMIN** | Yes | Updated |
| 15 | Payroll | Payroll Approval and Payment | **DIRECTOR** | No | **Major update** |
| 16 | Configuration | Salary Grade / Tax Config Update | **FINANCE_ADMIN** | No | **Fixed** |
| 17 | Attendance | Period Close | HR_ADMIN | Partial | **New** |
| 18 | Leave | Leave Balance Management | HR_ADMIN | Partial | **New** |
| 19 | Finance | Labour Cost Reporting | FINANCE_ADMIN | Yes | **New** |
| 20 | Finance | Insurance Remittance Summary | FINANCE_ADMIN | Yes | **New** |
| 21 | Finance | PIT Summary Reporting | FINANCE_ADMIN | Yes | **New** |
| 22 | Employee | Payslip Self-Service | EMPLOYEE | Yes | **New** |

---

## 3. Detailed Process Descriptions

---

### Process 1: Employee Registration

**Actor(s):** HR_ADMIN

**Process Steps:**
1. HR navigates to the Employees module and clicks "Add Employee".
2. HR enters: name, role, email, phone, address, date of joining, emergency contact, department.
3. HR optionally enters statutory fields: national ID, tax code, social insurance code, bank account, bank name, bank branch, date of birth, gender, hometown.
4. HR sets credentials: username and initial password.
5. System validates uniqueness of `employeeId` and `username`, role validity, department existence.
6. System creates `EmployeeInfo` and `UserAccount` records atomically.
7. System bcrypt-encodes the password; plaintext is never stored.

**Business Rules:**
- BR-001: Employee ID must be unique across the system (including soft-deleted records). *(Unchanged)*
- BR-002: Username must be unique. *(Unchanged)*
- BR-003: A valid role from the enum must be assigned. *(Updated: now includes `FINANCE_ADMIN` and `DIRECTOR`.)*
- BR-004: Department is optional at creation; assignable later. *(Unchanged)*
- BR-005: Password must meet minimum length. *(Unchanged)*
- **BR-003a (new):** Roles `FINANCE_ADMIN` and `DIRECTOR` are now valid and each grants distinct payroll workflow authority.

**Updated fields captured (added in Phase 2):**
`nationalId` (unique), `taxCode` (unique), `socialInsuranceCode` (unique), `bankAccountNumber`, `bankName`, `bankBranch`, `dateOfBirth`, `gender` (enum), `hometown`, `profilePictureUrl`

**Remaining gap:** No onboarding workflow, welcome email, or automated credential delivery. Credentials must be communicated out-of-band. Profile pictures are stored on local disk, not cloud storage.

---

### Process 2: Employee Profile Update

**Actor(s):** HR_ADMIN

**Business Rules:**
- BR-006: ~~A role change in `EmployeeInfo` does not automatically synchronise to `UserAccount.role`~~ — **FIXED:** The `Role` enum is the single source; `UserAccount` and `EmployeeInfo` share the same `role` field via the same enum type. Synchronisation is now automatic when a role update is submitted.
- BR-007: ~~Profile pictures stored as BLOB~~ — **FIXED:** Profile pictures are now stored as files on local disk; `employeeInfo.profilePictureUrl` stores the path/URL. Upload via `POST /api/employees/{id}/profile-picture` (HR_ADMIN, multipart, max 5 MB, JPEG/PNG/WebP).
- BR-008: Changing an employee's department does not re-assign pending requests. *(Still open.)*

---

### Process 3: Employee Offboarding

**Actor(s):** HR_ADMIN

**Business Rules:**
- BR-009: All historical records are preserved. Soft delete does not cascade to child records. *(Unchanged)*
- BR-010: A terminated employee's payroll and attendance data remain queryable. *(Unchanged)*
- BR-011: No multi-step confirmation before offboarding — a single API call completes the action. *(Still open)*

**Remaining gap:** No offboarding checklist, asset return workflow, or final settlement payroll trigger.

---

### Process 4: Password Change

*(Unchanged from v1.0. BR-012 still applies: one previous password hash retained, no N-cycle history enforcement.)*

---

### Process 5: Department Management

**Actor(s):** HR_ADMIN

**Business Rules:**
- BR-013: Each department has at most one designated manager. *(Unchanged)*
- BR-014: Department list is flat (no hierarchy). *(Unchanged)*
- BR-015: ~~Department list endpoints are publicly accessible~~ — **FIXED:** `GET /api/departments/**` now requires authentication. Anonymous access returns 401.

---

### Process 6: Biometric Check-in / Check-out

**Actor(s):** Access control device (automated)

**v1.0 gap resolved:** The pipeline from `CheckinLog` to `Attendance` is now **fully automated** via Spring Application Events.

**Process Steps:**
1. Device sends `POST /api/checkin-logs` with `X-Device-API-Key` header.
2. `DeviceApiKeyFilter` validates the header: SHA-256 hash of the key must match an active record in `api_key`.
3. `CheckinLogService.processRealTime()` saves the `CheckinLog`.
4. `CheckinProcessedEvent` is published.
5. After the checkin transaction commits: `AttendanceService.onCheckinProcessed()` fires.
   - `LogTypes.IN` → creates a new `Attendance` record for the day (idempotent — skips if one already exists).
   - `LogTypes.OUT` → closes the open `Attendance`, computes `workingHour`, `paidHour`, `lateHour`, `paidDay`, `violate`.
6. `AttendanceSchedule` runs at midnight to backfill any records missed by real-time processing.

**Business Rules:**
- BR-016: `logType` is per-device (IN or OUT). *(Unchanged)*
- BR-017: ~~Check-in endpoint unauthenticated~~ — **FIXED:** `X-Device-API-Key` header required. `DeviceApiKeyFilter` runs before `JwtAuthFilter`. Raw keys are never stored — only SHA-256 hashes.
- BR-018: Multiple IN/OUT logs per day handled by idempotent Attendance record (IN: skip if already exists; OUT: close the open record). *(Updated)*
- BR-019: ~~Work start hardcoded 08:30~~ — **FIXED:** `AttendanceService` reads `workStartTime` from `WORK_SCHEDULE` SystemConfig. Defaults to 08:30 if config is absent.
- BR-020: Batch upload (`POST /api/checkin-logs/batch`) supports partial success. *(Unchanged)*
- **BR-017a (new):** API keys are managed by SYSTEM_ADMIN or HR_ADMIN via `POST /api/devices/{deviceId}/api-key`. Generating a new key deactivates all previous keys for that device. The raw key is returned once and never stored.

---

### Process 7: Attendance Record Correction

**Actor(s):** HR_ADMIN, SYSTEM_ADMIN

**Business Rules:**
- BR-021: ~~Correction does not create an audit trail~~ — **PARTIALLY FIXED:** `AuditableEntity` now records `updatedBy` (the username of the HR user who made the correction) and `updatedAt`. The original check-in/out times are not preserved, but who made the last correction is captured.
- BR-022: Manual correction does not retroactively update already-calculated `Payroll` records. *(Still open — payroll must be recalculated manually.)*

**New constraint (Phase 1):** Attendance records for a closed period (`AttendancePeriodClose` record exists) cannot be modified. Corrections must be made before the period is closed, or the period must be reopened (currently requires direct database intervention — no UI for period reopening).

---

### Process 8: Leave Request Submission

**Actor(s):** Any authenticated employee

**v1.0 gaps resolved:** Leave type classification and balance enforcement are now implemented.

**Process Steps:**
1. Employee selects leave type (required), start date, end date, and reason.
2. System validates:
   - `leaveType` must be an employee-submittable type (cannot be `PUBLIC_HOLIDAY` or `COMPENSATORY`).
   - End date ≥ start date.
   - Sufficient leave balance for the requested type and year.
3. System **reserves** the requested days in `LeaveBalance.pendingDays` and reduces `remainingDays`.
4. System saves the request with status `TO_APPROVE`.
5. `LeaveRequestSubmittedEvent` is published → notification sent to employee's LEADER.

**Business Rules:**
- BR-023: ~~No leave balance or leave type~~ — **FIXED:** `LeaveType` enum is required on all requests. `LeaveBalance` entity tracks entitlementDays, pendingDays, usedDays, remainingDays, carryOverCap per employee per year per type.
- BR-024: Leave duration is calculated in calendar days from start to end. *(Duration stored in `durationHours` field.)*
- BR-025: ~~No overlap check~~ — **Still open.** Two leave requests for the same employee can cover the same dates. Balance check prevents quantity overdraft but not date overlap.
- BR-026: Employee may delete own request only while in `DRAFT` or `TO_APPROVE` status; pendingDays are released back to balance on deletion. *(Updated)*
- **BR-023a (new):** `PUBLIC_HOLIDAY` and `COMPENSATORY` leave types are system-generated only. Submitting them via the API returns HTTP 400.
- **BR-023b (new):** If `remainingDays < requestedDays`, the submission returns HTTP 400 with the current remaining balance in the message.
- **BR-023c (new):** Two concurrent submissions for the same employee cannot together exceed the balance — the `pendingDays` reservation prevents double-booking.

---

### Process 9: Leave Approval Workflow

**Actor(s):** LEADER → MANAGER → HR_ADMIN

**State machine (unchanged):**
```
TO_APPROVE → LEADER_APPROVED → MANAGER_APPROVED → APPROVED
                                                 ↘ REJECTED (any level)
```

**Business Rules:**
- BR-027: Each level can only act when the request is in the correct precursor status. *(Unchanged)*
- BR-028: Rejection at any level is final — request cannot be reopened. *(Unchanged)*
- BR-029: ~~No notification to approvers~~ — **FIXED:** `LeaveRequestSubmittedEvent` fires a notification to the employee's first-level approver (LEADER). Subsequent levels are not yet notified automatically (partial fix).
- BR-030: HR_ADMIN can approve at any level. *(Unchanged)*
- **BR-029a (new):** On final HR_ADMIN approval, `pendingDays` are moved to `usedDays` in `LeaveBalance`. On rejection, `pendingDays` are released back to `remainingDays`.

---

### Process 10: OT Request Submission

**Actor(s):** Any authenticated employee

**Process Steps (updated from v1.0):**
1. Employee submits OT request with `startTime`, `endTime`, and reason.
2. System validates OT hours do not exceed:
   - **Monthly limit:** 40 hours (2,400 minutes) — per Vietnamese Labour Code Art. 107.
   - **Annual limit:** 200 hours (12,000 minutes).
3. Limits are checked by querying `ot_monthly_summary` view (sum of approved OT minutes).
4. If limits would be exceeded, submission returns HTTP 400 with remaining capacity stated in fractional hours.

**Business Rules:**
- **BR-052 (new):** Monthly OT limit = 40 hours per Labour Code. System blocks submissions that would exceed this.
- **BR-053 (new):** Annual OT limit = 200 hours. System blocks submissions that would exceed this.
- **BR-054 (new):** All OT calculations are done in **minutes** to avoid silent truncation of fractional hours.
- **BR-055 (new):** Night supplement (×1.3) applies proportionally to the portion of OT that falls within 22:00–06:00. A 3-hour OT from 20:00–23:00 receives night rate only for the 60-minute overlap with the night window.

**Remaining gap:** OT is always employee-submitted (post-claim). There is no distinction between pre-authorisation ("I plan to work OT") and post-claim ("I worked OT and am claiming it"). Managers cannot create OT records on behalf of their team.

---

### Process 11: OT Approval Workflow

*(Architecturally identical to Process 9. Same state machine, same approver roles. No changes from v1.0.)*

---

### Process 12: Contract Creation / Update

**Actor(s):** HR_ADMIN

**v1.0 gaps resolved:** Contract dates are now `LocalDate`; contract history is preserved.

**Process Steps:**
1. HR creates a contract record linked to an employee.
2. HR enters: contract type, start/end dates (type `LocalDate`), position code, salary step, base salary, insurance base, dependent count, terms.
3. On **update**: the existing active contract is superseded (`effectiveTo = today`, `current = false`). A new record is inserted (`effectiveFrom = today`, `current = true`). No data is overwritten.
4. `ContractExpiryScheduler` runs daily at 08:00 and logs warnings + fires `ContractExpiringEvent` for contracts expiring within 30 days.

**Business Rules:**
- BR-031: ~~Only one active contract (1:1)~~ — **FIXED:** Contract history model: one-to-many, only the record with `current = true` is the active contract. Full history is queryable via `GET /api/contracts/employee/{id}/history`.
- BR-032: `positionCode` + `salaryStep` keys must match an active SALARY_GRADE config entry. *(Unchanged)*
- BR-033: Insurance base capped at 46,800,000 VND by the payroll engine. *(Unchanged)*
- BR-034: ~~Contract dates stored as String~~ — **FIXED:** `Contract.startDate` and `endDate` are `LocalDate` (Flyway V12 migration converted existing data).
- BR-035: ~~No size limit on binary attachment~~ — Binary attachment field removed in v2; contract documents should be stored externally.
- **BR-056 (new):** Payroll engine reads the contract with `effectiveFrom <= payrollPeriodStart` and `current = true`. If a contract was updated mid-month, the engine uses the contract that was effective at the start of the payroll period.
- **BR-057 (new):** `GET /api/contracts/expiring-soon?withinDays=30` returns contracts whose `endDate` is within the specified window (HR_ADMIN access).

---

### Process 13: Individual Payroll Calculation

**Actor(s): FINANCE_ADMIN** *(Changed from HR_ADMIN in v1.0)*

**Pre-conditions:**
- Attendance period has been closed by HR_ADMIN (Process 17 must complete first).
- Employee has an active contract with valid `positionCode`, `salaryStep`, `baseSalary`.
- Active `SystemConfig` records exist for all config types.

**Business Rules:**
- BR-036: One payroll record per employee per period (unique constraint). *(Unchanged)*
- BR-037: `DRAFT` payrolls can be deleted and recalculated. Once `PENDING_APPROVAL` or higher, they cannot be deleted. *(Updated from `APPROVED`.)*
- BR-038: Only `APPROVED` OT requests are included in payroll. *(Unchanged)*
- BR-039: All monetary values stored as `long` (VND, no decimal). *(Unchanged)*
- **BR-058 (new):** HR_ADMIN cannot call `POST /api/payrolls/calculate`. This endpoint requires `FINANCE_ADMIN` or `SYSTEM_ADMIN` authority. Attempting with an `HR_ADMIN` token returns HTTP 403.
- **BR-059 (new):** Period close guard: if no `AttendancePeriodClose` record exists for the requested year/month, calculation returns HTTP 400 with a message directing HR to close the period first.
- **BR-060 (new):** Employer-side contributions are computed and stored alongside employee deductions: `bhxhEmployer` (17%), `bhytEmployer` (3%), `bhtnEmployer` (1%), `workplaceAccidentInsurance` (0.5%), `totalEmployerContributions`, `totalEmploymentCost`.

---

### Process 14: Batch Payroll Processing

**Actor(s): FINANCE_ADMIN** *(Changed from HR_ADMIN in v1.0)*

**Business Rules:**
- BR-040: Batch uses auto-computed KPI scores and zero language allowance. *(Unchanged)*
- BR-041: ~~Job record stored in memory only~~ — **Still open.** `PayrollJobStore` remains a `ConcurrentHashMap`. Application restart during batch processing loses job state. Partially committed payrolls remain in the database with no status summary.
- BR-042: Standard working days (`Nt`) is the only batch-level parameter. *(Unchanged)*
- **BR-061 (new):** Batch calculation also requires the attendance period to be closed (same guard as single-employee calculation).

---

### Process 15: Payroll Approval and Payment Marking

**Major change from v1.0:** The payroll state machine now has five states and involves two separate roles.

**State Machine:**
```
DRAFT ──[FINANCE_ADMIN submits]──▶ PENDING_APPROVAL
                                        │
                    [DIRECTOR approves]──▶ APPROVED
                    [DIRECTOR rejects]───▶ REJECTED (with reason)
                                                │
                                    APPROVED ──[FINANCE_ADMIN marks-paid]──▶ PAID
```

**Business Rules:**
- BR-043: Only `DRAFT` payrolls can be deleted. *(Unchanged)*
- BR-044: ~~`APPROVED` payrolls locked~~ — **Updated:** `PENDING_APPROVAL` payrolls are locked for editing. Once submitted to the Director, Finance cannot recall and modify without the Director rejecting first.
- BR-045: `PAID` is the terminal state. *(Unchanged)*
- BR-046: No banking integration — "mark as paid" is a manual flag. *(Still open.)*
- BR-047: Employees can view their own payslip for `APPROVED` or `PAID` payrolls via `GET /api/payrolls/my/{year}/{month}/slip`. *(Updated — previously any status was visible.)*
- **BR-062 (new):** DIRECTOR is the only role that can approve or reject payroll (`PATCH /api/payrolls/{id}/approve` and `PATCH /api/payrolls/{id}/reject`). HR_ADMIN and FINANCE_ADMIN receive HTTP 403.
- **BR-063 (new):** DIRECTOR's reject action requires a `rejectionReason` (VARCHAR 500). The reason is stored on the `Payroll` record and returned to FINANCE_ADMIN via `PayrollApprovedEvent` notification.

---

### Process 16: System Configuration Management

**Actor(s): FINANCE_ADMIN** *(Changed from SYSTEM_ADMIN in v1.0)*

**Business Rules:**
- BR-048: Config history preserved — old versions deactivated, not deleted. *(Unchanged)*
- BR-049: Activation is immediate; existing DRAFT payrolls are not retroactively updated. *(Unchanged)*
- BR-050: ~~No JSON validation~~ — **Still open.** `configData` is free-form JSONB. A malformed config is not rejected at save time; it fails at payroll calculation time.
- BR-051: ~~Only SYSTEM_ADMIN can manage config~~ — **FIXED:** `FINANCE_ADMIN` can manage all payroll-related config types (`SALARY_GRADE`, `ALLOWANCE`, `PIT`, `INSURANCE`, `WORK_SCHEDULE`). `SYSTEM_ADMIN` retains access for technical reasons.

---

### Process 17: Attendance Period Close (New)

**Trigger:** End of each month; HR prepares attendance data for payroll.

**Actor(s):** HR_ADMIN

**Process Steps:**
1. HR calls `POST /api/attendances/close-period` with `{year, month}`.
2. System scans all active employees. For each working day in the period that has no `Attendance` record AND no approved leave record, it is classified as an **unexplained absence**.
3. If unexplained absences exist:
   - Response returns `closed = false` with a list of `{employeeId, employeeName, missingDates[]}`.
   - HR must resolve these (correct attendance, add approved leave, or force-close).
4. If `forceClose = true` is passed, unexplained absences are treated as unpaid leave and the period is closed immediately.
5. On close: an `AttendancePeriodClose` record is created with `{closeYear, closeMonth, closedBy, closedAt}`.
6. Payroll calculation for this period is now unblocked.

**Business Rules:**
- **BR-064 (new):** Each period (year + month combination) can only be closed once. The `attendance_period_close` table has a unique constraint on `(close_year, close_month)`.
- **BR-065 (new):** There is no period reopening mechanism in the UI. A closed period can only be reopened via direct database intervention.
- **BR-066 (new):** Public holidays are excluded from the working-day scan (an employee absent on a public holiday is not flagged as an unexplained absence).

---

### Process 18: Leave Balance Management (New)

**Actor(s):** HR_ADMIN (management), EMPLOYEE (self-service view)

**Process Steps:**
1. At the start of each year (or on employee creation), HR initialises leave balances via `POST /api/leaves/balances/initialise`.
2. The system creates `LeaveBalance` records for each active employee, each leave type, with an `entitlementDays` value appropriate to their role/level.
3. As leave requests are submitted, approved, and rejected, balances update automatically (two-stage deduction — see Process 8).
4. Employees view their own balance via `GET /api/leaves/balances/my`.
5. HR views any employee's balance via `GET /api/leaves/balances/{employeeId}`.

**Business Rules:**
- **BR-067 (new):** `LeaveBalance` has a unique constraint on `(employee_id, leave_year, leave_type)`.
- **BR-068 (new):** `carryOverCap` is stored per balance record but no annual rollover job exists yet. Carryover must be applied manually or remains unprocessed.

---

### Process 19: Labour Cost Reporting (New)

**Actor(s):** FINANCE_ADMIN, DIRECTOR

**Endpoint:** `GET /api/payrolls/reports/labour-cost?year=&month=&deptId=`

**Output:** Per-department and per-employee breakdown of `totalGross`, `netSalary`, `totalEmployeeInsurance`, `totalEmployerInsurance`, `totalPit`, `totalOtPay`, `totalEmploymentCost`, and `headcount`. This is the digital equivalent of the payroll register that Accounting formerly produced on a spreadsheet.

---

### Process 20: Insurance Remittance Summary (New)

**Actor(s):** FINANCE_ADMIN

**Endpoint:** `GET /api/payrolls/reports/insurance-remittance?year=&month=`

**Output:** Per-employee social insurance code, capped insurance base salary, and all BHXH/BHYT/BHTN contribution amounts (both employee and employer portions). Used to prepare monthly remittance filings to the Social Insurance Fund.

---

### Process 21: PIT Summary Reporting (New)

**Actor(s):** FINANCE_ADMIN

**Endpoint:** `GET /api/payrolls/reports/pit-summary?year=&month=`

**Output:** Per-employee tax code, dependent count, `taxableIncome`, and `pit` for the month. Used for monthly provisional PIT remittance to the Tax Authority.

---

### Process 22: Employee Payslip Self-Service (New)

**Actor(s):** EMPLOYEE (own payslip only)

**Endpoint:** `GET /api/payrolls/my/{year}/{month}/slip`

**Business Rules:**
- **BR-069 (new):** An EMPLOYEE caller may only retrieve their own payslip. The endpoint resolves the caller's employee record from the authenticated JWT username; there is no `employeeId` parameter.
- **BR-070 (new):** Returns HTTP 404 if no payroll in `APPROVED` or `PAID` status exists for the requested period.
- **BR-071 (new):** Response includes all deduction line items (BHXH, BHYT, BHTN, PIT), employer contributions, net salary, and the bank account on record.
- **Remaining gap:** No PDF or printable export — response is JSON only.

---

## 4. Cross-Process Data Dependencies

```
Process 1 (Employee Registration)
    └──▶ EmployeeInfo + UserAccount + TaxDependent (optional)

Process 5 (Department Management)
    └──▶ Department (referenced by EmployeeInfo)

Process 12 (Contract Management)
    └──▶ Contract (history model: effective from/to)
          ├── positionCode + salaryStep ──▶ SALARY_GRADE config lookup (Li)
          ├── baseSalary (Lhq)           ──▶ Payroll gross formula
          ├── insuranceBase (LCB)        ──▶ Insurance deductions (capped)
          └── dependentCount             ──▶ PIT relief calculation

Process 6 (Check-in / Check-out)  [now automated]
    └──▶ CheckinLog ──[event]──▶ Attendance
               ├── NCtt count           ──▶ Payroll attendance factor
               ├── violate flag         ──▶ KPI auto-scoring
               └── paidDay values       ──▶ Payroll NCtt

Process 17 (Period Close)  [new gate]
    └──▶ AttendancePeriodClose ──▶ Guards payroll calculation

Processes 8–11 (Leave & OT Workflows)
    └──▶ Approved OTRequest ──▶ Payroll OT pay
    └──▶ LeaveBalance ──▶ Block excess leave submissions

Process 16 (System Config)
    └──▶ Active SystemConfig records
               ├── SALARY_GRADE   ──▶ Li coefficient
               ├── ALLOWANCE      ──▶ HT1/HT2 allowances
               ├── PIT            ──▶ 7-bracket tax schedule + reliefs
               ├── INSURANCE      ──▶ BHXH/BHYT/BHTN rates + ceiling
               └── WORK_SCHEDULE  ──▶ Attendance start time + hours/day

All above ──▶ Process 13/14 (Payroll Calculation — FINANCE_ADMIN)
                    └──▶ Process 15 (Submit → Director approval → Mark paid)
                              └──▶ Process 19/20/21 (Financial reports)
                              └──▶ Process 22 (Employee payslip)
```

---

## 5. Unresolved Business Rules (Open Gaps)

| Rule | Description | Severity |
|------|-------------|----------|
| BR-022 | Manual attendance correction does not update already-calculated payroll | LOW |
| BR-025 | No overlapping leave request check | LOW |
| BR-041 | PayrollJobStore in memory; batch state lost on restart | MEDIUM |
| BR-046 | No banking integration; payment marking is manual | LOW |
| BR-050 | No JSON schema validation for SystemConfig configData | MEDIUM |
| BR-065 | No period-reopen mechanism | LOW |
| BR-068 | No annual leave rollover job | LOW |
| — | No OT pre-authorisation vs post-claim distinction | LOW |
| — | No payslip PDF or CSV export | LOW |
| — | Annual PIT settlement (Form 05-1/BK-TNCN) not generated | MEDIUM |

---

## 6. Frontend Page-to-Process Mapping

| Frontend Page | Backend Process(es) | Role(s) |
|---------------|---------------------|---------|
| `employees/dashboard` | Summary analytics | All |
| `employees/attendance` | Process 6 (view own) | All |
| `employees/leave` | Process 8 (submit/view), Process 18 (view balance) | All |
| `employees/ot` | Process 10 (submit/view) | All |
| `employees/payslip` | Process 22 | All |
| `employees/me` | Process 2 (view profile) | All |
| `managers/request` | Process 9, 11 (approve) | LEADER, MANAGER |
| `managers/department` | Process 5 (view) | LEADER, MANAGER |
| `hr/employee` | Process 1, 2, 3 | HR_ADMIN |
| `hr/contract` | Process 12 | HR_ADMIN |
| `hr/leave` | Process 9, 18 (balance view) | HR_ADMIN |
| `hr/attendance` | Process 7, 17 (period close) | HR_ADMIN |
| `finance/payroll` | Process 13, 14, 15 | FINANCE_ADMIN |
| `finance/config` | Process 16 | FINANCE_ADMIN |
| `finance/reports` | Process 19, 20, 21 | FINANCE_ADMIN |
| `director/payroll-approval` | Process 15 (approve/reject) | DIRECTOR |
| `director/reports` | Process 19 (view cost) | DIRECTOR |
| `system/config` | Process 16 (technical configs) | SYSTEM_ADMIN |

---

*End of Document 2 — Version 2.0*
