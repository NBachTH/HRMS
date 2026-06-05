# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server with Turbopack on port 3000
npm run build      # Production build (also uses Turbopack)
npm start          # Serve production build
npm run lint       # ESLint
```

Backend runs on `http://localhost:8084/face-z` by default. The frontend reads
`NEXT_PUBLIC_API_BASE` (defaults to `http://localhost:8080` in `ApiCallUtil.tsx` — override
with a `.env.local` file if your backend port differs).

## Architecture

All source lives under `src/app/`. Pages use the Next.js App Router.

### Request Flow

All API calls go through `src/app/commons/utils/ApiCallUtil.tsx` → `apiClient()`. It:
- Attaches the in-memory access token as `Authorization: Bearer <token>`
- On **401 or 403** (this backend returns 403 for expired tokens), silently calls
  `/api/auth/refresh` (HttpOnly cookie), retries once, then notifies `AuthContext`
  via `onTokenRefresh`

Never call `fetch` directly — always use `apiClient`. `Fetcher.tsx` exists but is unused.

**Standard error-handling pattern in components:**

```ts
try {
    await someService.doSomething();
    showToast('Success message');
    onSuccess();
} catch (err: any) {
    showToast(err?.body?.message || 'Fallback error text', 'error');
}
```

`apiClient` throws `{ status, body }` on non-2xx responses; `body.message` is the
backend's human-readable error string.

### Global Contexts (both provided at root `layout.tsx`)

| Context | Hook | Purpose |
|---------|------|---------|
| `AuthContext` | `useAuth()` | `user`, `role`, `accessToken`, `isLoading`, `logout()` |
| `ToastContext` | `useToast()` | `showToast(message, type)` — type defaults to `'success'` |

`AuthContext` restores the session on mount via the refresh endpoint; `isLoading` is `true`
until that resolves. Gates in `ProtectedRoute` check `isLoading` before redirecting.

### Route Protection

Wrap every page's content with `ProtectedRoute` from `src/app/commons/utils/Protector.tsx`:

```tsx
<ProtectedRoute allowedRoles={['HR_ADMIN', 'SYSTEM_ADMIN']}>
// omit allowedRoles → any authenticated user
```

### Page Layout Pattern

Every page follows this exact structure:

```tsx
<ProtectedRoute allowedRoles={[...]}>
  <div className="flex h-screen w-full bg-gray-50">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <*Content />
      </main>
    </div>
  </div>
</ProtectedRoute>
```

### Component Decomposition

Feature components follow a three-file split:
- `*Content.tsx` — owns local state (`refreshKey`, modal open/close, search term), renders layout
- `*Table.tsx` — fetches and renders paginated data; re-fetches when `refreshKey` prop changes
- `*FormModal.tsx` — create/edit form using `Modal` from `src/app/components/common/Modal.tsx`

**`refreshKey` pattern:** increment an integer after any mutation to trigger a table re-fetch.
This is the standard replacement for imperative refetch calls.

### Route Namespaces by Role

| Path prefix | Allowed roles | Key pages |
|-------------|--------------|-----------|
| `app/employees/` | any authenticated user | `dashboard/`, `attendance/`, `leave/`, `ot/`, `payroll/`, `me/` |
| `app/managers/` | `MANAGER`, `LEADER`, `HR_ADMIN` | `request/`, `department/` |
| `app/hr/` | `HR_ADMIN`, `SYSTEM_ADMIN` | `employee/`, `contract/`, `attendance/`, `attendance/close-period/`, `checkin-log/`, `devices/`, `holidays/`, `department/[id]/` |
| `app/finance/` | `FINANCE_ADMIN`, `DIRECTOR` | `payroll/`, `payroll/[id]/`, `reports/` |
| `app/director/` | `DIRECTOR` | `approvals/` |
| `app/system/` | `SYSTEM_ADMIN` only | `config/` |
| `app/notifications/` | any authenticated user | notifications list |

Legacy paths (`app/employee/`, `app/attendance/`, etc.) are deleted — do not create new pages there.

### Services

Each file in `src/app/services/` wraps one backend module and calls `apiClient`. Return types are
`ApiResponse<T>` or `ApiResponse<PageResponse<T>>`. All DTOs live in `src/app/commons/types/index.ts`.

**Endpoint scoping — important:**

- Functions ending in `/my` (e.g. `getLeaves` → `/api/leaves/my`) are employee self-service:
  they return only the current user's data.
- Manager/HR views need the unscoped endpoint (`/api/leaves`, `/api/attendances`). If a
  service only exposes the `/my` variant, add a separate exported function for the
  manager-scoped one rather than modifying the existing function.

**Delete responses** return `ApiResponse<null>` — `data` will be `null`, only `success` and
`message` matter.

**Backend response shape inconsistency:** Some endpoints (e.g. `/api/contracts`) may return
either a plain `T[]` or a `PageResponse<T>` depending on query params or backend version.
Always extract arrays defensively:

```ts
const items = Array.isArray(res.data) ? res.data : ((res.data as any)?.content ?? []);
```

### Common UI Components

Reuse these from `src/app/components/common/` instead of building ad-hoc:

| Component | Props of note | When to use |
|-----------|--------------|-------------|
| `Modal` | `isOpen`, `onClose`, `title`, `width` | Any form or detail overlay |
| `ConfirmDialog` | `open`, `title`, `message`, `onConfirm`, `onCancel`, `danger?`, `loading?` | Destructive actions (delete, force-close) |
| `Pagination` | `page`, `totalPages`, `onPageChange` | Any paginated table |
| `EmptyState` | `message` | Empty list placeholder |
| `Spinner` | — | Loading states |
| `RejectReasonModal` | `isOpen`, `onClose`, `onConfirm` | Leave/OT rejection reason capture |

### Utility Functions

`src/app/commons/utils/formatters.ts` provides shared formatting helpers:
- `formatVnd(n)` — Vietnamese Dong currency (`vi-VN` locale)
- `formatDate(iso)` / `formatDateTime(iso)` — locale date/datetime strings, returns `'—'` for null
- `relativeTime(iso)` — relative time string (e.g. `"5m ago"`)
- `formatMonth(year, month)` — `"MM/YYYY"` string
- `exportToCsv(filename, rows)` — triggers a browser CSV download with UTF-8 BOM

### System Config

`src/app/services/SystemConfigService.ts` manages versioned payroll configuration (`SALARY_GRADE`,
`ALLOWANCE`, `PIT`, `INSURANCE`). Only `SYSTEM_ADMIN` can call these endpoints. Each config
type has exactly one active version at a time; activating a new version reloads the payroll
engine cache immediately. The management UI lives at `app/system/config/`.

### Payroll Batch Job Polling

`batchCalculatePayroll()` starts an async job and returns `PayrollJobResponse` with a `jobId`.
Poll `pollPayrollJob(jobId)` on a `setInterval` (1 500 ms) until `state` is `COMPLETED` or
`FAILED`. Always clear the interval on modal close/unmount. See `BatchCalcModal` in
`src/app/components/payroll/PayrollContent.tsx` for the reference implementation.

`PayrollJobResponse.state`: `'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'`

### Attendance Period Close

`app/hr/attendance/close-period/` implements a three-step wizard: **form → preview → done**.

1. Dry run (`forceClose: false`) via `closePeriod()` — returns unexplained absences list
2. If absences exist, user confirms force close (`forceClose: true`)
3. On success, the period is permanently closed

The `PeriodCloseResponse.unexplainedAbsences` array drives the preview step. Reference:
`src/app/components/attendance/ClosePeriodContent.tsx`.

### Finance Reports

Three tabbed report types at `app/finance/reports/` (all support CSV export via `exportToCsv`):
- **Labour Cost** — gross/net/insurance/PIT/OT breakdown per employee; filterable by department
- **Insurance Remittance** — BHXH/BHYT/BHTN employee+employer amounts per employee
- **PIT Summary** — taxable income and PIT per employee

All three use `PayrollService` (`getLabourCostReport`, `getInsuranceRemittanceReport`,
`getPitSummaryReport`). DTOs: `LabourCostResponse`, `InsuranceRemittanceResponse`, `PitSummaryResponse`.

### Device Management

`app/hr/devices/` manages facial-recognition check-in devices. `DeviceService.ts` covers CRUD and
API-key generation. `ApiKeyCreateResponse.rawKey` is shown once on creation and never retrievable
again — display it immediately in a copy-friendly modal.

### Dashboard

`app/employees/dashboard/` is a single route for all roles. `DashboardContent` dispatches
to a role-specific sub-component based on `useAuth().role`:

| Role | Component |
|------|-----------|
| `SYSTEM_ADMIN` | `SystemAdminDashboard` → renders `HrDashboard` + active config cards |
| `HR_ADMIN` | `HrDashboard` → payroll trend, cost breakdown, contract types, leave rate, approvals |
| `MANAGER` / `LEADER` | `ManagerDashboard` → renders `EmployeeDashboard` + team approvals + dept overview |
| `FINANCE_ADMIN` / `DIRECTOR` / `EMPLOYEE` | `EmployeeDashboard` → attendance, personal requests, salary trend |

Charts use **Recharts** (`BarChart`, `AreaChart`, `LineChart`, `PieChart` via `ResponsiveContainer`).
All chart components live in `src/app/components/dashboard/`.

Approval filter by role: `LEADER` sees `TO_APPROVE`, `MANAGER` sees `LEADER_APPROVED`,
`HR_ADMIN` sees `MANAGER_APPROVED`.

### Sidebar Visibility

The `Sidebar` uses these derived flags:

```ts
const isManager = role === 'MANAGER' || role === 'LEADER' || role === 'HR_ADMIN';
```

| Section label | Shown when |
|---------------|-----------|
| Personal | always (all roles) |
| Manager | `isManager` (`MANAGER`, `LEADER`, `HR_ADMIN`) |
| HR Admin | `role === 'HR_ADMIN'` only |
| Finance | `role === 'FINANCE_ADMIN'` only |
| Director | `role === 'DIRECTOR'` only |
| System | `role === 'SYSTEM_ADMIN'` only |

`SYSTEM_ADMIN` can access `hr/employee` via the System section but does **not** see the full HR Admin section.

### Types and Enums

`Role`: `'EMPLOYEE' | 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'LEADER' | 'MANAGER' | 'FINANCE_ADMIN' | 'DIRECTOR'`

`RequestStatus`: `'DRAFT' | 'TO_APPROVE' | 'LEADER_APPROVED' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED'`

`PayrollStatus`: `'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID'`

`EmployeeStatus`: `'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'`

`LeaveType`: `'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'MARRIAGE' | 'UNPAID' | 'PUBLIC_HOLIDAY' | 'COMPENSATORY'`

`ConfigType`: `'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE'`
