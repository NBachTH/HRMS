# Phase 0 — Foundation: Detailed Implementation Guide

**Project:** FaceZ HRMS | **Backend:** `facez/` (Spring Boot 4.0.0-M3, Java 21)
**Estimated time:** 3 weeks | **Blocks:** All subsequent phases

This guide walks through every file change for Phase 0. Follow the sub-phases in order — each step is a prerequisite for the next.

---

## Current State Assessment

Before making any changes, verify what is already done:

| Item | Status | Notes |
|---|---|---|
| `flyway-core` in `pom.xml` | ✅ Done | Lines 157–162 |
| `ddl-auto: none` in `application.yml` | ✅ Done | Line 18 |
| DB/Redis URLs use `${ENV_VAR}` | ✅ Done | Lines 8–15 |
| `JWT_SECRET` has no hardcoded default | ✅ Done | Line 25 |
| `db/migration/` directory exists | ❌ Missing | Must create |
| `flyway.enabled` config block | ❌ Missing | Must add |
| `corsConfigurationSource` reads from `@Value` | ❌ Bug | Line 82 still hardcodes `List.of("http://localhost:3000")` |
| `SecurityConfig` `@Value` injection | ❌ Broken | Line 33 is outside any method |
| `AuditableEntity` base class | ❌ Missing | Must create |
| Bucket4j-Redis rate limiting | ❌ Missing | Must add dependency + code |
| Environment profile files | ❌ Missing | Must create |

---

## Phase 0.1 — Flyway Baseline Migration

### Step 1: Create the migration directory

```
facez/src/main/resources/db/migration/
```

This directory must exist before the application starts. Flyway scans `classpath:db/migration` by default.

### Step 2: Add Flyway config to `application.yml`

**File:** `facez/src/main/resources/application.yml`

Add the following block under `spring:` (after the `jpa:` section):

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false   # Do NOT auto-baseline — V1 must be written explicitly
    out-of-order: false          # Reject migrations applied out of version order
    validate-on-migrate: true    # Fail fast if a committed migration file is altered
```

### Step 3: Write `V1__baseline_schema.sql`

**File:** `facez/src/main/resources/db/migration/V1__baseline_schema.sql`

This script must recreate the schema that JPA currently manages via `ddl-auto: update`. Derive each table from its `@Entity` class.

```sql
-- ============================================================
-- V1 — Baseline schema derived from all current JPA entities
-- Run once against a fresh database.
-- ============================================================

-- department
CREATE TABLE IF NOT EXISTS department (
    department_id   VARCHAR(64)  PRIMARY KEY,
    department_name VARCHAR(255),
    manager_id      VARCHAR(64),
    delete_flag     BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP
);

-- employee_info
CREATE TABLE IF NOT EXISTS employee_info (
    employee_id       VARCHAR(64)  PRIMARY KEY,
    name              VARCHAR(200) NOT NULL,
    department_id     VARCHAR(64)  REFERENCES department(department_id),
    role              VARCHAR(30)  NOT NULL,
    email             VARCHAR(150),
    phone_number      VARCHAR(50),
    address           VARCHAR(500),
    profile_picture   BYTEA,
    date_of_joining   DATE,
    emergency_contact VARCHAR(200),
    status            VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
    delete_flag       BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMP
);

-- user_account
CREATE TABLE IF NOT EXISTS user_account (
    employee_id       VARCHAR(64)  PRIMARY KEY REFERENCES employee_info(employee_id),
    username          VARCHAR(100) NOT NULL,
    password_hash     VARCHAR(100) NOT NULL,
    last_password_hash VARCHAR(100),
    role              VARCHAR(30)  NOT NULL,
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP,
    delete_flag       BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at        TIMESTAMP,
    CONSTRAINT uq_user_account_username UNIQUE (username)
);

-- benefit
CREATE TABLE IF NOT EXISTS benefit (
    benefit_rank     VARCHAR(64) PRIMARY KEY,
    employee_level   VARCHAR(30),
    housing_benefit  VARCHAR(255),
    meal_benefit     VARCHAR(255),
    vehicle_benefit  VARCHAR(255),
    phone_benefit    VARCHAR(255),
    delete_flag      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMP,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP
);

-- contract
CREATE TABLE IF NOT EXISTS contract (
    id              VARCHAR(64)  PRIMARY KEY,
    employee_id     VARCHAR(64)  REFERENCES employee_info(employee_id),
    start_date      VARCHAR(50),    -- Phase 5.1 will convert to DATE
    end_date        VARCHAR(50),    -- Phase 5.1 will convert to DATE
    contract_type   VARCHAR(100),
    terms           TEXT,
    status          VARCHAR(50),
    salary_rank     VARCHAR(100),
    base_salary     BIGINT,
    insurance_base  BIGINT,
    position_code   VARCHAR(10),
    salary_step     INTEGER,
    dependent_count INTEGER      DEFAULT 0,
    attachment      BYTEA,
    delete_flag     BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

-- device
CREATE TABLE IF NOT EXISTS device (
    device_id   VARCHAR(64) PRIMARY KEY,
    device_name VARCHAR(255),
    log_type    VARCHAR(30),
    delete_flag BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMP
);

-- check_in_log
CREATE TABLE IF NOT EXISTS check_in_log (
    log_id      VARCHAR(64) PRIMARY KEY,
    device_id   VARCHAR(64) REFERENCES device(device_id),
    employee_id VARCHAR(64) REFERENCES employee_info(employee_id),
    log_time    TIMESTAMP,
    log_type    VARCHAR(30),
    delete_flag BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMP
);

-- attendance
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id   VARCHAR(64)    PRIMARY KEY,
    employee_id     VARCHAR(64)    REFERENCES employee_info(employee_id),
    attendance_date DATE           NOT NULL,
    check_in        TIMESTAMP,
    check_out       TIMESTAMP,
    late_hour       NUMERIC(10,2),
    working_hour    NUMERIC(10,2),
    paid_hour       NUMERIC(10,2),
    working_day     NUMERIC(10,2),
    paid_day        NUMERIC(10,2),
    violate         BOOLEAN        NOT NULL DEFAULT FALSE,
    delete_flag     BOOLEAN        NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    CONSTRAINT uk_attendance_employee_date UNIQUE (employee_id, attendance_date)
);

-- leave_request
CREATE TABLE IF NOT EXISTS leave_request (
    leave_request_id VARCHAR(64) PRIMARY KEY,
    employee_id      VARCHAR(64) REFERENCES employee_info(employee_id),
    reason           TEXT,
    start_time       TIMESTAMP,
    end_time         TIMESTAMP,
    status           VARCHAR(30),
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    delete_flag      BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMP
);

-- ot_request
CREATE TABLE IF NOT EXISTS ot_request (
    ot_request_id VARCHAR(64) PRIMARY KEY,
    employee_id   VARCHAR(64) REFERENCES employee_info(employee_id),
    start_time    TIMESTAMP,
    end_time      TIMESTAMP,
    status        VARCHAR(30),
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP,
    delete_flag   BOOLEAN     NOT NULL DEFAULT FALSE,
    deleted_at    TIMESTAMP
);

-- system_config
CREATE TABLE IF NOT EXISTS system_config (
    id            VARCHAR(64)  PRIMARY KEY,
    config_type   VARCHAR(30)  NOT NULL,
    version       VARCHAR(30)  NOT NULL,
    effective_date DATE,
    legal_basis   VARCHAR(300),
    config_data   JSONB        NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_by    VARCHAR(100),
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_syscfg_type_active   ON system_config (config_type, active);
CREATE INDEX IF NOT EXISTS idx_syscfg_type_version  ON system_config (config_type, version);

-- payroll
CREATE TABLE IF NOT EXISTS payroll (
    payroll_id            VARCHAR(64) PRIMARY KEY,
    employee_id           VARCHAR(64) REFERENCES employee_info(employee_id),
    payroll_year          INTEGER     NOT NULL,
    payroll_month         INTEGER     NOT NULL,
    performance_salary    BIGINT,
    position_coefficient  BIGINT,
    living_allowance      BIGINT,
    language_allowance    BIGINT,
    odc_allowance         BIGINT,
    kpi1_score            DOUBLE PRECISION,
    kpi2_score            DOUBLE PRECISION,
    kpi_average           DOUBLE PRECISION,
    actual_working_days   INTEGER,
    standard_working_days INTEGER,
    ot_pay                BIGINT,
    bonus                 BIGINT,
    base_gross            BIGINT,
    total_gross           BIGINT,
    insurance_base        BIGINT,
    bhxh_employee         BIGINT,
    bhyt_employee         BIGINT,
    bhtn_employee         BIGINT,
    dependent_count       INTEGER,
    taxable_income        BIGINT,
    pit                   BIGINT,
    net_salary            BIGINT,
    status                VARCHAR(20) NOT NULL,
    notes                 VARCHAR(500),
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP,
    CONSTRAINT uk_payroll_employee_period UNIQUE (employee_id, payroll_year, payroll_month)
);
```

> **How to derive this file from scratch:** Run `\d <table_name>` in `psql` against your local development database (which was created by `ddl-auto: update`). Copy and convert the output to `CREATE TABLE IF NOT EXISTS` statements. Then restart the app with `ddl-auto: none` and `flyway.enabled: true` against a **fresh empty database** to confirm Flyway creates everything correctly.

### Step 4: Verify startup

Run the application. Expected log output:
```
Flyway Community Edition ... by Redgate
Database: jdbc:postgresql://localhost:5432/postgres (PostgreSQL ...)
Successfully validated 1 migration (execution time ...)
Creating Schema History table "public"."flyway_schema_history" ...
Current version of schema "public": << Empty Schema >>
Migrating schema "public" to version "1 - baseline schema"
Successfully applied 1 migration to schema "public"
```

If you see `Found non-empty schema(s) ... without schema history`, your database already has tables. Either:
- Drop and recreate the database to run from clean: `DROP DATABASE postgres; CREATE DATABASE postgres;`
- Or temporarily set `baseline-on-migrate: true` for the first run, then revert it (this marks existing tables as already migrated at V1).

**Acceptance criteria:** Application starts from an empty database using only Flyway. No `ALTER TABLE` in startup logs. `flyway_schema_history` table exists with one row.

---

## Phase 0.2 — Fix Secrets Externalization

The `application.yml` already uses `${ENV_VAR}` for DB/Redis/JWT. **One remaining bug:** `SecurityConfig.java` still hardcodes CORS origins.

### Step 1: Fix `SecurityConfig.java`

**File:** `facez/src/main/java/org/dummy/facez/configs/SecurityConfig.java`

The current file has a syntax error — `configuration.setAllowedOrigins(allowedOrigins);` appears on line 33 outside any method body. The entire `@Value` injection + `corsConfigurationSource` bean must be rewritten:

```java
package org.dummy.facez.configs;

import org.dummy.facez.common.filters.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // HR Admin only
                .requestMatchers(HttpMethod.POST,   "/api/employees").hasAuthority("HR_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/employees/**").hasAuthority("HR_ADMIN")
                .requestMatchers(HttpMethod.POST,   "/api/departments").hasAuthority("HR_ADMIN")
                .requestMatchers(HttpMethod.PUT,    "/api/departments/**").hasAuthority("HR_ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/departments/**").hasAuthority("HR_ADMIN")
                .requestMatchers("/api/contracts/**").hasAnyAuthority("HR_ADMIN", "MANAGER")
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);   // reads from ${app.cors.allowed-origins}
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### Step 2: Move `show-sql` to dev profile

In `application.yml`, the `show-sql: false` and `logging.level.security: DEBUG` lines are fine for now. They will be moved to `application-dev.yml` in Phase 0.5.

**Acceptance criteria:** Application starts with no secrets in `application.yml`. Setting `CORS_ALLOWED_ORIGINS=https://facez.company.vn` in the environment changes CORS behaviour without touching source code.

---

## Phase 0.3 — Shared Audit Base Class

### Step 1: Enable JPA auditing in a configuration class

**File (new):** `facez/src/main/java/org/dummy/facez/common/configs/JpaAuditingConfig.java`

```java
package org.dummy.facez.common.configs;

import org.dummy.facez.common.auditing.AuditorAwareImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAwareImpl")
public class JpaAuditingConfig {

    @Bean
    public AuditorAwareImpl auditorAwareImpl() {
        return new AuditorAwareImpl();
    }
}
```

> Note: Do not place `@EnableJpaAuditing` on the main `@SpringBootApplication` class — it breaks Spring Batch's test slice (`@BatchTest`) by eagerly initializing the full JPA context.

### Step 2: Create `AuditorAwareImpl`

**File (new):** `facez/src/main/java/org/dummy/facez/common/auditing/AuditorAwareImpl.java`

```java
package org.dummy.facez.common.auditing;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public class AuditorAwareImpl implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return Optional.of("system");   // fallback for scheduled tasks and Flyway callbacks
        }
        return Optional.of(auth.getName());
    }
}
```

### Step 3: Create `AuditableEntity`

**File (new):** `facez/src/main/java/org/dummy/facez/common/model/AuditableEntity.java`

```java
package org.dummy.facez.common.model;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class AuditableEntity {

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 100)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
```

### Step 4: Apply `AuditableEntity` to existing entities

For each entity below, extend `AuditableEntity` and **remove** the manual `createdAt` / `updatedAt` fields (the superclass now provides them). Do NOT remove `deleteFlag` or `deletedAt` — those are separate.

| Entity class | File | Fields to remove |
|---|---|---|
| `Payroll` | `domain/payroll/model/Payroll.java` | `createdAt`, `updatedAt` |
| `Attendance` | `domain/attendance/model/Attendance.java` | `createdAt`, `updatedAt` |
| `Contract` | `domain/contract/model/Contract.java` | `createdAt`, `updatedAt` |
| `LeaveRequest` | `domain/leave/model/LeaveRequest.java` | `createdAt`, `updatedAt` |
| `OTRequest` | `domain/otrequest/model/OTRequest.java` | `createdAt`, `updatedAt` |
| `EmployeeInfo` | `domain/employee/model/EmployeeInfo.java` | *(no existing audit fields)* |
| `UserAccount` | `domain/employee/model/UserAccount.java` | `createdAt`, `updatedAt` |

Example for `Payroll`:

```java
// Before:
public class Payroll {
    // ...
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

// After:
public class Payroll extends AuditableEntity {
    // createdAt / updatedAt removed — inherited from AuditableEntity
    // createdBy / updatedBy are new — added by AuditableEntity
}
```

### Step 5: Write `V2__add_audit_columns.sql`

**File (new):** `facez/src/main/resources/db/migration/V2__add_audit_columns.sql`

```sql
-- Add created_by / updated_by to entities that now extend AuditableEntity.
-- created_at / updated_at columns already exist in V1 baseline.

ALTER TABLE payroll
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);

ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);

ALTER TABLE contract
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);

ALTER TABLE leave_request
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);

ALTER TABLE ot_request
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);

ALTER TABLE employee_info
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);

ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(100);
```

**Acceptance criteria:** After saving a `Payroll` record through the API, `payroll.created_by` is set to the authenticated username. No service code calls `setCreatedAt()` or `setUpdatedAt()` manually.

---

## Phase 0.4 — Login Rate Limiting (Bucket4j + Redis)

### Step 1: Add dependencies to `pom.xml`

**File:** `facez/pom.xml`

Add inside the `<dependencies>` block:

```xml
<!-- Rate limiting — must use Redis backend for multi-instance deployments -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-redis</artifactId>
    <version>8.10.1</version>
</dependency>
<!-- Redisson client required by bucket4j-redis -->
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson</artifactId>
    <version>3.27.2</version>
</dependency>
```

> **Why Redis, not in-memory?** The default `LocalBucket` stores its token count inside the JVM. If two application instances are running behind a load balancer, each instance has its own independent counter. An attacker can send 10 requests to instance A and 10 to instance B — 20 total — without triggering either limit. The Redis-backed `ProxyManager` shares one counter across all instances.

### Step 2: Create Redisson configuration bean

**File (new):** `facez/src/main/java/org/dummy/facez/common/configs/RedissonConfig.java`

```java
package org.dummy.facez.common.configs;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedissonConfig {

    @Value("${spring.data.redis.host}")
    private String redisHost;

    @Value("${spring.data.redis.port}")
    private int redisPort;

    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient() {
        Config config = new Config();
        config.useSingleServer()
              .setAddress("redis://" + redisHost + ":" + redisPort);
        return Redisson.create(config);
    }
}
```

### Step 3: Create `RateLimitService`

**File (new):** `facez/src/main/java/org/dummy/facez/common/services/RateLimitService.java`

```java
package org.dummy.facez.common.services;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.redisson.cas.RedissonBasedProxyManager;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitService {

    private final ProxyManager<String> proxyManager;

    private static final BucketConfiguration LOGIN_CONFIG = BucketConfiguration.builder()
            .addLimit(Bandwidth.builder()
                    .capacity(10)
                    .refillIntervally(10, Duration.ofMinutes(15))
                    .build())
            .build();

    public RateLimitService(RedissonClient redissonClient) {
        this.proxyManager = RedissonBasedProxyManager.builderFor(redissonClient).build();
    }

    /**
     * Returns true if the request is allowed; false if the limit is exceeded.
     * Key format: "login_rate:<clientIp>"
     */
    public boolean tryConsume(String clientIp) {
        String key = "login_rate:" + clientIp;
        return proxyManager.builder()
                .build(key, LOGIN_CONFIG)
                .tryConsume(1);
    }
}
```

### Step 4: Apply rate limiting in `AuthController`

**File:** `facez/src/main/java/org/dummy/facez/auth/controller/AuthController.java`

Add `RateLimitService` as a constructor dependency. Add the check at the top of the `login` method. Extract the client IP from `HttpServletRequest`:

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;          // existing
    private final RateLimitService rateLimitService; // new

    public AuthController(AuthService authService, RateLimitService rateLimitService) {
        this.authService = authService;
        this.rateLimitService = rateLimitService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = resolveClientIp(httpRequest);
        if (!rateLimitService.tryConsume(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", "900")  // 15 minutes in seconds
                    .body(ApiResponse.error("Too many login attempts. Try again in 15 minutes."));
        }

        // ... existing login logic
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();   // take the first (original client) IP
        }
        return request.getRemoteAddr();
    }
}
```

> **Important:** `ApiResponse.error(String message)` must exist. If your `ApiResponse` class does not have this static factory, add it:
> ```java
> public static <T> ApiResponse<T> error(String message) {
>     return new ApiResponse<>(false, message, null);
> }
> ```

**Acceptance criteria:** After 10 POST `/api/auth/login` calls from the same IP (even across multiple app instances), the 11th returns HTTP 429 with `Retry-After: 900`. The counter resets after 15 minutes.

---

## Phase 0.5 — Environment Profiles and Pre-Deployment Checklist

### Step 1: Create `application-dev.yml`

**File (new):** `facez/src/main/resources/application-dev.yml`

```yaml
# Development profile — NOT for staging or production
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
  flyway:
    out-of-order: true    # allow applying migrations in any order during dev
app:
  jwt:
    access-exp-ms: 3600000      # 1 hour — longer for easier manual testing
    refresh-exp-ms: 86400000    # 1 day

logging:
  level:
    org.springframework.security: DEBUG
    org.flywaydb: DEBUG
```

### Step 2: Create `application-staging.yml`

**File (new):** `facez/src/main/resources/application-staging.yml`

```yaml
# Staging profile — mirrors production constraints, points at staging DB
spring:
  datasource:
    url: ${STAGING_DB_URL}
    username: ${STAGING_DB_USERNAME}
    password: ${STAGING_DB_PASSWORD}
  jpa:
    show-sql: false
  flyway:
    out-of-order: false
    validate-on-migrate: true

logging:
  level:
    root: INFO
```

### Step 3: Create `application-prod.yml`

**File (new):** `facez/src/main/resources/application-prod.yml`

```yaml
# Production profile
spring:
  jpa:
    show-sql: false
  flyway:
    out-of-order: false
    validate-on-migrate: true

logging:
  level:
    root: WARN
    org.dummy.facez: INFO
  # JSON format is configured in logback-spring.xml (Phase 8.5)
```

### Step 4: Activate a profile at runtime

Set the `SPRING_PROFILES_ACTIVE` environment variable:

```bash
# Development (default — developer laptop)
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run

# Staging deployment
SPRING_PROFILES_ACTIVE=staging java -jar facez.jar

# Production deployment
SPRING_PROFILES_ACTIVE=prod java -jar facez.jar
```

Or in `application.yml`, set a default for local development only:

```yaml
spring:
  profiles:
    default: dev
```

### Step 5: Pre-deployment checklist (mandatory for staging and production)

Execute these steps **before every Flyway migration** against staging or production. Paste this checklist into your deployment run-book or CI/CD pipeline:

```
Pre-deployment checklist
─────────────────────────────────────────────────────────────
□ 1. Take a full database backup:
      pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

□ 2. Verify the backup restores successfully:
      pg_restore -h localhost -U postgres -d facez_restore_test backup_<timestamp>.dump
      (confirm row counts match production before proceeding)

□ 3. Run migration against STAGING:
      SPRING_PROFILES_ACTIVE=staging java -jar facez.jar
      (confirm application starts, /actuator/health returns {"status":"UP"})

□ 4. Run smoke tests on staging (log in, load employee list, submit a leave request)

□ 5. Only after staging passes: run migration against PRODUCTION
      SPRING_PROFILES_ACTIVE=prod java -jar facez.jar

□ 6. If a migration fails mid-run:
      DO NOT edit the committed migration file.
      Run: flyway repair   (removes the failed checksum from flyway_schema_history)
      Fix the migration SQL, commit the fix as a NEW migration file (Vn+1),
      then re-run.
─────────────────────────────────────────────────────────────
```

**Acceptance criteria:** Deploying to staging uses `application-staging.yml`. No migration runs against production without a verified prior backup. A developer running `./mvnw spring-boot:run` without setting `SPRING_PROFILES_ACTIVE` uses the `dev` profile.

---

## Phase 0 Acceptance Criteria Summary

| # | Criterion | How to verify |
|---|---|---|
| 0.1 | App starts from empty DB via Flyway only | Drop DB, run app, check `flyway_schema_history` |
| 0.1 | No silent `ALTER TABLE` on startup | Search startup log for "HHH90000022" or "SchemaUpdate" |
| 0.2 | No secrets in source code | `grep -r "password\|secret" src/main/resources/application.yml` — only `${...}` refs |
| 0.2 | CORS origins read from env var | Change `CORS_ALLOWED_ORIGINS`, confirm preflight returns new origin |
| 0.3 | `Payroll.createdBy` auto-set | POST a payroll via API, query DB: `SELECT created_by FROM payroll LIMIT 1` |
| 0.3 | No manual `setCreatedAt()` in service code | `grep -r "setCreatedAt\|setUpdatedAt" src/main/java` — should return nothing |
| 0.4 | 11th login attempt from same IP → 429 | `for i in $(seq 1 11); do curl -X POST .../api/auth/login ...; done` |
| 0.4 | Rate limit shared across instances | Start two instances on ports 8084/8085, send 6 requests to each, 11th → 429 |
| 0.5 | Dev profile activates by default locally | Startup log shows `The following 1 profile is active: "dev"` |
| 0.5 | Staging profile uses separate DB URL | `SPRING_PROFILES_ACTIVE=staging` startup log shows `STAGING_DB_URL` |

---

## Dependency Map for Phase 1

Phase 1 can begin only after:
- ✅ V1 baseline migration is stable (Phase 0.1)
- ✅ V2 audit columns migration is applied (Phase 0.3)
- ✅ `SecurityConfig` compiles without errors (Phase 0.2)
- ✅ All environment profile files exist (Phase 0.5)

Phase 1 will add `FINANCE_ADMIN` and `DIRECTOR` to the `Role` enum and rewrite the `SecurityConfig` `authorizeHttpRequests` block — it requires Phase 0.2's clean `SecurityConfig` as its base.

---

*End of Phase 0 Implementation Guide*
