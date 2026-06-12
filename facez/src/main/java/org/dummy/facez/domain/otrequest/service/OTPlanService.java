package org.dummy.facez.domain.otrequest.service;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.otrequest.dto.OTPlanCreateDto;
import org.dummy.facez.domain.otrequest.dto.OTPlanResponse;
import org.dummy.facez.domain.otrequest.model.OTPlan;
import org.dummy.facez.domain.otrequest.model.OTPlanEmployee;
import org.dummy.facez.domain.otrequest.repository.OTPlanRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OTPlanService {

    private final OTPlanRepository otPlanRepository;
    private final EmployeeInfoRepository employeeInfoRepository;

    public OTPlanService(OTPlanRepository otPlanRepository,
                         EmployeeInfoRepository employeeInfoRepository) {
        this.otPlanRepository = otPlanRepository;
        this.employeeInfoRepository = employeeInfoRepository;
    }

    /** LEADER creates a plan; it starts pending MANAGER approval (TO_APPROVE). */
    @Transactional
    public OTPlanResponse createPlan(OTPlanCreateDto dto) {
        if (dto.getPlannedStartTime() != null && dto.getPlannedEndTime() != null
                && !dto.getPlannedEndTime().isAfter(dto.getPlannedStartTime())) {
            throw new BadRequestException("Planned end time must be after planned start time");
        }

        OTPlan plan = OTPlan.builder()
                .id(UUID.randomUUID().toString())
                .otDate(dto.getOtDate())
                .plannedStartTime(dto.getPlannedStartTime())
                .plannedEndTime(dto.getPlannedEndTime())
                .departmentId(dto.getDepartmentId())
                .reason(dto.getReason())
                .status(RequestStatus.TO_APPROVE)
                .build();

        for (String employeeId : dto.getEmployeeIds().stream().distinct().toList()) {
            // Managed reference (no DB hit) — safe for the cascade insert; the FK
            // constraint rejects ids that don't exist.
            EmployeeInfo empRef = employeeInfoRepository.getReferenceById(employeeId);
            OTPlanEmployee link = OTPlanEmployee.builder()
                    .id(UUID.randomUUID().toString())
                    .otPlan(plan)
                    .employee(empRef)
                    .build();
            plan.getEmployees().add(link);
        }

        otPlanRepository.save(plan);
        return toResponse(plan);
    }

    public PageResponse<OTPlanResponse> getAllPlans(String status, Pageable pageable) {
        Page<OTPlan> page = (status != null && !status.isBlank())
                ? otPlanRepository.findByStatusAndDeleteFlagFalse(RequestStatus.valueOf(status), pageable)
                : otPlanRepository.findByDeleteFlagFalse(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public OTPlanResponse getPlanById(String id) {
        return toResponse(findById(id));
    }

    /** Approved plans the employee is assigned to — used to pick a plan when logging OT. */
    public List<OTPlanResponse> getMyApprovedPlans(String employeeId) {
        return otPlanRepository.findApprovedPlansForEmployee(employeeId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public OTPlanResponse approvePlan(String id) {
        OTPlan plan = findById(id);
        if (plan.getStatus() != RequestStatus.TO_APPROVE) {
            throw new BadRequestException("Only plans pending approval can be approved. Current: " + plan.getStatus());
        }
        plan.setStatus(RequestStatus.APPROVED);
        otPlanRepository.save(plan);
        return toResponse(plan);
    }

    @Transactional
    public OTPlanResponse rejectPlan(String id, String reason) {
        OTPlan plan = findById(id);
        if (plan.getStatus() != RequestStatus.TO_APPROVE) {
            throw new BadRequestException("Only plans pending approval can be rejected. Current: " + plan.getStatus());
        }
        plan.setStatus(RequestStatus.REJECTED);
        plan.setRejectionReason(reason);
        otPlanRepository.save(plan);
        return toResponse(plan);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private OTPlan findById(String id) {
        return otPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OTPlan", "id", id));
    }

    private OTPlanResponse toResponse(OTPlan plan) {
        List<String> ids = plan.getEmployees().stream()
                .map(e -> e.getEmployee().getEmployeeId())
                .toList();
        Map<String, String> names = employeeInfoRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(EmployeeInfo::getEmployeeId, EmployeeInfo::getName, (a, b) -> a));

        List<OTPlanResponse.PlanEmployee> employees = ids.stream()
                .map(eid -> OTPlanResponse.PlanEmployee.builder()
                        .employeeId(eid)
                        .employeeName(names.getOrDefault(eid, eid))
                        .build())
                .toList();

        return OTPlanResponse.builder()
                .id(plan.getId())
                .otDate(plan.getOtDate())
                .plannedStartTime(plan.getPlannedStartTime())
                .plannedEndTime(plan.getPlannedEndTime())
                .departmentId(plan.getDepartmentId())
                .reason(plan.getReason())
                .status(plan.getStatus() != null ? plan.getStatus().name() : null)
                .rejectionReason(plan.getRejectionReason())
                .employees(employees)
                .createdBy(plan.getCreatedBy())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }
}
