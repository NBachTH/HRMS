# FaceZ HRMS — Frontend Development Roadmap & Guidelines
**Target**: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4

---

## Current State (Baseline)

The frontend is ~70% feature-complete. Authentication, routing, and the API client layer are solid. The main gaps are:

| Area | Status |
|------|--------|
| Login / Session | ✅ Done — JWT + HttpOnly cookie, silent refresh, protected routes |
| Employee CRUD (HR) | ✅ Done |
| Leave self-service | ✅ Done |
| OT self-service | ✅ Done |
| Payroll calc/batch (HR) | ✅ Done |
| System config (admin) | ✅ Done |
| Request approval (manager) | ✅ Done |
| Employee profile page | ❌ Bug — `/employees/me` renders LeaveContent |
| Dashboard charts | 🟡 Component shells exist, no real data fetching |
| Statutory employee fields | 🟡 Backend fields added; form not updated |
| FINANCE_ADMIN / DIRECTOR roles | ❌ No routes, sidebar links, or UI |
| Payroll reports | ❌ Missing — backend has 3 report endpoints |
| Payslip detail view | 🟡 List exists, no line-item breakdown |
| Notifications | 🟡 Mock bell in header; real API not connected |
| Leave balance | ❌ Backend returns balance; frontend never requests it |
| Contract table + history | 🟡 Service exists, no table component |
| Department hierarchy | 🟡 List exists; member table, headcount charts are stubs |
| Public holiday management | ❌ No UI |
| Attendance period close | ❌ No UI |
| Tax dependent management | ❌ No UI |
| Profile picture upload | ❌ No UI |
| Change password | ❌ Service exists, no form on profile page |
| Device API key management | ❌ New backend feature; no UI |

---

## Implementation Conventions

Read these before writing any code. They describe the patterns already established in the codebase — follow them exactly.

### Directory Layout

```
src/app/
├── commons/
│   ├── contexts/       # AuthContext, ToastContext — DO NOT add new state here lightly
│   ├── types/index.ts  # ALL interfaces and enums go here — single source of truth
│   └── utils/          # ApiCallUtil, Protector, Fetcher
├── services/           # One service file per backend module
├── components/
│   ├── common/         # Modal, Spinner, Badge, Pagination, ConfirmDialog …
│   └── <feature>/      # <Feature>Content.tsx, <Feature>Table.tsx, <Feature>FormModal.tsx
├── employees/          # Self-service pages (all authenticated users)
├── hr/                 # HR_ADMIN pages
├── finance/            # NEW — FINANCE_ADMIN pages
├── director/           # NEW — DIRECTOR pages
├── managers/           # MANAGER / LEADER pages
└── system/             # SYSTEM_ADMIN pages
```

### Page File Template

Every page follows this exact structure — no exceptions:

```tsx
"use client";
import ProtectedRoute from "@/app/commons/utils/Protector";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import XxxContent from "@/app/components/xxx/XxxContent";

export default function XxxPage() {
  return (
    <ProtectedRoute allowedRoles={["HR_ADMIN"]}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <XxxContent />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

### Component Breakdown Pattern

Break each feature into exactly three files:

| File | Responsibility |
|------|---------------|
| `<Feature>Content.tsx` | Page container — owns state, fetches data, renders table + modals |
| `<Feature>Table.tsx` | Pure display — receives data as props, emits edit/delete callbacks |
| `<Feature>FormModal.tsx` | Create / edit form inside `<Modal>` |

### Service File Pattern

```ts
// services/XxxService.ts
import { apiClient } from "@/app/commons/utils/ApiCallUtil";
import { ApiResponse, PageResponse, Xxx } from "@/app/commons/types";

const BASE = "/api/xxxs";

export const XxxService = {
  getAll: (page = 0, size = 20) =>
    apiClient<PageResponse<Xxx>>(`${BASE}?page=${page}&size=${size}`),

  getById: (id: string) =>
    apiClient<Xxx>(`${BASE}/${id}`),

  create: (body: Partial<Xxx>) =>
    apiClient<Xxx>(BASE, { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<Xxx>) =>
    apiClient<Xxx>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: string) =>
    apiClient<null>(`${BASE}/${id}`, { method: "DELETE" }),
};
```

### Type Definition Rules

- All interfaces live in `src/app/commons/types/index.ts`
- Mirror backend DTO field names exactly (camelCase)
- Add a type for every new service method — no `any`
- Enums as TypeScript string union types, not `enum` keyword

### Error Handling Pattern

```tsx
const handleAction = async () => {
  try {
    const res = await SomeService.doX(payload);
    if (res.success) {
      showToast("Success message");
      await reload();
    } else {
      showToast(res.message ?? "Operation failed", "error");
    }
  } catch (err: any) {
    showToast(err?.body?.message ?? "Unexpected error", "error");
  }
};
```

### Sidebar Addition Pattern

When adding a new nav link to `Sidebar.tsx`, follow the existing group structure:

```tsx
// Personal section (all users)
{ href: "/employees/...", label: "...", icon: SomeIcon }

// Manager section (MANAGER, LEADER)
// HR section (HR_ADMIN)
// Finance section (FINANCE_ADMIN) — new
// Director section (DIRECTOR) — new
// System section (SYSTEM_ADMIN)
```

---

## Phase 1 — Role Architecture & Auth Polish

**Goal**: Add the two new roles (`FINANCE_ADMIN`, `DIRECTOR`) to all role-gating logic; fix the broken employee profile page; wire up change-password.

### 1.1 Update Role Type and Sidebar

**`src/app/commons/types/index.ts`**
```ts
// Add to existing Role type
export type Role =
  | "EMPLOYEE" | "SYSTEM_ADMIN" | "HR_ADMIN"
  | "LEADER"  | "MANAGER"
  | "FINANCE_ADMIN"   // ← new
  | "DIRECTOR";       // ← new
```

**`src/app/components/Sidebar.tsx`** — add two new navigation groups between the HR and System sections:

```
Finance Admin section (role: FINANCE_ADMIN):
  - /finance/payroll     Payroll Management  (Banknote icon)
  - /finance/reports     Reports             (BarChart3 icon)

Director section (role: DIRECTOR):
  - /director/approvals  Pending Approvals   (ClipboardCheck icon)
```

Also update `Header.tsx` role badge colors:
```ts
FINANCE_ADMIN: "bg-emerald-100 text-emerald-700"
DIRECTOR:      "bg-indigo-100 text-indigo-700"
```

**`src/app/commons/utils/Protector.tsx`** — no code change needed; role check already uses the `Role` type.

### 1.2 Fix Employee Profile Page (`/employees/me`)

**File**: `src/app/employees/me/page.tsx`

Currently renders `<LeaveContent />` — replace with a proper profile page using two sub-components:

**`src/app/components/employee/MyProfileContent.tsx`**
- Calls `EmployeeService.getMyProfile()` on mount
- Displays: avatar (profile picture), name, role badge, department, email, phone, national ID, tax code, social insurance code, bank account, bank name, date of birth, gender, hometown
- Edit button opens `ChangePasswordModal`

**`src/app/components/employee/ChangePasswordModal.tsx`**
- Fields: oldPassword, newPassword, confirmNewPassword
- Calls `AuthService.changePassword({ oldPassword, newPassword })`
- Validates: newPassword === confirmNewPassword, length ≥ 6
- Closes on success with toast

### 1.3 Handle HTTP 429 on Login

**`src/app/components/login/LoginForm.tsx`** — add handling for rate limit:

```tsx
} catch (err: any) {
  const status = err?.status;
  const retryAfter = err?.headers?.["retry-after"];
  if (status === 429) {
    setError(`Too many login attempts. Please wait ${retryAfter ?? "15 minutes"} before trying again.`);
  } else {
    setError(err?.body?.message ?? "Login failed");
  }
}
```

### 1.4 New Routes: Finance & Director

Create the page shells — content filled in later phases:

```
src/app/finance/
  payroll/page.tsx       — allowedRoles: ["FINANCE_ADMIN"]
  reports/page.tsx       — allowedRoles: ["FINANCE_ADMIN", "DIRECTOR"]

src/app/director/
  approvals/page.tsx     — allowedRoles: ["DIRECTOR"]
```

---

## Phase 2 — Employee Data Completion

**Goal**: Update the employee form with all statutory fields added to the backend; add profile picture upload; build tax dependent management.

### 2.1 Update Employee Types

**`src/app/commons/types/index.ts`** — extend `Employee` and `EmployeeCreateRequest`:

```ts
export interface Employee {
  // ... existing fields ...
  nationalId?: string;
  nationalIdIssueDate?: string;
  nationalIdIssuePlace?: string;
  taxCode?: string;
  socialInsuranceCode?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  hometown?: string;
  profilePictureUrl?: string;
}

export interface TaxDependent {
  id: string;
  employeeId: string;
  fullName: string;
  nationalId?: string;
  dateOfBirth?: string;
  relationship: string;
  registrationDate?: string;
  active: boolean;
}
```

### 2.2 Update EmployeeFormModal

**`src/app/components/employee/EmployeeFormModal.tsx`** — add a tabbed layout with two tabs:

**Tab 1 — Basic Info** (existing fields):
- Username, password, name, email, phone, address, department, role, status

**Tab 2 — Statutory Info** (new fields):
- National ID, issue date, issue place
- Tax code, social insurance code
- Bank account number, bank name, bank branch
- Date of birth, gender (select), hometown

Use `<input type="date">` for date fields. Keep all new fields optional (backend validation handles required fields).

### 2.3 Employee Service — Profile Picture

**`src/app/services/EmployeeService.ts`** — add:
```ts
uploadProfilePicture: (employeeId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient<string>(`/api/employees/${employeeId}/profile-picture`, {
    method: "POST",
    body: form,
    // Do NOT set Content-Type — let browser set multipart boundary
  });
},
```

Add an avatar image in `MyProfileContent.tsx` that shows a camera-icon overlay on hover, opens a file picker (`input type="file" accept="image/*"`), and uploads immediately on change.

### 2.4 Tax Dependent Management

**New service**: `src/app/services/TaxDependentService.ts`
- `getByEmployee(employeeId)` → `GET /api/tax-dependents?employeeId=`
- `create(body)` → `POST /api/tax-dependents`
- `update(id, body)` → `PUT /api/tax-dependents/{id}`
- `deactivate(id)` → `DELETE /api/tax-dependents/{id}`

**New component**: `src/app/components/employee/TaxDependentSection.tsx`
- Shown at the bottom of employee detail view (HR admin only)
- Lists dependents in a compact table: name, relationship, DOB, status, edit/deactivate buttons
- "Add Dependent" opens `TaxDependentFormModal`

**New component**: `src/app/components/employee/TaxDependentFormModal.tsx`
- Fields: fullName, nationalId, dateOfBirth, relationship (select), registrationDate

Add a "Dependents" link or accordion at the bottom of `EmployeeTable.tsx`'s row expand, or navigate to a dedicated employee detail page.

---

## Phase 3 — HR Operational Workflows

**Goal**: Build attendance period close, public holiday management, and leave balance display — three backend features with no current UI.

### 3.1 Attendance Period Close

**New service**: Add to `src/app/services/AttendanceService.ts`:
```ts
closePeriod: (body: { year: number; month: number; notes?: string; forceClose?: boolean }) =>
  apiClient<PeriodCloseResponse>("/api/attendances/close-period", {
    method: "POST",
    body: JSON.stringify(body),
  }),
```

**New types**:
```ts
export interface PeriodCloseResponse {
  id: string;
  year: number;
  month: number;
  closedBy: string;
  closedAt: string;
  notes?: string;
  unexplainedAbsences: UnexplainedAbsenceDto[];
  closed: boolean;
  message: string;
}

export interface UnexplainedAbsenceDto {
  employeeId: string;
  employeeName: string;
  missingDates: string[];
}
```

**New component**: `src/app/components/attendance/PeriodCloseModal.tsx`
- Year + month selectors (defaults to previous month)
- Notes textarea
- "Close Period" button triggers API
- If response contains `unexplainedAbsences.length > 0`:
  - Shows a warning list of employees with missing dates
  - Reveals "Force Close" checkbox + confirmation
  - Re-submits with `forceClose: true`
- On success: toast + close modal

Add a "Close Attendance Period" button to the HR Payroll page (`/hr/payroll`) — period must be closed before payroll calculation is allowed. Show a period-close status indicator.

### 3.2 Public Holiday Management

**New service**: `src/app/services/PublicHolidayService.ts`
```ts
export interface PublicHoliday {
  id: string;
  holidayYear: number;
  holidayDate: string;
  name: string;
  compensatoryDay?: string;
}
```
- `getByYear(year)` → `GET /api/public-holidays?year=`
- `create(body)` → `POST /api/public-holidays`
- `delete(id)` → `DELETE /api/public-holidays/{id}`

**New page**: `src/app/hr/holidays/page.tsx` (allowedRoles: `["HR_ADMIN"]`)

**New components**:
- `PublicHolidayContent.tsx` — year selector, "Add Holiday" button, table
- `PublicHolidayFormModal.tsx` — date picker, name, optional compensatory date

Add "Holidays" to the HR section of `Sidebar.tsx`.

### 3.3 Leave Balance Display

**New service call** — add to `src/app/services/LeaveService.ts`:
```ts
getMyBalances: () =>
  apiClient<LeaveBalance[]>("/api/leaves/balances/my"),

getBalancesByEmployee: (employeeId: string) =>
  apiClient<LeaveBalance[]>(`/api/leaves/balances/${employeeId}`),
```

**New type**:
```ts
export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveYear: number;
  leaveType: LeaveType;
  entitlementDays: number;
  carriedOverDays: number;
  pendingDays: number;
  usedDays: number;
  remainingDays: number;
}

export type LeaveType =
  | "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY"
  | "BEREAVEMENT" | "MARRIAGE" | "UNPAID"
  | "PUBLIC_HOLIDAY" | "COMPENSATORY";
```

**New component**: `src/app/components/leave/LeaveBalanceCards.tsx`
- Rendered at the top of the employee `/employees/leave` page
- Shows a small card per leave type with entitlement, used, pending, remaining
- Color-coded: green if remaining > 3 days, amber if 1–3, red if 0

Update `LeaveFormModal.tsx` to include a `leaveType` select field (only EMPLOYEE_SUBMITTABLE types: ANNUAL, SICK, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE, UNPAID).

---

## Phase 4 — Contract Lifecycle

**Goal**: Build a complete contract management UI with table, history view, and expiry alerts.

### 4.1 Update Contract Types

**`src/app/commons/types/index.ts`** — extend `Contract`:
```ts
export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  contractType: string;
  startDate: string;        // ISO date (YYYY-MM-DD)
  endDate?: string;
  baseSalary?: number;
  insuranceBase?: number;
  positionCode?: string;
  salaryStep?: number;
  dependentCount?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  current: boolean;
  status: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### 4.2 Contract Table

**New component**: `src/app/components/contract/ContractTable.tsx`
- Columns: Employee Name, Type, Start Date, End Date, Base Salary, Status (badge), Current (badge), Actions
- Actions: View History, Edit (active only), Delete (DRAFT only)
- Highlight contracts expiring within 30 days in amber

**Update** `ContractContent.tsx`:
- Add pagination (currently returns plain array — handle as list, add client-side pagination)
- Add "New Contract" button opening `ContractFormModal`
- Show expiry warning count at the top ("3 contracts expiring within 30 days")

### 4.3 Contract Form Modal

**`src/app/components/contract/ContractFormModal.tsx`** — update with all new fields:
- Contract type (select: FIXED_TERM, INDEFINITE, PROBATION)
- Start date, end date (date pickers)
- Base salary (number), insurance base (number)
- Position code (text), salary step (number)
- Dependent count (number)
- Effective from (date)
- Notes (textarea)

### 4.4 Contract History Modal

**New component**: `src/app/components/contract/ContractHistoryModal.tsx`
- Triggered by "View History" on any contract row
- Calls `ContractService.getHistoryByEmployee(employeeId)` → new service method hitting `GET /api/contracts/employee/{id}/history`
- Shows a timeline of past contracts with superseded dates

**New service method**:
```ts
getHistoryByEmployee: (employeeId: string) =>
  apiClient<Contract[]>(`/api/contracts/employee/${employeeId}/history`),

getExpiringSoon: (withinDays = 30) =>
  apiClient<Contract[]>(`/api/contracts/expiring-soon?withinDays=${withinDays}`),
```

### 4.5 Expiring Contracts Widget

Add to `HrDashboard.tsx`:
```tsx
<ExpiringContractsWidget />
```
Calls `ContractService.getExpiringSoon()` and shows a small table of contracts expiring within 30 days with a direct link to `/hr/contract`.

---

## Phase 5 — Finance Admin Flows

**Goal**: Build the complete FINANCE_ADMIN UI: payroll submission workflow, employer cost visibility, and the three accounting reports.

### 5.1 Finance Payroll Page (`/finance/payroll`)

**`src/app/components/finance/FinancePayrollContent.tsx`**

This mirrors the HR payroll page but focuses on the FINANCE_ADMIN workflow:

**Step 1 — Calculate** (already done by HR admin view; Finance admin can also trigger):
- Period selector (year + month)
- "Batch Calculate" and "Single Calculate" buttons
- Payroll list with DRAFT records

**Step 2 — Review & Submit**:
- Table of DRAFT payrolls with columns: Employee, Gross, Deductions, Net, Employer Cost, Status
- "Submit for Approval" button (PATCH `/{id}/submit`) changes status DRAFT → PENDING_APPROVAL
- "Submit All Drafts" bulk action button

**Step 3 — Track Pending**:
- Tab for PENDING_APPROVAL records (waiting for Director)
- Read-only view

**Step 4 — Mark Paid**:
- Tab for APPROVED records
- "Mark as Paid" button (PATCH `/{id}/mark-paid`)

Update `PayrollService.ts`:
```ts
submit: (id: string) =>
  apiClient<Payroll>(`/api/payrolls/${id}/submit`, { method: "PATCH" }),

reject: (id: string, reason: string) =>
  apiClient<Payroll>(`/api/payrolls/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  }),
```

### 5.2 Payroll Detail Modal

**New component**: `src/app/components/finance/PayrollDetailModal.tsx`
- Opens when clicking any payroll row
- Shows full earnings/deductions breakdown:

```
Earnings
  Performance Salary:        X,XXX,XXX đ
  Position Coefficient:        XXX,XXX đ
  Living Allowance:            XXX,XXX đ
  Language Allowance:          XXX,XXX đ
  ODC Allowance:               XXX,XXX đ
  KPI Average:                      1.04
  OT Pay:                      XXX,XXX đ
  Bonus:                       XXX,XXX đ
  ─────────────────────────────────────
  Total Gross:               X,XXX,XXX đ

Employee Deductions
  BHXH (8%):                   XXX,XXX đ
  BHYT (1.5%):                  XX,XXX đ
  BHTN (1%):                    XX,XXX đ
  PIT:                         XXX,XXX đ
  ─────────────────────────────────────
  Net Salary:                X,XXX,XXX đ

Employer Cost
  BHXH Employer (17%):         XXX,XXX đ
  BHYT Employer (3%):           XX,XXX đ
  BHTN Employer (1%):           XX,XXX đ
  Workplace Accident (0.5%):    XX,XXX đ
  Total Employer Contrib:      XXX,XXX đ
  Total Employment Cost:     X,XXX,XXX đ
```

**Update `Payroll` type** to include all new employer fields from the backend:
```ts
export interface Payroll {
  // ... existing ...
  bhxhEmployer?: number;
  bhytEmployer?: number;
  bhtnEmployer?: number;
  workplaceAccidentInsurance?: number;
  totalEmployerContributions?: number;
  totalEmploymentCost?: number;
  rejectionReason?: string;
}
```

### 5.3 Director Approval Page (`/director/approvals`)

**`src/app/components/director/DirectorApprovalContent.tsx`**
- Shows all PENDING_APPROVAL payrolls
- Each row: Employee, Period, Net Salary, Total Employment Cost, Status
- Click → opens `PayrollDetailModal` (read-only)
- "Approve" button (PATCH `/{id}/approve`) — confirm dialog before executing
- "Reject" button → opens `RejectReasonModal` (textarea for reason) → PATCH `/{id}/reject`

**New component**: `src/app/components/common/RejectReasonModal.tsx`
- Generic — takes `onConfirm(reason: string)` prop
- Used for both payroll rejection and other approval workflows

### 5.4 Accounting Reports (`/finance/reports`)

**`src/app/components/finance/ReportsContent.tsx`**
- Tab bar: "Labour Cost" | "Insurance Remittance" | "PIT Summary"
- Each tab has: year + month selector, "Generate Report" button, results table, "Export CSV" button

**Labour Cost Tab** — calls `GET /api/payrolls/reports/labour-cost?year=&month=&deptId=`:
- Optional department filter dropdown
- Summary row: headcount, total gross, total net, total employee insurance, total employer insurance, total PIT, total employment cost
- Detail table per employee

**Insurance Remittance Tab** — calls `GET /api/payrolls/reports/insurance-remittance?year=&month=`:
- Columns: Employee, Social Insurance Code, Insurance Base, BHXH (EMP), BHYT (EMP), BHTN (EMP), Total EMP, BHXH (ER), BHYT (ER), BHTN (ER), Workplace Acc, Total ER
- Grand total row

**PIT Summary Tab** — calls `GET /api/payrolls/reports/pit-summary?year=&month=`:
- Columns: Employee, Tax Code, Dependents, Taxable Income, PIT
- Total PIT row

**New service methods** in `PayrollService.ts`:
```ts
getLabourCostReport: (year: number, month: number, deptId?: string) =>
  apiClient<LabourCostResponse>(
    `/api/payrolls/reports/labour-cost?year=${year}&month=${month}${deptId ? `&deptId=${deptId}` : ""}`
  ),

getInsuranceRemittanceReport: (year: number, month: number) =>
  apiClient<InsuranceRemittanceResponse>(
    `/api/payrolls/reports/insurance-remittance?year=${year}&month=${month}`
  ),

getPitSummaryReport: (year: number, month: number) =>
  apiClient<PitSummaryResponse>(
    `/api/payrolls/reports/pit-summary?year=${year}&month=${month}`
  ),
```

**New types**:
```ts
export interface LabourCostResponse {
  period: string;
  departmentId?: string;
  departmentName?: string;
  headcount: number;
  totalGross: number;
  totalNetSalary: number;
  totalEmployeeInsurance: number;
  totalEmployerInsurance: number;
  totalPit: number;
  totalOtPay: number;
  totalEmploymentCost: number;
  byEmployee: LabourCostItem[];
}

export interface LabourCostItem {
  employeeId: string;
  employeeName: string;
  totalGross: number;
  netSalary: number;
  totalEmployeeInsurance: number;
  totalEmployerInsurance: number;
  pit: number;
  otPay: number;
  totalEmploymentCost: number;
}

export interface InsuranceRemittanceResponse {
  period: string;
  headcount: number;
  totalEmployeeInsurance: number;
  totalEmployerInsurance: number;
  grandTotal: number;
  items: InsuranceRemittanceItem[];
}

export interface PitSummaryResponse {
  period: string;
  totalPit: number;
  items: PitSummaryItem[];
}
```

### 5.5 CSV Export Utility

**New util**: `src/app/commons/utils/CsvExport.ts`
```ts
export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => JSON.stringify(row[h] ?? "")).join(",")
    ),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Phase 6 — Employee Payslip Detail

**Goal**: Replace the simple payroll list on the employee self-service page with a detailed, print-ready payslip.

### 6.1 Employee Payslip Service

**Add to** `src/app/services/PayrollService.ts`:
```ts
getMyPayslip: (year: number, month: number) =>
  apiClient<Payslip>(`/api/payrolls/my/${year}/${month}/slip`),
```

**New type**:
```ts
export interface Payslip {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  bankAccountNumber?: string;
  bankName?: string;
  payrollYear: number;
  payrollMonth: number;
  performanceSalary: number;
  positionCoefficient: number;
  livingAllowance: number;
  languageAllowance: number;
  odcAllowance: number;
  kpiAverage: number;
  actualWorkingDays: number;
  standardWorkingDays: number;
  otPay: number;
  bonus: number;
  totalGross: number;
  insuranceBase: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  dependentCount: number;
  taxableIncome: number;
  pit: number;
  netSalary: number;
  status: string;
}
```

### 6.2 Payslip Page Component

**Update** `src/app/components/payroll/PayslipContent.tsx`:

**List view** — table of past payroll records (year, month, status, net salary). Status must be APPROVED or PAID to show "View Payslip" button.

**Payslip Detail View** — shown in a full-screen modal or dedicated section:

```
┌─────────────────────────────────────────────┐
│  PHIẾU LƯƠNG / PAY SLIP                      │
│  [Employee Name]        Period: 05/2026      │
│  Bank: [Bank Name] — [Account Number]        │
├──────────────────────────────────────────────┤
│  A. GROSS EARNINGS                           │
│  Performance Salary:            12,000,000 đ │
│  × KPI Average:                        1.04  │
│  Position Coefficient:           2,000,000 đ │
│  Living Allowance:                 800,000 đ │
│  Language Allowance:               500,000 đ │
│  ODC Allowance:                  1,200,000 đ │
│  Working Days: 22 / 26                       │
│  OT Pay:                         1,500,000 đ │
│  Bonus:                                  0 đ │
│  ─────────────────────────────────────────── │
│  Total Gross:                   18,000,000 đ │
│                                              │
│  B. DEDUCTIONS                               │
│  Insurance Base:                10,000,000 đ │
│  BHXH (8%):                        800,000 đ │
│  BHYT (1.5%):                      150,000 đ │
│  BHTN (1%):                        100,000 đ │
│  Dependents: 1 (reduction: 4,400,000 đ)     │
│  Taxable Income:                11,550,000 đ │
│  PIT:                              577,500 đ │
│  ─────────────────────────────────────────── │
│  NET SALARY:                    16,372,500 đ │
└─────────────────────────────────────────────┘
  [Print]   [Download PDF]
```

**Print button**: `window.print()` with a `@media print` CSS class that hides sidebar/header.

---

## Phase 7 — Notifications

**Goal**: Replace the mock notification bell with a real API-backed notification system.

### 7.1 Notification Types

**`src/app/commons/types/index.ts`**:
```ts
export interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}
```

### 7.2 Notification Service

**New file**: `src/app/services/NotificationService.ts`
```ts
export const NotificationService = {
  getAll: (page = 0, size = 20) =>
    apiClient<PageResponse<Notification>>(
      `/api/notifications?page=${page}&size=${size}`
    ),

  getUnreadCount: () =>
    apiClient<{ unreadCount: number }>("/api/notifications/unread-count"),

  markRead: (id: string) =>
    apiClient<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: () =>
    apiClient<null>("/api/notifications/read-all", { method: "PATCH" }),
};
```

### 7.3 Notification Bell in Header

**Update** `src/app/components/Header.tsx`:

1. On mount: call `NotificationService.getUnreadCount()` → set unread badge count
2. Poll every 60 seconds while page is visible (`document.visibilityState === "visible"`)
3. On bell click: open dropdown panel showing last 10 notifications
4. Each notification: title, truncated message, relative time (`X minutes ago`), read/unread indicator
5. "Mark all as read" button at the top of the panel
6. Click individual notification → mark as read + close panel

```tsx
// Polling with cleanup
useEffect(() => {
  const fetchCount = () => NotificationService.getUnreadCount()
    .then(r => r.success && setUnreadCount(r.data.unreadCount));
  fetchCount();
  const id = setInterval(fetchCount, 60_000);
  return () => clearInterval(id);
}, []);
```

### 7.4 Notification Page (Optional)

**New page**: `src/app/employees/notifications/page.tsx`
- Full paginated list of all notifications
- Filter: All | Unread
- Mark all read button
- Link from Header bell → "See all notifications"

---

## Phase 8 — Dashboard Real Data

**Goal**: Replace all chart stubs with actual API data. This is the highest-effort phase but the highest visual impact.

### 8.1 Data Fetching Pattern for Dashboards

All dashboard components should follow this pattern:

```tsx
const [data, setData] = useState<ChartData[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  SomeService.getSomeData()
    .then(res => res.success && setData(transformForChart(res.data)))
    .finally(() => setLoading(false));
}, []);

if (loading) return <ChartSkeleton />;
```

**New component**: `src/app/components/common/ChartSkeleton.tsx` — animated gray placeholder rectangle.

### 8.2 Employee Dashboard (`EmployeeDashboard.tsx`)

Fetch on mount:
- `AttendanceService.getAttendances({ year, month })` → compute: days worked, late days, absences
- `LeaveService.getMyBalances()` → remaining annual leave days
- `PayrollService.getMyPayrolls()` (last 6 months) → for `MySalaryTrendChart`

**StatCards**:
```
Days Worked This Month: X / 26
Days Late:              X
Remaining Annual Leave: X days
Last Net Salary:        X,XXX,XXX đ
```

**`MySalaryTrendChart.tsx`** — LineChart of netSalary for last 6 months. X-axis: month labels. Y-axis: VND (formatted as millions).

**`AttendanceSummaryDonut.tsx`** — Pie: On-Time vs Late vs Absent.

**`AttendanceRadarChart.tsx`** — Radar: Working hours by day-of-week for current month.

### 8.3 Manager Dashboard (`ManagerDashboard.tsx`)

Fetch on mount:
- `LeaveService.getAllLeaves("TO_APPROVE")` + `OTRequestService.getAllOTRequests("TO_APPROVE")` → pending count
- `DepartmentService.getDepartments()` → department members

**StatCards**:
```
Pending Leave Requests:   X
Pending OT Requests:      X
Team Members:             X
```

**`MiniRequestTable.tsx`** — 5 most recent pending leave/OT requests with approve/reject buttons.

**`DeptMemberTable.tsx`** — members of current manager's department (name, role, status).

**`WorkingHoursBarChart.tsx`** — BarChart of team average working hours this month.

**`DeptStatusDonut.tsx`** — PieChart: ACTIVE / ON_LEAVE / TERMINATED team member statuses.

### 8.4 HR Dashboard (`HrDashboard.tsx`)

Fetch on mount:
- `EmployeeService.getEmployees(0, 200)` → headcount, department distribution
- `PayrollService.getPayrollsByPeriod(year, month)` (last 3 months) → cost trend
- `LeaveService.getAllLeaves()` → approval rate
- `ContractService.getExpiringSoon()` → expiry alert count

**StatCards**:
```
Total Employees:          X
Active Employees:         X
Contracts Expiring (30d): X
Avg Net Salary:           X,XXX,XXX đ
```

**`PayrollTrendChart.tsx`** — LineChart: total gross, total net, total employment cost for last 6 months.

**`PayrollCostBreakdownBar.tsx`** — BarChart: employee salary vs employer contributions vs PIT for current month.

**`DeptHeadcountChart.tsx`** — BarChart: employee count per department.

**`ContractTypeChart.tsx`** — BarChart: count by contract type (FIXED_TERM, INDEFINITE, PROBATION).

**`LeaveApprovalRateChart.tsx`** — BarChart or Pie: APPROVED vs REJECTED vs PENDING leave requests for current month.

**`RequestStatusPieChart.tsx`** — Pie: request statuses across leave + OT combined.

### 8.5 System Admin Dashboard (`SystemAdminDashboard.tsx`)

Renders `HrDashboard` + additional admin-specific cards:

**`ActiveConfigCard.tsx`** (update to fetch real data):
- Calls `SystemConfigService.getSystemConfigs("SALARY_GRADE")`, `"ALLOWANCE"`, `"PIT"`, `"INSURANCE"`
- Shows active version, effective date, legal basis for each

---

## Phase 9 — Department Management Completion

**Goal**: Complete the department management UI — the existing code has form + service but no table component.

### 9.1 Department Table

**New component**: `src/app/components/department/DepartmentTable.tsx`
- Columns: ID, Department Name, Manager, Parent Department, Actions (Edit, Delete)
- Edit button opens `DepartmentFormModal` (existing, update to pre-fill data)
- Delete shows `ConfirmDialog` (new common component)

**New component**: `src/app/components/common/ConfirmDialog.tsx`
```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;   // default: "Confirm"
  danger?: boolean;        // makes confirm button red
}
```

Update `DepartmentContent.tsx` to render `DepartmentTable`.

### 9.2 Manager Department View (`/managers/department`)

**Update** `src/app/components/department/DepartmentDetailContent.tsx`:
- Currently shows department list — replace with team member view
- Shows current manager's department name + members
- Table: Name, Role, Status, Today's Attendance Status (present/absent)
- Calls `EmployeeService.getEmployees(0, 100, deptId)` scoped to manager's department

---

## Phase 10 — Polish & Error Handling

**Goal**: Production-hardening — loading states, error boundaries, empty states, and accessibility.

### 10.1 Loading Skeletons

**New component**: `src/app/components/common/TableSkeleton.tsx`
- Animated gray rows (configurable row count)
- Used in every Content component while data is loading

**New component**: `src/app/components/common/Spinner.tsx`
- Centered spinner for page-level loads
- Replace any hard-coded `Loading...` text

### 10.2 Empty State Component

**New component**: `src/app/components/common/EmptyState.tsx`
```tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

Use in every table when `data.length === 0`.

### 10.3 Error Boundary

**New component**: `src/app/components/common/ErrorBoundary.tsx`
- React class component (required for error boundaries)
- Shows friendly error message + "Try again" button on caught render errors
- Wrap `<main>` content in each page layout

### 10.4 Pagination Component

**New component**: `src/app/components/common/Pagination.tsx`
- Receives: `page`, `totalPages`, `onPageChange`
- Shows: « Prev  1 2 3 … N  Next »
- All paginated tables should use this instead of ad-hoc pagination logic

### 10.5 Currency Formatter

**New util**: `src/app/commons/utils/formatters.ts`
```ts
export const formatVnd = (n: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export const formatDate = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString("vi-VN") : "—";

export const formatDateTime = (iso?: string): string =>
  iso ? new Date(iso).toLocaleString("vi-VN") : "—";

export const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
```

Use `formatVnd()` everywhere a money amount is displayed. Use `formatDate()` for dates, `formatDateTime()` for timestamps.

---

## Implementation Order

Implement phases in this order — each builds on the previous:

```
Phase 1  — Role architecture + auth polish          (1–2 days)
Phase 2  — Employee data: statutory fields + pic    (2–3 days)
Phase 9  — Department management completion         (1 day)
Phase 3  — HR operational: period close, holidays   (2 days)
Phase 4  — Contract lifecycle                       (2 days)
Phase 5  — Finance admin: payroll + reports         (3–4 days)
Phase 6  — Employee payslip detail                  (1 day)
Phase 7  — Notifications                            (1–2 days)
Phase 8  — Dashboard real data                      (3–4 days)
Phase 10 — Polish and error handling                (2 days)
```

**Total estimated effort**: ~18–22 working days for a single developer.

---

## New API Endpoints Reference

These backend endpoints were added in the backend roadmap but have no current frontend callers:

| Method | Path | Used in Phase |
|--------|------|--------------|
| `GET` | `/api/employees/{id}/profile` (extended fields) | 2 |
| `POST` | `/api/employees/{id}/profile-picture` | 2 |
| `GET/POST/DELETE` | `/api/tax-dependents` | 2 |
| `POST` | `/api/attendances/close-period` | 3 |
| `GET/POST/DELETE` | `/api/public-holidays` | 3 |
| `GET` | `/api/leaves/balances/my` | 3 |
| `GET` | `/api/leaves/balances/{id}` | 3 |
| `GET` | `/api/contracts/employee/{id}/history` | 4 |
| `GET` | `/api/contracts/expiring-soon` | 4 |
| `PATCH` | `/api/payrolls/{id}/submit` | 5 |
| `PATCH` | `/api/payrolls/{id}/reject` | 5 |
| `GET` | `/api/payrolls/reports/labour-cost` | 5 |
| `GET` | `/api/payrolls/reports/insurance-remittance` | 5 |
| `GET` | `/api/payrolls/reports/pit-summary` | 5 |
| `GET` | `/api/payrolls/my/{year}/{month}/slip` | 6 |
| `GET` | `/api/notifications` | 7 |
| `GET` | `/api/notifications/unread-count` | 7 |
| `PATCH` | `/api/notifications/{id}/read` | 7 |
| `PATCH` | `/api/notifications/read-all` | 7 |
| `POST` | `/api/devices/{id}/api-key` | (System admin, low priority) |

---

## Key Constraints

1. **Never use `fetch()` directly** — always use `apiClient()` from `ApiCallUtil.tsx`
2. **Never add state to `AuthContext`** unless it is authentication state (user, token, role)
3. **All types go in `commons/types/index.ts`** — no local type definitions in components
4. **All API calls in services** — no inline `apiClient()` calls inside components
5. **No CSS modules** — use Tailwind utility classes only
6. **No `react-router-dom`** — use Next.js `<Link>` and `useRouter()` from `next/navigation`
7. **Defensive array check** when receiving data that might be paginated or plain array:
   ```ts
   const items = Array.isArray(data) ? data : (data as any)?.content ?? [];
   ```
8. **Money formatting**: always use `formatVnd()` — never format numbers manually
9. **Always handle loading state** — show skeleton/spinner while fetching
10. **Always handle empty state** — show `<EmptyState>` when table has zero rows
