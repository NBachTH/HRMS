# FACE-Z HRMS — Role-Based Access Control (RBAC)

> **Version:** 1.0  
> **Last Updated:** March 2026  
> **Project:** FACE-Z HRMS — Graduation Thesis  
> **Stack:** Java Spring Boot 3.3 + Next.js 15

---

## Overview

The system defines **5 roles** with clearly separated responsibilities following the **Principle of Least Privilege**. Each role can only access data and perform actions strictly necessary for their responsibilities.

### Role Summary

| Role | Scope | Primary Responsibility |
|---|---|---|
| `SYSTEM_ADMIN` | System-wide (technical only) | Infrastructure, accounts, system configuration |
| `HR_ADMIN` | Company-wide (business data) | HR operations, payroll, reporting |
| `MANAGER` | Department-level | Department oversight, final approval |
| `PM` | Project-level | Project coordination, first-level approval |
| `EMPLOYEE` | Self only | Personal data, requests |

### Approval Workflow

```
Leave / OT Request:
EMPLOYEE → PM (level 1) → MANAGER (level 2) → HR_ADMIN (final confirm)

Attendance Adjustment:
EMPLOYEE → PM (level 1) → MANAGER (level 2) → HR_ADMIN (apply adjustment)

Specialized Departments (HR, Finance, Accounting — no PM):
EMPLOYEE → MANAGER (level 1) → HR_ADMIN (final confirm)
```

---

## 1. SYSTEM_ADMIN

> Manages technical infrastructure and user accounts only.  
> **Has NO access to any business or HR data.**

### ✅ Permissions

#### Account Management
| Action | Description |
|---|---|
| Unlock account | Unlock accounts locked after too many failed login attempts |
| Send password reset link | Sends time-limited link (15–30 min) to employee email — admin never sees the new password |
| Activate / Deactivate account | Enable or disable login access (does NOT delete the employee record) |
| Force logout all sessions | Revoke all active sessions for a specific account (e.g., suspected breach) |
| View login history | See login timestamps and IP addresses per account (audit log) |

#### Security Configuration
| Action | Description |
|---|---|
| Configure password policy | Minimum length, complexity requirements, expiry period |
| Configure account lockout policy | Number of failed attempts before lock, lock duration |
| Configure JWT / session timeout | Access token lifetime, refresh token expiry |

#### System Configuration
| Action | Description |
|---|---|
| Configure SMTP email server | Host, port, credentials for outgoing email |
| Configure company information | Company name, logo, address (displayed on payslips) |
| Manage system catalogs | Contract types, leave types, allowance types |
| Register / remove attendance devices | Add or deregister ZKTeco / RFID / fingerprint machines |
| View device connection status | Online/offline status, device error logs |

#### Monitoring
| Action | Description |
|---|---|
| View system audit log | Who did what, when, from which IP |
| View application error logs | System health monitoring |

### ❌ Restrictions

| Restricted Action | Reason |
|---|---|
| View employee salary, personal records, CCCD | Separation of IT and HR responsibilities |
| View KPI evaluations or leave history | Business data — HR Admin only |
| Create / edit / delete employee records | HR Admin responsibility |
| Approve any business requests | Not within technical scope |
| Directly set a new password for any user | Must use reset-link flow to ensure zero knowledge |

---

## 2. HR_ADMIN

> Manages all HR business operations across the entire company.  
> **Can view all employee data including sensitive information.**

### ✅ Permissions

#### Employee Management
| Action | Description |
|---|---|
| Create new employee (Onboarding) | Add full employee profile to the system |
| View full employee details | Including CCCD, bank account, personal contacts |
| Edit employee information | Full name, date of birth, CCCD, department, position |
| Deactivate resigned employee (Offboarding) | Soft delete — record is retained for audit |
| Assign employee to department | |
| View career history | Promotions, department transfers over time |

#### Contract Management
| Action | Description |
|---|---|
| Create new employment contract | |
| Renew / extend existing contract | |
| View all contracts — all employees | |
| Terminate / close a contract | |
| Receive alerts for expiring contracts | Configurable threshold (30 / 15 / 7 days) |

#### Attendance Management
| Action | Description |
|---|---|
| View attendance records — all employees | Filter by month, department, individual |
| Manually adjust attendance | Apply correction with mandatory reason note |
| Approve attendance adjustment requests (final) | After Manager has approved |
| View attendance device logs | Raw punch data from physical devices |

#### Leave & OT Management
| Action | Description |
|---|---|
| View all leave / OT requests — company-wide | All statuses: pending, approved, rejected |
| Final approve / reject leave and OT requests | After Manager approval |
| Configure annual leave quota | By contract type and seniority level |
| Manually adjust leave balance | For exceptional cases |

#### Payroll Management
| Action | Description |
|---|---|
| Configure payroll settings | Allowances, tax brackets, BHXH/BHYT/BHTN rates |
| Run monthly payroll calculation job | Triggers payroll engine for selected period |
| View salary details — all employees | Full breakdown per employee |
| Review and edit payroll before confirmation | Correct errors before finalizing |
| Confirm and lock payroll (CONFIRMED → PAID) | Irreversible after confirmation |
| Send payslip emails to employees | Bulk send after payroll is confirmed |

#### Reporting
| Action | Description |
|---|---|
| Export payroll summary (Excel) | Monthly payroll totals by department |
| Export employee list (Excel) | With filters by department, status, level |
| Export attendance report (Excel) | Monthly attendance per employee |
| Export individual payslip (PDF) | Unicode Vietnamese font support |
| View HR dashboard | Headcount, monthly payroll cost, turnover rate |

#### Performance Evaluation
| Action | Description |
|---|---|
| Create evaluation cycle | Set period, deadline, scope |
| View all KPI evaluation results | Company-wide |

### ❌ Restrictions

| Restricted Action | Reason |
|---|---|
| Manage system technical configuration | System Admin responsibility |
| Directly reset user passwords | Must be done through System Admin |

---

## 3. MANAGER

> Manages a specific **department**.  
> Sees and acts only on data within their own department.

> **Data Scope:** `WHERE employee.department_id = manager.department_id`

### ✅ Permissions

#### Employee (Department Scope)
| Action | Scope | Description |
|---|---|---|
| View employee list | Own department | Basic info only — no salary, no CCCD |
| View basic employee profile | Own department | Name, position, level, contact |
| View department org chart | Own department | |

#### Project Management
| Action | Scope | Description |
|---|---|---|
| Assign employees to projects | Own department | Set allocation percentage per project |
| View department project list | Own department | |

#### Attendance (Department Scope)
| Action | Scope | Description |
|---|---|---|
| View team attendance records | Own department | Monthly view |
| View project timesheets | Own department | Hours worked per project |
| Approve attendance adjustment (level 2) | Own department | After PM approval, before HR |

#### Leave & OT (Department Scope)
| Action | Scope | Description |
|---|---|---|
| View all leave / OT requests | Own department | Including PM requests |
| Approve / reject leave and OT (level 2) | Own department | After PM → Manager → HR |
| View team leave calendar | Own department | Prevent understaffing during peak periods |
| View remaining leave balance per employee | Own department | Context for approval decisions |

#### Performance Evaluation
| Action | Scope | Description |
|---|---|---|
| View KPI evaluation results | Own department | |
| Evaluate / score PMs in department | Own department | |

#### Dashboard
| Action | Scope | Description |
|---|---|---|
| View department dashboard | Own department | Headcount, attendance rate, OT hours |

### ❌ Restrictions

| Restricted Action | Reason |
|---|---|
| View employee salary | HR Admin only |
| Create / edit employee records | HR Admin responsibility |
| Manually adjust attendance | HR Admin responsibility |
| View data from other departments | Hard-filtered by department_id |
| Final approval (after HR) | HR Admin is always the final approver |

---

## 4. LEADER

> Manages one or more **projects**.  
> Can see members from **multiple departments** if they are assigned to the same project.  
> Lower authority than Manager — handles **level 1 approvals only**.

> **Data Scope:** `WHERE employee.id IN (project.member_ids) AND project.pm_id = current_user.id`

### ✅ Permissions

#### Employee (Project Scope)
| Action | Scope | Description |
|---|---|---|
| View member list | Own projects | Members may come from different departments |
| View basic member profile | Own projects | Name, level, contact — no salary, no CCCD |

#### Project Management
| Action | Scope | Description |
|---|---|---|
| View project details | Own projects | |
| View allocation percentage per member | Own projects | |

#### Attendance (Project Scope)
| Action | Scope | Description |
|---|---|---|
| View project timesheets | Own projects | Hours logged per member per project |
| View OT hours per member | Own projects | |
| Approve attendance adjustment (level 1) | Own projects | Escalates to Manager after |

#### Leave & OT (Project Scope)
| Action | Scope | Description |
|---|---|---|
| View leave / OT requests | Own project members | |
| Approve / reject leave and OT **(level 1)** | Own project members | Escalates to Manager after |
| View project leave calendar | Own projects | Prevent member shortage before deadlines |
| View remaining leave balance per member | Own projects | Context for approval decisions |

#### Performance Evaluation
| Action | Scope | Description |
|---|---|---|
| Submit self-evaluation | Self only | |
| Evaluate project members | Own projects | Input reviewed by Manager |

### ❌ Restrictions

| Restricted Action | Reason |
|---|---|
| Final approval of any request | PM is level 1 only — Manager must approve after |
| View employee salary | HR Admin only |
| Assign employees to projects | Manager responsibility |
| View employees outside own projects | Hard-filtered by project membership |
| View data from other projects | Hard-filtered by project_id |
| Edit employee records | HR Admin responsibility |

---

## 5. EMPLOYEE

> Standard employee account.  
> Can only view and manage **their own personal data**.

### ✅ Permissions

#### Personal Profile
| Action | Description |
|---|---|
| View full personal profile | Read-only for restricted fields |
| **Self-editable:** phone number, home address, profile photo, emergency contact, bank account number | Can update without HR approval |
| **Not self-editable:** full name, date of birth, national ID (CCCD), work email, department, job title | Must submit a request to HR Admin |

#### Contract
| Action | Description |
|---|---|
| View own employment contract(s) | Read-only |

#### Attendance
| Action | Description |
|---|---|
| View personal attendance history | Filter by month |
| View personal timesheet by project | Hours logged per project |
| Create attendance adjustment request | When check-in/out was missed or incorrect |
| View status of submitted adjustment requests | PENDING / APPROVED / REJECTED |

#### Leave & OT
| Action | Description |
|---|---|
| View remaining leave balance | By leave type |
| Create leave request | Select type, dates, reason |
| Create OT request | Date, hours, reason |
| View history and status of all submitted requests | Full timeline with approver notes |
| Cancel a pending request | Only allowed while status is PENDING |

#### Payroll
| Action | Description |
|---|---|
| View personal payslips by month | Read-only breakdown |
| Download personal payslip as PDF | |

#### Account
| Action | Description |
|---|---|
| Change own password | Requires current password confirmation |
| View own login history | Timestamps and IP addresses |

### ❌ Restrictions

| Restricted Action | Reason |
|---|---|
| View any other employee's information | Strict personal data isolation |
| View any other employee's salary | |
| Approve any request | No approval authority |
| Directly edit attendance records | Must use adjustment request flow |
| Edit restricted profile fields | Must go through HR Admin |

---

## Approval Matrix

### Leave & OT Request

| Requester Department | Level 1 | Level 2 |
|---|---|---|---|
| Development unit | PM | Manager |
| Specialized dept (HR, Finance, etc.) | Manager | — |

### Attendance Adjustment Request

| Requester Department | Level 1 | Level 2 | Apply |
|---|---|---|---|
| Development unit | PM | Manager | HR Admin |
| Specialized dept | Manager | — | HR Admin |

---

## Permission Matrix — Quick Reference

| Feature | SYSTEM_ADMIN | HR_ADMIN | MANAGER | PM | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|:---:|
| System configuration | ✅ | ❌ | ❌ | ❌ | ❌ |
| Account unlock / reset | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all employee records | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create / edit employees | ❌ | ✅ | ❌ | ❌ | ❌ |
| View department employees | ❌ | ✅ | ✅ | ✅ (project) | ❌ |
| View salary data | ❌ | ✅ | ❌ | ❌ | Self only |
| Run payroll | ❌ | ✅ | ❌ | ❌ | ❌ |
| Export reports | ❌ | ✅ | ❌ | ❌ | Self PDF |
| Level 1 approval | ❌ | ❌ | ❌ | ✅ | ❌ |
| Level 2 approval | ❌ | ❌ | ✅ | ❌ | ❌ |
| Final HR approval | ❌ | ✅ | ❌ | ❌ | ❌ |
| Submit requests | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own data | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage attendance devices | ✅ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | Self only |

---

## Implementation Notes

### Data Scope Enforcement
All queries must be filtered by the authenticated user's scope. This must be enforced at the **Service layer**, not just the Controller layer.

```java
// Example: Manager can only query employees in their department
public Page<EmployeeDTO> getEmployees(UUID requesterId, Pageable pageable) {
    User requester = userRepository.findById(requesterId);

    return switch (requester.getRole()) {
        case HR_ADMIN      -> employeeRepository.findAll(pageable);
        case MANAGER       -> employeeRepository.findByDepartmentId(
                                  requester.getDepartmentId(), pageable);
        case PM            -> employeeRepository.findByProjectMembership(
                                  requester.getId(), pageable);
        case EMPLOYEE      -> employeeRepository.findById(requesterId)
                                  .map(Page::of).orElse(Page.empty());
        default            -> Page.empty();
    };
}
```

### Spring Security — Method-level Authorization
```java
// Controller example using @PreAuthorize
@GetMapping("/employees")
@PreAuthorize("hasAnyRole('HR_ADMIN', 'MANAGER', 'PM')")
public ResponseEntity<ApiResponse<Page<EmployeeDTO>>> getEmployees(...) { }

@PostMapping("/payroll/calculate")
@PreAuthorize("hasRole('HR_ADMIN')")
public ResponseEntity<ApiResponse<Void>> calculatePayroll(...) { }

@PutMapping("/leaves/{id}/approve")
@PreAuthorize("hasAnyRole('PM', 'MANAGER', 'HR_ADMIN')")
public ResponseEntity<ApiResponse<LeaveDTO>> approveLeave(...) { }
```

### Specialized Department Handling
Employees in non-development departments (HR, Finance, Accounting) do not have a PM in their approval chain. This must be handled in the approval workflow logic:

```java
public void submitApprovalRequest(LeaveRequest request) {
    Employee employee = request.getEmployee();

    if (employee.getDepartment().getType() == DepartmentType.SPECIALIZED) {
        // Skip PM step — go directly to Manager
        request.setNextApprover(employee.getDepartment().getManager());
        request.setCurrentStep(ApprovalStep.MANAGER);
    } else {
        // Development unit — start with PM
        request.setNextApprover(employee.getProject().getPm());
        request.setCurrentStep(ApprovalStep.PM);
    }
}
```

---

*FACE-Z HRMS · RBAC Design Document · v1.0*
