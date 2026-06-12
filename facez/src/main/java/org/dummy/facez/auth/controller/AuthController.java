package org.dummy.facez.auth.controller;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.dummy.facez.auth.dtos.ChangePasswordRequest;
import org.dummy.facez.auth.dtos.LoginRequest;
import org.dummy.facez.auth.dtos.RefreshToken;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.services.LoginRateLimiter;
import org.dummy.facez.domain.employee.repository.UserAccountRepository;
import org.dummy.facez.common.services.JwtService;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.common.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authManager;
    private final UserAccountRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final JwtService refreshSvc;
    private final LoginRateLimiter rateLimiter;
    private final String refreshCookieName;
    private final boolean cookieSecure;
    private final String sameSite;
    private final long refreshExpMs;

    public AuthController(AuthenticationManager authManager,
            UserAccountRepository userRepo,
            PasswordEncoder passwordEncoder,
            JwtUtils jwtUtils,
            JwtService refreshSvc,
            LoginRateLimiter rateLimiter,
            @Value("${app.cookie.refresh-token-name}") String refreshCookieName,
            @Value("${app.cookie.secure}") boolean cookieSecure,
            @Value("${app.cookie.sameSite}") String sameSite,
            @Value("${app.jwt.refresh-exp-ms}") long refreshExpMs) {
        this.authManager = authManager;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.refreshSvc = refreshSvc;
        this.rateLimiter = rateLimiter;
        this.refreshCookieName = refreshCookieName;
        this.cookieSecure = cookieSecure;
        this.sameSite = sameSite;
        this.refreshExpMs = refreshExpMs;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Valid @RequestBody LoginRequest req,
            HttpServletRequest request,
            HttpServletResponse response) {
        String clientIp = resolveClientIp(request);
        long retryAfter = rateLimiter.checkAndIncrement(clientIp);
        if (retryAfter > 0) {
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("Too many login attempts. Try again in " + retryAfter + " seconds."));
        }

        Authentication a = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        UserDetails ud = (UserDetails) a.getPrincipal();
        UserAccount user = userRepo.findUserAccountByUsername(ud.getUsername()).orElseThrow();

        // access token
        String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().name());

        // refresh token: create jti, save in Redis
        String jti = UUID.randomUUID().toString();
        String refreshJwt = jwtUtils.generateRefreshToken(user.getUsername(), jti);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setJti(jti);
        refreshToken.setUserId(user.getEmployeeId());
        refreshToken.setUsername(user.getUsername());
        refreshToken.setExpiry(Instant.now().plusMillis(refreshExpMs).toEpochMilli());
        refreshToken.setRevoked(false);
        refreshSvc.save(refreshToken);

        // set refresh cookie (HttpOnly)
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, refreshJwt)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMillis(refreshExpMs).getSeconds())
                .sameSite(sameSite)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        rateLimiter.resetFor(clientIp);

        Map<String, Object> body = Map.of(
                "accessToken", accessToken,
                "username", user.getUsername(),
                "role", user.getRole().name(),
                "employeeId", user.getEmployeeId());
        return ResponseEntity.ok(ApiResponse.ok(body, "Login successful"));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refresh(HttpServletRequest req, HttpServletResponse res) {
        String refreshJwt = extractRefreshCookie(req);
        if (refreshJwt == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Refresh token not found"));
        }

        try {
            Claims claims = jwtUtils.parseToken(refreshJwt);
            String jti = claims.getId();
            String username = claims.getSubject();

            // validate stored token
            var maybe = refreshSvc.findByJti(jti);
            if (maybe.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Invalid refresh token"));
            }
            RefreshToken stored = maybe.get();
            if (stored.isRevoked()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Refresh token has been revoked"));
            }

            // rotation: delete old stored token
            refreshSvc.deleteByJti(jti);

            // issue new refresh token
            String newJti = UUID.randomUUID().toString();
            String newRefreshJwt = jwtUtils.generateRefreshToken(username, newJti);
            RefreshToken newStored = new RefreshToken();
            newStored.setJti(newJti);
            newStored.setUsername(username);
            newStored.setExpiry(Instant.now().plusMillis(refreshExpMs).toEpochMilli());
            newStored.setRevoked(false);
            refreshSvc.save(newStored);

            // set cookie
            ResponseCookie cookie = ResponseCookie.from(refreshCookieName, newRefreshJwt)
                    .httpOnly(true).secure(cookieSecure).path("/")
                    .maxAge(Duration.ofMillis(refreshExpMs).getSeconds())
                    .sameSite(sameSite).build();
            res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            // issue new access token
            UserAccount user = userRepo.findUserAccountByUsername(username).orElseThrow();
            String access = jwtUtils.generateAccessToken(username, user.getRole().name());

            Map<String, Object> body = Map.of(
                    "accessToken", access,
                    "username", username,
                    "role", user.getRole().name(),
                    "employeeId", user.getEmployeeId());
            return ResponseEntity.ok(ApiResponse.ok(body, "Token refreshed"));

        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid refresh token"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest req, HttpServletResponse res) {
        String refreshJwt = extractRefreshCookie(req);

        if (refreshJwt != null) {
            try {
                String jti = jwtUtils.parseToken(refreshJwt).getId();
                refreshSvc.deleteByJti(jti);
            } catch (JwtException ignored) {
            }
        }

        // clear cookie
        ResponseCookie delete = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true).secure(cookieSecure).path("/").maxAge(0).sameSite(sameSite).build();
        res.addHeader(HttpHeaders.SET_COOKIE, delete.toString());

        return ResponseEntity.ok(ApiResponse.ok(null, "Signed out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        var ud = (UserDetails) authentication.getPrincipal();
        UserAccount user = userRepo.findUserAccountByUsername(ud.getUsername()).orElseThrow();
        Map<String, Object> data = Map.of(
                "username", user.getUsername(),
                "role", user.getRole().name(),
                "employeeId", user.getEmployeeId() != null ? user.getEmployeeId() : "");
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        var ud = (UserDetails) authentication.getPrincipal();
        UserAccount user = userRepo.findUserAccountByUsername(ud.getUsername()).orElseThrow();

        // verify old password
        if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Old password is incorrect");
        }

        // validate new password
        if (req.getNewPassword().length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters");
        }

        user.setLastPasswordHash(user.getPasswordHash());
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);

        return ResponseEntity.ok(ApiResponse.ok(null, "Password changed successfully"));
    }

    private String extractRefreshCookie(HttpServletRequest req) {
        return Arrays.stream(Optional.ofNullable(req.getCookies()).orElse(new Cookie[0]))
                .filter(c -> refreshCookieName.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst().orElse(null);
    }
}
