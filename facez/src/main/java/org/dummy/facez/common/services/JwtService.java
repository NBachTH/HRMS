package org.dummy.facez.common.services;

import org.dummy.facez.auth.dtos.RefreshToken;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
public class JwtService {
    private final RedisTemplate<String, Object> redisTemplate;
    private final String KEY_PREFIX = "refresh:";
    private final long refreshExpMs;

    public JwtService(RedisTemplate<String, Object> redisTemplate,
                      @Value("${app.jwt.refresh-exp-ms}") long refreshExpMs) {
        this.redisTemplate = redisTemplate;
        this.refreshExpMs = refreshExpMs;
    }

    public void save(RefreshToken token) {
        String key = KEY_PREFIX + token.getJti();
        redisTemplate.opsForValue().set(key, token, Duration.ofMillis(refreshExpMs));
    }

    public Optional<RefreshToken> findByJti(String jti) {
        Object v = redisTemplate.opsForValue().get(KEY_PREFIX + jti);
        if (v instanceof RefreshToken) return Optional.of((RefreshToken)v);
        return Optional.empty();
    }

    public void deleteByJti(String jti) {
        redisTemplate.delete(KEY_PREFIX + jti);
    }

    public void revoke(String jti) {
        findByJti(jti).ifPresent(t -> {
            t.setRevoked(true);
            save(t);
        });
    }
}
