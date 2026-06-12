package org.dummy.facez.domain.attendance.service;

import org.dummy.facez.common.enums.LogTypes;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.attendance.dto.DeviceCreateRequest;
import org.dummy.facez.domain.attendance.dto.DeviceResponse;
import org.dummy.facez.domain.attendance.model.Device;
import org.dummy.facez.domain.attendance.repository.ApiKeyRepository;
import org.dummy.facez.domain.attendance.repository.DeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final ApiKeyRepository apiKeyRepository;

    public DeviceService(DeviceRepository deviceRepository, ApiKeyRepository apiKeyRepository) {
        this.deviceRepository = deviceRepository;
        this.apiKeyRepository = apiKeyRepository;
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> getAll() {
        return deviceRepository.findByDeleteFlagFalseOrderByCreatedAtDesc()
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public DeviceResponse create(DeviceCreateRequest req) {
        LogTypes logType = LogTypes.IN;
        if (req.getLogType() != null && !req.getLogType().isBlank()) {
            logType = LogTypes.valueOf(req.getLogType().toUpperCase());
        }
        Device device = Device.builder()
                .deviceId(UUID.randomUUID().toString())
                .deviceName(req.getDeviceName())
                .location(req.getLocation())
                .logType(logType)
                .active(true)
                .createdAt(LocalDateTime.now())
                .deleteFlag(false)
                .build();
        deviceRepository.save(device);
        return toResponse(device);
    }

    @Transactional
    public void delete(String deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device", "id", deviceId));
        device.setDeleteFlag(true);
        device.setActive(false);
        device.setDeletedAt(LocalDateTime.now());
        deviceRepository.save(device);
    }

    private DeviceResponse toResponse(Device d) {
        return DeviceResponse.builder()
                .deviceId(d.getDeviceId())
                .deviceName(d.getDeviceName())
                .location(d.getLocation())
                .logType(d.getLogType() != null ? d.getLogType().name() : null)
                .active(d.isActive())
                .apiKeyActive(apiKeyRepository.existsByDevice_DeviceIdAndActiveTrue(d.getDeviceId()))
                .createdAt(d.getCreatedAt())
                .build();
    }
}
