# FaceZ HRMS — Business Process Alignment Review
### Assessment of Organisational Role Correctness and Process Ownership
**Version:** 2.0 | **Date:** 2026-05-21 | **Analyst:** Claude Code
**Supersedes:** v1.0 (2026-04-10)

> **v2.0 scope:** The most critical finding of v1.0 — that `HR_ADMIN` absorbed Accounting and Director responsibilities, destroying separation of duties — has been addressed by the introduction of `FINANCE_ADMIN` and `DIRECTOR` roles. This document re-assesses each domain against the corrected role model.

---

## 1. Purpose and Approach

This document reviews FaceZ from a **business process ownership** perspective: not whether the software works technically, but whether it correctly maps to how a company is organised. The central question is whether each process is owned by the organisational function that is accountable for it in the real world.

The v1.0 analysis identified a serious internal control failure: a single `HR_ADMIN` user could create employees, edit attendance, calculate payroll, and approve payment — bypassing all separation-of-duties controls. This has been corrected.

---

## 2. Organisational Functions and Their Roles in the System

### 2.1 Human Resources (HR) Department → `HR_ADMIN`

Responsible for:
- Recruiting, onboarding, and offboarding employees.
- Maintaining employee records (personal data, employment history, contract terms).
- Managing leave entitlements and enforcing leave policy.
- Gathering attendance inputs for payroll (via attendance period close).
- Submitting the payroll input package to Finance.

HR does **not** calculate salaries, manage tax brackets, or authorise disbursement. These boundaries are now enforced by the system.

### 2.2 Accounting / Finance Department → `FINANCE_ADMIN`

Responsible for:
- Calculating gross and net salaries from HR-provided attendance data.
- Computing statutory deductions (BHXH, BHYT, BHTN, PIT).
- Managing payroll configuration (tax brackets, salary grades, insurance rates).
- Submitting the payroll register for Director authorisation.
- Executing payment after Director approval (marking as paid).
- Generating insurance remittance and PIT summary reports.

Finance does **not** approve or modify attendance records, leave requests, or employment contracts.

### 2.3 Company Director / Finance Director → `DIRECTOR`

Responsible for:
- Final authorisation of monthly payroll before disbursement.
- Reviewing total labour cost reports.
- Approving or rejecting submitted payrolls with documented reasons.

### 2.4 System Administrator → `SYSTEM_ADMIN`

Responsible for:
- Infrastructure-level settings.
- User account management and device API key provisioning.
- Actuator and operational monitoring access.
- Can perform HR_ADMIN and FINANCE_ADMIN actions in exceptional circumstances.

### 2.5 Management → `MANAGER`, `LEADER`

Responsible for:
- Approving leave and OT requests at their assigned level.
- KPI assessment input for direct reports (influences payroll gross calculation).

---

## 3. Role Architecture: v1.0 vs v2.0

### 3.1 v1.0 Problem Statement (Reproduced for Reference)

The v1.0 `HR_ADMIN` role combined the responsibilities of three distinct organisational functions:

| Task in v1.0 HR_ADMIN | Actual owning function |
|----------------------|------------------------|
| Employee profile management | HR ✓ correct |
| Leave and OT final approval | HR ✓ correct |
| Contract creation | HR ✓ correct |
| **Payroll calculation** | **Accounting** ✗ |
| **Payroll approval (disbursement)** | **Finance Director** ✗ |
| **System config (tax brackets, salary grades)** | **Accounting** ✗ |

This was identified as a **separation of duties failure** — the same user who records attendance can calculate and approve the resulting salary payment. This is the type of internal control failure that enables payroll fraud.

### 3.2 v2.0 Corrected Role Architecture

```
SYSTEM_ADMIN
  └── Technical: infrastructure config, user management, device API keys

DIRECTOR
  └── Final payroll authorisation (approve/reject PENDING_APPROVAL → APPROVED/REJECTED)
  └── Labour cost report review

FINANCE_ADMIN
  └── Payroll calculation (DRAFT)
  └── Payroll submission for Director approval (DRAFT → PENDING_APPROVAL)
  └── Mark payroll as paid (APPROVED → PAID)
  └── System configuration management (SALARY_GRADE, ALLOWANCE, PIT, INSURANCE)
  └── Financial reports (labour cost, insurance remittance, PIT summary)

HR_ADMIN
  └── Employee lifecycle (onboarding, update, offboarding)
  └── Contract management (employment terms, date ranges)
  └── Leave and OT final approval
  └── Attendance oversight and correction
  └── Attendance period close (prerequisite for payroll)

MANAGER / LEADER
  └── Leave and OT approval (second / first level)

EMPLOYEE
  └── View own data, submit requests, view payslip
```

### 3.3 Payroll Workflow — Correct Separation

The corrected payroll workflow now mirrors the paper-based process:

```
HR_ADMIN: closes attendance period
  → AttendancePeriodClose record created
  → This is the "signed attendance sheet handed to Accounting"

FINANCE_ADMIN: calculates payroll
  → Reads closed attendance data, runs PayrollCalculationEngine
  → Reviews the DRAFT payroll register
  → Submits for Director authorisation (PENDING_APPROVAL)
  → This is "Accounting submits the payroll register for sign-off"

DIRECTOR: authorises payment
  → Reviews total labour cost
  → Approves (→ APPROVED) or rejects with reason (→ REJECTED)
  → This is "Director signs the payroll register / bank transfer order"

FINANCE_ADMIN: marks as paid
  → Confirms payment execution
  → This is "Accounting files the payment record"
```

---

## 4. Domain-by-Domain Business Process Assessment

---

### 4.1 Employee Management

**Business owner:** Human Resources → `HR_ADMIN` ✓ Correct

**Updated assessment:** HR_ADMIN correctly owns employee management. Statutory data fields required for compliance are now captured:

| Field | Status in v2.0 |
|-------|----------------|
| National ID (CCCD/CMND) | ✅ Added (unique) |
| Tax registration number (MST cá nhân) | ✅ Added (unique) |
| Social insurance number (Sổ BHXH) | ✅ Added (unique) |
| Bank account number | ✅ Added |
| Date of birth, gender, hometown | ✅ Added |
| Tax dependent detail (Form 02/CK-TNCN) | ✅ `TaxDependent` entity with relationship, active flag |
| Employment contract signed status | Still absent |
| Probation period tracking | Still absent |

**Remaining gap:** The system does not track whether the employment contract has been physically signed and acknowledged by the employee. Probation period, probation salary, and probation outcome are not recorded.

---

### 4.2 Department and Organisation Structure

**Business owner:** Human Resources / Management → `HR_ADMIN` ✓ Correct

**Updated assessment:**
- ✅ Department list is no longer publicly accessible (requires authentication).
- Department endpoints still support only a flat list (no hierarchy).
- The "manager" of a department is a single FK — no concept of acting manager, deputy, or historical manager assignment.
- No formal approval process for organisational changes.

---

### 4.3 Attendance Management

**Business owner:** Human Resources (tracking) + Finance (payroll input)

**v1.0 finding:** Check-in → Attendance pipeline not automated.
**v2.0 status:** ✅ Resolved. Automated via Spring Events. Period close gate ensures Finance cannot calculate on incomplete data.

**Updated assessment — remaining issues:**

| Issue | Status |
|-------|--------|
| Check-in → Attendance automated | ✅ Resolved |
| Work start time configurable | ✅ Resolved (WORK_SCHEDULE config) |
| Public holiday calendar managed | ✅ Resolved |
| Absence classification (leave vs. unauthorised) | ✅ Resolved (period close reconciliation) |
| No shift management | Still absent |
| No monthly attendance sign-off (HR sign) | Period close partially addresses this |
| Period reopen mechanism | Still absent (requires direct DB) |

---

### 4.4 Leave Management

**Business owner:** Human Resources (policy, records) + Management (approval)

**v1.0 finding:** No leave type classification; no leave balance tracking.
**v2.0 status:** ✅ Both resolved.

**Updated assessment:**

| Issue | Status |
|-------|--------|
| Leave type classification | ✅ LeaveType enum — all Labour Code categories |
| Leave balance tracking | ✅ Two-stage deduction (pending → used) |
| Notification to first approver | ✅ LeaveRequestSubmittedEvent → LEADER notification |
| Overlapping leave request check | Still absent |
| Annual leave rollover | Still absent |
| BHXH sick leave reimbursement claim workflow | Not implemented |

---

### 4.5 Overtime Management

**Business owner:** Management (approval) + HR (records) + Finance (pay calculation)

**v1.0 finding:** No OT limit enforcement; night rate not proportional.
**v2.0 status:** Both resolved.

**Updated assessment:**

| Issue | Status |
|-------|--------|
| OT monthly limit (40h) enforcement | ✅ HTTP 400 with remaining capacity |
| OT annual limit (200h) enforcement | ✅ Checked via ot_monthly_summary view |
| Night rate proportional to actual overlap | ✅ Minute-by-minute calculation |
| OT on public holiday ×3.0 | ✅ |
| Pre-authorisation vs. post-claim distinction | Still absent |
| Manager-initiated OT for their team | Still absent |

---

### 4.6 Payroll Calculation

**Business owner: Finance / Accounting → `FINANCE_ADMIN`** ✅ Now correct

**v1.0 finding:** HR_ADMIN performed payroll calculation — a critical process ownership misalignment.
**v2.0 status:** ✅ Resolved. `POST /api/payrolls/calculate` and `/batch-calculate` now require `FINANCE_ADMIN` authority. `HR_ADMIN` receives HTTP 403.

**Updated assessment:**

| Issue | Status |
|-------|--------|
| Payroll calculation by Finance (not HR) | ✅ FINANCE_ADMIN only |
| Period close gate before calculation | ✅ BadRequestException if not closed |
| Employer-side contributions computed | ✅ BHXH 17%, BHYT 3%, BHTN 1%, accident 0.5% |
| OT night supplement proportional | ✅ |
| PIT 7-bracket progressive from SystemConfig | ✅ |
| Total employment cost visible to Finance | ✅ totalEmploymentCost field |
| Bank transfer file generation | Still absent |
| General Ledger journal entries | Still absent (out of scope for v1) |
| Annual PIT settlement (Form 05-1/BK-TNCN) | Still absent |

**Remaining gap — process handoff documentation:** The system does not produce a formal "payroll input package" document that HR hands to Finance. The period close record is the implicit handoff, but there is no document or audit-stamped summary that captures what HR certified before Finance began calculations.

---

### 4.7 Contract Management

**Business owner:** Human Resources (employment terms) + Finance (compensation terms)

**v1.0 finding:** No contract history; dates stored as strings.
**v2.0 status:** Both resolved.

**Updated assessment:**

| Issue | Status |
|-------|--------|
| Contract history preserved | ✅ effectiveFrom/effectiveTo/current model |
| Contract dates as LocalDate | ✅ V12 migration |
| Contract expiry alerts | ✅ Daily cron + ContractExpiringEvent notification |
| Expiring contracts API | ✅ GET /api/contracts/expiring-soon |
| One active contract per employee enforced | ✅ current=true constraint |
| Contract type enforcement (fixed-term limits) | Still absent |
| Probation period tracking | Still absent |
| Digital signature or acknowledgement | Still absent |

**Salary-related contract fields (baseSalary, insuranceBase, positionCode, salaryStep):** These are set by HR_ADMIN. In practice, these values represent compensation decisions that belong to Finance. The current design allows HR to set salary amounts without Finance sign-off. This is a lower-severity misalignment than payroll calculation ownership, but represents an incomplete control.

---

### 4.8 Payroll Approval

**Business owner: Finance Director / Company Director → `DIRECTOR`** ✅ Now correct

**v1.0 finding:** HR_ADMIN approved payroll — a financial authorisation performed by the wrong function.
**v2.0 status:** ✅ Resolved. DIRECTOR role owns `PATCH /api/payrolls/{id}/approve` and `PATCH /api/payrolls/{id}/reject`. HR_ADMIN and FINANCE_ADMIN receive HTTP 403.

The new `REJECTED` state with mandatory `rejectionReason` enables Finance to understand why a payroll was sent back, which mirrors the paper process where the Director writes comments on the returned register.

---

### 4.9 System Configuration

**Business owner:** Finance / Accounting (content) + IT (technical deployment) → `FINANCE_ADMIN` ✅ Now correct

**v1.0 finding:** Only SYSTEM_ADMIN could manage tax brackets and salary grades — a technical role making accounting decisions.
**v2.0 status:** ✅ Resolved. FINANCE_ADMIN can create, update, and activate all payroll-related SystemConfig records. SYSTEM_ADMIN retains access for technical reasons.

---

## 5. Summary of Process Ownership Alignments (Updated)

| Process | v1.0 Assignment | v2.0 Assignment | v1.0 Severity | v2.0 Status |
|---------|----------------|-----------------|:-------------:|:-----------:|
| Employee management | HR_ADMIN | HR_ADMIN | Correct | ✅ Correct |
| Leave approval (final) | HR_ADMIN | HR_ADMIN | Correct | ✅ Correct |
| OT approval (final) | HR_ADMIN | HR_ADMIN | Correct | ✅ Correct |
| Contract (employment terms) | HR_ADMIN | HR_ADMIN | Correct | ✅ Correct |
| Contract (salary terms) | HR_ADMIN | HR_ADMIN | Medium | ⚠️ Partial |
| **Payroll calculation** | HR_ADMIN | **FINANCE_ADMIN** | **Critical** | ✅ Fixed |
| **Payroll approval** | HR_ADMIN | **DIRECTOR** | **Critical** | ✅ Fixed |
| **Salary/tax configuration** | SYSTEM_ADMIN | **FINANCE_ADMIN** | High | ✅ Fixed |
| Employer insurance costs | Not implemented | FINANCE_ADMIN | Critical gap | ✅ Fixed |
| Leave balance management | Not implemented | HR_ADMIN | High gap | ✅ Fixed |
| Labour cost reporting | Not implemented | FINANCE_ADMIN | High gap | ✅ Fixed |
| Insurance remittance | Not implemented | FINANCE_ADMIN | High gap | ✅ Fixed |
| PIT annual settlement | Not implemented | Not implemented | High gap | ⚠️ Still open |
| Bank transfer file | Not implemented | Not implemented | Medium gap | ⚠️ Still open |

---

## 6. Remaining Misalignments

### 6.1 Contract Salary Terms Set by HR (Low-Medium)

`Contract.baseSalary`, `insuranceBase`, `positionCode`, and `salaryStep` are entered by HR_ADMIN. In a company with a formal compensation policy, these values are determined by Finance according to the approved salary table. The current design allows HR to set salary values without Finance review.

**Mitigation:** The `SALARY_GRADE` SystemConfig table is maintained by Finance and contains the authorised salary ranges per position code. HR cannot enter a salary that is out-of-range without Finance noticing at payroll calculation time (the engine would produce an anomalous figure). A future improvement would add Finance approval of salary-related contract changes.

### 6.2 No Bank Transfer File Generation

After a payroll is marked as paid, Finance must manually generate a bank transfer file in the format required by their bank. The system does not produce this file. Finance continues to perform this step outside the system.

**Impact:** The system's record of "PAID" does not mean the bank transfer has occurred — only that Finance has committed to paying. There is no automated link between the system record and actual payment.

### 6.3 Annual PIT Settlement Not Generated

Vietnamese PIT law requires an annual final settlement (Form 05-1/BK-TNCN) to be filed with the Tax Authority. Monthly payroll records the provisional PIT deducted, but no annual aggregation or settlement report is produced. Finance must compile this externally.

### 6.4 No Compensation Policy Guard on Salary Entry

HR can set any `baseSalary` value in a contract without any system-enforced check against the approved salary range for the employee's position code. A cross-check against SALARY_GRADE config at contract save time would prevent HR from entering values outside the approved band.

---

## 7. Conclusion

The introduction of `FINANCE_ADMIN` and `DIRECTOR` roles is the most significant improvement since v1.0. The three-actor payroll workflow (HR closes → Finance calculates → Director approves) correctly replicates the separation of duties that paper-based processes enforced through physical signatures. The previous critical misalignment — a single HR_ADMIN controlling the entire payroll lifecycle — has been resolved.

The remaining business process gaps are lower severity:
- Bank transfer file generation and annual PIT settlement remain outside the system's scope.
- Contract salary terms are still set by HR rather than Finance (medium misalignment, low fraud risk given the salary grade config system).
- No auto-notification for second and third approval levels in leave workflows.

For a company deploying this system, the most important procedural control to document is the period close process — the HR manager must understand that closing the period is the formal handoff to Finance, equivalent to signing the paper attendance sheet.

---

*End of Document 4 — Version 2.0*
