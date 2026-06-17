# Dashboard Design — FaceZ HRMS

Role-specific dashboard specifications: layout sections, charts, components, and API calls for each view.

**Chart library in use:** [Recharts](https://recharts.org) — already a project dependency
(`BarChart`, `LineChart`, `PieChart`, `RadarChart`, `ResponsiveContainer` all available).

**Scope principle:** Every chart on this page is derived from data that the same dashboard
already fetches for its tables and stat cards. No chart requires an extra API call unless
explicitly noted.

---

## Table of Contents

1. [Route Strategy](#1-route-strategy)
2. [Shared Infrastructure](#2-shared-infrastructure)
3. [EMPLOYEE Dashboard](#3-employee-dashboard)
4. [LEADER Dashboard](#4-leader-dashboard)
5. [MANAGER Dashboard](#5-manager-dashboard)
6. [HR_ADMIN Dashboard](#6-hr_admin-dashboard)
7. [SYSTEM_ADMIN Dashboard](#7-system_admin-dashboard)
8. [Component Inventory](#8-component-inventory)
9. [Implementation Status](#9-implementation-status)

---

## 1. Route Strategy

All roles currently land on `/employees/dashboard`, which renders `DashboardContent` with
**static mock data** (no real API calls). The design below proposes that the single page
becomes role-aware — `DashboardContent` reads `role` from `useAuth()` and delegates to a
role-specific sub-component.

```
/employees/dashboard          ← single route, role-aware rendering
        │
        ├─ role = EMPLOYEE      → <EmployeeDashboard />
        ├─ role = LEADER        → <LeaderDashboard />
        ├─ role = MANAGER       → <ManagerDashboard />
        ├─ role = HR_ADMIN      → <HrDashboard />
        └─ role = SYSTEM_ADMIN  → <SystemAdminDashboard />
```

This keeps the page layout (Sidebar + Header + ProtectedRoute) unchanged.

---

## 2. Shared Infrastructure

### Layout (unchanged)

```tsx
// app/employees/dashboard/page.tsx
<ProtectedRoute>                   // any authenticated user
  <Sidebar />
  <Header />
  <main>
    <DashboardContent />           // role-dispatch hub
  </main>
</ProtectedRoute>
```

### Shared UI Primitives

| Component | File | Purpose |
|-----------|------|---------|
| `StatCard` | `components/dashboard/StatCard.tsx` | Single KPI card (value + trend) |
| `Modal` | `components/common/Modal.tsx` | Reusable modal wrapper |
| `Sidebar` | `components/Sidebar.tsx` | Navigation |
| `Header` | `components/Header.tsx` | Top bar with user info |

### Auth context used by all dashboards

```ts
const { user, role } = useAuth();
// user.username, user.employeeId — used to scope API calls
```

---

## 3. EMPLOYEE Dashboard

**Route:** `/employees/dashboard`
**Allowed roles:** `EMPLOYEE` (and higher roles fall through role-dispatch)
**Component file (proposed):** `components/dashboard/EmployeeDashboard.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Welcome back, {name}                            [Today's date]   │
├───────────┬───────────┬───────────┬──────────────────────────────┤
│ Working   │ Late      │ Pending   │ Latest Net                   │
│ Days(MTD) │ Days(MTD) │ Leaves    │ Salary                       │
│ StatCard  │ StatCard  │ StatCard  │ StatCard                     │
├───────────┴───────────┴───────────┴──────────────────────────────┤
│ Attendance — This Month          │  Month Summary                │
│ WorkingHoursBarChart             │  AttendanceSummaryDonut        │
│ (daily working hours bar chart)  │  (on-time / late / absent)    │
├──────────────────────────────────┴──────────────────────────────-┤
│ My Attendance Detail                          [month/year picker] │
│ AttendanceMonthTable (date | check-in | check-out | hrs | status)│
├────────────────────────────┬─────────────────────────────────────┤
│ My Leave Requests          │ My OT Requests                      │
│ MiniRequestTable (last 5)  │ MiniRequestTable (last 5)           │
└────────────────────────────┴─────────────────────────────────────┘
```

### Sections & Components

#### 3.1 Stat Cards (top row)

| Card | Value | Source |
|------|-------|--------|
| Working Days (MTD) | Sum of `workingDay` from attendance records this month | computed client-side |
| Late Days (MTD) | Count of records where `violate === true` | computed client-side |
| Pending Leaves | Count of leave records with `status === 'TO_APPROVE'` | computed client-side |
| Latest Net Salary | `netSalary` from most recent payroll record | payroll API |

Component: `StatCard` (existing — replace hardcoded props with real data).

#### 3.2 Working Hours Bar Chart *(replaces mock `ReportsChart`)*

Component: `WorkingHoursBarChart` *(new)*

**Chart type:** `BarChart` (recharts)

| Property | Value |
|----------|-------|
| X-axis | Day of month (1–31) |
| Y-axis | `workingHour` (hours, 0–12) |
| Bar fill | Blue (`#6366f1`) for on-time days, amber (`#f59e0b`) for late days (`violate === true`) |
| Reference line | Dashed horizontal at y = 8 (standard working hours) |
| Tooltip | `{date}: {workingHour}h worked · {checkIn} → {checkOut}` |

**Data source:** attendance list already fetched for stat cards — zero extra API calls.

**Why it fits:** Gives an immediate visual of work pattern this month. Late days stand out
in amber without needing a separate query. Simple BarChart keeps implementation trivial.

#### 3.3 Attendance Summary Donut *(replaces mock `AttendanceRadarChart`)*

Component: `AttendanceSummaryDonut` *(new)*

**Chart type:** `PieChart` with `innerRadius` (donut) (recharts)

| Slice | Value | Color |
|-------|-------|-------|
| On-time | Days present with `violate === false` | Green `#10b981` |
| Late | Days present with `violate === true` | Amber `#f59e0b` |
| Absent | Standard working days − days present | Red `#ef4444` |

Center label: `{workingDay} / {standardDays} days` (standard days = calendar working days in month).

**Data source:** same attendance API call — zero extra API calls.

**Why it fits:** A compact three-slice donut is immediately readable and replaces the
department-scoped radar chart that makes no sense on a personal dashboard.

#### 3.4 My Salary Trend *(analytical chart — extra API call)*

Component: `MySalaryTrendChart` *(new)*

**Chart type:** `LineChart` (recharts)

| Property | Value |
|----------|-------|
| X-axis | Last 6 payroll periods (e.g. `Nov · Dec · Jan · Feb · Mar · Apr`) |
| Y-axis | `netSalary` (VND, formatted in million) |
| Line | Single smooth line, color `#10b981` (green — personal income) |
| Area fill | Light green fill under the line for visual depth (`fillOpacity: 0.1`) |
| Tooltip | `{month} {year}: {netSalary} VND` |

**Why it fits:** An employee's most common question after viewing their payslip is "is my pay
going up?". A 6-point line chart answers this directly. Salary data is personal and already
scoped by the `/my` endpoint — no privacy concern. The `lateHour` penalty impact on net
salary becomes visible across months without any extra computation.

**Data source:** `getMyPayrolls(0, 6)` — **1 extra API call** at mount.

Records are already sorted newest-first; reverse for chronological display.

#### 3.5 My Attendance Detail Table

Component: `AttendanceMonthTable` *(new — lightweight inline table)*

Columns: Date · Check-in · Check-out · Working Hours · Status badge (On-time / Late)

Month/year picker navigates to past months (triggers a new `getAttendances` call for that period).

#### 3.6 My Leave Requests (mini list)

Component: `MiniRequestTable` *(new — reusable for leave and OT)*

Columns: Date range · Reason (truncated) · Status badge · Created at

Shows last 5 records. "View all →" links to `/employees/leave`.

#### 3.7 My OT Requests (mini list)

Same `MiniRequestTable` component, OT data source.
"View all →" links to `/employees/ot`.

### API Calls

```ts
// On mount — all called in parallel via Promise.all
GET /api/attendances/my?from=YYYY-MM-01&to=YYYY-MM-31&page=0&size=31
  → AttendanceService.getAttendances({ from, to, page: 0, size: 31 })
  → Feeds: Working Days card, Late Days card,
           WorkingHoursBarChart, AttendanceSummaryDonut, AttendanceMonthTable

GET /api/leaves/my?page=0&size=10
  → LeaveService.getLeaves(0, 10)
  → Feeds: Pending Leaves card, MiniRequestTable (leave)

GET /api/ot-requests/my?page=0&size=10
  → OTRequestService.getOTRequests(0, 10)
  → Feeds: MiniRequestTable (OT)

GET /api/payrolls/my?page=0&size=6          ← extra call for salary trend
  → PayrollService.getMyPayrolls(0, 6)
  → Feeds: Latest Net Salary card (first record) + MySalaryTrendChart (all 6)
```

---

## 4. LEADER Dashboard

**Route:** `/employees/dashboard`
**Allowed roles:** `LEADER`
**Component file (proposed):** `components/dashboard/LeaderDashboard.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [All EMPLOYEE sections — identical top portion]                  │
│  Stat cards · WorkingHoursBarChart · Donut · Table · Lists       │
├──────────────────────────────────────────────────────────────────┤
│ Team Approvals — Needs Action                                     │
├───────────────────────────────┬──────────────────────────────────┤
│ Pending Leave Requests        │ Pending OT Requests              │
│ ApprovalMiniTable             │ ApprovalMiniTable                │
│ (last 5 TO_APPROVE, actions)  │ (last 5 TO_APPROVE, actions)    │
├───────────────────────────────┴──────────────────────────────────┤
│ Request Status Breakdown — This Month                            │
│ RequestStatusPieChart  (leave + OT by status)                   │
└──────────────────────────────────────────────────────────────────┘
```

### Additional Sections (beyond EMPLOYEE)

#### 4.1 Pending Leave Requests

Component: `ApprovalMiniTable` *(new)*

Columns: Employee · Date range · Reason (truncated) · Status badge · [Approve] [Reject]

Inline approve/reject calls `LeaveService.approveLeave` / `rejectLeave`, then re-fetches.
"View all →" links to `/managers/request`.

> The existing `RequestTableWithActions` (`components/request/`) is the full-featured version.
> `ApprovalMiniTable` is a lighter dashboard variant.

#### 4.2 Pending OT Requests

Same `ApprovalMiniTable`, OT data source. Inline actions call `OTRequestService`.

#### 4.3 Request Status Breakdown Pie *(new chart)*

Component: `RequestStatusPieChart` *(new)*

**Chart type:** `PieChart` (recharts), two side-by-side pies or a grouped view

| Pie | Slices | Color mapping |
|-----|--------|---------------|
| Leave requests | TO_APPROVE / APPROVED / REJECTED / DRAFT | Blue/Green/Red/Gray |
| OT requests | same statuses | same colors |

**Data source:** already fetched leave and OT lists — zero extra API calls.

**Why it fits:** Helps a leader see at a glance whether their team's requests are being
processed or piling up. Simple pie, no complex computation.

### API Calls

```ts
// All EMPLOYEE calls, plus:
GET /api/leaves?status=TO_APPROVE&page=0&size=10
  → LeaveService (manager-scoped endpoint)
  → Feeds: ApprovalMiniTable (leave), RequestStatusPieChart

GET /api/ot-requests?status=TO_APPROVE&page=0&size=10
  → OTRequestService (manager-scoped endpoint)
  → Feeds: ApprovalMiniTable (OT), RequestStatusPieChart

// Inline actions on button click:
PUT /api/leaves/{id}/approve        → LeaveService.approveLeave(id)
PUT /api/leaves/{id}/reject         → LeaveService.rejectLeave(id)
PUT /api/ot-requests/{id}/approve   → OTRequestService.approveOTRequest(id)
PUT /api/ot-requests/{id}/reject    → OTRequestService.rejectOTRequest(id)
```

---

## 5. MANAGER Dashboard

**Route:** `/employees/dashboard`
**Allowed roles:** `MANAGER`
**Component file (proposed):** `components/dashboard/ManagerDashboard.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [All LEADER sections — personal stats, charts, approval tables]  │
├──────────────────────────────────────────────────────────────────┤
│ Department Overview                                               │
├───────────┬───────────┬───────────┬──────────────────────────────┤
│ Total     │ Active    │ On Leave  │ Pending                      │
│ Headcount │           │           │ Requests                     │
│ StatCard  │ StatCard  │ StatCard  │ StatCard                     │
├───────────┴───────────┴───────────┴──────────────────────────────┤
│ Member Status Breakdown          │ Department Members             │
│ DeptStatusDonut                  │ DeptMemberTable                │
│ (Active / On Leave / Inactive)   │ (id · name · role · status)   │
└──────────────────────────────────┴───────────────────────────────┘
```

### Additional Sections (beyond LEADER)

#### 5.1 Department Stat Cards

| Card | Value | Source |
|------|-------|--------|
| Total Headcount | `totalElements` from employee list | EmployeeService |
| Active | Count with `status === 'ACTIVE'` | computed |
| On Leave | Count with `status === 'ON_LEAVE'` | computed |
| Pending Requests | Sum of pending leave + OT (from existing calls) | computed |

#### 5.2 Department Status Donut *(new chart)*

Component: `DeptStatusDonut` *(new)*

**Chart type:** `PieChart` with inner radius (recharts)

| Slice | Value | Color |
|-------|-------|-------|
| Active | `status === 'ACTIVE'` count | Green `#10b981` |
| On Leave | `status === 'ON_LEAVE'` count | Amber `#f59e0b` |
| Inactive | `status === 'INACTIVE'` count | Gray `#9ca3af` |

**Data source:** `getEmployees(departmentId)` already fetched for the headcount cards —
zero extra API calls.

**Why it fits:** A manager's key daily question is "who is available today?". A three-slice
donut answers this instantly. Small scope, high value.

#### 5.3 Department Member Table

Component: `DeptMemberTable` *(new)*

Columns: Employee ID · Name · Role · Status badge

### API Calls

```ts
// All LEADER calls, plus:
GET /api/departments
  → DepartmentService.getDepartments()
  → Resolve manager's own departmentId from user context

GET /api/employees?departmentId={id}&page=0&size=50
  → EmployeeService.getEmployees(0, 50, departmentId)
  → Feeds: all 4 dept StatCards, DeptStatusDonut, DeptMemberTable
```

---

## 6. HR_ADMIN Dashboard

**Route:** `/employees/dashboard`
**Allowed roles:** `HR_ADMIN`
**Component file (proposed):** `components/dashboard/HrDashboard.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ HR Overview                                 [Month / Year picker] │
├───────────┬───────────┬───────────┬──────────────────────────────┤
│ Total     │ Payrolls  │ Approved  │ Expiring                     │
│ Employees │ This Month│ Payrolls  │ Contracts (≤30d)             │
│ StatCard  │ StatCard  │ StatCard  │ StatCard                     │
├───────────┴───────────┴───────────┴──────────────────────────────┤
│ Payroll — 6-Month Net Salary Trend          [recharts LineChart]  │
│ PayrollTrendChart                                                  │
│ (x = month label, y = sum of netSalary, one line = total output) │
├──────────────────────────────────────────────────────────────────┤
│ Payroll Cost Breakdown — This Month                               │
│ PayrollCostBreakdownBar  (stacked: Net | PIT | BHXH | BHYT | BHTN)│
├────────────────────────────────────┬─────────────────────────────┤
│ Payroll Status — This Month        │ Headcount by Department      │
│ PayrollStatusBreakdown             │ DeptHeadcountChart           │
│ (DRAFT / APPROVED / PAID          │ (horizontal BarChart)        │
│  stacked progress bar + counts)   │ (x = count, y = dept name)  │
├────────────────────────────────────┴─────────────────────────────┤
│ Contract Type Distribution   │ Leave Approval Rate — Last 30 Days │
│ ContractTypeChart (donut)    │ LeaveApprovalRateChart (donut)     │
│ (INDEFINITE/FIXED/PROBATION) │ (Approved / Rejected / Pending)   │
├──────────────────────────────┴────────────────────────────────────┤
│ Pending Approvals (all employees)                                  │
│ ApprovalMiniTable — leave + OT combined, "Manage all →" link      │
└───────────────────────────────────────────────────────────────────┘
```

### Sections & Components

#### 6.1 Stat Cards

| Card | Value | Source |
|------|-------|--------|
| Total Employees | `totalElements` | `getEmployees(0, 1)` |
| Payrolls This Month | `totalElements` from period query | `getPayrollsByPeriod` |
| Approved Payrolls | Count of `status === 'APPROVED'` | computed from period query |
| Expiring Contracts (≤30d) | Contracts with `endDate` within 30 days | computed from `getContracts` |

#### 6.2 Payroll 6-Month Net Salary Trend *(new chart)*

Component: `PayrollTrendChart` *(new)*

**Chart type:** `LineChart` (recharts) — replaces or extends the existing mock `ReportsChart`

| Property | Value |
|----------|-------|
| X-axis | Last 6 month labels (e.g. `Nov · Dec · Jan · Feb · Mar · Apr`) |
| Y-axis | Sum of `netSalary` across all employees (formatted in million VND) |
| Line | Single line, color `#6366f1`, with dots |
| Tooltip | `{month}: {totalNetSalary} VND ({n} employees)` |

**Data source:** 6 parallel calls to `getPayrollsByPeriod` for the past 6 months.
Each response is `data.content` — sum the `netSalary` field.

> **Extra API calls: 6** (one per past month). Each returns a paginated list; use `size=200`
> to capture all employees in one page for typical company sizes. If the org grows beyond
> ~200 employees, paginate or add a backend aggregation endpoint.

**Why it fits:** HR's most important month-end question is "are payroll costs trending up or
down?". A 6-point line chart gives that answer with minimal implementation effort. The
recharts `LineChart` is already in the project.

#### 6.3 Payroll Status Breakdown

Component: `PayrollStatusBreakdown` *(new)*

**Visual:** Horizontal stacked progress bar + counts below it.

| Segment | Count | Color |
|---------|-------|-------|
| DRAFT | count of DRAFT records | Amber `#f59e0b` |
| APPROVED | count of APPROVED | Blue `#6366f1` |
| PAID | count of PAID | Green `#10b981` |

Width of each segment = `count / total * 100%`.

**Data source:** same `getPayrollsByPeriod` call as the stat cards — zero extra calls.

Month/year picker updates the underlying call and re-renders this and the stat cards together.

#### 6.4 Headcount by Department

Component: `DeptHeadcountChart` *(new)*

**Chart type:** `BarChart` horizontal layout (recharts)

| Property | Value |
|----------|-------|
| Y-axis | Department names (from `getDepartments`) |
| X-axis | Employee count |
| Bar fill | `#6366f1` |
| Tooltip | `{deptName}: {count} employees` |

**Data source:** one `getEmployees(0, 1, departmentId)` call per department to read
`totalElements`. Runs in parallel via `Promise.all(departments.map(...))`.

> For a typical org with ≤20 departments, this is 20 lightweight calls. Acceptable scope.

#### 6.5 Payroll Cost Breakdown — Gross vs Deductions vs Net *(analytical chart)*

Component: `PayrollCostBreakdownBar` *(new)*

**Chart type:** Horizontal stacked `BarChart` (recharts), single aggregate bar

| Segment | Value | Color |
|---------|-------|-------|
| Net Salary | Sum of all `netSalary` | Green `#10b981` |
| PIT | Sum of all `pit` | Red `#ef4444` |
| BHXH (employee) | Sum of all `bhxhEmployee` | Amber `#f59e0b` |
| BHYT (employee) | Sum of all `bhytEmployee` | Orange `#f97316` |
| BHTN (employee) | Sum of all `bhtnEmployee` | Yellow `#eab308` |

Tooltip: `Total Gross: {X VND} · Net: {Y VND} · Total Deductions: {Z VND}`

Below the bar: summary numbers — Total Gross / Total Deductions / Total Net — formatted in
million VND for readability.

**Data source:** same `getPayrollsByPeriod` call already used for stat cards — zero extra calls.

**Why it fits:** Finance and HR leadership want to know not just how much was paid out, but
how the total payroll cost is structured. Insurance and PIT are significant cost drivers
that are invisible from net salary alone. The data is all in `Payroll` fields already fetched.

#### 6.6 Contract Type Distribution *(analytical chart)*

Component: `ContractTypeChart` *(new)*

**Chart type:** `PieChart` (donut) (recharts)

| Slice | Value | Color |
|-------|-------|-------|
| INDEFINITE | Count of indefinite contracts | Blue `#6366f1` |
| FIXED_TERM | Count of fixed-term contracts | Green `#10b981` |
| PROBATION | Count of probation contracts | Amber `#f59e0b` |

Center label: total active contracts.

**Data source:** `getContracts()` — already fetched for the Expiring Contracts card.
Filter by `status === 'ACTIVE'` before counting.

**Why it fits:** The ratio of probation/fixed-term/indefinite reflects workforce stability.
A high probation ratio indicates heavy recent hiring or high turnover. Zero extra calls.

#### 6.7 Leave Approval Rate — Last 30 Days *(analytical chart — extra API call)*

Component: `LeaveApprovalRateChart` *(new)*

**Chart type:** `PieChart` (donut) (recharts)

| Slice | Condition | Color |
|-------|-----------|-------|
| Approved | `status === 'APPROVED'` | Green `#10b981` |
| Rejected | `status === 'REJECTED'` | Red `#ef4444` |
| Pending | `status === 'TO_APPROVE'` | Amber `#f59e0b` |
| Draft | `status === 'DRAFT'` | Gray `#9ca3af` |

Center label: approval rate `%` (Approved / (Approved + Rejected) × 100).

**Data source:** requires a separate call for resolved leave requests (not just `TO_APPROVE`).

**Extra API call:** `GET /api/leaves?page=0&size=200` — **1 extra call** at mount.

Fetched once on load; no picker needed. Combine with the `TO_APPROVE` call result.

**Why it fits:** A persistently low approval rate signals that either leave policy is too
strict or managers are not processing requests. Actionable for HR.

#### 6.8 Pending Approvals Mini-Table

Component: `ApprovalMiniTable` (reused from LEADER)

Combined leave + OT requests awaiting approval, across all employees.
"Manage all →" links to `/managers/request`.

### API Calls

```ts
// On mount — parallel via Promise.all
GET /api/employees?page=0&size=1
  → EmployeeService.getEmployees(0, 1)
  → data.totalElements → Total Employees card

GET /api/payrolls/period?year={Y}&month={M}&page=0&size=200
  → PayrollService.getPayrollsByPeriod(year, month, 0, 200)
  → Feeds: Payrolls card, Approved card,
           PayrollStatusBreakdown, PayrollCostBreakdownBar

GET /api/contracts
  → ContractService.getContracts()
  → Filter endDate ≤ today+30d → Expiring Contracts card
  → Group by contractType (active only) → ContractTypeChart

GET /api/departments
  → DepartmentService.getDepartments()
  → Feeds: DeptHeadcountChart labels

// Per-department headcount (parallel):
GET /api/employees?departmentId={id}&page=0&size=1   (× number of departments)
  → EmployeeService.getEmployees(0, 1, departmentId)
  → data.totalElements per dept → DeptHeadcountChart bars

// Pending approvals:
GET /api/leaves?status=TO_APPROVE&page=0&size=10
  → Feeds: ApprovalMiniTable

GET /api/ot-requests?status=TO_APPROVE&page=0&size=10
  → Feeds: ApprovalMiniTable

// ── Extra analytical calls ────────────────────────────────────────

// Payroll trend (6 parallel calls, one per past month):
GET /api/payrolls/period?year={Y}&month={M}&page=0&size=200   (× 6 months)
  → PayrollService.getPayrollsByPeriod(year, month, 0, 200)
  → Sum netSalary per month → PayrollTrendChart

// Leave approval rate across all employees (not just TO_APPROVE):
GET /api/leaves?page=0&size=200
  → getAllLeaves(0, 200)   ← new service function needed (manager-scoped, no /my)
  → Group by status → LeaveApprovalRateChart
```

> **Backend note:** `LeaveService.getLeaves` currently calls `/api/leaves/my`. A
> manager-scoped overload (e.g. `getAllLeaves(page, size)` → `GET /api/leaves`) must be
> added to `LeaveService.ts` for use in HR and LEADER dashboards.

---

## 7. SYSTEM_ADMIN Dashboard

**Route:** `/employees/dashboard`
**Allowed roles:** `SYSTEM_ADMIN`
**Component file (proposed):** `components/dashboard/SystemAdminDashboard.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [All HR_ADMIN sections — stat cards, trend chart, status bars,  │
│   headcount chart, pending approvals]                             │
├──────────────────────────────────────────────────────────────────┤
│ Payroll Config — Active Versions                                  │
├──────────┬──────────┬──────────┬──────────────────────────────── ┤
│SALARY_   │ALLOWANCE │ PIT      │ INSURANCE                       │
│GRADE     │          │          │                                 │
│ActiveCfg │ActiveCfg │ActiveCfg │ActiveCfg                       │
│Card      │Card      │Card      │Card                            │
│          │          │          │  "Manage →" /system/config     │
└──────────┴──────────┴──────────┴─────────────────────────────────┘
```

### Additional Sections (beyond HR_ADMIN)

#### 7.1 Active Config Cards

Component: `ActiveConfigCard` *(new)*

One card per config type (`SALARY_GRADE`, `ALLOWANCE`, `PIT`, `INSURANCE`). Each shows:
- Config type label
- Active version string (e.g. `2026`)
- Effective date
- Legal basis (truncated to one line)
- "Manage →" link to `/system/config`

**Warning state:** if no active version exists for a type → card renders with a red border
and a `⚠ No active config` badge. The payroll engine will fail for that type — this is a
critical signal.

**No new visual chart needed here** — the active/inactive information is already clearly
presented in the `/system/config` management page. The dashboard cards serve as a health
status summary only.

### API Calls

```ts
// All HR_ADMIN calls, plus:
Promise.all([
  SystemConfigService.getSystemConfigs('SALARY_GRADE'),
  SystemConfigService.getSystemConfigs('ALLOWANCE'),
  SystemConfigService.getSystemConfigs('PIT'),
  SystemConfigService.getSystemConfigs('INSURANCE'),
])
// For each: filter active === true → ActiveConfigCard
```

---

## 8. Component Inventory

### Existing Components (require updates)

| Component | File | Current State | Required Change |
|-----------|------|---------------|-----------------|
| `DashboardContent` | `components/dashboard/DashboardContent.tsx` | Static mock, no role dispatch | Add role-aware dispatch by `useAuth().role` |
| `StatCard` | `components/dashboard/StatCard.tsx` | Wired to props correctly | Replace hardcoded call-sites with real data |
| `AttendanceRadarChart` | `components/dashboard/AttendanceRadarChart.tsx` | Mock department radar (wrong for personal view) | Replace with `AttendanceSummaryDonut` |
| `ReportsChart` | `components/dashboard/ReportsChart.tsx` | Mock hourly time-series (no meaning) | Replace with `WorkingHoursBarChart` |

### New Components to Build

#### Dashboard sub-pages

| Component | File | Used by |
|-----------|------|---------|
| `EmployeeDashboard` | `components/dashboard/EmployeeDashboard.tsx` | `EMPLOYEE` |
| `LeaderDashboard` | `components/dashboard/LeaderDashboard.tsx` | `LEADER` |
| `ManagerDashboard` | `components/dashboard/ManagerDashboard.tsx` | `MANAGER` |
| `HrDashboard` | `components/dashboard/HrDashboard.tsx` | `HR_ADMIN` |
| `SystemAdminDashboard` | `components/dashboard/SystemAdminDashboard.tsx` | `SYSTEM_ADMIN` |

#### Tables

| Component | File | Used by |
|-----------|------|---------|
| `AttendanceMonthTable` | `components/dashboard/AttendanceMonthTable.tsx` | `EMPLOYEE`+ |
| `MiniRequestTable` | `components/dashboard/MiniRequestTable.tsx` | `EMPLOYEE`+ |
| `ApprovalMiniTable` | `components/dashboard/ApprovalMiniTable.tsx` | `LEADER`+ |
| `DeptMemberTable` | `components/dashboard/DeptMemberTable.tsx` | `MANAGER`+ |

#### Charts

| Component | File | Chart type | Used by | Extra API calls |
|-----------|------|------------|---------|-----------------|
| `WorkingHoursBarChart` | `components/dashboard/WorkingHoursBarChart.tsx` | `BarChart` — daily hours, late days in amber | `EMPLOYEE`+ | 0 |
| `AttendanceSummaryDonut` | `components/dashboard/AttendanceSummaryDonut.tsx` | `PieChart` (donut) — on-time / late / absent | `EMPLOYEE`+ | 0 |
| `MySalaryTrendChart` | `components/dashboard/MySalaryTrendChart.tsx` | `LineChart` with area fill — personal 6-month salary | `EMPLOYEE`+ | 1 |
| `RequestStatusPieChart` | `components/dashboard/RequestStatusPieChart.tsx` | `PieChart` — leave + OT by status | `LEADER`+ | 0 |
| `DeptStatusDonut` | `components/dashboard/DeptStatusDonut.tsx` | `PieChart` (donut) — Active / On Leave / Inactive | `MANAGER`+ | 0 |
| `DeptHeadcountChart` | `components/dashboard/DeptHeadcountChart.tsx` | `BarChart` horizontal — count per dept | `HR_ADMIN`+ | N (one per dept) |
| `PayrollTrendChart` | `components/dashboard/PayrollTrendChart.tsx` | `LineChart` — 6-month total net salary | `HR_ADMIN`+ | 6 |
| `PayrollStatusBreakdown` | `components/dashboard/PayrollStatusBreakdown.tsx` | Stacked progress bar (CSS) — DRAFT/APPROVED/PAID | `HR_ADMIN`+ | 0 |
| `PayrollCostBreakdownBar` | `components/dashboard/PayrollCostBreakdownBar.tsx` | `BarChart` stacked — Net/PIT/BHXH/BHYT/BHTN | `HR_ADMIN`+ | 0 |
| `ContractTypeChart` | `components/dashboard/ContractTypeChart.tsx` | `PieChart` (donut) — INDEFINITE/FIXED_TERM/PROBATION | `HR_ADMIN`+ | 0 |
| `LeaveApprovalRateChart` | `components/dashboard/LeaveApprovalRateChart.tsx` | `PieChart` (donut) — Approved/Rejected/Pending | `HR_ADMIN`+ | 1 |

#### Config widgets

| Component | File | Used by |
|-----------|------|---------|
| `ActiveConfigCard` | `components/dashboard/ActiveConfigCard.tsx` | `SYSTEM_ADMIN` |

### Services Used

| Service | File | Functions |
|---------|------|-----------|
| `AttendanceService` | `services/AttendanceService.ts` | `getAttendances` |
| `LeaveService` | `services/LeaveService.ts` | `getLeaves`, `approveLeave`, `rejectLeave` |
| `OTRequestService` | `services/OTRequestService.ts` | `getOTRequests`, `approveOTRequest`, `rejectOTRequest` |
| `PayrollService` | `services/PayrollService.ts` | `getMyPayrolls`, `getPayrollsByPeriod` |
| `EmployeeService` | `services/EmployeeService.ts` | `getEmployees` |
| `DepartmentService` | `services/DepartmentService.ts` | `getDepartments` |
| `ContractService` | `services/ContractService.ts` | `getContracts` |
| `SystemConfigService` | `services/SystemConfigService.ts` | `getSystemConfigs` |

---

## 9. Implementation Status

| Dashboard | Status | Notes |
|-----------|--------|-------|
| `EMPLOYEE` | Skeleton — mock data | `DashboardContent` renders `StatCard`, `ReportsChart`, `AttendanceRadarChart` with hardcoded values. No API calls wired. |
| `LEADER` | Not started | Falls through to EMPLOYEE skeleton. |
| `MANAGER` | Not started | Falls through to EMPLOYEE skeleton. |
| `HR_ADMIN` | Not started | Falls through to EMPLOYEE skeleton. |
| `SYSTEM_ADMIN` | Not started | Falls through to EMPLOYEE skeleton. `/system/config` management page is complete. |

### Build Order (dependency-first)

```
1.  WorkingHoursBarChart        ← BarChart, no deps, replaces ReportsChart
2.  AttendanceSummaryDonut      ← PieChart, no deps, replaces AttendanceRadarChart
3.  MySalaryTrendChart          ← LineChart + area, 1 extra call (getMyPayrolls)
4.  AttendanceMonthTable        ← simple table
5.  MiniRequestTable            ← simple table, reused for leave + OT
6.  EmployeeDashboard           ← composes 1–5 + StatCard + real API calls
    └─ Update DashboardContent to dispatch for EMPLOYEE role

7.  RequestStatusPieChart       ← PieChart, data from existing calls
8.  ApprovalMiniTable           ← table with inline actions
9.  LeaderDashboard             ← composes EmployeeDashboard + 7 + 8
    └─ Update DashboardContent dispatch for LEADER
    └─ Add getAllLeaves() to LeaveService.ts (manager-scoped endpoint)

10. DeptStatusDonut             ← PieChart, data from existing dept call
11. DeptMemberTable             ← simple table
12. ManagerDashboard            ← composes LeaderDashboard + 10 + 11 + dept StatCards
    └─ Update DashboardContent dispatch for MANAGER

13. PayrollTrendChart           ← LineChart, 6 extra parallel API calls
14. DeptHeadcountChart          ← BarChart horizontal, N per-dept calls
15. PayrollStatusBreakdown      ← CSS stacked bar (no chart lib needed)
16. PayrollCostBreakdownBar     ← BarChart stacked, 0 extra calls
17. ContractTypeChart           ← PieChart, data from existing getContracts call
18. LeaveApprovalRateChart      ← PieChart, 1 extra call (getAllLeaves)
19. ActiveConfigCard            ← display-only card
20. HrDashboard                 ← composes 13–18 + dept sections
    └─ Update DashboardContent dispatch for HR_ADMIN

21. SystemAdminDashboard        ← composes HrDashboard + 19
    └─ Update DashboardContent dispatch for SYSTEM_ADMIN
```

### Charts Not Included (out of scope)

| Chart idea | Reason excluded |
|------------|-----------------|
| Leave quota vs. used | No leave quota/balance endpoint in the backend |
| Per-employee attendance heatmap | Requires a calendar heatmap library not currently in the project |
| Department attendance rate trend | Would need per-employee attendance data across months — too many calls at current scale |
| KPI score distribution histogram | KPI values exist only inside `Payroll` records (no standalone metric); distribution is misleading without more context |
| Revenue / productivity trend | Outside HRMS scope — no revenue data in the system |
| Turnover rate chart | Requires tracking employee exit dates; `Employee.status = TERMINATED` exists but no exit-date field is exposed |
| New hire trend (hires per month) | `dateOfJoining` is available on `Employee`, but filtering by joining month requires either a backend date-range parameter or fetching all employees — feasible if employee count is small, revisit when needed |
