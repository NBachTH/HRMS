# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FaceZ is a Spring Boot 4 (Java 21) HRMS / payroll backend. It is an API-only service
(`/face-z` context path, port `8084`) — there are no Thymeleaf templates or static assets
despite the starters being present. Front end is assumed to be a separate SPA (CORS allows
`http://localhost:3000`). Core domains: employees, departments, contracts, attendance
(check-in logs / workdays / timesheets), leave, OT requests, payroll, and notifications.

## Build & run

```bash
./mvnw clean package           # build (use mvnw.cmd on Windows cmd; Bash tool can use ./mvnw)
./mvnw spring-boot:run         # run with default profile
./mvnw test                    # run all tests
./mvnw test -Dtest=ClassName#method   # run a single test
```

Spring profiles: `dev`, `staging`, `prod` (`application-<profile>.yml`). No profile is active
by default; pass `-Dspring-boot.run.profiles=dev` to enable one. `dev` shows SQL and uses a
1-hour access token for convenience; `prod` quiets logging and hardens cookies.

### Infrastructure dependencies
- **PostgreSQL** on `localhost:5434`, db `HRMS`, user/pass `hrmsuser`/`hrmspassword` (override via `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`).
- **Redis** on `localhost:6379` (see `compose.yaml.txt`).
- **MinIO** (S3-compatible) on `localhost:9000`, bucket `facez-contracts` — stores contract documents (`compose.yaml.txt`, `MinioConfig`, `StorageService`).

`compose.yaml.txt` brings up Redis + MinIO (it is not named `compose.yaml`, so Spring Boot
does not auto-start it — run `docker compose -f compose.yaml.txt up` manually). Postgres is
expected to already be running.

### Database schema — NOT managed by Flyway at runtime
`ddl-auto: none` and **Flyway is not a dependency** (despite `spring.flyway.*` keys in the
profile YAMLs and the `flyway` actuator endpoint being exposed — both are inert). The
`src/main/resources/db/migration/V*.sql` files are the source of truth but are applied
**manually**, in order, against the database. `db/final_schema.sql` / `db/schema_full.sql` are
consolidated snapshots. After applying the schema, seed data with the Python scripts in
`src/main/resources/scripts/` (require `psycopg2`):
- `insert_payroll_configs.py` — seeds the typed, effective-dated payroll config tables (V27) from `config/payroll/*.json`; TRUNCATEs first so it is idempotent.
- `generate_mock_data.py` / `insert_mock_data.py` / `insert_extra_tables.py` — demo data.

On first boot, `DataInitializerConfig` (a `CommandLineRunner`) creates a `SYSTEM_ADMIN` user
`admin` / `admin123` if absent.

## Architecture

### Package layout
- `org.dummy.facez.domain.<domain>` — each domain is a vertical slice with `controller/`, `service/`, `repository/`, `model/` (JPA entities), `dto/`, and sometimes `event/` and `scheduler/`.
- `org.dummy.facez.common` — cross-cutting: `enums/` (Role, statuses, etc.), `model/AuditableEntity`, `response/{ApiResponse,PageResponse}`, `exception/` (with `GlobalExceptionHandler`), `filters/`, `storage/`, `services/`, `utils/`.
- `org.dummy.facez.configs` — `SecurityConfig`, `MinioConfig`, `RedisConfig`, `JpaAuditingConfig`, `DataInitializerConfig`.
- `org.dummy.facez.auth` — login/refresh, `CustomUserDetailService`.

### Conventions
- Controllers return `ApiResponse<T>` (`ApiResponse.ok(...)` / `.error(...)`) and `PageResponse<T>` for pages. Errors are funneled through `GlobalExceptionHandler` using `BadRequestException` / `ResourceNotFoundException`.
- Entities extend `AuditableEntity` to get `createdAt/updatedAt/createdBy/updatedBy` (JPA auditing via `JpaAuditingConfig`; the `createdBy/updatedBy` come from the authenticated principal).
- Lombok is used throughout (`@Data`, `@Builder`, etc.) and is excluded from the built jar.
- Cross-domain side effects use Spring `ApplicationEvent`s, published synchronously/async (`AsyncConfig`) rather than direct service calls: e.g. `CheckinProcessedEvent`, `LeaveApprovedEvent`, `OTApprovedEvent` drive workday/timesheet/notification updates. Prefer this pattern over reaching across domains.

### Auth & RBAC (`SecurityConfig`)
- Stateless JWT (jjwt). `JwtAuthFilter` authenticates bearer tokens; refresh token lives in an HTTP-only cookie (`app.cookie.refresh-token-name`). Public endpoints: `/api/auth/login`, `/api/auth/refresh`, swagger, `/actuator/health`.
- `DeviceApiKeyFilter` authenticates attendance devices via an `X-Device-API-Key` header, granting the `DEVICE_CHECKIN` authority for `/api/checkin-logs/**`.
- Roles (`common/enums/Role`): `EMPLOYEE`, `LEADER`, `MANAGER`, `SYSTEM_ADMIN`, `HR_ADMIN`, `FINANCE_ADMIN`, `DIRECTOR`. Authorities are checked by **string name** (e.g. `hasAuthority("HR_ADMIN")`), so any new role must match the enum name exactly.
- Authorization is enforced in two layers: coarse URL rules in `SecurityConfig` plus method-level `@PreAuthorize` (`@EnableMethodSecurity`). Ownership checks (e.g. an `EMPLOYEE` reading only their own payslip via `/api/payrolls/my/**`) are enforced **in the service layer**, not the URL matcher.
- Payroll follows a maker–checker split: **Finance** calculates / marks-paid / deletes (DRAFT only), **Director** approves. Keep new payroll endpoints consistent with this separation.

### Payroll engine (`domain/payroll`)
- `PayrollCalculationEngine` is a **pure** computation component — no DB writes, no transactions. It takes pre-loaded domain objects (contract, workdays, OT requests, KPI inputs) and returns a DRAFT `Payroll`. Keep persistence/transaction logic in `PayrollService` / `PayrollBatchService`, not the engine.
- Payroll configuration (salary grades, PIT brackets, insurance, allowances) lives in **typed, effective-dated, append-only** tables (V27) — published versions are immutable and selected by effective date. Do not revert these to JSONB blobs. Admin edits go through `PayrollConfigAdminService` (maker-checker, Finance-owned); reads through `PayrollConfigService`. Batch jobs are tracked via `PayrollJobStore` / `PayrollJobRecord`.

## API docs
Swagger UI at `/face-z/swagger-ui.html`, OpenAPI JSON at `/face-z/v3/api-docs`.

## Design specs
Canonical design documentation (business / technical / operational, ~14 docs) lives outside
this module in `D:\PRJ\docs\design-spec\`. Consult it for business-rule intent before changing
payroll, attendance, or leave logic.
