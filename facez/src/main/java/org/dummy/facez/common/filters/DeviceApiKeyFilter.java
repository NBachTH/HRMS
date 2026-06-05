package org.dummy.facez.common.filters;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.dummy.facez.domain.attendance.model.ApiKey;
import org.dummy.facez.domain.attendance.repository.ApiKeyRepository;
import org.dummy.facez.domain.attendance.service.ApiKeyService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Validates X-Device-API-Key header for /api/checkin-logs/** endpoints.
 * If a valid key is present, the request is authenticated as the device
 * with DEVICE_CHECKIN authority, bypassing JWT authentication.
 */
@Component
public class DeviceApiKeyFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "X-Device-API-Key";

    private final ApiKeyRepository apiKeyRepository;

    public DeviceApiKeyFilter(ApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().contains("/api/checkin-logs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String rawKey = request.getHeader(HEADER_NAME);
        if (rawKey != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            String hash = ApiKeyService.sha256Hex(rawKey);
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findByKeyHashAndActiveTrue(hash);
            if (apiKeyOpt.isPresent()) {
                ApiKey apiKey = apiKeyOpt.get();
                apiKey.setLastUsedAt(LocalDateTime.now());
                apiKeyRepository.save(apiKey);

                String deviceId = apiKey.getDevice().getDeviceId();
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        "device:" + deviceId, null,
                        List.of(new SimpleGrantedAuthority("DEVICE_CHECKIN")));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
