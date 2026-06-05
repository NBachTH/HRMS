package org.dummy.facez.domain.payroll.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.payroll.dto.SystemConfigRequest;
import org.dummy.facez.domain.payroll.dto.SystemConfigResponse;
import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.dummy.facez.domain.payroll.repository.SystemConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SystemConfigService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final SystemConfigRepository configRepo;
    private final PayrollConfigService   payrollConfigService;

    public SystemConfigService(SystemConfigRepository configRepo,
                               PayrollConfigService payrollConfigService) {
        this.configRepo           = configRepo;
        this.payrollConfigService = payrollConfigService;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public SystemConfigResponse create(SystemConfigRequest req, String username) {
        SystemConfig config = SystemConfig.builder()
                .id(UUID.randomUUID().toString())
                .configType(req.getConfigType())
                .version(req.getVersion())
                .effectiveDate(req.getEffectiveDate())
                .legalBasis(req.getLegalBasis())
                .configData(req.getConfigData())
                .active(false)
                .build();

        configRepo.save(config);
        return toResponse(config);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public List<SystemConfigResponse> listByType(String configType) {
        return configRepo.findByConfigTypeOrderByCreatedAtDesc(configType)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public SystemConfigResponse getById(String id) {
        return toResponse(findById(id));
    }

    // ── Activate ──────────────────────────────────────────────────────────────

    @Transactional
    public SystemConfigResponse activate(String id, String username) {
        SystemConfig target = findById(id);

        if (target.isActive()) {
            throw new BadRequestException("Config " + id + " is already active.");
        }

        // Deactivate current active version for this type
        configRepo.deactivateAllByConfigType(target.getConfigType());

        target.setActive(true);
        target.setUpdatedBy(username);
        target.setUpdatedAt(LocalDateTime.now());
        configRepo.save(target);

        // Refresh in-memory cache so next payroll calculation picks up new values
        payrollConfigService.reload();

        return toResponse(target);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Transactional
    public void delete(String id) {
        SystemConfig config = findById(id);
        if (config.isActive()) {
            throw new BadRequestException("Cannot delete an active config. Activate another version first.");
        }
        configRepo.delete(config);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private SystemConfig findById(String id) {
        return configRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SystemConfig", "id", id));
    }

    private SystemConfigResponse toResponse(SystemConfig c) {
        return SystemConfigResponse.builder()
                .id(c.getId())
                .configType(c.getConfigType())
                .version(c.getVersion())
                .effectiveDate(c.getEffectiveDate())
                .legalBasis(c.getLegalBasis())
                .configData(toMap(c.getConfigData()))
                .active(c.isActive())
                .updatedBy(c.getUpdatedBy())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMap(JsonNode node) {
        if (node == null) return null;
        return MAPPER.convertValue(node, Map.class);
    }
}
