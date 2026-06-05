package org.dummy.facez.common.services;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed rate limiter for login attempts.
 * Allows MAX_ATTEMPTS per IP within WINDOW_MINUTES before blocking.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS      = 10;
    private static final int WINDOW_MINUTES    = 15;
    private static final String KEY_PREFIX     = "login_rate:";

    private final RedisTemplate<String, String> redisTemplate;

    public LoginRateLimiter(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** Returns remaining seconds to wait, or -1 if not rate-limited. */
    public long checkAndIncrement(String ipAddress) {
        String key = KEY_PREFIX + ipAddress;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) count = 1L;

        if (count == 1) {
            redisTemplate.expire(key, WINDOW_MINUTES, TimeUnit.MINUTES);
        }

        if (count > MAX_ATTEMPTS) {
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            return ttl != null && ttl > 0 ? ttl : WINDOW_MINUTES * 60L;
        }
        return -1;
    }

    public void resetFor(String ipAddress) {
        redisTemplate.delete(KEY_PREFIX + ipAddress);
    }
}
