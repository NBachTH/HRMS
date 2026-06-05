package org.dummy.facez.common.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {
    private final SecretKey key;
    private final long accessExpMs;
    private final long refreshExpMs;

    public JwtUtils(@Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-exp-ms}") long accessExpMs,
            @Value("${app.jwt.refresh-exp-ms}") long refreshExpMs) {
        // Ensure secret is at least 32 bytes for HS256
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.key = new SecretKeySpec(keyBytes, "HmacSHA256");
        this.accessExpMs = accessExpMs;
        this.refreshExpMs = refreshExpMs;
    }

    public String generateAccessToken(String username, String roles) {
        return Jwts.builder()
                .subject(username)
                .claim("roles", roles)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpMs))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String username, String jti) {
        return Jwts.builder()
                .subject(username)
                .id(jti)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpMs))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
