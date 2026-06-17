# Tài liệu Luồng Xác thực & Phân quyền (Auth Flow) — v2

> **Thay đổi so với v1:** Làm rõ hành vi khi cả hai filter header cùng có mặt; ghi chú access token TTL sau logout; annotate double DB query trong login; bổ sung giả định infrastructure cho rate limiting.

## Mục lục

1. [Tổng quan & Giả định Infrastructure](#1-tổng-quan--giả-định-infrastructure)
2. [Luồng Đăng nhập (Login)](#2-luồng-đăng-nhập-login)
3. [Luồng Làm mới Token (Refresh)](#3-luồng-làm-mới-token-refresh)
4. [Luồng Đăng xuất (Logout)](#4-luồng-đăng-xuất-logout)
5. [Luồng Xử lý Request được Bảo vệ](#5-luồng-xử-lý-request-được-bảo-vệ)
6. [Cơ chế Rate Limiting](#6-cơ-chế-rate-limiting)
7. [Biểu đồ Trạng thái Token](#7-biểu-đồ-trạng-thái-token)
8. [Giới hạn Đã biết](#8-giới-hạn-đã-biết)

---

## 1. Tổng quan & Giả định Infrastructure

```mermaid
graph TB
    subgraph Client["Client (Browser / Mobile)"]
        REQ[HTTP Request]
        COOKIE[HTTP-only Cookie\nrefresh_token JWT]
        HEADER[Authorization Header\nBearer accessToken]
    end

    subgraph Filters["Filter Chain — Thứ tự ưu tiên"]
        DKAF["1. DeviceApiKeyFilter\nChỉ active nếu có X-Device-API-Key header\nNếu set SecurityContext → JwtAuthFilter bỏ qua"]
        JWTF["2. JwtAuthFilter\nChỉ chạy nếu SecurityContext còn trống"]
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
        REDIS[(Redis\nrefresh:{jti}\nlogin_rate:{ip})]
        DB[(PostgreSQL\nUserAccount)]
    end

    REQ --> DKAF --> JWTF --> Auth
    LOGIN --> RL --> AM --> REDIS
    REFRESH --> REDIS
    LOGOUT --> REDIS
    JWTF --> SC
    AM --> DB
```

> **Giả định Infrastructure:**
> - **Single-instance deployment.** Nếu scale horizontally, Redis rate limiter vẫn hoạt động đúng (shared state), nhưng không có thêm thay đổi cần thiết.
> - **Rate limiting dùng `X-Forwarded-For`.** Cần có nginx/load balancer cấu hình `proxy_set_header X-Forwarded-For $remote_addr` (overwrite, không append) để tránh client tự set header giả mạo. Nếu không có proxy, cần đổi sang `RemoteAddr` only.
> - **Filter chain conflict:** Nếu request có cả `X-Device-API-Key` lẫn `Authorization: Bearer`, `DeviceApiKeyFilter` chạy trước và set SecurityContext → `JwtAuthFilter` kiểm tra `SecurityContext.getAuthentication() != null` nên bỏ qua. **Device auth luôn thắng.**

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
    H -->|Có| J["Load UserAccount từ DB\n⚠ Query 2: role lấy từ đây\nThực ra có thể dùng UserDetails từ bước G"]
    J --> K[JwtUtils.generateAccessToken\nsubject=username, claim=role\nTTL: 5 phút prod / 1 giờ dev]
    K --> L[Tạo JTI mới\nUUID.randomUUID]
    L --> M[JwtUtils.generateRefreshToken\nsubject=username, id=jti\nTTL: 14 ngày]
    M --> N[Lưu RefreshToken vào Redis\nKey: refresh:jti\nTTL: refresh-exp-ms]
    N --> O[Set HTTP-only Cookie\nrefresh token JWT\nhttpOnly=true, secure, SameSite=Lax]
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
    CTL->>CTL: resolveClientIp(request)\n[Dùng X-Forwarded-For — cần nginx trust]

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
        UDTS->>DB: findUserAccountByUsername(username) — Query 1
        DB-->>UDTS: UserAccount {role embedded in authorities}
        UDTS-->>AM: UserDetails
        AM->>AM: verify password hash
        AM-->>CTL: Authentication {principal: UserDetails với role}

        Note over CTL,DB: ⚠ Query 2 thực tế trong code — role đã có trong UserDetails từ Query 1
        CTL->>DB: findUserAccountByUsername(username) — Query 2 (redundant)
        DB-->>CTL: UserAccount {role}

        CTL->>JWT: generateAccessToken(username, role) — TTL: access-exp-ms
        JWT-->>CTL: accessToken (HS256)

        CTL->>CTL: jti = UUID.randomUUID()
        CTL->>JWT: generateRefreshToken(username, jti) — TTL: refresh-exp-ms
        JWT-->>CTL: refreshJwt (HS256)

        CTL->>REDIS: SET refresh:{jti} RefreshToken TTL=refreshExpMs
        REDIS-->>CTL: OK

        CTL->>CTL: Build ResponseCookie (HttpOnly, Secure=true, SameSite=Lax)
        CTL->>RL: resetFor(clientIp) — DELETE login_rate:{ip}

        CTL-->>C: 200 OK {accessToken, username, role}\nSet-Cookie: refreshToken=..., HttpOnly
    end
```

---

## 3. Luồng Làm mới Token (Refresh)

### 3.1 Biểu đồ Luồng (Flowchart)

```mermaid
flowchart TD
    A([Client]) -->|POST /api/auth/refresh\nCookie: refreshToken| B[AuthController.refresh]
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
    M -->|Không| O[JwtService.deleteByJti\nXóa token cũ — Token Rotation]
    O --> P[Tạo newJti mới\nUUID.randomUUID]
    P --> Q[JwtUtils.generateRefreshToken\nnewJti]
    Q --> R[Lưu RefreshToken mới\nvào Redis]
    R --> S[Load UserAccount từ DB\nĐể lấy role hiện tại]
    S --> T[JwtUtils.generateAccessToken\nAccessToken mới TTL: access-exp-ms]
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

    C->>CTL: POST /api/auth/refresh (Cookie: refreshToken=oldRefreshJwt)
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

                    CTL->>DB: findUserAccountByUsername(username) — lấy role hiện tại
                    DB-->>CTL: UserAccount {role}

                    CTL->>JWT: generateAccessToken(username, role)
                    JWT-->>CTL: newAccessToken

                    CTL-->>C: 200 OK {accessToken, username, role}\nSet-Cookie: refreshToken=newRefreshJwt; HttpOnly
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
    A([Client]) -->|POST /api/auth/logout\nCookie: refreshToken| B[AuthController.logout]
    B --> C[extractRefreshCookie]
    C --> D{Cookie\ntồn tại?}
    D -->|Không| E[Bỏ qua xóa Redis]
    D -->|Có| F[JwtUtils.parseToken]
    F --> G{Token hợp lệ?}
    G -->|Không - JwtException| H[Bỏ qua — ignored]
    G -->|Có| I[Extract jti từ claims]
    I --> J[JwtService.deleteByJti\nXóa Refresh Token khỏi Redis]
    H --> K[Set Cookie maxAge=0\nXóa cookie khỏi browser]
    E --> K
    J --> K
    K --> L[200 OK\nSigned out successfully]
    L --> M["Client — cookie bị xóa\n⚠ Access token vẫn còn hiệu lực cho đến khi hết hạn tự nhiên\nTTL: 5 phút prod / 1 giờ dev"]
```

### 4.2 Biểu đồ Trình tự (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as Client
    participant CTL as AuthController
    participant JWT as JwtUtils
    participant REDIS as Redis

    C->>CTL: POST /api/auth/logout (Cookie: refreshToken=refreshJwt)
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
    CTL-->>C: 200 OK {message: "Signed out successfully"}\nSet-Cookie: refreshToken=; Max-Age=0

    Note over C: Refresh token đã bị revoke trên server.\nAccess token còn sống đến hết TTL (5 phút prod).\nRủi ro chấp nhận được với TTL ngắn.
```

---

## 5. Luồng Xử lý Request được Bảo vệ

### 5.1 Biểu đồ Luồng (Flowchart) — Kể cả conflict case

```mermaid
flowchart TD
    A([Client]) -->|Request tới /api/...| B[DeviceApiKeyFilter]
    B --> C{Header\nX-Device-API-Key\ncó mặt?}
    C -->|Có| D[Xác thực API Key\nSet SecurityContext — DEVICE_CHECKIN\nXem attendance-flow.md]
    C -->|Không| E[JwtAuthFilter]
    D --> F{SecurityContext\nđã có auth}
    E --> F
    F -->|JwtAuthFilter: đã có| G[Bỏ qua JwtAuthFilter\n— Device auth thắng]
    F -->|JwtAuthFilter: chưa có| H[Extract Bearer token\ntừ Authorization header]
    H --> I{Header có dạng\nBearer xxx?}
    I -->|Không| J[Tiếp tục chain\nkhông set auth]
    I -->|Có| K[JwtUtils.parseToken\nValidate signature + expiry]
    K --> L{Token\nhợp lệ?}
    L -->|Không - JwtException| J
    L -->|Có| M[Extract username\ntừ claims.subject]
    M --> N[loadUserByUsername từ DB]
    N --> O[Set SecurityContext]
    O --> J
    G --> J
    J --> P[Endpoint Handler]
    P --> Q{PreAuthorize\ncheck?}
    Q -->|Không đủ quyền| R[403 Forbidden]
    Q -->|Chưa authenticate| S[401 Unauthorized]
    Q -->|OK| T[200 Xử lý bình thường]
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
    DKAF->>JWTF: Forward (SecurityContext trống)

    JWTF->>JWTF: Check SecurityContext.getAuthentication() — null → tiếp tục
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
    A[Login Request từ IP] --> B["KEY = login_rate:IP\n⚠ IP lấy từ X-Forwarded-For\nCần nginx overwrite header này"]
    B --> C[Redis INCR KEY]
    C --> D{count = 1?}
    D -->|Có - lần đầu| E[Redis EXPIRE KEY 900s\n15 phút window]
    D -->|Không| F{count > 10?}
    E --> F
    F -->|Không| G[Cho phép đăng nhập]
    F -->|Có| H[Redis GETEXPIRE KEY]
    H --> I[Trả về retryAfter\nseconds còn lại]
    I --> J[429 Too Many Requests\nRetry-After: N seconds\nHeader trả về để client backoff]

    G --> K{Đăng nhập\nthành công?}
    K -->|Có| L[Redis DEL login_rate:IP\nReset counter]
    K -->|Không| M[Counter giữ nguyên\ntăng dần cho đến khi hết 15 phút]
```

---

## 7. Biểu đồ Trạng thái Token

```mermaid
stateDiagram-v2
    [*] --> AccessToken_Valid : Login thành công\ngenerateAccessToken()

    AccessToken_Valid : Access Token\n● JWT HS256\n● claim: username, role\n● TTL: 5 phút prod / 1 giờ dev\n● Dùng trong Authorization header

    AccessToken_Valid --> AccessToken_Expired : Hết hạn tự nhiên

    AccessToken_Expired : Access Token Hết hạn\n● Các request trả về 401\n● Client cần refresh

    AccessToken_Expired --> AccessToken_Valid : POST /api/auth/refresh

    state RefreshToken_Lifecycle {
        [*] --> RT_Active : Login — save Redis

        RT_Active : Refresh Token\n● JWT + JTI\n● TTL: 14 ngày\n● Redis key: refresh:jti\n● revoked=false

        RT_Active --> RT_Rotated : POST /refresh — Token Rotation
        RT_Rotated : Token Cũ bị Xóa\nToken Mới được Tạo\n(jti mới, Redis entry mới)
        RT_Rotated --> RT_Active

        RT_Active --> RT_Revoked : POST /logout — DEL từ Redis
        RT_Revoked : Token Đã Thu hồi\n● Không còn trong Redis\n● Mọi /refresh đều 401
    }
```

---

## 8. Giới hạn Đã biết

| Giới hạn | Mô tả | Mức độ rủi ro | Ghi chú |
|---|---|---|---|
| **Access token sau logout** | Sau khi logout, access token vẫn hiệu lực đến hết TTL (5 phút prod). Refresh token đã bị revoke — không cấp mới được. | Thấp | Chấp nhận được với TTL 5 phút. Nếu cần mức độ bảo mật cao hơn, cần blacklist access token trong Redis. |
| **Double DB query trong login** | `AuthController` load `UserAccount` 2 lần: lần 1 qua `AuthenticationManager`, lần 2 trực tiếp để lấy role. Role đã có trong `UserDetails` từ lần 1. | Thấp | Ảnh hưởng performance nhỏ, không ảnh hưởng security. |
| **X-Forwarded-For spoofing** | Nếu không có proxy đáng tin cậy phía trước, client có thể set header này để bypass rate limiting. | Trung bình | Cần nginx cấu hình `proxy_set_header X-Forwarded-For $remote_addr` (overwrite mode). |
| **Filter conflict không document rõ** | Khi cả hai header cùng có mặt, DeviceApiKeyFilter thắng do chạy trước và set SecurityContext. | Thấp | Hành vi đúng, đã document ở section 1 và 5. |

---

## Tóm tắt Cấu trúc JWT

| Trường | Access Token | Refresh Token |
|--------|-------------|---------------|
| `sub` | username | username |
| `roles` | tên Role | _(không có)_ |
| `jti` | _(không có)_ | UUID (tracking rotation) |
| `iat` | thời điểm tạo | thời điểm tạo |
| `exp` | `now + 5 phút (prod)` | `now + 14 ngày` |
| Thuật toán | HS256 | HS256 |
| Lưu ở đâu | Response body | HTTP-only Cookie |
| Lưu server | Không (stateless) | Redis: `refresh:{jti}` |
