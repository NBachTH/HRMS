# Tài liệu Luồng Xác thực & Phân quyền (Auth Flow)

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Luồng Đăng nhập (Login)](#2-luồng-đăng-nhập-login)
3. [Luồng Làm mới Token (Refresh)](#3-luồng-làm-mới-token-refresh)
4. [Luồng Đăng xuất (Logout)](#4-luồng-đăng-xuất-logout)
5. [Luồng Xử lý Request được Bảo vệ](#5-luồng-xử-lý-request-được-bảo-vệ)
6. [Cơ chế Rate Limiting](#6-cơ-chế-rate-limiting)
7. [Biểu đồ Trạng thái Token](#7-biểu-đồ-trạng-thái-token)

---

## 1. Tổng quan

```mermaid
graph TB
    subgraph Client["Client (Browser / Mobile)"]
        REQ[HTTP Request]
        COOKIE[HTTP-only Cookie\nrefresh_token JWT]
        HEADER[Authorization Header\nBearer accessToken]
    end

    subgraph Filters["Filter Chain"]
        DKAF[DeviceApiKeyFilter\n1st priority]
        JWTF[JwtAuthFilter\n2nd priority]
    end

    subgraph Auth["Auth Endpoints /api/auth"]
        LOGIN[POST /login]
        REFRESH[POST /refresh]
        LOGOUT[POST /logout]
        ME[GET /me]
        CHPWD[PUT /change-password]
    end

    subgraph Security["Security Layer"]
        RL[LoginRateLimiter\nRedis counter per IP]
        AM[AuthenticationManager\nValidate credentials]
        SC[SecurityContext\nHold principal]
    end

    subgraph Storage["Storage"]
        REDIS[(Redis\nrefresh:{jti})]
        DB[(PostgreSQL\nUserAccount)]
    end

    REQ --> DKAF --> JWTF --> Auth
    LOGIN --> RL --> AM --> REDIS
    REFRESH --> REDIS
    LOGOUT --> REDIS
    JWTF --> SC
    AM --> DB
```

---

## 2. Luồng Đăng nhập (Login)

### 2.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Client]) -->|POST /api/auth/login\nusername + password| B[AuthController.login]
    B --> C[Lấy Client IP\ntừ X-Forwarded-For / RemoteAddr]
    C --> D[LoginRateLimiter.checkAndIncrement\nip]
    D --> E{Đã vượt quá\n10 lần / 15 phút?}
    E -->|Có| F[429 Too Many Requests\nRetry-After header]
    E -->|Không| G[AuthenticationManager.authenticate\nUsernamePasswordAuthenticationToken]
    G --> H{Credentials\nhợp lệ?}
    H -->|Không| I[401 Unauthorized\nBad credentials]
    H -->|Có| J[Load UserAccount từ DB]
    J --> K[JwtUtils.generateAccessToken\nsubject=username, claim=role]
    K --> L[Tạo JTI mới\nUUID.randomUUID]
    L --> M[JwtUtils.generateRefreshToken\nsubject=username, id=jti]
    M --> N[Lưu RefreshToken vào Redis\nKey: refresh:jti\nTTL: refresh-exp-ms]
    N --> O[Set HTTP-only Cookie\nrefresh token JWT\nhttpOnly=true, secure, SameSite]
    O --> P[LoginRateLimiter.resetFor\nip - xóa counter thành công]
    P --> Q[200 OK\naccessToken, username, role]
    Q --> R([Client lưu accessToken\nCookie tự động lưu])
```

### 2.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Client
    participant CTL as AuthController
    participant RL as LoginRateLimiter
    participant AM as AuthenticationManager
    participant UDTS as CustomUserDetailService
    participant DB as PostgreSQL
    participant REDIS as Redis
    participant JWT as JwtUtils

    C->>CTL: POST /api/auth/login {username, password}
    CTL->>CTL: resolveClientIp(request)

    CTL->>RL: checkAndIncrement(clientIp)
    RL->>REDIS: INCR login_rate:{ip}
    REDIS-->>RL: count
    RL->>REDIS: EXPIRE login_rate:{ip} 900s (if count==1)

    alt count > 10
        RL-->>CTL: retryAfter (seconds)
        CTL-->>C: 429 Too Many Requests
    else count <= 10
        RL-->>CTL: -1 (allowed)

        CTL->>AM: authenticate(username, password)
        AM->>UDTS: loadUserByUsername(username)
        UDTS->>DB: findUserAccountByUsername(username)
        DB-->>UDTS: UserAccount
        UDTS-->>AM: UserDetails
        AM->>AM: verify password hash
        AM-->>CTL: Authentication (success)

        CTL->>DB: findUserAccountByUsername (load role)
        DB-->>CTL: UserAccount

        CTL->>JWT: generateAccessToken(username, role)
        JWT-->>CTL: accessToken (HS256 JWT, short-lived)

        CTL->>CTL: jti = UUID.randomUUID()
        CTL->>JWT: generateRefreshToken(username, jti)
        JWT-->>CTL: refreshJwt (HS256 JWT, long-lived)

        CTL->>REDIS: SET refresh:{jti} RefreshToken TTL=refreshExpMs
        REDIS-->>CTL: OK

        CTL->>CTL: Build ResponseCookie (HttpOnly, Secure, SameSite)
        CTL->>RL: resetFor(clientIp) — DELETE login_rate:{ip}

        CTL-->>C: 200 OK {accessToken, username, role}\nSet-Cookie: refresh_token=refreshJwt; HttpOnly
    end
```

---

## 3. Luồng Làm mới Token (Refresh)

### 3.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Client]) -->|POST /api/auth/refresh\nCookie: refresh_token| B[AuthController.refresh]
    B --> C[extractRefreshCookie\nĐọc cookie từ request]
    C --> D{Cookie\ntồn tại?}
    D -->|Không| E[401 Unauthorized\nRefresh token not found]
    D -->|Có| F[JwtUtils.parseToken\nValidate signature + expiry]
    F --> G{Token JWT\nhợp lệ?}
    G -->|Không - JwtException| H[401 Unauthorized\nInvalid refresh token]
    G -->|Có| I[Extract jti từ claims]
    I --> J[JwtService.findByJti\nTìm trong Redis]
    J --> K{Tìm thấy\ntrong Redis?}
    K -->|Không| L[401 Unauthorized\nToken không tồn tại]
    K -->|Có| M{revoked\n= true?}
    M -->|Có| N[401 Unauthorized\nToken đã bị thu hồi]
    M -->|Không| O[JwtService.deleteByJti\nXóa token cũ - token rotation]
    O --> P[Tạo newJti mới\nUUID.randomUUID]
    P --> Q[JwtUtils.generateRefreshToken\nnewJti]
    Q --> R[Lưu RefreshToken mới\nvào Redis]
    R --> S[Load UserAccount\nđể lấy role hiện tại]
    S --> T[JwtUtils.generateAccessToken\nAccessToken mới]
    T --> U[Set Cookie mới\nRefresh token mới]
    U --> V[200 OK\naccessToken mới, username, role]
```

### 3.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Client
    participant CTL as AuthController
    participant JWT as JwtUtils
    participant REDIS as Redis
    participant DB as PostgreSQL

    C->>CTL: POST /api/auth/refresh (Cookie: refresh_token=oldRefreshJwt)
    CTL->>CTL: extractRefreshCookie(request)

    alt Cookie không tồn tại
        CTL-->>C: 401 Refresh token not found
    else Cookie tồn tại
        CTL->>JWT: parseToken(oldRefreshJwt)

        alt JWT không hợp lệ hoặc hết hạn
            JWT-->>CTL: JwtException
            CTL-->>C: 401 Invalid refresh token
        else JWT hợp lệ
            JWT-->>CTL: Claims {sub=username, jti=oldJti}

            CTL->>REDIS: GET refresh:{oldJti}
            REDIS-->>CTL: RefreshToken | null

            alt Không tìm thấy
                CTL-->>C: 401 Invalid refresh token
            else Tìm thấy
                alt revoked = true
                    CTL-->>C: 401 Token has been revoked
                else revoked = false
                    Note over CTL,REDIS: Token Rotation
                    CTL->>REDIS: DEL refresh:{oldJti}

                    CTL->>CTL: newJti = UUID.randomUUID()
                    CTL->>JWT: generateRefreshToken(username, newJti)
                    JWT-->>CTL: newRefreshJwt

                    CTL->>REDIS: SET refresh:{newJti} RefreshToken TTL=refreshExpMs

                    CTL->>DB: findUserAccountByUsername(username)
                    DB-->>CTL: UserAccount {role}

                    CTL->>JWT: generateAccessToken(username, role)
                    JWT-->>CTL: newAccessToken

                    CTL-->>C: 200 OK {accessToken, username, role}\nSet-Cookie: refresh_token=newRefreshJwt; HttpOnly
                end
            end
        end
    end
```

---

## 4. Luồng Đăng xuất (Logout)

### 4.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Client]) -->|POST /api/auth/logout\nCookie: refresh_token| B[AuthController.logout]
    B --> C[extractRefreshCookie]
    C --> D{Cookie\ntồn tại?}
    D -->|Không| E[Bỏ qua xóa Redis]
    D -->|Có| F[JwtUtils.parseToken]
    F --> G{Token hợp lệ?}
    G -->|Không - JwtException| H[Bỏ qua - ignored]
    G -->|Có| I[Extract jti từ claims]
    I --> J[JwtService.deleteByJti\nXóa khỏi Redis]
    H --> K[Set Cookie maxAge=0\nXóa cookie khỏi browser]
    E --> K
    J --> K
    K --> L[200 OK\nSigned out successfully]
    L --> M([Client - cookie bị xóa\nAccess token hết hạn tự nhiên])
```

### 4.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Client
    participant CTL as AuthController
    participant JWT as JwtUtils
    participant REDIS as Redis

    C->>CTL: POST /api/auth/logout (Cookie: refresh_token=refreshJwt)
    CTL->>CTL: extractRefreshCookie(request)

    opt Cookie tồn tại
        CTL->>JWT: parseToken(refreshJwt)
        opt JWT hợp lệ
            JWT-->>CTL: Claims {jti}
            CTL->>REDIS: DEL refresh:{jti}
            REDIS-->>CTL: OK
        end
        Note over CTL: JwtException bị bỏ qua (ignored)
    end

    CTL->>CTL: Build ResponseCookie maxAge=0 (clear cookie)
    CTL-->>C: 200 OK {message: "Signed out successfully"}\nSet-Cookie: refresh_token=; Max-Age=0
    Note over C: Cookie bị xóa. Access token sẽ hết hạn tự nhiên.
```

---

## 5. Luồng Xử lý Request được Bảo vệ

### 5.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Client]) -->|GET /api/resource\nAuthorization: Bearer accessToken| B[DeviceApiKeyFilter]
    B --> C{X-Device-API-Key\nheader có mặt?}
    C -->|Có| D[Xử lý Device Auth\nXem attendance-flow.md]
    C -->|Không| E[JwtAuthFilter]
    E --> F[Extract token\ntừ Authorization header]
    F --> G{Header có dạng\nBearer xxx?}
    G -->|Không| H[Tiếp tục chain\nkhông set auth]
    G -->|Có| I[JwtUtils.parseToken\nValidate signature + expiry]
    I --> J{Token\nhợp lệ?}
    J -->|Không - JwtException| H
    J -->|Có| K[Extract username\ntừ claims.subject]
    K --> L{SecurityContext\nchưa có auth?}
    L -->|Đã có| H
    L -->|Chưa| M[loadUserByUsername\ntừ DB]
    M --> N[Set SecurityContext\nUsernamePasswordAuthenticationToken]
    N --> H
    H --> O[Endpoint Handler]
    O --> P{PreAuthorize\ncheck role?}
    P -->|Không đủ quyền| Q[403 Forbidden]
    P -->|Không authenticate| R[401 Unauthorized]
    P -->|OK| S[200 Xử lý bình thường]
```

### 5.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Client
    participant DKAF as DeviceApiKeyFilter
    participant JWTF as JwtAuthFilter
    participant UDTS as UserDetailsService
    participant DB as PostgreSQL
    participant EP as Endpoint Handler

    C->>DKAF: GET /api/employees {Authorization: Bearer accessToken}
    DKAF->>DKAF: Check X-Device-API-Key header → không có
    DKAF->>JWTF: Forward

    JWTF->>JWTF: Extract "Bearer " prefix từ header
    JWTF->>JWTF: JwtUtils.parseToken(accessToken)

    alt Token hợp lệ
        JWTF->>UDTS: loadUserByUsername(username từ claims)
        UDTS->>DB: SELECT UserAccount WHERE username=?
        DB-->>UDTS: UserAccount {role, authorities}
        UDTS-->>JWTF: UserDetails
        JWTF->>JWTF: Set SecurityContext với authorities
    else Token không hợp lệ / hết hạn
        Note over JWTF: JwtException bị bỏ qua — request tiếp tục không có auth
    end

    JWTF->>EP: Forward request

    EP->>EP: @PreAuthorize check
    alt Không đủ quyền
        EP-->>C: 403 Forbidden
    else Chưa authenticate
        EP-->>C: 401 Unauthorized
    else Hợp lệ
        EP-->>C: 200 OK {data}
    end
```

---

## 6. Cơ chế Rate Limiting

```mermaid
flowchart TD
    A[Login Request từ IP] --> B[KEY = login_rate:IP]
    B --> C[Redis INCR KEY]
    C --> D{count = 1?}
    D -->|Có - lần đầu| E[Redis EXPIRE KEY 900s\n15 phút window]
    D -->|Không| F{count > 10?}
    E --> F
    F -->|Không| G[Cho phép đăng nhập]
    F -->|Có| H[Redis GETEXPIRE KEY]
    H --> I[Trả về retryAfter\nseconds còn lại]
    I --> J[429 Too Many Requests\nRetry-After: N seconds]

    G --> K{Đăng nhập\nthành công?}
    K -->|Có| L[Redis DEL login_rate:IP\nReset counter]
    K -->|Không| M[Counter giữ nguyên\ntăng dần]
```

---

## 7. Biểu đồ Trạng thái Token

```mermaid
stateDiagram-v2
    [*] --> AccessToken_Valid : Login thành công\ngenerateAccessToken()

    AccessToken_Valid : Access Token\n● JWT, HS256\n● claim: username, role\n● TTL: access-exp-ms\n● Dùng trong Authorization header

    AccessToken_Valid --> AccessToken_Expired : Hết hạn tự nhiên\n(TTL trôi qua)

    AccessToken_Expired : Access Token Hết hạn\n● Các request trả về 401\n● Client cần refresh

    AccessToken_Expired --> AccessToken_Valid : POST /api/auth/refresh\n(dùng refresh cookie)

    state RefreshToken_Lifecycle {
        [*] --> RT_Active : Login — save Redis

        RT_Active : Refresh Token\n● JWT + JTI\n● TTL: refresh-exp-ms\n● Redis key: refresh:jti\n● revoked=false

        RT_Active --> RT_Rotated : POST /refresh\nToken Rotation
        RT_Rotated : Token Cũ bị Xóa\nToken Mới được Tạo\n(jti mới, Redis mới)
        RT_Rotated --> RT_Active

        RT_Active --> RT_Revoked : POST /logout\nDEL từ Redis
        RT_Revoked : Token Đã Thu hồi\n● Không còn trong Redis\n● Mọi /refresh đều 401
    }
```

---

## Tóm tắt Cấu trúc JWT

| Trường | Access Token | Refresh Token |
|--------|-------------|---------------|
| `sub` | username | username |
| `roles` | tên Role | _(không có)_ |
| `jti` | _(không có)_ | UUID (tracking rotation) |
| `iat` | thời điểm tạo | thời điểm tạo |
| `exp` | `now + access-exp-ms` | `now + refresh-exp-ms` |
| Thuật toán | HS256 | HS256 |
| Lưu ở đâu | Response body | HTTP-only Cookie |
| Lưu server | Không (stateless) | Redis: `refresh:{jti}` |
