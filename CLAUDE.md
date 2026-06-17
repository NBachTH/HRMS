# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo for **FaceZ**, a Vietnamese HRMS / payroll system. It has two
deployable applications plus a shared design-spec corpus:

- **`facez/`** — Spring Boot 4 (Java 21) backend. API-only, context path `/face-z`,
  port `8084`. See `facez/CLAUDE.md` for build/run, schema management, auth/RBAC, and
  the payroll engine.
- **`facez-front/`** — Next.js (App Router) web client on port `3000`. Pure client of
  the backend; no Next API routes. See `facez-front/CLAUDE.md` for commands,
  the layered structure, and the auth/API flow.
- **`docs/`** — design and reporting docs (see below).
- **`.bk/`** — archived/superseded doc snapshots (`docs_backend/`, `docs_frontend/`).
  Historical reference only; not authoritative.

**Always read the relevant subproject's `CLAUDE.md` before working in it** — those
files carry the details that matter (conventions, gotchas, infra). This root file only
covers what spans both.

## How the two halves connect

- The frontend reaches the backend through `NEXT_PUBLIC_API_BASE` (default
  `http://localhost:8084/face-z`); the backend's CORS allows `http://localhost:3000`.
- Contracts are hand-mirrored, not generated: backend DTOs ↔
  `facez-front/src/commons/types/index.ts`. When you change a backend response shape,
  update the frontend types in the same change.
- **Shared invariants that must stay aligned on both sides:**
  - Roles: `EMPLOYEE | LEADER | MANAGER | SYSTEM_ADMIN | HR_ADMIN | FINANCE_ADMIN | DIRECTOR`.
    Authorities are matched by exact enum-name string — a new role must use the same
    name in backend `@PreAuthorize` rules and frontend `allowedRoles`/`Sidebar`.
  - Pagination is **0-indexed**; pages are returned as `PageResponse<T>`, payloads
    wrapped in `ApiResponse<T>`.
  - Auth: stateless JWT bearer + httpOnly rotating refresh-token cookie. The backend
    returns **403** (not 401) for expired/missing tokens — the client refreshes on both.
  - Server derives identity from the JWT for self-service mutations; client-supplied
    `employeeId` is ignored.

## Running the full stack locally

1. Infra (from `facez/`): PostgreSQL on `localhost:5434` (db `HRMS`), plus Redis +
   MinIO via `docker compose -f compose.yaml.txt up`. The DB schema is applied
   **manually** from `facez/src/main/resources/db/migration/V*.sql` (Flyway is inert),
   then seeded with the Python scripts in `.../resources/scripts/`. See `facez/CLAUDE.md`.
2. Backend: `cd facez && ./mvnw spring-boot:run` (first boot seeds `admin`/`admin123`).
3. Frontend: `cd facez-front && cp .env.example .env.local && npm run dev`.

## Documentation

- **`docs/design-spec/`** is the canonical 14-doc design set (business / technical /
  operational), indexed by `docs/design-spec/00-README.md`. Consult it for business-rule
  intent before changing payroll, attendance, or leave logic.
- `docs/` also holds analysis docs (`0X_*.md`), Vietnamese versions under `docs/vi/`,
  and student progress reports under `docs/report/`.
