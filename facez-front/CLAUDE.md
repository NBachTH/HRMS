# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FaceZ frontend — a Next.js (App Router) HRMS web client for a Vietnamese HR/payroll
system. It is a pure client of a Spring Boot backend (`facez`, served at
`http://localhost:8084/face-z`); there are no Next.js API routes or server actions.
Almost every page is a Client Component (`"use client"`).

## Commands

```bash
npm run dev      # dev server on :3000 (Turbopack)
npm run build    # production build (Turbopack)
npm start        # serve production build
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
```

There is **no test framework configured** — do not assume `npm test` exists.

Before running, copy `.env.example` to `.env.local`. The only env var is
`NEXT_PUBLIC_API_BASE` (backend base URL incl. `/face-z` context path). It is read
once at module load in `ApiCallUtil.tsx` and `*Service.ts` files.

## Architecture

### Layered structure (all under `src/app/`, `@/` aliases `./src/`)
- **`<role>/<feature>/page.tsx`** — thin route pages. They compose
  `ProtectedRoute` → `Sidebar` + `Header` → a `*Content` component. Route folders are
  organized by audience: `employees/`, `managers/`, `hr/`, `finance/`, `director/`,
  `system/`. `app/page.tsx` is the login page.
- **`components/<feature>/*Content.tsx`** — the actual feature UI and data wiring.
  Pages stay dumb; logic lives in Content components and below.
- **`services/*Service.ts`** — one module per backend resource. Every function calls
  `apiClient(...)` and returns the typed `ApiResponse<T>`. This is the **only** layer
  that knows backend URLs. Add new endpoints here, not inline in components.
- **`commons/types/index.ts`** — all shared types, hand-mirrored from backend DTOs.
  Keep this in sync with the backend; it is the source of truth for response shapes.
- **`commons/utils/`**, **`commons/contexts/`** — cross-cutting infrastructure (below).

### Auth & API flow (the critical path)
- `AuthContext` (`commons/contexts/AuthContext.tsx`) holds `user`, `accessToken`,
  `role`, `employeeId`. On mount it calls `refresh()` to silently restore a session
  from the httpOnly refresh-token cookie. Wrapped around the app in `layout.tsx`.
- `ApiCallUtil.tsx` is the centralized fetch client (`apiClient<T>`):
  - Holds the access token in a **module-level variable** (not React state); kept in
    sync via `setAccessToken` / `onTokenRefresh`. The token is **not** persisted —
    a page reload re-runs the refresh flow.
  - Sends `Authorization: Bearer` + `credentials: 'include'` (cookies).
  - On **401 or 403** it refreshes once and retries. This backend returns **403**
    (not 401) for expired/missing tokens — handle both.
  - Refresh is **single-flight**: concurrent failures share one `/api/auth/refresh`
    call. Refresh tokens rotate, so parallel refreshes would cascade into failures.
    Preserve this behavior when touching the client.
  - Non-OK responses `throw { status, body }` — callers catch this shape, not an Error.
- `AuthService.tsx` `signin`/`refresh` deliberately use raw `fetch` (not `apiClient`)
  to avoid the refresh-retry loop. The backend wraps payloads in `ApiResponse<T>`;
  these read `body.data || body`.

### Authorization (RBAC)
- Roles: `EMPLOYEE | SYSTEM_ADMIN | HR_ADMIN | LEADER | MANAGER | FINANCE_ADMIN | DIRECTOR`.
- `ProtectedRoute` (`commons/utils/Protector.tsx`) gates pages: redirects
  unauthenticated users to `/`, shows a 403 panel if `role` is not in `allowedRoles`.
  Pass `allowedRoles` per page; omit it to allow any authenticated user.
- `Sidebar.tsx` renders nav sections conditionally by `role` — this is the canonical
  map of which roles reach which routes. Keep `Sidebar` and each page's
  `allowedRoles` consistent when adding routes. Client-side gating is UX only; the
  backend enforces real authz.

### Conventions
- **Money/dates**: format via `commons/utils/formatters.ts` (`formatVnd`,
  `formatDate`, `formatDateTime`, `formatMonth`, `exportToCsv`). VND amounts in
  salary-grade configs are in **thousand VND**.
- **Toasts**: `useToast().showToast(msg, 'success'|'error')` from `ToastContext`
  (provider in `layout.tsx`). Use instead of `alert`.
- **Pagination**: backend pages are **0-indexed**; responses use `PageResponse<T>`.
- **Shared UI primitives** live in `components/common/` (`Modal`, `ConfirmDialog`,
  `Pagination`, `Spinner`, `EmptyState`, `ApprovalStepper`, etc.) — reuse them.
- Styling is Tailwind v4 (`@tailwindcss/postcss`); no CSS modules.
- `react-router-dom` is a dependency but routing is **Next App Router** — use
  `next/navigation` (`useRouter`, `redirect`) for navigation.

### Domain notes
- Core domains: employees/contracts, attendance (check-in logs → workdays →
  timesheets, monthly period close), leave & OT (multi-step approval: LEADER → MANAGER
  → DIRECTOR), payroll (per-employee + batch jobs polled via `pollPayrollJob`), and
  effective-dated payroll config (`SALARY_GRADE | ALLOWANCE | PIT | INSURANCE`, with
  `DRAFT | PUBLISHED | ARCHIVED` status and maker-checker workflow under Finance).
- Identity for self-service mutations (leave/OT/adjustment create) is derived from the
  JWT server-side; client-supplied `employeeId` is ignored — types note this.

### Turbopack gotcha
`next.config.ts` pins `turbopack.root` to `process.cwd()`. Without it Turbopack infers
a parent dir as workspace root and fails to resolve `tailwindcss` from local
`node_modules`. Run `dev`/`build` from the project root.
