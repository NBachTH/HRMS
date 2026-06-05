# Phase 1 & 2 — Detailed Implementation Guide

**Project:** FaceZ HRMS | **Backend:** `facez/` | **Frontend:** `facez-front/`
**Estimated time:** Phase 1: Weeks 4–7 | Phase 2: Week 8
**Prerequisite:** Phase 0 complete (Flyway running, `AuditableEntity` applied)

---

## Current State Assessment

| Item | Status | Notes |
|---|---|---|
| `Role` enum has `FINANCE_ADMIN`, `DIRECTOR` | ✅ Done | [Role.java](../facez/src/main/java/org/dummy/facez/common/enums/Role.java) |
| `PayrollStatus` has `PENDING_APPROVAL`, `REJECTED` | ✅ Done | [PayrollStatus.java](../facez/src/main/java/org/dummy/facez/common/enums/PayrollStatus.java) |
| `SecurityConfig` uses new role split for payroll | ❌ Missing | Still `HR_ADMIN` on all payroll endpoints |
| `PayrollService.approve()` guards on `PENDING_APPROVAL` | ❌ Missing | Still checks `DRAFT` |
| `PayrollService.submitForApproval()` / `reject()` | ❌ Missing | Methods don't exist yet |
| `PayrollController` has submit/reject endpoints | ❌ Missing | Still old `HR_ADMIN` guards |
| `payroll` table has `rejection_reason` column | ❌ Missing | Migration V4 needed |
| `AttendancePeriodClose` entity | ❌ Missing | Entity + migration V5 needed |
| `PayrollService.calculate()` checks period closure | ❌ Missing | No guard exists |
| `EmployeeInfo` has statutory fields | ❌ Missing | Migration V6 needed |
| `Gender` enum | ❌ Missing | New enum needed |
| `TaxDependent` entity | ❌ Missing | Migration V7 needed |

---

# Phase 1 — Role Architecture Redesign

## 1.1 Flyway Documentation Migration `[DB]`

The `Role` and `PayrollStatus` enums are already correct in Java. Write migration files to document the schema state — they contain no DDL, just comments. Flyway needs the version entries so future migrations have correct predecessor numbers.

**File (new):** `facez/src/main/resources/db/migration/V3__add_roles.sql`

```sql
-- V3: FINANCE_ADMIN and DIRECTOR roles added to Role enum (Java-side only).
-- role column is VARCHAR — new enum values are valid as soon as they appear in Java.
-- No column changes required.

-- Verify the column still allows string values:
-- SELECT DISTINCT role FROM user_account;
-- SELECT DISTINCT role FROM employee_info;
```

**File (new):** `facez/src/main/resources/db/migration/V4__payroll_status_update.sql`

```sql
-- V4: Add rejection_reason column and document new PayrollStatus values
-- (PENDING_APPROVAL, REJECTED) added to the Java enum.

ALTER TABLE payroll
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

-- Existing DRAFT/APPROVED/PAID rows are unaffected.
-- Status values are stored as VARCHAR — no column type migration needed.
```

---

## 1.2 Add `rejectionReason` Field to `Payroll` Entity `[BE]`

**File:** [facez/src/main/java/org/dummy/facez/domain/payroll/model/Payroll.java](../facez/src/main/java/org/dummy/facez/domain/payroll/model/Payroll.java)

Add one field in the `// ── Metadata ─────────────────────────────────────────────────────────────` section (after `notes`):

```java
@Column(length = 500)
private String rejectionReason;   // populated by DIRECTOR on reject()
```

Add it to `PayrollResponse` as well:

**File:** [facez/src/main/java/org/dummy/facez/domain/payroll/dto/PayrollResponse.java](../facez/src/main/java/org/dummy/facez/domain/payroll/dto/PayrollResponse.java)

```java
private String rejectionReason;
```

In `PayrollService.toResponse()`, add the mapping:
```java
.rejectionReason(p.getRejectionReason())
```

---

## 1.3 Add Three New Workflow Methods to `PayrollService` `[BE]`

**File:** [facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollService.java](../facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollService.java)

The current `approve()` method uses the wrong guard (`DRAFT` instead of `PENDING_APPROVAL`). Replace the two existing workflow methods and add `submitForApproval` and `reject`:

```java
// ── Workflow transitions ──────────────────────────────────────────────────

/**
 * FINANCE_ADMIN: submits a calculated payroll for Director authorisation.
 * Transition: DRAFT → PENDING_APPROVAL
 */
@Transactional
public PayrollResponse submitForApproval(String id) {
    Payroll payroll = findById(id);
    if (payroll.getStatus() != PayrollStatus.DRAFT) {
        throw new BadRequestException(
            "Only DRAFT payrolls can be submitted. Current status: " + payroll.getStatus());
    }
    payroll.setStatus(PayrollStatus.PENDING_APPROVAL);
    payrollRepository.save(payroll);
    return toResponse(payroll);
}

/**
 * DIRECTOR: authorises disbursement.
 * Transition: PENDING_APPROVAL → APPROVED
 */
@Transactional
public PayrollResponse approve(String id) {
    Payroll payroll = findById(id);
    if (payroll.getStatus() != PayrollStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
            "Only PENDING_APPROVAL payrolls can be approved. Current status: " + payroll.getStatus());
    }
    payroll.setStatus(PayrollStatus.APPROVED);
    payroll.setRejectionReason(null);
    payrollRepository.save(payroll);
    return toResponse(payroll);
}

/**
 * DIRECTOR: sends back to Finance for correction.
 * Transition: PENDING_APPROVAL → REJECTED
 */
@Transactional
public PayrollResponse reject(String id, String reason) {
    Payroll payroll = findById(id);
    if (payroll.getStatus() != PayrollStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
            "Only PENDING_APPROVAL payrolls can be rejected. Current status: " + payroll.getStatus());
    }
    payroll.setStatus(PayrollStatus.REJECTED);
    payroll.setRejectionReason(reason);
    payrollRepository.save(payroll);
    return toResponse(payroll);
}

/**
 * FINANCE_ADMIN: executes payment after Director approval.
 * Transition: APPROVED → PAID
 */
@Transactional
public PayrollResponse markPaid(String id) {
    Payroll payroll = findById(id);
    if (payroll.getStatus() != PayrollStatus.APPROVED) {
        throw new BadRequestException(
            "Only APPROVED payrolls can be marked as paid. Current status: " + payroll.getStatus());
    }
    payroll.setStatus(PayrollStatus.PAID);
    payrollRepository.save(payroll);
    return toResponse(payroll);
}
```

Create a simple DTO for the reject request body:

**File (new):** `facez/src/main/java/org/dummy/facez/domain/payroll/dto/PayrollRejectRequest.java`

```java
package org.dummy.facez.domain.payroll.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PayrollRejectRequest {
    @NotBlank(message = "Rejection reason is required")
    private String reason;
}
```

---

## 1.4 Update `PayrollController` — New Endpoints and Role Guards `[BE]`

**File:** [facez/src/main/java/org/dummy/facez/domain/payroll/controller/PayrollController.java](../facez/src/main/java/org/dummy/facez/domain/payroll/controller/PayrollController.java)

**Changes required:**

1. **`/calculate` and `/batch-calculate`** — change `HR_ADMIN` to `FINANCE_ADMIN`
2. **`/jobs/{jobId}`** — change `HR_ADMIN` to `FINANCE_ADMIN`
3. **`GET /` and `GET /period`** — change `HR_ADMIN` to `FINANCE_ADMIN, DIRECTOR`
4. **`GET /employee/{employeeId}`** — add `FINANCE_ADMIN`
5. **`GET /{id}`** — add `FINANCE_ADMIN, DIRECTOR`
6. **Existing `/approve`** — change to `DIRECTOR` only
7. **Existing `/mark-paid`** — change to `FINANCE_ADMIN` only
8. **`DELETE /{id}`** — change to `FINANCE_ADMIN`
9. **Add three new endpoints** for `submit`, `approve` (Director), `reject`

Updated `PayrollController` (full replacement of workflow-related methods):

```java
// ── Calculate (FINANCE_ADMIN) ─────────────────────────────────────────────

@PostMapping("/calculate")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollResponse>> calculate(
        @Valid @RequestBody PayrollCalculateRequest req) {
    return ResponseEntity.ok(ApiResponse.ok(
        payrollService.calculate(req), "Payroll calculated and saved as DRAFT"));
}

@PostMapping("/batch-calculate")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollJobResponse>> batchCalculate(
        @Valid @RequestBody PayrollBatchRequest req) {
    int nt = req.getStandardWorkingDays() != null
            ? req.getStandardWorkingDays()
            : PayrollConfigService.DEFAULT_STANDARD_DAYS;
    String jobId = batchService.triggerBatch(req.getPayrollYear(), req.getPayrollMonth(), nt);
    batchService.runBatch(jobId, req.getPayrollYear(), req.getPayrollMonth(), nt);
    PayrollJobRecord record = jobStore.get(jobId).orElseThrow();
    return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(ApiResponse.ok(PayrollJobResponse.from(record),
                "Batch job submitted. Poll /api/payrolls/jobs/" + jobId));
}

@GetMapping("/jobs/{jobId}")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollJobResponse>> getJobStatus(@PathVariable String jobId) {
    PayrollJobRecord record = jobStore.get(jobId)
            .orElseThrow(() -> new ResourceNotFoundException("PayrollJob", "jobId", jobId));
    return ResponseEntity.ok(ApiResponse.ok(PayrollJobResponse.from(record)));
}

// ── Read (FINANCE_ADMIN + DIRECTOR) ──────────────────────────────────────

@GetMapping
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getAll(
        @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
    return ResponseEntity.ok(ApiResponse.ok(payrollService.getAll(pageable)));
}

@GetMapping("/period")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getByPeriod(
        @RequestParam int year, @RequestParam int month,
        @PageableDefault(size = 20) Pageable pageable) {
    return ResponseEntity.ok(ApiResponse.ok(payrollService.getByPeriod(year, month, pageable)));
}

@GetMapping("/employee/{employeeId}")
@PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getByEmployee(
        @PathVariable String employeeId,
        @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
    return ResponseEntity.ok(ApiResponse.ok(payrollService.getByEmployee(employeeId, pageable)));
}

@GetMapping("/my")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<ApiResponse<PageResponse<PayrollResponse>>> getMy(
        Authentication authentication,
        @PageableDefault(size = 20, sort = "payrollYear", direction = Sort.Direction.DESC) Pageable pageable) {
    String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
    String employeeId = employeeService.getEmployeeIdByUsername(username);
    return ResponseEntity.ok(ApiResponse.ok(payrollService.getByEmployee(employeeId, pageable)));
}

@GetMapping("/{id}")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollResponse>> getById(@PathVariable String id) {
    return ResponseEntity.ok(ApiResponse.ok(payrollService.getById(id)));
}

// ── Workflow transitions ──────────────────────────────────────────────────

/** FINANCE_ADMIN: DRAFT → PENDING_APPROVAL */
@PatchMapping("/{id}/submit")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollResponse>> submit(@PathVariable String id) {
    return ResponseEntity.ok(ApiResponse.ok(
        payrollService.submitForApproval(id), "Payroll submitted for Director approval"));
}

/** DIRECTOR: PENDING_APPROVAL → APPROVED */
@PatchMapping("/{id}/approve")
@PreAuthorize("hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollResponse>> approve(@PathVariable String id) {
    return ResponseEntity.ok(ApiResponse.ok(payrollService.approve(id), "Payroll approved"));
}

/** DIRECTOR: PENDING_APPROVAL → REJECTED */
@PatchMapping("/{id}/reject")
@PreAuthorize("hasAuthority('DIRECTOR') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollResponse>> reject(
        @PathVariable String id,
        @Valid @RequestBody PayrollRejectRequest req) {
    return ResponseEntity.ok(ApiResponse.ok(
        payrollService.reject(id, req.getReason()), "Payroll rejected"));
}

/** FINANCE_ADMIN: APPROVED → PAID */
@PatchMapping("/{id}/mark-paid")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<PayrollResponse>> markPaid(@PathVariable String id) {
    return ResponseEntity.ok(ApiResponse.ok(payrollService.markPaid(id), "Payroll marked as paid"));
}

/** FINANCE_ADMIN: delete DRAFT (service enforces DRAFT-only) */
@DeleteMapping("/{id}")
@PreAuthorize("hasAuthority('FINANCE_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
    payrollService.delete(id);
    return ResponseEntity.ok(ApiResponse.ok(null, "Payroll deleted"));
}
```

---

## 1.5 Add `AttendancePeriodClose` Entity and Period-Closure Guard `[BE]` `[DB]`

### Step 1: Create the entity

**File (new):** `facez/src/main/java/org/dummy/facez/domain/attendance/model/AttendancePeriodClose.java`

```java
package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_period_close",
       uniqueConstraints = @UniqueConstraint(
           name = "uk_period_close_year_month",
           columnNames = {"close_year", "close_month"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendancePeriodClose {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "close_year",  nullable = false)
    private int closeYear;

    @Column(name = "close_month", nullable = false)
    private int closeMonth;

    @Column(length = 100, nullable = false)
    private String closedBy;      // username of the HR_ADMIN who closed

    @Column(nullable = false)
    private LocalDateTime closedAt;

    @Column(length = 500)
    private String notes;
}
```

### Step 2: Create the repository

**File (new):** `facez/src/main/java/org/dummy/facez/domain/attendance/repository/AttendancePeriodCloseRepository.java`

```java
package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.AttendancePeriodClose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttendancePeriodCloseRepository extends JpaRepository<AttendancePeriodClose, String> {

    Optional<AttendancePeriodClose> findByCloseYearAndCloseMonth(int year, int month);

    boolean existsByCloseYearAndCloseMonth(int year, int month);
}
```

### Step 3: Add the close-period endpoint to `AttendanceController`

**File:** [facez/src/main/java/org/dummy/facez/domain/attendance/controller/AttendanceController.java](../facez/src/main/java/org/dummy/facez/domain/attendance/controller/AttendanceController.java)

Create a simple DTO first:

**File (new):** `facez/src/main/java/org/dummy/facez/domain/attendance/dto/ClosePeriodRequest.java`

```java
package org.dummy.facez.domain.attendance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ClosePeriodRequest {
    @NotNull @Min(2020) @Max(2100)
    private Integer year;

    @NotNull @Min(1) @Max(12)
    private Integer month;

    private String notes;
}
```

Add the endpoint to `AttendanceController` (inject `AttendancePeriodCloseRepository` and `Authentication`):

```java
@PostMapping("/close-period")
@PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('SYSTEM_ADMIN')")
public ResponseEntity<ApiResponse<Void>> closePeriod(
        @Valid @RequestBody ClosePeriodRequest req,
        Authentication authentication) {

    if (periodCloseRepository.existsByCloseYearAndCloseMonth(req.getYear(), req.getMonth())) {
        throw new BadRequestException(
            "Attendance period " + req.getMonth() + "/" + req.getYear() + " is already closed.");
    }

    String username = ((UserDetails) authentication.getPrincipal()).getUsername();
    AttendancePeriodClose close = AttendancePeriodClose.builder()
            .id(java.util.UUID.randomUUID().toString())
            .closeYear(req.getYear())
            .closeMonth(req.getMonth())
            .closedBy(username)
            .closedAt(java.time.LocalDateTime.now())
            .notes(req.getNotes())
            .build();

    periodCloseRepository.save(close);
    return ResponseEntity.ok(ApiResponse.ok(null,
        "Attendance period " + req.getMonth() + "/" + req.getYear() + " closed successfully."));
}
```

### Step 4: Guard `PayrollService.calculate()` against unclosed periods

**File:** [facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollService.java](../facez/src/main/java/org/dummy/facez/domain/payroll/service/PayrollService.java)

Inject `AttendancePeriodCloseRepository` and add the guard at the top of `calculate()`:

```java
// Inject in constructor:
private final AttendancePeriodCloseRepository periodCloseRepository;

// Add at the top of calculate(), before the contract lookup:
if (!periodCloseRepository.existsByCloseYearAndCloseMonth(req.getPayrollYear(), req.getPayrollMonth())) {
    throw new BadRequestException(
        "Attendance for " + req.getPayrollMonth() + "/" + req.getPayrollYear() +
        " has not been closed by HR. Close the attendance period before calculating payroll.");
}
```

Apply the same guard in `PayrollBatchService.runBatch()` at the start of the method:

```java
// Inject AttendancePeriodCloseRepository in PayrollBatchService constructor, then:
if (!periodCloseRepository.existsByCloseYearAndCloseMonth(year, month)) {
    job.setState(PayrollJobRecord.JobState.FAILED);
    job.setFailureReason(
        "Attendance for " + month + "/" + year + " has not been closed by HR.");
    return;
}
```

### Step 5: Write the migration

**File (new):** `facez/src/main/resources/db/migration/V5__attendance_period_close.sql`

```sql
CREATE TABLE attendance_period_close
(
    id          VARCHAR(64)  NOT NULL,
    close_year  INTEGER      NOT NULL,
    close_month INTEGER      NOT NULL,
    closed_by   VARCHAR(100) NOT NULL,
    closed_at   TIMESTAMP    NOT NULL,
    notes       VARCHAR(500),
    CONSTRAINT attendance_period_close_pkey PRIMARY KEY (id),
    CONSTRAINT uk_period_close_year_month   UNIQUE (close_year, close_month)
);
```

---

## 1.6 Update `SecurityConfig` `[BE]`

**File:** [facez/src/main/java/org/dummy/facez/configs/SecurityConfig.java](../facez/src/main/java/org/dummy/facez/configs/SecurityConfig.java)

Replace the `authorizeHttpRequests` block with the full role-split rules. The current config lets `HR_ADMIN` do everything — this separates concerns:

```java
.authorizeHttpRequests(auth -> auth
    // Public
    .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
    .requestMatchers("/actuator/health").permitAll()

    // Employee management — HR only
    .requestMatchers(HttpMethod.POST,   "/api/employees").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.PUT,    "/api/employees/**").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/employees/**").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.GET,    "/api/employees/**").hasAnyAuthority(
        "HR_ADMIN", "MANAGER", "LEADER", "SYSTEM_ADMIN")

    // Department management — HR only
    .requestMatchers(HttpMethod.POST,   "/api/departments").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.PUT,    "/api/departments/**").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/departments/**").hasAuthority("HR_ADMIN")
    .requestMatchers(HttpMethod.GET,    "/api/departments/**").authenticated()

    // Contract management — HR and Finance
    .requestMatchers("/api/contracts/**").hasAnyAuthority(
        "HR_ADMIN", "FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Attendance — HR manages, anyone can see their own (enforced in controller)
    .requestMatchers(HttpMethod.POST,   "/api/attendances/close-period").hasAnyAuthority(
        "HR_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.PUT,    "/api/attendances/**").hasAnyAuthority(
        "HR_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/attendances/**").hasAnyAuthority(
        "HR_ADMIN", "SYSTEM_ADMIN")

    // Payroll — Finance calculates, Director approves
    .requestMatchers(HttpMethod.POST,  "/api/payrolls/calculate").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.POST,  "/api/payrolls/batch-calculate").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls/jobs/**").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls/period").hasAnyAuthority(
        "FINANCE_ADMIN", "DIRECTOR", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls").hasAnyAuthority(
        "FINANCE_ADMIN", "DIRECTOR", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.GET,   "/api/payrolls/my/**").authenticated()
    .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/submit").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/approve").hasAnyAuthority(
        "DIRECTOR", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/reject").hasAnyAuthority(
        "DIRECTOR", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.PATCH, "/api/payrolls/*/mark-paid").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")
    .requestMatchers(HttpMethod.DELETE, "/api/payrolls/**").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")

    // System configuration — Finance manages business rules
    .requestMatchers("/api/system-configs/**").hasAnyAuthority(
        "FINANCE_ADMIN", "SYSTEM_ADMIN")

    // Everything else — authenticated
    .anyRequest().authenticated()
)
```

> **Note on `@PreAuthorize` vs `SecurityConfig`:** Both layers are active. The controller-level `@PreAuthorize` annotations and this `SecurityConfig` block must stay in sync. If they conflict, the more restrictive rule wins. During Phase 1, update both.

---

## 1.7 Frontend Role Routing Updates `[FE]`

### Step 1: Add new roles to the AuthContext type

**File:** `facez-front/commons/contexts/AuthContext.tsx`

Find the `role` type definition and add the new values:

```typescript
// Before:
type Role = 'EMPLOYEE' | 'LEADER' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM_ADMIN'

// After:
type Role = 'EMPLOYEE' | 'LEADER' | 'MANAGER' | 'HR_ADMIN'
           | 'FINANCE_ADMIN' | 'DIRECTOR' | 'SYSTEM_ADMIN'
```

### Step 2: Add Finance and Director pages

Create the following directories and page files:

```
facez-front/app/finance/
  page.tsx              — redirect to /finance/payroll
  payroll/
    page.tsx            — payroll calculation list + calculate button
  config/
    page.tsx            — system config (moved from wherever it currently lives)

facez-front/app/director/
  page.tsx              — redirect to /director/payroll-approval
  payroll-approval/
    page.tsx            — list PENDING_APPROVAL payrolls, approve/reject buttons
```

### Step 3: Update Sidebar navigation

The sidebar must show different sections based on the logged-in user's role. Remove the Payroll section from HR_ADMIN — HR should only see: Employees, Departments, Attendance, Leave management, Contracts.

```typescript
// Sidebar navigation map (role → menu items):
const NAV_CONFIG: Record<Role, NavItem[]> = {
  HR_ADMIN: [
    { label: 'Employees',   href: '/employee' },
    { label: 'Departments', href: '/department' },
    { label: 'Attendance',  href: '/attendance' },
    { label: 'Leave',       href: '/leave' },
    { label: 'OT Requests', href: '/otrequest' },
    { label: 'Contracts',   href: '/contract' },
  ],
  FINANCE_ADMIN: [
    { label: 'Payroll',       href: '/finance/payroll' },
    { label: 'System Config', href: '/finance/config' },
    { label: 'Contracts',     href: '/contract' },      // view-only
  ],
  DIRECTOR: [
    { label: 'Payroll Approval', href: '/director/payroll-approval' },
    { label: 'Reports',          href: '/director/reports' },
  ],
  MANAGER: [
    { label: 'My Team',     href: '/employee' },
    { label: 'Attendance',  href: '/attendance' },
    { label: 'Leave',       href: '/leave' },
    { label: 'OT Requests', href: '/otrequest' },
  ],
  EMPLOYEE: [
    { label: 'My Attendance', href: '/employees/attendance' },
    { label: 'My Leave',      href: '/employees/leave' },
    { label: 'My OT',         href: '/employees/otrequest' },
    { label: 'My Payslip',    href: '/employees/payslip' },
  ],
  SYSTEM_ADMIN: [
    /* all sections */
  ],
};
```

### Step 4: Add global error handling

Create a global error handler for API errors. Add it at the `ApiCallUtil` level so all API calls benefit automatically:

**File:** `facez-front/commons/utils/ApiCallUtil.tsx`

After the 401 retry logic, add handling for common HTTP errors:

```typescript
if (response.status === 403) {
  // Role may have changed mid-session — force logout
  toast.error('Access denied. Your session may have expired.');
  // Optionally: trigger logout
}
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') ?? '900';
  toast.error(`Too many requests. Please wait ${Math.ceil(Number(retryAfter) / 60)} minutes.`);
}
if (response.status >= 500) {
  toast.error('Server error. Please try again or contact support.');
}
```

Install a toast library if not already present (`react-hot-toast` or `sonner` are lightweight options):
```bash
npm install sonner
```

---

## Phase 1 Acceptance Criteria Verification

| Test | How to verify |
|---|---|
| `HR_ADMIN` cannot calculate payroll | `POST /api/payrolls/calculate` with HR_ADMIN JWT → expect 403 |
| `FINANCE_ADMIN` can calculate but not approve | `POST /calculate` ✅; `PATCH /{id}/approve` → 403 |
| `DIRECTOR` can approve/reject but not calculate | `PATCH /approve` ✅; `POST /calculate` → 403 |
| Payroll blocked if period not closed | `POST /calculate` for unclosed month → 400 with message |
| Close period, then calculate | `POST /close-period` ✅; `POST /calculate` ✅ |
| Workflow: DRAFT → PENDING → APPROVED → PAID | Call `/submit`, `/approve`, `/mark-paid` in sequence |
| Workflow: rejection path | DRAFT → `/submit` → `/reject` → status is REJECTED with reason |

---

# Phase 2 — Employee Data Completeness

## 2.1 Create `Gender` Enum `[BE]`

**File (new):** `facez/src/main/java/org/dummy/facez/common/enums/Gender.java`

```java
package org.dummy.facez.common.enums;

public enum Gender {
    MALE,
    FEMALE,
    OTHER
}
```

---

## 2.2 Add Statutory Fields to `EmployeeInfo` `[BE]` `[DB]`

**File:** [facez/src/main/java/org/dummy/facez/domain/employee/model/EmployeeInfo.java](../facez/src/main/java/org/dummy/facez/domain/employee/model/EmployeeInfo.java)

Add these fields to the entity (after `emergencyContact`):

```java
/** Căn cước công dân / CMND — required for BHXH registration */
@Column(length = 20, unique = true)
private String nationalId;

/** Ngày cấp CCCD */
private LocalDate nationalIdIssueDate;

/** Nơi cấp CCCD */
@Column(length = 200)
private String nationalIdIssuePlace;

/** Mã số thuế cá nhân — required for PIT reporting */
@Column(length = 20, unique = true)
private String taxCode;

/** Số sổ BHXH — required for social insurance reporting */
@Column(length = 20, unique = true)
private String socialInsuranceCode;

/** Số tài khoản ngân hàng — required for salary transfer */
@Column(length = 30)
private String bankAccountNumber;

/** Tên ngân hàng */
@Column(length = 100)
private String bankName;

/** Chi nhánh ngân hàng */
@Column(length = 200)
private String bankBranch;

/** Ngày sinh */
private LocalDate dateOfBirth;

@Enumerated(EnumType.STRING)
@Column(length = 10)
private Gender gender;

/** Quê quán */
@Column(length = 200)
private String hometown;
```

### Migration

**File (new):** `facez/src/main/resources/db/migration/V6__employee_statutory_fields.sql`

```sql
ALTER TABLE employee_info
    ADD COLUMN IF NOT EXISTS national_id               VARCHAR(20),
    ADD COLUMN IF NOT EXISTS national_id_issue_date    DATE,
    ADD COLUMN IF NOT EXISTS national_id_issue_place   VARCHAR(200),
    ADD COLUMN IF NOT EXISTS tax_code                  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS social_insurance_code     VARCHAR(20),
    ADD COLUMN IF NOT EXISTS bank_account_number       VARCHAR(30),
    ADD COLUMN IF NOT EXISTS bank_name                 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bank_branch               VARCHAR(200),
    ADD COLUMN IF NOT EXISTS date_of_birth             DATE,
    ADD COLUMN IF NOT EXISTS gender                    VARCHAR(10),
    ADD COLUMN IF NOT EXISTS hometown                  VARCHAR(200);

-- Unique constraints (NULL values are excluded from uniqueness checks in PostgreSQL —
-- two NULLs are allowed, which is correct for employees who haven't provided the data yet)
ALTER TABLE employee_info
    ADD CONSTRAINT uq_employee_national_id          UNIQUE (national_id),
    ADD CONSTRAINT uq_employee_tax_code             UNIQUE (tax_code),
    ADD CONSTRAINT uq_employee_social_insurance     UNIQUE (social_insurance_code);
```

---

## 2.3 Update Employee DTOs `[BE]`

### `EmployeeCreateRequest`

**File:** [facez/src/main/java/org/dummy/facez/domain/employee/dto/EmployeeCreateRequest.java](../facez/src/main/java/org/dummy/facez/domain/employee/dto/EmployeeCreateRequest.java)

Add these optional fields (all nullable — statutory data may be collected later):

```java
private String nationalId;
private LocalDate nationalIdIssueDate;
private String nationalIdIssuePlace;
private String taxCode;
private String socialInsuranceCode;
private String bankAccountNumber;
private String bankName;
private String bankBranch;
private LocalDate dateOfBirth;
private String gender;           // string → validated against Gender enum in service
private String hometown;
```

### `EmployeeUpdateRequest`

**File:** [facez/src/main/java/org/dummy/facez/domain/employee/dto/EmployeeUpdateRequest.java](../facez/src/main/java/org/dummy/facez/domain/employee/dto/EmployeeUpdateRequest.java)

Add the same optional fields. All update fields are already nullable by convention.

### `EmployeeResponse`

**File:** [facez/src/main/java/org/dummy/facez/domain/employee/dto/EmployeeResponse.java](../facez/src/main/java/org/dummy/facez/domain/employee/dto/EmployeeResponse.java)

Add to the builder:

```java
private String nationalId;
private LocalDate nationalIdIssueDate;
private String nationalIdIssuePlace;
private String taxCode;
private String socialInsuranceCode;
private String bankAccountNumber;
private String bankName;
private String bankBranch;
private LocalDate dateOfBirth;
private String gender;
private String hometown;
```

---

## 2.4 Update `EmployeeService` — Validation and Mapping `[BE]`

**File:** [facez/src/main/java/org/dummy/facez/domain/employee/service/EmployeeService.java](../facez/src/main/java/org/dummy/facez/domain/employee/service/EmployeeService.java)

### In `createEmployee()` — add duplicate checks and field mapping:

```java
// Add after the username uniqueness check:
if (req.getNationalId() != null) {
    employeeInfoRepository.findByNationalId(req.getNationalId()).ifPresent(existing -> {
        throw new BadRequestException("National ID already registered: " + req.getNationalId());
    });
}
if (req.getTaxCode() != null) {
    employeeInfoRepository.findByTaxCode(req.getTaxCode()).ifPresent(existing -> {
        throw new BadRequestException("Tax code already registered: " + req.getTaxCode());
    });
}

// In the EmployeeInfo.builder():
.nationalId(req.getNationalId())
.nationalIdIssueDate(req.getNationalIdIssueDate())
.nationalIdIssuePlace(req.getNationalIdIssuePlace())
.taxCode(req.getTaxCode())
.socialInsuranceCode(req.getSocialInsuranceCode())
.bankAccountNumber(req.getBankAccountNumber())
.bankName(req.getBankName())
.bankBranch(req.getBankBranch())
.dateOfBirth(req.getDateOfBirth())
.gender(req.getGender() != null ? Gender.valueOf(req.getGender()) : null)
.hometown(req.getHometown())
```

### In `updateEmployee()` — add field updates:

```java
// Add inside the field-by-field update block:
if (req.getNationalId() != null) {
    employeeInfoRepository.findByNationalId(req.getNationalId())
        .filter(e -> !e.getEmployeeId().equals(employeeId))  // exclude self
        .ifPresent(e -> { throw new BadRequestException("National ID already in use."); });
    info.setNationalId(req.getNationalId());
}
if (req.getTaxCode() != null) {
    employeeInfoRepository.findByTaxCode(req.getTaxCode())
        .filter(e -> !e.getEmployeeId().equals(employeeId))
        .ifPresent(e -> { throw new BadRequestException("Tax code already in use."); });
    info.setTaxCode(req.getTaxCode());
}
if (req.getSocialInsuranceCode() != null) info.setSocialInsuranceCode(req.getSocialInsuranceCode());
if (req.getBankAccountNumber() != null)   info.setBankAccountNumber(req.getBankAccountNumber());
if (req.getBankName() != null)            info.setBankName(req.getBankName());
if (req.getBankBranch() != null)          info.setBankBranch(req.getBankBranch());
if (req.getDateOfBirth() != null)         info.setDateOfBirth(req.getDateOfBirth());
if (req.getGender() != null)              info.setGender(Gender.valueOf(req.getGender()));
if (req.getHometown() != null)            info.setHometown(req.getHometown());
```

### Add query methods to `EmployeeInfoRepository`

**File:** `facez/src/main/java/org/dummy/facez/domain/employee/repository/EmployeeInfoRepository.java`

```java
Optional<EmployeeInfo> findByNationalId(String nationalId);
Optional<EmployeeInfo> findByTaxCode(String taxCode);
```

### Update `toResponse()` to include new fields:

```java
.nationalId(info.getNationalId())
.nationalIdIssueDate(info.getNationalIdIssueDate())
.nationalIdIssuePlace(info.getNationalIdIssuePlace())
.taxCode(info.getTaxCode())
.socialInsuranceCode(info.getSocialInsuranceCode())
.bankAccountNumber(info.getBankAccountNumber())
.bankName(info.getBankName())
.bankBranch(info.getBankBranch())
.dateOfBirth(info.getDateOfBirth())
.gender(info.getGender() != null ? info.getGender().name() : null)
.hometown(info.getHometown())
```

---

## 2.5 Create `TaxDependent` Entity `[BE]` `[DB]`

**File (new):** `facez/src/main/java/org/dummy/facez/domain/employee/model/TaxDependent.java`

```java
package org.dummy.facez.domain.employee.model;

import jakarta.persistence.*;
import lombok.*;
import org.dummy.facez.common.model.AuditableEntity;

import java.time.LocalDate;

@Entity
@Table(name = "tax_dependent")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxDependent extends AuditableEntity {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeInfo employeeInfo;

    @Column(length = 200, nullable = false)
    private String fullName;

    @Column(length = 20)
    private String nationalId;

    private LocalDate dateOfBirth;

    /** con / vợ / chồng / cha / mẹ / khác */
    @Column(length = 50)
    private String relationship;

    /** Date Form 02/CK-TNCN was submitted to the tax authority */
    private LocalDate registrationDate;

    /** False when the dependent no longer qualifies (e.g., child reaches 18) */
    @Column(nullable = false)
    private boolean active = true;
}
```

**File (new):** `facez/src/main/java/org/dummy/facez/domain/employee/repository/TaxDependentRepository.java`

```java
package org.dummy.facez.domain.employee.repository;

import org.dummy.facez.domain.employee.model.TaxDependent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxDependentRepository extends JpaRepository<TaxDependent, String> {

    List<TaxDependent> findByEmployeeInfo_EmployeeIdAndActiveTrue(String employeeId);

    long countByEmployeeInfo_EmployeeIdAndActiveTrue(String employeeId);
}
```

**Migration:**

**File (new):** `facez/src/main/resources/db/migration/V7__tax_dependent.sql`

```sql
CREATE TABLE tax_dependent
(
    id                  VARCHAR(64)  NOT NULL,
    employee_id         VARCHAR(64)  NOT NULL REFERENCES employee_info(employee_id),
    full_name           VARCHAR(200) NOT NULL,
    national_id         VARCHAR(20),
    date_of_birth       DATE,
    relationship        VARCHAR(50),
    registration_date   DATE,
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    CONSTRAINT tax_dependent_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_tax_dependent_employee ON tax_dependent (employee_id, active);
```

---

## 2.6 Create `TaxDependentController` `[BE]`

**File (new):** `facez/src/main/java/org/dummy/facez/domain/employee/controller/TaxDependentController.java`

```java
package org.dummy.facez.domain.employee.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.employee.dto.TaxDependentRequest;
import org.dummy.facez.domain.employee.dto.TaxDependentResponse;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.model.TaxDependent;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.employee.repository.TaxDependentRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/employees/{employeeId}/dependents")
public class TaxDependentController {

    private final TaxDependentRepository dependentRepository;
    private final EmployeeInfoRepository employeeInfoRepository;

    public TaxDependentController(TaxDependentRepository dependentRepository,
                                   EmployeeInfoRepository employeeInfoRepository) {
        this.dependentRepository   = dependentRepository;
        this.employeeInfoRepository = employeeInfoRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<TaxDependentResponse>>> list(
            @PathVariable String employeeId) {
        List<TaxDependentResponse> list = dependentRepository
                .findByEmployeeInfo_EmployeeIdAndActiveTrue(employeeId)
                .stream().map(TaxDependentResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN', 'SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<TaxDependentResponse>> create(
            @PathVariable String employeeId,
            @Valid @RequestBody TaxDependentRequest req) {
        EmployeeInfo employee = employeeInfoRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        TaxDependent dep = TaxDependent.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(employee)
                .fullName(req.getFullName())
                .nationalId(req.getNationalId())
                .dateOfBirth(req.getDateOfBirth())
                .relationship(req.getRelationship())
                .registrationDate(req.getRegistrationDate())
                .active(true)
                .build();
        dependentRepository.save(dep);
        return ResponseEntity.ok(ApiResponse.ok(TaxDependentResponse.from(dep), "Dependent registered"));
    }

    @DeleteMapping("/{depId}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN', 'SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(
            @PathVariable String employeeId,
            @PathVariable String depId) {
        TaxDependent dep = dependentRepository.findById(depId)
                .filter(d -> d.getEmployeeInfo().getEmployeeId().equals(employeeId))
                .orElseThrow(() -> new ResourceNotFoundException("TaxDependent", "id", depId));
        dep.setActive(false);
        dependentRepository.save(dep);
        return ResponseEntity.ok(ApiResponse.ok(null, "Dependent deactivated"));
    }
}
```

Create the DTOs:

**File (new):** `facez/src/main/java/org/dummy/facez/domain/employee/dto/TaxDependentRequest.java`

```java
package org.dummy.facez.domain.employee.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;

@Data
public class TaxDependentRequest {
    @NotBlank private String fullName;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String relationship;
    private LocalDate registrationDate;
}
```

**File (new):** `facez/src/main/java/org/dummy/facez/domain/employee/dto/TaxDependentResponse.java`

```java
package org.dummy.facez.domain.employee.dto;

import lombok.Builder;
import lombok.Data;
import org.dummy.facez.domain.employee.model.TaxDependent;
import java.time.LocalDate;

@Data
@Builder
public class TaxDependentResponse {
    private String id;
    private String employeeId;
    private String fullName;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String relationship;
    private LocalDate registrationDate;
    private boolean active;

    public static TaxDependentResponse from(TaxDependent d) {
        return TaxDependentResponse.builder()
                .id(d.getId())
                .employeeId(d.getEmployeeInfo().getEmployeeId())
                .fullName(d.getFullName())
                .nationalId(d.getNationalId())
                .dateOfBirth(d.getDateOfBirth())
                .relationship(d.getRelationship())
                .registrationDate(d.getRegistrationDate())
                .active(d.isActive())
                .build();
    }
}
```

---

## Phase 2 Acceptance Criteria Verification

| Test | How to verify |
|---|---|
| Create employee with `nationalId` | `POST /api/employees` with nationalId → field stored |
| Duplicate nationalId rejected | `POST /api/employees` with same nationalId → 400 |
| Duplicate taxCode rejected | Same pattern for taxCode |
| List dependents | `GET /api/employees/{id}/dependents` → empty list initially |
| Add dependent | `POST /api/employees/{id}/dependents` → saved, returned |
| Deactivate dependent | `DELETE /api/employees/{id}/dependents/{depId}` → `active = false` |
| Deactivated dependent not in active list | `GET /dependents` does not show deactivated entries |

---

## Migration Sequence After Phase 2

| File | Phase | Description |
|---|---|---|
| `V1__baseline_schema.sql` | 0.1 | Full schema from existing entities |
| `V2__add_audit_columns.sql` | 0.3 | `created_by`, `updated_by` on audited entities |
| `V3__add_roles.sql` | 1.1 | Documentation only (enum values are Java-side) |
| `V4__payroll_status_update.sql` | 1.3 | Add `rejection_reason` to `payroll` |
| `V5__attendance_period_close.sql` | 1.4 | New `attendance_period_close` table |
| `V6__employee_statutory_fields.sql` | 2.1 | Statutory columns on `employee_info` |
| `V7__tax_dependent.sql` | 2.2 | New `tax_dependent` table |

---

*End of Phase 1 & 2 Implementation Guide*
