package org.dummy.facez.domain.attendance.service;

import org.dummy.facez.common.enums.RequestStatus;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.attendance.dto.AttendanceAdjustmentCreateDto;
import org.dummy.facez.domain.attendance.dto.AttendanceAdjustmentResponse;
import org.dummy.facez.domain.attendance.model.AttendanceAdjustment;
import org.dummy.facez.domain.attendance.repository.AttendanceAdjustmentRepository;
import org.dummy.facez.domain.attendance.repository.AttendancePeriodCloseRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class AttendanceAdjustmentService {

    private final AttendanceAdjustmentRepository adjustmentRepository;
    private final AttendancePeriodCloseRepository periodCloseRepository;
    private final AttendanceService attendanceService;
    private final EmployeeInfoRepository employeeInfoRepository;

    public AttendanceAdjustmentService(AttendanceAdjustmentRepository adjustmentRepository,
                                       AttendancePeriodCloseRepository periodCloseRepository,
                                       AttendanceService attendanceService,
                                       EmployeeInfoRepository employeeInfoRepository) {
        this.adjustmentRepository = adjustmentRepository;
        this.periodCloseRepository = periodCloseRepository;
        this.attendanceService = attendanceService;
        this.employeeInfoRepository = employeeInfoRepository;
    }

    @Transactional
    public AttendanceAdjustmentResponse create(AttendanceAdjustmentCreateDto req) {
        if (req.getRequestedCheckIn() == null && req.getRequestedCheckOut() == null) {
            throw new BadRequestException("Provide at least a check-in or check-out time.");
        }
        if (req.getRequestedCheckIn() != null && req.getRequestedCheckOut() != null
                && !req.getRequestedCheckOut().isAfter(req.getRequestedCheckIn())) {
            throw new BadRequestException("Check-out must be after check-in.");
        }
        assertPeriodOpen(req.getWorkDate());

        // Duplicate guard: one pending request per employee per day.
        if (adjustmentRepository.existsByEmployeeInfo_EmployeeIdAndWorkDateAndStatus(
                req.getEmployeeId(), req.getWorkDate(), RequestStatus.TO_APPROVE)) {
            throw new BadRequestException(
                    "You already have a pending attendance-adjustment request for " + req.getWorkDate() + ".");
        }

        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(req.getEmployeeId());

        AttendanceAdjustment adj = AttendanceAdjustment.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .workDate(req.getWorkDate())
                .requestedCheckIn(req.getRequestedCheckIn())
                .requestedCheckOut(req.getRequestedCheckOut())
                .reason(req.getReason())
                .status(RequestStatus.TO_APPROVE)
                .build();
        adjustmentRepository.save(adj);
        return toResponse(adj);
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceAdjustmentResponse> getByEmployee(String employeeId, Pageable pageable) {
        return PageResponse.from(adjustmentRepository.findByEmployeeInfo_EmployeeId(employeeId, pageable)
                .map(this::toResponse));
    }

    /**
     * Team-scoped listing. {@code unrestricted} (HR_ADMIN / SYSTEM_ADMIN) sees everything;
     * a LEADER / MANAGER only sees requests from employees in their own department.
     */
    @Transactional(readOnly = true)
    public PageResponse<AttendanceAdjustmentResponse> getAll(
            String status, String approverEmployeeId, boolean unrestricted, Pageable pageable) {
        RequestStatus st = (status != null && !status.isBlank()) ? RequestStatus.valueOf(status) : null;
        Page<AttendanceAdjustment> page;

        if (unrestricted) {
            page = st != null ? adjustmentRepository.findByStatus(st, pageable)
                              : adjustmentRepository.findAll(pageable);
        } else {
            String deptId = departmentOf(approverEmployeeId);
            if (deptId == null) {
                page = Page.empty(pageable);
            } else {
                page = st != null
                        ? adjustmentRepository.findByEmployeeInfo_Department_DepartmentIdAndStatus(deptId, st, pageable)
                        : adjustmentRepository.findByEmployeeInfo_Department_DepartmentId(deptId, pageable);
            }
        }
        return PageResponse.from(page.map(this::toResponse));
    }

    /** HR/MANAGER approval — writes the requested times into Attendance + WorkDay. */
    @Transactional
    public AttendanceAdjustmentResponse approve(String id, String approverEmployeeId, boolean unrestricted) {
        AttendanceAdjustment adj = findById(id);
        if (adj.getStatus() != RequestStatus.TO_APPROVE) {
            throw new BadRequestException("Only pending adjustments can be approved. Current: " + adj.getStatus());
        }
        if (!unrestricted) assertSameDepartment(approverEmployeeId, adj);
        assertPeriodOpen(adj.getWorkDate());

        attendanceService.upsertManualAttendance(
                adj.getEmployeeInfo().getEmployeeId(), adj.getWorkDate(),
                adj.getRequestedCheckIn(), adj.getRequestedCheckOut());

        adj.setStatus(RequestStatus.APPROVED);
        adjustmentRepository.save(adj);
        return toResponse(adj);
    }

    @Transactional
    public AttendanceAdjustmentResponse reject(String id, String reason, String approverEmployeeId, boolean unrestricted) {
        AttendanceAdjustment adj = findById(id);
        if (adj.getStatus() != RequestStatus.TO_APPROVE) {
            throw new BadRequestException("Only pending adjustments can be rejected. Current: " + adj.getStatus());
        }
        if (!unrestricted) assertSameDepartment(approverEmployeeId, adj);
        adj.setStatus(RequestStatus.REJECTED);
        adj.setRejectionReason(reason);
        adjustmentRepository.save(adj);
        return toResponse(adj);
    }

    @Transactional
    public void delete(String id) {
        AttendanceAdjustment adj = findById(id);
        if (adj.getStatus() != RequestStatus.TO_APPROVE) {
            throw new BadRequestException("Only pending adjustments can be cancelled.");
        }
        adjustmentRepository.delete(adj);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void assertPeriodOpen(LocalDate date) {
        if (periodCloseRepository.existsByCloseYearAndCloseMonth(date.getYear(), date.getMonthValue())) {
            throw new BadRequestException(
                    "Attendance period " + date.getMonthValue() + "/" + date.getYear() +
                    " is already closed — adjustments are no longer allowed.");
        }
    }

    private AttendanceAdjustment findById(String id) {
        return adjustmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttendanceAdjustment", "id", id));
    }

    private String departmentOf(String employeeId) {
        if (employeeId == null) return null;
        return employeeInfoRepository.findById(employeeId)
                .map(EmployeeInfo::getDepartment)
                .map(d -> d != null ? d.getDepartmentId() : null)
                .orElse(null);
    }

    /** A LEADER/MANAGER may only act on requests from employees in their own department. */
    private void assertSameDepartment(String approverEmployeeId, AttendanceAdjustment adj) {
        String approverDept = departmentOf(approverEmployeeId);
        String employeeDept = (adj.getEmployeeInfo() != null && adj.getEmployeeInfo().getDepartment() != null)
                ? adj.getEmployeeInfo().getDepartment().getDepartmentId() : null;
        if (approverDept == null || !approverDept.equals(employeeDept)) {
            throw new BadRequestException(
                    "You can only handle adjustment requests from employees in your own department.");
        }
    }

    private AttendanceAdjustmentResponse toResponse(AttendanceAdjustment a) {
        return AttendanceAdjustmentResponse.builder()
                .id(a.getId())
                .employeeId(a.getEmployeeInfo() != null ? a.getEmployeeInfo().getEmployeeId() : null)
                .employeeName(a.getEmployeeInfo() != null ? a.getEmployeeInfo().getName() : null)
                .workDate(a.getWorkDate())
                .requestedCheckIn(a.getRequestedCheckIn())
                .requestedCheckOut(a.getRequestedCheckOut())
                .reason(a.getReason())
                .status(a.getStatus() != null ? a.getStatus().name() : null)
                .rejectionReason(a.getRejectionReason())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
