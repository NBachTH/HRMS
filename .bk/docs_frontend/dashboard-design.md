# Dashboard Design — FaceZ HRMS

Role-specific dashboard specifications: layout sections, charts, components, and API calls for each view.

**Chart library in use:** [Recharts](https://recharts.org) — already a project dependency
(`BarChart`, `LineChart`, `PieChart`, `AreaChart`, `ResponsiveContainer` all available).

**Scope principle:** Every chart on this page is derived from data that the same dashboard
already fetches for its tables and stat cards. No chart requires an extra API call unless
explicitly noted with *(extra call)*.

---

## Table of Contents

1. [Route Strategy](#1-route-strategy)
2. [Shared Infrastructure](#2-shared-infrastructure)
3. [EMPLOYEE Dashboard](#3-employee-dashboard)
4. [LEADER / MANAGER Dashboard](#4-leader--manager-dashboard)
5. [HR_ADMIN Dashboard](#5-hr_admin-dashboard)
6. [SYSTEM_ADMIN Dashboard](#6-system_admin-dashboard)
7. [Component Inventory](#7-component-inventory)
8. [Implementation Status](#8-implementation-status)

---

## 1. Route Strategy

All roles land on `/employees/dashboard`. `DashboardContent` reads `role` from `useAuth()`
and delegates to a role-specific sub-component.

```
/employees/dashboard
        │
        ├─ role = EMPLOYEE      → <EmployeeDashboard />
        ├─ role = LEADER        → <ManagerDashboard />   (shared — approval filter differs)
        ├─ role = MANAGER       → <ManagerDashboard />   (shared — approval filter differs)
        ├─ role = HR_ADMIN      → <HrDashboard />
        └─ role = SYSTEM_ADMIN  → <SystemAdminDashboard />
```

**LEADER and MANAGER share one component.** The approval section filters on different statuses
(LEADER sees `TO_APPROVE`, MANAGER sees `LEADER_APPROVED`) but the layout and other sections
are identical. The department section is conditionally rendered only when `role === 'MANAGER'`.

---

## 2. Shared Infrastructure

### Layout (unchanged)

```tsx
// app/employees/dashboard/page.tsx
<ProtectedRoute>
  <Sidebar />
  <Header />
  <main>
    <DashboardContent />   // role-dispatch hub
  </main>
</ProtectedRoute>
```

### Shared UI Primitives

| Component | File | Purpose |
|-----------|------|---------|
| `StatCard` | `components/dashboard/StatCard.tsx` | Single KPI card (value + label + optional sub-text) |
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

**Component file:** `components/dashboard/EmployeeDashboard.tsx`  
**Roles:** `EMPLOYEE` (and higher roles inherit this as their personal section)

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
│ (daily working hours per day)    │  (on-time / late / absent)    │
├──────────────────────────────────┴──────────────────────────────-┤
│ My Salary Trend — Last 6 Months     *(extra call)*               │
│ MySalaryTrendChart (LineChart + area fill)                        │
├──────────────────────────────────────────────────────────────────┤
│ My Attendance Detail                          [month/year picker] │
│ AttendanceMonthTable (date | check-in | check-out | hrs | status)│
├────────────────────────────┬─────────────────────────────────────┤
│ My Leave Requests          │ My OT Requests                      │
│ MiniRequestTable (last 5)  │ MiniRequestTable (last 5)           │
└────────────────────────────┴─────────────────────────────────────┘
```

### Sections & Components

#### 3.1 Stat Cards

| Card | Value | Source |
|------|-------|--------|
| Working Days (MTD) | Sum of `workingDay` from attendance records this month | computed client-side |
| Late Days (MTD) | Count of records where `violate === true` | computed client-side |
| Pending Leaves | Count of leave records with `status === 'TO_APPROVE'` | computed client-side |
| Latest Net Salary | `netSalary` from the most recent payroll record | payroll API |

#### 3.2 Working Hours Bar Chart *(replaces mock `ReportsChart`)*

Component: `WorkingHoursBarChart` *(new)*  
**Chart type:** `BarChart` (recharts)

| Property | Value |
|----------|-------|
| X-axis | Day of month (1–31) |
| Y-axis | `workingHour` (0–12) |
| Bar fill | Blue `#6366f1` for on-time, amber `#f59e0b` for late (`violate === true`) |
| Reference line | Dashed horizontal at y = 8 (standard hours) |
| Tooltip | `{date}: {workingHour}h worked · {checkIn} → {checkOut}` |

**Data source:** attendance list already fetched for stat cards — zero extra API calls.

#### 3.3 Attendance Summary Donut *(replaces mock `AttendanceRadarChart`)*

Component: `AttendanceSummaryDonut` *(new)*  
**Chart type:** `PieChart` with `innerRadius` (recharts)

| Slice | Value | Color |
|-------|-------|-------|
| On-time | `violate === false` days | Green `#10b981` |
| Late | `violate === true` days | Amber `#f59e0b` |
| Absent | Standard days − days present | Red `#ef4444` |

Center label: `{workingDay} / {standardDays} days`.  
**Data source:** same attendance call — zero extra API calls.

#### 3.4 My Salary Trend *(extra call)*

Component: `MySalaryTrendChart` *(new)*  
**Chart type:** `AreaChart` (recharts) — use `Area` + `Line` from recharts (not `LineChart` alone)

| Property | Value |
|----------|-------|
| X-axis | Last 6 payroll periods (e.g. `Nov · Dec · Jan · Feb · Mar · Apr`) |
| Y-axis | `netSalary` formatted in million VND |
| Line + fill | Green `#10b981`, fill `fillOpacity: 0.1` |
| Tooltip | `{month} {year}: {netSalary} VND` |

**Data source:** `getMyPayrolls(0, 6)` — **1 extra API call** at mount.  
Records come newest-first; reverse array before rendering.  
`Latest Net Salary` card also reads from the first record of this same response.

#### 3.5 My Attendance Detail Table

Component: `AttendanceMonthTable` *(new)*

Columns: Date · Check-in · Check-out · Working Hours · Status badge (On-time / Late)

Month/year picker triggers a new `getMyAttendances(from, to)` call for the selected period.

#### 3.6 My Leave Requests (mini list)

Component: `MiniRequestTable` *(new — reused for leave and OT)*

Columns: Date range · Reason (truncated) · Status badge  
Shows last 5 records. "View all →" links to `/employees/leave`.

#### 3.7 My OT Requests (mini list)

Same `MiniRequestTable`, OT data. "View all →" links to `/employees/ot`.

### API Calls — EMPLOYEE

```ts
// On mount — all parallel via Promise.all
GET /api/attendances/my?from=YYYY-MM-01&to=YYYY-MM-31&page=0&size=31
  → Feeds: Working Days card, Late Days card,
           WorkingHoursBarChart, AttendanceSummaryDonut, AttendanceMonthTable

GET /api/leaves/my?page=0&size=10
  → Feeds: Pending Leaves card, MiniRequestTable (leave)

GET /api/ot-requests/my?page=0&size=10
  → Feeds: MiniRequestTable (OT)

GET /api/payrolls/my?page=0&size=6          ← extra call for salary trend + latest salary card
  → Feeds: Latest Net Salary card (first record), MySalaryTrendChart (all 6)

// Total: 4 calls on mount
```

---

## 4. LEADER / MANAGER Dashboard

**Component file:** `components/dashboard/ManagerDashboard.tsx`  
**Roles:** `LEADER` and `MANAGER` (shared component, role-conditional behavior)

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [All EMPLOYEE sections]                                          │
│  Stat cards · Charts · AttendanceMonthTable · MiniRequestTables  │
├──────────────────────────────────────────────────────────────────┤
│ Team Approvals — Needs Action                                     │
├───────────────────────────────┬──────────────────────────────────┤
│ Pending Leave Requests        │ Pending OT Requests              │
│ ApprovalMiniTable             │ ApprovalMiniTable                │
│                               │                                  │
│ LEADER: status=TO_APPROVE     │ LEADER: status=TO_APPROVE        │
│ MANAGER: status=LEADER_       │ MANAGER: status=LEADER_          │
│          APPROVED             │          APPROVED                │
├───────────────────────────────┴──────────────────────────────────┤
│ Request Status Breakdown — This Month                            │
│ RequestStatusPieChart  (leave + OT by status)                   │
├──────────────────────────────────────────────────────────────────┤
│ [MANAGER only] Department Overview                               │
├───────────┬───────────┬───────────┬──────────────────────────────┤
│ Total     │ Active    │ On Leave  │ Pending                      │
│ Headcount │           │           │ Requests                     │
│ StatCard  │ StatCard  │ StatCard  │ StatCard                     │
├───────────┴───────────┴───────────┴──────────────────────────────┤
│ [MANAGER only] Member Status    │ [MANAGER only] Dept Members    │
│ DeptStatusDonut                 │ DeptMemberTable                │
│ (Active / On Leave / Inactive)  │ (id · name · role · status)   │
└─────────────────────────────────┴──────────────────────────────── ┘
```

### Additional Sections (beyond EMPLOYEE)

#### 4.1 Pending Leave / OT Approvals

Component: `ApprovalMiniTable` *(new)*

Columns: Employee · Date range · Reason (truncated) · Status badge · [Approve] [Reject]

Inline approve/reject calls the appropriate service method then re-fetches the list.
"View all →" links to `/managers/request`.

**Role-based status filter:**

| Role | Leave filter | OT filter |
|------|-------------|-----------|
| `LEADER` | `status=TO_APPROVE` | `status=TO_APPROVE` |
| `MANAGER` | `status=LEADER_APPROVED` | `status=LEADER_APPROVED` |

#### 4.2 Request Status Breakdown Pie

Component: `RequestStatusPieChart` *(new)*  
**Chart type:** `PieChart` (recharts), two side-by-side or tabbed pies

| Slice | Color |
|-------|-------|
| TO_APPROVE | Amber `#f59e0b` |
| LEADER_APPROVED | Blue `#6366f1` |
| APPROVED | Green `#10b981` |
| REJECTED | Red `#ef4444` |
| DRAFT | Gray `#9ca3af` |

**Data source:** approval-list call already fetched — zero extra API calls.

#### 4.3 Department Stat Cards *(MANAGER only)*

| Card | Value | Source |
|------|-------|--------|
| Total Headcount | `totalElements` | employee call |
| Active | Count `status === 'ACTIVE'` | computed |
| On Leave | Count `status === 'ON_LEAVE'` | computed |
| Pending Requests | Sum of pending leave + OT (from existing calls) | computed |

#### 4.4 Department Status Donut *(MANAGER only)*

Component: `DeptStatusDonut` *(new)*  
**Chart type:** `PieChart` with inner radius (recharts)

| Slice | Color |
|-------|-------|
| Active | Green `#10b981` |
| On Leave | Amber `#f59e0b` |
| Inactive | Gray `#9ca3af` |

**Data source:** `getEmployees(departmentId)` — zero extra API calls.

#### 4.5 Department Member Table *(MANAGER only)*

Component: `DeptMemberTable` *(new)*

Columns: Employee ID · Name · Role · Status badge

### API Calls — LEADER / MANAGER

```ts
// All EMPLOYEE calls, plus:

// Approval lists — status param differs by role:
GET /api/leaves?status={status}&page=0&size=10
  → LeaveService.getAllLeaves(status, 0, 10)       ← new service function
  → Feeds: ApprovalMiniTable (leave), RequestStatusPieChart

GET /api/ot-requests?status={status}&page=0&size=10
  → OTRequestService.getAllOTRequests(status, 0, 10)  ← new service function
  → Feeds: ApprovalMiniTable (OT), RequestStatusPieChart

// MANAGER only:
GET /api/departments
  → DepartmentService.getDepartments()
  → Resolve own departmentId from user context

GET /api/employees?departmentId={id}&page=0&size=50
  → EmployeeService.getEmployees(0, 50, departmentId)
  → Feeds: dept StatCards, DeptStatusDonut, DeptMemberTable

// Inline actions (on button click, then re-fetch list):
PUT /api/leaves/{id}/approve
PUT /api/leaves/{id}/reject
PUT /api/ot-requests/{id}/approve
PUT /api/ot-requests/{id}/reject

// Total: 4 + 2 = 6 calls on mount for LEADER
//        4 + 4 = 8 calls on mount for MANAGER
```

---

## 5. HR_ADMIN Dashboard

**Component file:** `components/dashboard/HrDashboard.tsx`  
**Role:** `HR_ADMIN`

This dashboard is org-level, not personal. It does **not** include the personal EMPLOYEE
sections — HR admins access their own leave/OT/attendance through the regular pages.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ HR Overview                                 [Month / Year picker] │
├───────────┬───────────┬───────────┬──────────────────────────────┤
│ Total     │ Payrolls  │ Approved  │ Expiring                     │
│ Employees │ This Month│ Payrolls  │ Contracts (≤30d)             │
│ StatCard  │ +vs last  │ StatCard  │ StatCard                     │
│           │ month     │           │                              │
├───────────┴───────────┴───────────┴──────────────────────────────┤
│ Payroll Status — This Month                                       │
│ PayrollStatusBreakdown (stacked progress bar: DRAFT/APPROVED/PAID)│
├──────────────────────────────────────────────────────────────────┤
│ Payroll Cost Breakdown — This Month                               │
│ PayrollCostBreakdownBar  (stacked bar: Net | PIT | BHXH | BHYT | BHTN)│
├──────────────────────────────────────────────────────────────────┤
│ Pending Approvals (all employees — final HR approval level)       │
│ ApprovalMiniTable — leave + OT, status=MANAGER_APPROVED          │
│ "Manage all →" links to /managers/request                         │
└───────────────────────────────────────────────────────────────────┘
```

### Sections & Components

#### 5.1 Stat Cards

| Card | Value | Source |
|------|-------|--------|
| Total Employees | `totalElements` | `getEmployees(0, 1)` |
| Payrolls This Month | `totalElements` + sub-text "vs {N} last month" | `getPayrollsByPeriod(cur)` + `getPayrollsByPeriod(prev, size=1)` |
| Approved Payrolls | Count of `status === 'APPROVED'` records | computed from current period call |
| Expiring Contracts (≤30d) | Contracts with `endDate` within 30 days | computed from `getContracts` |

The "vs last month" sub-text on the Payrolls card uses only `totalElements` from the previous
month call (size=1), so it costs **one lightweight extra call** instead of a full 6-month fetch.

#### 5.2 Payroll Status Breakdown

Component: `PayrollStatusBreakdown` *(new)*  
**Visual:** Horizontal stacked progress bar (CSS `flex`, no chart library needed) + counts below

| Segment | Color |
|---------|-------|
| DRAFT | Amber `#f59e0b` |
| APPROVED | Blue `#6366f1` |
| PAID | Green `#10b981` |

Width: `count / total * 100%`. Month/year picker updates this and the stat cards together.

**Data source:** same `getPayrollsByPeriod` call as stat cards — zero extra API calls.

#### 5.3 Payroll Cost Breakdown Bar

Component: `PayrollCostBreakdownBar` *(new)*  
**Chart type:** Horizontal stacked `BarChart` (recharts), single aggregate bar

| Segment | Value | Color |
|---------|-------|-------|
| Net Salary | Sum of `netSalary` | Green `#10b981` |
| PIT | Sum of `pit` | Red `#ef4444` |
| BHXH | Sum of `bhxhEmployee` | Amber `#f59e0b` |
| BHYT | Sum of `bhytEmployee` | Orange `#f97316` |
| BHTN | Sum of `bhtnEmployee` | Yellow `#eab308` |

Below the bar: Total Gross / Total Deductions / Total Net formatted in million VND.

**Data source:** same `getPayrollsByPeriod` call — zero extra API calls.

#### 5.4 Pending Approvals Mini-Table

Component: `ApprovalMiniTable` (reused)

Filters on `status=MANAGER_APPROVED` — this is the HR final-approval queue.
"Manage all →" links to `/managers/request`.

### API Calls — HR_ADMIN

```ts
// On mount — all parallel via Promise.all
GET /api/employees?page=0&size=1
  → EmployeeService.getEmployees(0, 1)
  → data.totalElements → Total Employees card

GET /api/payrolls/period?year={Y}&month={M}&page=0&size=200
  → PayrollService.getPayrollsByPeriod(year, month, 0, 200)
  → Feeds: Payrolls card (count), Approved card,
           PayrollStatusBreakdown, PayrollCostBreakdownBar
  // Note: size=200 covers typical org size. For >200 employees, paginate or add aggregation endpoint.

GET /api/payrolls/period?year={prevY}&month={prevM}&page=0&size=1   ← 1 lightweight extra call
  → PayrollService.getPayrollsByPeriod(prevYear, prevMonth, 0, 1)
  → data.totalElements → "vs last month" sub-text on Payrolls card

GET /api/contracts?page=0&size=200
  → ContractService.getContracts(0, 200)
  → Filter endDate ≤ today+30d → Expiring Contracts card

GET /api/leaves?status=MANAGER_APPROVED&page=0&size=10
  → LeaveService.getAllLeaves('MANAGER_APPROVED', 0, 10)
  → Feeds: ApprovalMiniTable (leave)

GET /api/ot-requests?status=MANAGER_APPROVED&page=0&size=10
  → OTRequestService.getAllOTRequests('MANAGER_APPROVED', 0, 10)
  → Feeds: ApprovalMiniTable (OT)

// Total: 6 calls on mount
```

---

## 6. SYSTEM_ADMIN Dashboard

**Component file:** `components/dashboard/SystemAdminDashboard.tsx`  
**Role:** `SYSTEM_ADMIN`

Focused on **system health** — config integrity and high-level headcount/payroll numbers.
Does not inherit the HR_ADMIN payroll cost sections; those belong to HR's operational view.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ System Overview                                                   │
├───────────┬───────────┬───────────────────────────────────────── ┤
│ Total     │ Payrolls  │ Expiring Contracts (≤30d)                │
│ Employees │ This Month│ StatCard                                 │
│ StatCard  │ StatCard  │                                          │
├───────────┴───────────┴──────────────────────────────────────────┤
│ Payroll Config — Active Versions                                  │
├──────────┬───────────┬──────────┬───────────────────────────────-┤
│SALARY_   │ ALLOWANCE │ PIT      │ INSURANCE                      │
│GRADE     │           │          │                                │
│ActiveCfg │ ActiveCfg │ActiveCfg │ ActiveCfg                      │
│Card      │ Card      │Card      │ Card                           │
│          │           │          │  "Manage →" /system/config     │
└──────────┴───────────┴──────────┴────────────────────────────────┘
```

### Sections

#### 6.1 Stat Cards

| Card | Value | Source |
|------|-------|--------|
| Total Employees | `totalElements` | `getEmployees(0, 1)` |
| Payrolls This Month | `totalElements` | `getPayrollsByPeriod(year, month, 0, 1)` |
| Expiring Contracts (≤30d) | Contracts with `endDate` within 30 days | `getContracts(0, 200)` |

#### 6.2 Active Config Cards

Component: `ActiveConfigCard` *(new)*

One card per config type. Each shows:
- Config type label
- Active version string (e.g. `2026`)
- Effective date
- Legal basis (truncated to one line)
- "Manage →" link to `/system/config`

**Warning state:** red border + `⚠ No active config` badge if no active version exists — the
payroll engine will fail for that type. This is the primary health signal for SYSTEM_ADMIN.

### API Calls — SYSTEM_ADMIN

```ts
// On mount — all parallel via Promise.all
GET /api/employees?page=0&size=1
  → EmployeeService.getEmployees(0, 1)

GET /api/payrolls/period?year={Y}&month={M}&page=0&size=1
  → PayrollService.getPayrollsByPeriod(year, month, 0, 1)

GET /api/contracts?page=0&size=200
  → ContractService.getContracts(0, 200)

GET /api/system-configs?type=SALARY_GRADE
GET /api/system-configs?type=ALLOWANCE
GET /api/system-configs?type=PIT
GET /api/system-configs?type=INSURANCE
  → SystemConfigService.getSystemConfigs(type)   ← new service (see dashboard-api.md)
  → Filter active === true → ActiveConfigCard

// Total: 7 calls on mount
```

---

## 7. Component Inventory

### Existing Components (require updates)

| Component | File | Required Change |
|-----------|------|-----------------|
| `DashboardContent` | `components/dashboard/DashboardContent.tsx` | Add role-aware dispatch via `useAuth().role` |
| `StatCard` | `components/dashboard/StatCard.tsx` | Add optional `subText` prop for "vs last month" |
| `AttendanceRadarChart` | `components/dashboard/AttendanceRadarChart.tsx` | Replace with `AttendanceSummaryDonut` |
| `ReportsChart` | `components/dashboard/ReportsChart.tsx` | Replace with `WorkingHoursBarChart` |

### New Components

#### Dashboard sub-pages

| Component | File | Roles |
|-----------|------|-------|
| `EmployeeDashboard` | `components/dashboard/EmployeeDashboard.tsx` | `EMPLOYEE`+ |
| `ManagerDashboard` | `components/dashboard/ManagerDashboard.tsx` | `LEADER`, `MANAGER` |
| `HrDashboard` | `components/dashboard/HrDashboard.tsx` | `HR_ADMIN` |
| `SystemAdminDashboard` | `components/dashboard/SystemAdminDashboard.tsx` | `SYSTEM_ADMIN` |

#### Tables

| Component | File | Used by |
|-----------|------|---------|
| `AttendanceMonthTable` | `components/dashboard/AttendanceMonthTable.tsx` | `EMPLOYEE`+ |
| `MiniRequestTable` | `components/dashboard/MiniRequestTable.tsx` | `EMPLOYEE`+ |
| `ApprovalMiniTable` | `components/dashboard/ApprovalMiniTable.tsx` | `LEADER`+ |
| `DeptMemberTable` | `components/dashboard/DeptMemberTable.tsx` | `MANAGER` |

#### Charts

| Component | File | Chart type | Extra calls |
|-----------|------|------------|-------------|
| `WorkingHoursBarChart` | `components/dashboard/WorkingHoursBarChart.tsx` | `BarChart` — daily hours, late in amber | 0 |
| `AttendanceSummaryDonut` | `components/dashboard/AttendanceSummaryDonut.tsx` | `PieChart` (donut) — on-time / late / absent | 0 |
| `MySalaryTrendChart` | `components/dashboard/MySalaryTrendChart.tsx` | `AreaChart` — personal 6-month salary | 1 |
| `RequestStatusPieChart` | `components/dashboard/RequestStatusPieChart.tsx` | `PieChart` — leave + OT by status | 0 |
| `DeptStatusDonut` | `components/dashboard/DeptStatusDonut.tsx` | `PieChart` (donut) — Active / On Leave / Inactive | 0 |
| `PayrollStatusBreakdown` | `components/dashboard/PayrollStatusBreakdown.tsx` | CSS stacked bar — DRAFT / APPROVED / PAID | 0 |
| `PayrollCostBreakdownBar` | `components/dashboard/PayrollCostBreakdownBar.tsx` | `BarChart` stacked — Net / PIT / BHXH / BHYT / BHTN | 0 |

#### Config widgets

| Component | File | Used by |
|-----------|------|---------|
| `ActiveConfigCard` | `components/dashboard/ActiveConfigCard.tsx` | `SYSTEM_ADMIN` |

### Services Used

| Service | File | New functions needed |
|---------|------|---------------------|
| `AttendanceService` | `services/AttendanceService.ts` | — |
| `LeaveService` | `services/LeaveService.ts` | `getAllLeaves(status, page, size)` |
| `OTRequestService` | `services/OTRequestService.ts` | `getAllOTRequests(status, page, size)` |
| `PayrollService` | `services/PayrollService.ts` | `getPayrollsByPeriod(year, month, page, size)` |
| `EmployeeService` | `services/EmployeeService.ts` | — |
| `DepartmentService` | `services/DepartmentService.ts` | — |
| `ContractService` | `services/ContractService.ts` | `getContracts(page, size)` |
| `SystemConfigService` | `services/SystemConfigService.ts` | `getSystemConfigs(type)` *(new file)* |

See `dashboard-api.md` for the full specification of all new service functions.

---

## 8. Implementation Status

| Dashboard | Status | Notes |
|-----------|--------|-------|
| `EMPLOYEE` | Skeleton — mock data | `DashboardContent` renders `StatCard`, `ReportsChart`, `AttendanceRadarChart` with hardcoded values. No API calls wired. |
| `LEADER` | Not started | Falls through to EMPLOYEE skeleton. |
| `MANAGER` | Not started | Falls through to EMPLOYEE skeleton. |
| `HR_ADMIN` | Not started | Falls through to EMPLOYEE skeleton. |
| `SYSTEM_ADMIN` | Not started | Falls through to EMPLOYEE skeleton. `/system/config` management page is complete. |

### Build Order (dependency-first)

```
1.  WorkingHoursBarChart        ← BarChart, replaces ReportsChart
2.  AttendanceSummaryDonut      ← PieChart (donut), replaces AttendanceRadarChart
3.  MySalaryTrendChart          ← AreaChart + area fill, 1 extra call
4.  AttendanceMonthTable        ← simple table with month picker
5.  MiniRequestTable            ← simple table, reused for leave + OT
6.  EmployeeDashboard           ← composes 1–5 + StatCard + real API calls
    └─ Update DashboardContent to dispatch EMPLOYEE role

7.  Add getPayrollsByPeriod() to PayrollService.ts
8.  Add getAllLeaves() + getAllOTRequests() to respective services
9.  ApprovalMiniTable           ← table with inline approve/reject
10. RequestStatusPieChart       ← PieChart, data from approval lists
11. DeptStatusDonut             ← PieChart, data from dept employee call
12. DeptMemberTable             ← simple table
13. ManagerDashboard            ← composes EmployeeDashboard + 9–12 + dept StatCards
    └─ Update DashboardContent to dispatch LEADER + MANAGER

14. PayrollStatusBreakdown      ← CSS stacked bar, no chart lib needed
15. PayrollCostBreakdownBar     ← BarChart stacked
16. HrDashboard                 ← composes 14–15 + StatCards + ApprovalMiniTable
    └─ Update DashboardContent to dispatch HR_ADMIN

17. Create SystemConfigService.ts (new service file)
18. ActiveConfigCard            ← display-only card with warning state
19. SystemAdminDashboard        ← 3 stat cards + 4 ActiveConfigCards
    └─ Update DashboardContent to dispatch SYSTEM_ADMIN
```

### API Call Count Summary

| Dashboard | Calls on mount |
|-----------|----------------|
| EMPLOYEE | 4 |
| LEADER | 6 |
| MANAGER | 8 |
| HR_ADMIN | 6 |
| SYSTEM_ADMIN | 7 |

### Charts Not Included (out of scope)

| Chart idea | Reason excluded |
|------------|-----------------|
| 6-month payroll trend line | Requires 6 heavy `size=200` calls; replaced by simpler "vs last month" stat |
| Headcount by department bar chart | Requires N per-dept calls; DeptMemberTable covers the use case |
| Contract type distribution donut | Low operational value on a daily dashboard; belongs in a Reports page |
| Leave approval rate donut | Redundant with RequestStatusPieChart; requires extra `size=200` call |
| Leave quota vs. used | No leave quota/balance endpoint in the backend |
| Per-employee attendance heatmap | Requires a calendar heatmap library not in the project |
| KPI score distribution histogram | KPI values exist only inside `Payroll` records; no standalone metric |
| Turnover rate chart | No employee exit-date field exposed |
| New hire trend | Feasible via `dateOfJoining`, revisit when needed |
```
