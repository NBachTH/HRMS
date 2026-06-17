# Dashboard API — Frontend Service Functions

Documents every API call made by the dashboard, which frontend service functions map to them,
and which ones are new (not yet implemented). Existing service calls used only by non-dashboard
pages are omitted.

**Base URL:** `http://localhost:8084/face-z`  
**Auth:** All calls require `Authorization: Bearer <accessToken>`

---

## Table of Contents

1. [Service Layer Changes](#1-service-layer-changes)
   - [Frontend: New Service Functions](#11-frontend-new-service-functions)
   - [Backend: Endpoint Updates](#12-backend-endpoint-updates)
2. [Per-Dashboard Call Map](#2-per-dashboard-call-map)
   - [EMPLOYEE](#21-employee)
   - [LEADER / MANAGER](#22-leader--manager)
   - [HR_ADMIN](#23-hr_admin)
   - [SYSTEM_ADMIN](#24-system_admin)
3. [Response Shapes](#3-response-shapes)
4. [Error Handling Notes](#4-error-handling-notes)

---

## 1. Service Layer Changes

### 1.1 Frontend: New Service Functions

These functions do not yet exist in the frontend services. All others reuse existing functions.

#### 1.1.1 `LeaveService.getAllLeaves`

**File:** `services/LeaveService.ts`

```ts
// Add alongside the existing getLeaves() (which calls /my)
export const getAllLeaves = async (
  status: string | null,
  page: number,
  size: number
): Promise<PageResponse<LeaveResponse>> => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  const res = await ApiCallUtil.get(`/api/leaves?${params}`);
  return res.data.data;
};
```

**Backend endpoint:** `GET /api/leaves`  
**Required role:** `MANAGER`, `LEADER`, or `HR_ADMIN`  
**Used by:** `ManagerDashboard` (approval table), `HrDashboard` (approval table)

---

#### 1.1.2 `OTRequestService.getAllOTRequests`

**File:** `services/OTRequestService.ts`

```ts
export const getAllOTRequests = async (
  status: string | null,
  page: number,
  size: number
): Promise<PageResponse<OTRequestResponse>> => {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  const res = await ApiCallUtil.get(`/api/ot-requests?${params}`);
  return res.data.data;
};
```

**Backend endpoint:** `GET /api/ot-requests`  
**Required role:** `MANAGER`, `LEADER`, or `HR_ADMIN`  
**Used by:** `ManagerDashboard`, `HrDashboard`

---

#### 1.1.3 `PayrollService.getPayrollsByPeriod`

**File:** `services/PayrollService.ts`

```ts
export const getPayrollsByPeriod = async (
  year: number,
  month: number,
  page: number,
  size: number
): Promise<PageResponse<PayrollResponse>> => {
  const res = await ApiCallUtil.get(
    `/api/payrolls/period?year=${year}&month=${month}&page=${page}&size=${size}`
  );
  return res.data.data;
};
```

**Backend endpoint:** `GET /api/payrolls/period?year={Y}&month={M}&page={P}&size={S}`  
**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`  
**Used by:** `HrDashboard` (cost breakdown, status breakdown, stat cards), `SystemAdminDashboard` (count only)

---

#### 1.1.4 `ContractService.getContracts` (update signature)

**File:** `services/ContractService.ts`

If the existing `getContracts()` doesn't accept pagination params, add an overload:

```ts
export const getContracts = async (
  page = 0,
  size = 200
): Promise<PageResponse<ContractResponse>> => {
  const res = await ApiCallUtil.get(`/api/contracts?page=${page}&size=${size}`);
  return res.data.data;
};
```

**Backend endpoint:** `GET /api/contracts?page={P}&size={S}`  
**Required role:** `HR_ADMIN` or `SYSTEM_ADMIN`  
**Used by:** `HrDashboard`, `SystemAdminDashboard`

---

#### 1.1.5 `SystemConfigService` (new file)

**File:** `services/SystemConfigService.ts` *(create new)*

```ts
import ApiCallUtil from '@/commons/utils/ApiCallUtil';

export interface SystemConfigResponse {
  id: string;
  configType: string;
  version: string;
  effectiveDate: string | null;
  legalBasis: string | null;
  configData: Record<string, unknown>;
  active: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export const getSystemConfigs = async (
  type: 'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE'
): Promise<SystemConfigResponse[]> => {
  const res = await ApiCallUtil.get(`/api/system-configs?type=${type}`);
  return res.data.data;
};

export const getActiveConfig = async (
  type: 'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE'
): Promise<SystemConfigResponse | null> => {
  const all = await getSystemConfigs(type);
  return all.find(c => c.active) ?? null;
};

export const createSystemConfig = async (
  payload: Omit<SystemConfigResponse, 'id' | 'active' | 'updatedBy' | 'createdAt' | 'updatedAt'>
): Promise<SystemConfigResponse> => {
  const res = await ApiCallUtil.post('/api/system-configs', payload);
  return res.data.data;
};

export const activateSystemConfig = async (id: string): Promise<SystemConfigResponse> => {
  const res = await ApiCallUtil.patch(`/api/system-configs/${id}/activate`, {});
  return res.data.data;
};

export const deleteSystemConfig = async (id: string): Promise<void> => {
  await ApiCallUtil.delete(`/api/system-configs/${id}`);
};
```

**Backend endpoint:** `GET /api/system-configs?type={TYPE}`  
**Required role:** `SYSTEM_ADMIN`  
**Used by:** `SystemAdminDashboard` (ActiveConfigCard)

---

### 1.2 Backend: Endpoint Updates

The following existing backend endpoints require changes to support the dashboard calls above.

#### 1.2.1 `GET /api/leaves` — add `status` filter

**Change:** Add optional `?status=` query parameter. When supplied, filter results by that `RequestStatus` value. When omitted, return all requests (existing behaviour).

**Required role:** `LEADER`, `MANAGER`, or `HR_ADMIN` (unchanged)

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | no | One of `TO_APPROVE`, `LEADER_APPROVED`, `MANAGER_APPROVED`, `APPROVED`, `REJECTED` |
| `page` | integer | no | default `0` |
| `size` | integer | no | default `20` |

**Response:** `200 OK` — `ApiResponse<PageResponse<LeaveResponse>>` (unchanged shape)

---

#### 1.2.2 `GET /api/ot-requests` — add `status` filter

Identical change to `GET /api/leaves` above. Add optional `?status=` query param that filters by `RequestStatus`.

**Required role:** `LEADER`, `MANAGER`, or `HR_ADMIN` (unchanged)

**Response:** `200 OK` — `ApiResponse<PageResponse<OTRequestResponse>>` (unchanged shape)

---

#### 1.2.3 `GET /api/contracts` — add pagination, grant `SYSTEM_ADMIN`

**Changes:**
1. Return type changes from `ApiResponse<List<ContractResponse>>` to `ApiResponse<PageResponse<ContractResponse>>`.
2. Add `SYSTEM_ADMIN` to the allowed roles (currently `HR_ADMIN` only).

| Param | Type | Required | Description |
|---|---|---|---|
| `page` | integer | no | default `0` |
| `size` | integer | no | default `20` |

**Response:** `200 OK` — `ApiResponse<PageResponse<ContractResponse>>`

**Note:** The dashboard calls this with `size=200` to load all contracts for client-side expiry filtering. See §3 for the filter logic.

---

#### 1.2.4 `GET /api/employees` — add `departmentId` filter

**Changes:**
1. Add optional `?departmentId=` query parameter. When supplied, return only employees in that department.
2. Remove the conflicting `GET /api/employees/{departmentId}` path endpoint (it shadows `GET /{id}` and is unused by the frontend).

| Param | Type | Required | Description |
|---|---|---|---|
| `departmentId` | string | no | Filter by department UUID |
| `page` | integer | no | default `0` |
| `size` | integer | no | default `20` |

**Required role:** `HR_ADMIN`, `MANAGER`, or `LEADER` (unchanged)

**Response:** `200 OK` — `ApiResponse<PageResponse<EmployeeResponse>>` (unchanged shape)

---

## 2. Per-Dashboard Call Map

### 2.1 EMPLOYEE

All calls are in parallel via `Promise.all` on mount.

| # | Call | Function | Feeds |
|---|------|----------|-------|
| 1 | `GET /api/attendances/my?from=...&to=...&page=0&size=31` | `AttendanceService.getMyAttendances(from, to)` | Working Days card, Late Days card, WorkingHoursBarChart, AttendanceSummaryDonut, AttendanceMonthTable |
| 2 | `GET /api/leaves/my?page=0&size=10` | `LeaveService.getLeaves(0, 10)` | Pending Leaves card, MiniRequestTable (leave) |
| 3 | `GET /api/ot-requests/my?page=0&size=10` | `OTRequestService.getMyOTRequests(0, 10)` | MiniRequestTable (OT) |
| 4 | `GET /api/payrolls/my?page=0&size=6` | `PayrollService.getMyPayrolls(0, 6)` | Latest Net Salary card (index 0), MySalaryTrendChart (all 6) |

**Total: 4 calls on mount**

Month picker on AttendanceMonthTable triggers one additional `getMyAttendances(from, to)` call
for the selected period.

---

### 2.2 LEADER / MANAGER

All EMPLOYEE calls, plus the following (also parallel on mount):

| # | Call | Function | Feeds | Roles |
|---|------|----------|-------|-------|
| 5 | `GET /api/leaves?status={filter}&page=0&size=10` | `LeaveService.getAllLeaves(status, 0, 10)` *(new)* | ApprovalMiniTable (leave), RequestStatusPieChart | LEADER + MANAGER |
| 6 | `GET /api/ot-requests?status={filter}&page=0&size=10` | `OTRequestService.getAllOTRequests(status, 0, 10)` *(new)* | ApprovalMiniTable (OT), RequestStatusPieChart | LEADER + MANAGER |
| 7 | `GET /api/departments` | `DepartmentService.getDepartments()` | Resolve own dept ID | MANAGER only |
| 8 | `GET /api/employees?departmentId={id}&page=0&size=50` | `EmployeeService.getEmployees(0, 50, deptId)` | Dept StatCards, DeptStatusDonut, DeptMemberTable | MANAGER only |

**Status filter by role:**

| Role | `status` param |
|------|----------------|
| `LEADER` | `TO_APPROVE` |
| `MANAGER` | `LEADER_APPROVED` |

**Total: 6 calls (LEADER) / 8 calls (MANAGER) on mount**

**Inline action calls** (triggered by Approve / Reject buttons, then re-fetch calls 5 & 6):

| Action | Endpoint | Function |
|--------|----------|----------|
| Approve leave | `PUT /api/leaves/{id}/approve` | `LeaveService.approveLeave(id)` |
| Reject leave | `PUT /api/leaves/{id}/reject` | `LeaveService.rejectLeave(id)` |
| Approve OT | `PUT /api/ot-requests/{id}/approve` | `OTRequestService.approveOTRequest(id)` |
| Reject OT | `PUT /api/ot-requests/{id}/reject` | `OTRequestService.rejectOTRequest(id)` |

---

### 2.3 HR_ADMIN

All calls are in parallel on mount. Uses month/year picker state for calls 2 & 3.

| # | Call | Function | Feeds |
|---|------|----------|-------|
| 1 | `GET /api/employees?page=0&size=1` | `EmployeeService.getEmployees(0, 1)` | Total Employees card |
| 2 | `GET /api/payrolls/period?year={Y}&month={M}&page=0&size=200` | `PayrollService.getPayrollsByPeriod(Y, M, 0, 200)` *(new)* | Payrolls card, Approved card, PayrollStatusBreakdown, PayrollCostBreakdownBar |
| 3 | `GET /api/payrolls/period?year={prevY}&month={prevM}&page=0&size=1` | `PayrollService.getPayrollsByPeriod(prevY, prevM, 0, 1)` *(new)* | "vs last month" sub-text on Payrolls card |
| 4 | `GET /api/contracts?page=0&size=200` | `ContractService.getContracts(0, 200)` *(updated)* | Expiring Contracts card |
| 5 | `GET /api/leaves?status=MANAGER_APPROVED&page=0&size=10` | `LeaveService.getAllLeaves('MANAGER_APPROVED', 0, 10)` *(new)* | ApprovalMiniTable (leave) |
| 6 | `GET /api/ot-requests?status=MANAGER_APPROVED&page=0&size=10` | `OTRequestService.getAllOTRequests('MANAGER_APPROVED', 0, 10)` *(new)* | ApprovalMiniTable (OT) |

**Total: 6 calls on mount**

When the month/year picker changes, re-fire calls 2 & 3 only (not the others).

> `size=200` for the payroll call assumes ≤200 employees in a single period. If headcount
> grows beyond that, paginate client-side or add a server-side aggregation endpoint that
> returns pre-summed totals instead of individual records.

---

### 2.4 SYSTEM_ADMIN

| # | Call | Function | Feeds |
|---|------|----------|-------|
| 1 | `GET /api/employees?page=0&size=1` | `EmployeeService.getEmployees(0, 1)` | Total Employees card |
| 2 | `GET /api/payrolls/period?year={Y}&month={M}&page=0&size=1` | `PayrollService.getPayrollsByPeriod(Y, M, 0, 1)` *(new)* | Payrolls This Month card (totalElements only) |
| 3 | `GET /api/contracts?page=0&size=200` | `ContractService.getContracts(0, 200)` *(updated)* | Expiring Contracts card |
| 4 | `GET /api/system-configs?type=SALARY_GRADE` | `SystemConfigService.getSystemConfigs('SALARY_GRADE')` *(new)* | ActiveConfigCard |
| 5 | `GET /api/system-configs?type=ALLOWANCE` | `SystemConfigService.getSystemConfigs('ALLOWANCE')` *(new)* | ActiveConfigCard |
| 6 | `GET /api/system-configs?type=PIT` | `SystemConfigService.getSystemConfigs('PIT')` *(new)* | ActiveConfigCard |
| 7 | `GET /api/system-configs?type=INSURANCE` | `SystemConfigService.getSystemConfigs('INSURANCE')` *(new)* | ActiveConfigCard |

**Total: 7 calls on mount**

---

## 3. Response Shapes

Shapes for the new calls not covered in other API docs.

### PayrollResponse (from `/api/payrolls/period`)

```ts
interface PayrollResponse {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  payrollYear: number;
  payrollMonth: number;
  netSalary: number;
  totalGross: number;
  pit: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  // ... full field list in payroll-api.md §5
}
```

**Client-side aggregations used by HR dashboard:**

```ts
const totalNet   = records.reduce((s, r) => s + r.netSalary, 0);
const totalPit   = records.reduce((s, r) => s + r.pit, 0);
const totalBhxh  = records.reduce((s, r) => s + r.bhxhEmployee, 0);
const totalBhyt  = records.reduce((s, r) => s + r.bhytEmployee, 0);
const totalBhtn  = records.reduce((s, r) => s + r.bhtnEmployee, 0);
const totalGross = totalNet + totalPit + totalBhxh + totalBhyt + totalBhtn;

const draftCount    = records.filter(r => r.status === 'DRAFT').length;
const approvedCount = records.filter(r => r.status === 'APPROVED').length;
const paidCount     = records.filter(r => r.status === 'PAID').length;
```

### ContractResponse (from `/api/contracts`)

```ts
interface ContractResponse {
  contractId: string;
  employeeId: string;
  contractType: 'PROBATION' | 'FIXED_TERM' | 'INDEFINITE';
  startDate: string;    // ISO date
  endDate: string | null;
  status: string;
  // ...
}
```

**Expiring contracts filter:**

```ts
const today = new Date();
const thirtyDaysOut = new Date(today);
thirtyDaysOut.setDate(today.getDate() + 30);

const expiring = contracts.filter(c =>
  c.endDate &&
  new Date(c.endDate) >= today &&
  new Date(c.endDate) <= thirtyDaysOut
);
```

### SystemConfigResponse (from `/api/system-configs`)

```ts
interface SystemConfigResponse {
  id: string;
  configType: 'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE';
  version: string;
  effectiveDate: string | null;   // ISO date
  legalBasis: string | null;
  configData: Record<string, unknown>;
  active: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
```

Full spec in `system-config-api.md`.

---

## 4. Error Handling Notes

### Failed config call (SYSTEM_ADMIN)

If any `getSystemConfigs(type)` call returns a non-2xx response or an empty array (no active
version), the corresponding `ActiveConfigCard` should render the warning state (red border,
`⚠ No active config`) rather than throwing. Use `Promise.allSettled` instead of `Promise.all`
for the 4 config calls so one failure doesn't block the others:

```ts
const [salary, allowance, pit, insurance] = await Promise.allSettled([
  SystemConfigService.getSystemConfigs('SALARY_GRADE'),
  SystemConfigService.getSystemConfigs('ALLOWANCE'),
  SystemConfigService.getSystemConfigs('PIT'),
  SystemConfigService.getSystemConfigs('INSURANCE'),
]);

const activeOrNull = (result: PromiseSettledResult<SystemConfigResponse[]>) =>
  result.status === 'fulfilled'
    ? result.value.find(c => c.active) ?? null
    : null;
```

### Payroll period returns empty (HR_ADMIN / SYSTEM_ADMIN)

If `getPayrollsByPeriod` returns `content: []` for the selected month (no payroll run yet),
all derived values should default to `0` and charts should render an empty state message
("No payroll data for this period") rather than a blank chart.

### `size=200` cap exceeded

If `data.totalElements > 200` from any call using `size=200`, log a warning to the console
and surface a banner: "Showing first 200 records. Data may be incomplete." This is the
indicator to add a server-side aggregation endpoint.
