# FaceZ HRMS — Project Completion Plan

**Target:** Complete HR Management System for 1,000+ employee tech company
**Stack:** Spring Boot 4 (Java 21) + Next.js 15 (TypeScript) + PostgreSQL 15 + Redis 7

---

## Current Status

| Module | Backend | Frontend | Overall |
|--------|---------|----------|---------|
| Authentication & RBAC | ✅ Done | ✅ Done | ✅ Done |
| Employee Management | ✅ Done | ⚠️ List only | 60% |
| Department Management | ✅ Done | ⚠️ List only | 60% |
| Attendance Tracking | ⚠️ Basic | ⚠️ View only | 30% |
| Leave Management | ⚠️ Basic | ⚠️ Minimal | 25% |
| OT Requests | ⚠️ Basic | ⚠️ Minimal | 25% |
| Contract Management | ⚠️ Basic | ❌ None | 15% |
| Dashboard Analytics | ⚠️ None | ⚠️ Mock data | 10% |
| Payroll Calculation | ❌ Not started | ❌ Not started | 0% |
| PDF/Excel Reports | ❌ Not started | ❌ Not started | 0% |
| Device Integration | ❌ Not started | ❌ Not started | 0% |
| Email Notifications | ❌ Not started | ❌ Not started | 0% |
| Unit Tests | ❌ ~0% coverage | N/A | 0% |

**Overall estimate: ~35% complete**

---

## Phase 1 — UI Completion & Approval Workflows (Week 1–2)

### Week 1: CRUD Forms & Validation ✅ COMPLETE

**Frontend — Employee Module**
- [x] Create Employee modal (employeeId, name, username, password, email, role, department, phone, address, dateOfJoining, emergencyContact)
- [x] Edit Employee modal (pre-populated; all fields except employeeId/username/password)
- [x] Status toggle in Edit modal (ACTIVE/INACTIVE/ON_LEAVE/TERMINATED)
- [x] Styled confirm dialog for delete (replaces browser `confirm()`)

**Frontend — Department Module**
- [x] Create Department modal (departmentId, name, manager dropdown)
- [x] Edit Department modal

**Frontend — Contract Module**
- [x] Contract list table with search (by employee name, ID, type)
- [x] Create Contract modal (employee, type, startDate, endDate, terms, salaryRank, status)
- [x] Edit Contract modal

**Shared Frontend**
- [x] `Modal.tsx` — reusable overlay component (Escape key + backdrop click to close)
- [x] `ToastContext.tsx` — global success/error toast notifications (auto-dismiss 4s)
- [x] Confirm dialog for all destructive actions (delete employee/department/contract/OT)
- [x] Inline form validation (required fields, email format, date ordering)

**Frontend — Leave & OT Modals**
- [x] `LeaveFormModal.tsx` — New leave request (reason, startTime, endTime)
- [x] `OTFormModal.tsx` — New OT request (startTime, endTime)

**Backend**
- [x] Multi-level leave approval: MANAGER can only approve leaves ≤5 days; HR_ADMIN/SYSTEM_ADMIN can approve any
- [x] `PUT /api/leaves/{id}/approve` — now receives `Authentication`, enforces role-based day limit
- [x] Note: approve/reject endpoints for both leaves and OT were already in place

---

### Week 2: Dashboard & Analytics API

**Backend — Statistics Endpoints**
- [ ] `GET /api/dashboard/stats` — headcount, active employees, pending approvals count
- [ ] `GET /api/dashboard/attendance-summary` — on-time/late/absent counts for current week
- [ ] `GET /api/dashboard/expiring-contracts` — contracts expiring in next 30/15/7 days
- [ ] `GET /api/dashboard/leave-balance/{employeeId}` — remaining annual leave days

**Frontend — Dashboard**
- [ ] Connect all charts and stat cards to real API data (remove mock data)
- [ ] Pending approvals widget (clickable, deep-links to leave/OT list)
- [ ] Expiring contracts alert table
- [ ] Employee self-service dashboard: own attendance summary, leave balance, pending requests

---

## Phase 2 — Payroll Engine & Reports (Week 3–4)

### Week 3: Payroll Calculation Engine

**Database**
- [ ] Flyway migration: `payroll_records` table (employee_id, period YYYY-MM, base_salary, allowances, ot_pay, kpi_bonus, bhxh, bhyt, bhtn, pit, net_salary, status, version)
- [ ] Flyway migration: `salary_configs` table (employee_id, component_type, amount, effective_from)

**Backend — Payroll Module**
- [ ] `PayrollRecord` entity + repository
- [ ] `SalaryConfig` entity + repository (base salary, allowances per employee)
- [ ] `PayrollCalculationService`:
  - Gross = base_salary + ot_pay + allowances + kpi_bonus
  - BHXH = 8% of gross
  - BHYT = 1.5% of gross
  - BHTN = 1% of gross
  - Taxable income = Gross − BHXH − BHYT − BHTN − 11,000,000 (family deduction)
  - PIT = progressive 7-tier Vietnamese tax rate
  - Net = Gross − BHXH − BHYT − BHTN − PIT
- [ ] `POST /api/payroll/run?period=YYYY-MM` — trigger monthly payroll (SYSTEM_ADMIN/HR_ADMIN only)
- [ ] `GET /api/payroll?period=YYYY-MM` — list payroll records (paginated)
- [ ] `GET /api/payroll/me?period=YYYY-MM` — employee's own payslip data
- [ ] Unit tests for all payroll calculation edge cases (coverage target: >70% for this service)

---

### Week 4: PDF Payslips & Excel Reports

**Dependencies to add (pom.xml)**
```xml
<!-- iText 7 for PDF -->
<dependency>
  <groupId>com.itextpdf</groupId>
  <artifactId>itext7-core</artifactId>
  <version>7.2.5</version>
  <type>pom</type>
</dependency>
<!-- Apache POI for Excel -->
<dependency>
  <groupId>org.apache.poi</groupId>
  <artifactId>poi-ooxml</artifactId>
  <version>5.2.5</version>
</dependency>
```

**Backend — Report Generation**
- [ ] `PayslipPdfService` — generate payslip PDF with Vietnamese Unicode font (embed .ttf)
- [ ] `GET /api/payroll/{id}/pdf` — download payslip as PDF
- [ ] `AttendanceReportService` — generate attendance Excel report per month per department
- [ ] `GET /api/reports/attendance?period=YYYY-MM&departmentId=X` — download Excel
- [ ] `GET /api/reports/payroll-summary?period=YYYY-MM` — download payroll summary Excel

**Frontend**
- [ ] "My Payslip" page for EMPLOYEE role: dropdown to select month, table view, download PDF button
- [ ] Payroll management page for HR_ADMIN: run payroll button, payroll table, bulk PDF download

---

## Phase 3 — Attendance Device Integration & Email (Week 5–6)

### Week 5: Physical Device Integration

**Backend**
- [ ] `POST /api/devices/punch` — ingest raw punch data from ZKTeco/RFID devices (public with device API key)
- [ ] `AttendanceProcessingJob` (Spring Batch):
  - Pair IN/OUT punches → create `daily_attendance` record
  - Detect forgot check-out (next day IN with no prior OUT)
  - Handle night shifts (punch times crossing midnight)
  - Deduplicate punches within 5-minute window
  - Reject data from unregistered device IDs
- [ ] `AttendanceDevice` entity + `POST /api/devices` endpoint to register devices
- [ ] Batch job scheduled trigger (`@Scheduled` or Spring Batch JobLauncher)

**Testing**
- [ ] Device simulator script (Python or shell) to POST 5 scenarios to the API:
  1. Normal on-time (IN 8:45, OUT 17:30)
  2. Late arrival (IN 9:15)
  3. Forgot check-out (IN with no OUT)
  4. Night shift (IN 22:00, OUT 06:00 next day)
  5. Invalid device ID (should be rejected)

---

### Week 6: Email Notifications

**Dependencies to add**
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
```

**Backend**
- [ ] Configure SMTP in `application.yml` (Gmail or Office 365)
- [ ] Thymeleaf HTML email templates for: payslip delivery, leave approved/rejected, contract expiring
- [ ] `EmailNotificationService` — send templated emails
- [ ] `@Scheduled` jobs:
  - Monthly: send payslips after payroll confirmation
  - Weekly (Friday 17:00): timesheet submission reminder
  - Daily: contract expiration alerts (30/15/7 days prior)
- [ ] After leave/OT approval or rejection → send notification email to requester

---

## Phase 4 — Testing, Deployment & Demo (Week 7–8)

### Week 7: Testing & Polish

**Backend Tests (target: >70% line coverage via JaCoCo)**
- [ ] `PayrollCalculationServiceTest` — all tax/insurance calculation cases
- [ ] `AttendanceProcessingJobTest` — punch pairing, edge cases
- [ ] `LeaveServiceTest` — balance deduction, multi-level approval state machine
- [ ] `AuthServiceTest` — token generation, refresh, blacklist

**Frontend Polish**
- [ ] Loading skeletons on all data tables
- [ ] Empty states (no data illustrations)
- [ ] Error boundaries with retry buttons
- [ ] Responsive layout check on mobile/tablet viewports
- [ ] Role-based nav menu (hide links user has no access to)

**API**
- [ ] Add Flyway migration files for all tables not yet migrated
- [ ] Review and fix any missing `@PreAuthorize` role guards on endpoints
- [ ] Swagger/OpenAPI annotations on all new endpoints

---

### Week 8: Deployment & Final Demo

**Docker Compose (full stack)**
- [ ] Rename `compose.yaml.txt` → `compose.yaml`
- [ ] Add backend service to compose (build from `facez/Dockerfile`)
- [ ] Add frontend service to compose (build from `facez-front/Dockerfile`)
- [ ] Add health checks and restart policies

**Dockerfiles**
- [ ] `facez/Dockerfile` — multi-stage build (Maven build → slim JRE 21 runtime)
- [ ] `facez-front/Dockerfile` — multi-stage build (npm build → nginx static serve)

**Seed Data**
- [ ] Flyway seed migration: 5 departments, 20 employees across all roles, 3 months of attendance, 1 payroll run

**Deployment**
- [ ] Deploy to Render.com or Railway (free tier)
- [ ] Set environment variables for DB, Redis, JWT secret, SMTP credentials
- [ ] Confirm HTTPS works (update cookie `secure: true` and CORS origin)

**Demo Scenario (5-minute walkthrough)**
1. HR Admin logs in → dashboard shows real stats
2. Device simulator sends punch data → attendance records appear
3. Employee submits leave request → manager approves → email notification sent
4. HR Admin runs monthly payroll → payslip PDF generated → emailed to employee
5. Employee logs in → downloads own payslip PDF from "My Payslips" page

---

## API Endpoints Checklist

### To Be Added

| Method | Endpoint | Role | Status |
|--------|----------|------|--------|
| GET | `/api/dashboard/stats` | HR_ADMIN, MANAGER | ❌ |
| GET | `/api/dashboard/attendance-summary` | HR_ADMIN, MANAGER | ❌ |
| GET | `/api/dashboard/expiring-contracts` | HR_ADMIN | ❌ |
| PATCH | `/api/leaves/{id}/approve` | MANAGER, HR_ADMIN | ❌ |
| PATCH | `/api/leaves/{id}/reject` | MANAGER, HR_ADMIN | ❌ |
| PATCH | `/api/ot-requests/{id}/approve` | MANAGER, HR_ADMIN | ❌ |
| POST | `/api/payroll/run` | HR_ADMIN | ❌ |
| GET | `/api/payroll` | HR_ADMIN | ❌ |
| GET | `/api/payroll/me` | EMPLOYEE | ❌ |
| GET | `/api/payroll/{id}/pdf` | HR_ADMIN, EMPLOYEE (own) | ❌ |
| GET | `/api/reports/attendance` | HR_ADMIN, MANAGER | ❌ |
| GET | `/api/reports/payroll-summary` | HR_ADMIN | ❌ |
| POST | `/api/devices/punch` | Device API key | ❌ |
| POST | `/api/devices` | SYSTEM_ADMIN | ❌ |
| GET | `/api/contracts` | HR_ADMIN | ⚠️ Basic |
| POST | `/api/contracts` | HR_ADMIN | ⚠️ Basic |

---

## Dependencies To Add

### Backend (`pom.xml`)
```xml
<!-- PDF generation -->
<dependency>
  <groupId>com.itextpdf</groupId>
  <artifactId>itext7-core</artifactId>
  <version>7.2.5</version>
  <type>pom</type>
</dependency>
<!-- Excel generation -->
<dependency>
  <groupId>org.apache.poi</groupId>
  <artifactId>poi-ooxml</artifactId>
  <version>5.2.5</version>
</dependency>
<!-- Email -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
<!-- Thymeleaf for email templates -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
<!-- TestContainers for integration tests -->
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <scope>test</scope>
</dependency>
```

### Frontend (`package.json`)
```json
"zod": "^3.23.8",
"react-hook-form": "^7.51.0",
"@hookform/resolvers": "^3.3.4",
"@tanstack/react-query": "^5.0.0",
"sonner": "^1.4.0"
```

---

## Completion Criteria

The project is complete when:
- [ ] All 8 core modules have working backend + frontend
- [ ] Payroll runs end-to-end: punch → attendance → payroll → PDF payslip → email
- [ ] Backend unit test coverage ≥ 70% (measured by JaCoCo)
- [ ] Full Docker Compose stack starts with `docker compose up`
- [ ] Application is deployed and accessible via public URL
- [ ] 5-minute demo scenario runs without errors
