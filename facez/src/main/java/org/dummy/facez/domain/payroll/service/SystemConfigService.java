package org.dummy.facez.domain.payroll.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.payroll.dto.SystemConfigResponse;
import org.dummy.facez.domain.payroll.model.SystemConfig;
import org.dummy.facez.domain.payroll.repository.SystemConfigRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * READ-ONLY access to the legacy {@code system_config} (JSONB) records.
 * <p>
 * Payroll configuration now lives in the typed effective-dated tables managed by
 * {@code PayrollConfig*} (see {@code PayrollConfigController}). This service is kept only so the
 * old JSON versions remain visible for reference/rollback during the deprecation window; all
 * mutation (create/activate/delete) has been removed.
 */
@Service
public class SystemConfigService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final SystemConfigRepository configRepo;

    public SystemConfigService(SystemConfigRepository configRepo) {
        this.configRepo = configRepo;
    }

    public List<SystemConfigResponse> listByType(String configType) {
        return configRepo.findByConfigTypeOrderByCreatedAtDesc(configType)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public SystemConfigResponse getById(String id) {
        return toResponse(findById(id));
    }

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
