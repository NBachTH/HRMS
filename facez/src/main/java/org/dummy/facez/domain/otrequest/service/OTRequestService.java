package org.dummy.facez.domain.otrequest.service;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.otrequest.repository.OTRequestRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.otrequest.model.OTRequest;
import org.dummy.facez.domain.otrequest.dto.OTRequestCreateDto;
import org.dummy.facez.domain.otrequest.dto.OTRequestResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class OTRequestService {

    // Labour Code Article 107: max 40 hours/month = 2400 minutes
    private static final long MAX_MONTHLY_OT_MINUTES = 2400L;
    // Max 200 hours/year = 12000 minutes
    private static final long MAX_ANNUAL_OT_MINUTES = 12000L;

    private final OTRequestRepository otRequestRepository;

    public OTRequestService(OTRequestRepository otRequestRepository) {
        this.otRequestRepository = otRequestRepository;
    }

    @Transactional
    public OTRequestResponse createOTRequest(OTRequestCreateDto req) {
        if (req.getEndTime().isBefore(req.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        // Phase 6.1: Enforce OT limits using minutes to avoid fractional hour truncation
        long requestedMinutes = Duration.between(req.getStartTime(), req.getEndTime()).toMinutes();

        long monthlyOtMinutes = otRequestRepository.sumApprovedMinutesForMonth(
                req.getEmployeeId(),
                req.getStartTime().getYear(),
                req.getStartTime().getMonthValue());

        if (monthlyOtMinutes + requestedMinutes > MAX_MONTHLY_OT_MINUTES) {
            throw new BadRequestException(String.format(
                    "This request would exceed the 40-hour monthly OT limit. " +
                    "Approved this month: %.1fh. Requested: %.1fh.",
                    monthlyOtMinutes / 60.0, requestedMinutes / 60.0));
        }

        long annualOtMinutes = otRequestRepository.sumApprovedMinutesForYear(
                req.getEmployeeId(), req.getStartTime().getYear());

        if (annualOtMinutes + requestedMinutes > MAX_ANNUAL_OT_MINUTES) {
            throw new BadRequestException(String.format(
                    "This request would exceed the 200-hour annual OT limit. " +
                    "Approved this year: %.1fh.", annualOtMinutes / 60.0));
        }

        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(req.getEmployeeId());

        OTRequest ot = OTRequest.builder()
                .otRequestId(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .status(RequestStatus.TO_APPROVE)
                .build();

        otRequestRepository.save(ot);
        return toResponse(ot);
    }

    public PageResponse<OTRequestResponse> getAllOTRequests(String status, Pageable pageable) {
        Page<OTRequest> page = (status != null && !status.isBlank())
                ? otRequestRepository.findByStatus(RequestStatus.valueOf(status), pageable)
                : otRequestRepository.findAll(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public PageResponse<OTRequestResponse> getByEmployee(String employeeId, Pageable pageable) {
        return PageResponse.from(otRequestRepository.findByEmployeeInfo_EmployeeId(employeeId, pageable)
                .map(this::toResponse));
    }

    public OTRequestResponse getOTRequestById(String id) {
        return toResponse(findById(id));
    }

    @Transactional
    public OTRequestResponse approveOTRequest(String id, String approverRole) {
        OTRequest ot = findById(id);
        RequestStatus current = ot.getStatus();

        switch (approverRole) {
            case "LEADER" -> {
                if (current != RequestStatus.TO_APPROVE)
                    throw new BadRequestException(
                            "LEADER can only approve requests in TO_APPROVE status. Current: " + current);
                ot.setStatus(RequestStatus.LEADER_APPROVED);
            }
            case "MANAGER" -> {
                if (current != RequestStatus.LEADER_APPROVED)
                    throw new BadRequestException(
                            "MANAGER can only approve requests in LEADER_APPROVED status. Current: " + current);
                ot.setStatus(RequestStatus.MANAGER_APPROVED);
            }
            case "HR_ADMIN" -> {
                if (current != RequestStatus.MANAGER_APPROVED)
                    throw new BadRequestException(
                            "HR_ADMIN can only give final approval on MANAGER_APPROVED requests. Current: " + current);
                ot.setStatus(RequestStatus.APPROVED);
            }
            default -> throw new BadRequestException("Role '" + approverRole + "' is not authorized to approve requests.");
        }

        ot.setUpdatedAt(LocalDateTime.now());
        otRequestRepository.save(ot);
        return toResponse(ot);
    }

    @Transactional
    public OTRequestResponse rejectOTRequest(String id, String approverRole) {
        OTRequest ot = findById(id);
        RequestStatus current = ot.getStatus();

        boolean canReject = switch (approverRole) {
            case "LEADER"   -> current == RequestStatus.TO_APPROVE;
            case "MANAGER"  -> current == RequestStatus.LEADER_APPROVED;
            case "HR_ADMIN" -> current == RequestStatus.MANAGER_APPROVED;
            default -> false;
        };

        if (!canReject) {
            throw new BadRequestException(
                    "Role '" + approverRole + "' cannot reject a request in '" + current + "' status.");
        }

        ot.setStatus(RequestStatus.REJECTED);
        ot.setUpdatedAt(LocalDateTime.now());
        otRequestRepository.save(ot);
        return toResponse(ot);
    }

    @Transactional
    public void deleteOTRequest(String id) {
        OTRequest ot = findById(id);
        if (ot.getStatus() != RequestStatus.TO_APPROVE && ot.getStatus() != RequestStatus.DRAFT) {
            throw new BadRequestException(
                    "Cannot delete an OT request that has already entered the approval process.");
        }
        otRequestRepository.delete(ot);
    }

    private OTRequest findById(String id) {
        return otRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OTRequest", "id", id));
    }

    private OTRequestResponse toResponse(OTRequest ot) {
        OTRequestResponse.OTRequestResponseBuilder builder = OTRequestResponse.builder()
                .otRequestId(ot.getOtRequestId())
                .startTime(ot.getStartTime())
                .endTime(ot.getEndTime())
                .status(ot.getStatus() != null ? ot.getStatus().name() : null)
                .createdAt(ot.getCreatedAt())
                .updatedAt(ot.getUpdatedAt());

        if (ot.getEmployeeInfo() != null) {
            builder.employeeId(ot.getEmployeeInfo().getEmployeeId())
                    .employeeName(ot.getEmployeeInfo().getName());
        }
        return builder.build();
    }
}
