package org.dummy.facez.domain.attendance.service;

import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.attendance.dto.ApiKeyResponse;
import org.dummy.facez.domain.attendance.model.ApiKey;
import org.dummy.facez.domain.attendance.model.Device;
import org.dummy.facez.domain.attendance.repository.ApiKeyRepository;
import org.dummy.facez.domain.attendance.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final DeviceRepository deviceRepository;

    public ApiKeyService(ApiKeyRepository apiKeyRepository,
                          DeviceRepository deviceRepository) {
        this.apiKeyRepository = apiKeyRepository;
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public ApiKeyResponse generateApiKey(String deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device", "id", deviceId));

        // Deactivate previous active keys for this device
        apiKeyRepository.findAll().stream()
                .filter(k -> k.getDevice().getDeviceId().equals(deviceId) && k.isActive())
                .forEach(k -> {
                    k.setActive(false);
                    apiKeyRepository.save(k);
                });

        // Generate secure 32-byte random key, base64url-encoded
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        String rawKey = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        ApiKey apiKey = ApiKey.builder()
                .id(UUID.randomUUID().toString())
                .keyHash(sha256Hex(rawKey))
                .device(device)
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();

        apiKeyRepository.save(apiKey);

        return ApiKeyResponse.builder()
                .keyId(apiKey.getId())
                .deviceId(deviceId)
                .rawKey(rawKey)
                .message("Store this key securely — it will not be shown again.")
                .build();
    }

    public static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
