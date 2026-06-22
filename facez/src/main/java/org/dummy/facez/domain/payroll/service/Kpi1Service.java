package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.department.model.Department;
import org.dummy.facez.domain.department.repository.DepartmentRepository;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.payroll.dto.Kpi1RatingRequest;
import org.dummy.facez.domain.payroll.dto.Kpi1RatingResponse;
import org.dummy.facez.domain.payroll.model.Kpi1Rating;
import org.dummy.facez.domain.payroll.repository.Kpi1RatingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class Kpi1Service {

    private static final Set<String> VALID_RATINGS = Set.of("A", "B", "C");

    private final Kpi1RatingRepository kpi1RatingRepository;
    private final EmployeeInfoRepository employeeInfoRepository;
    private final DepartmentRepository departmentRepository;

    public Kpi1Service(Kpi1RatingRepository kpi1RatingRepository,
                       EmployeeInfoRepository employeeInfoRepository,
                       DepartmentRepository departmentRepository) {
        this.kpi1RatingRepository = kpi1RatingRepository;
        this.employeeInfoRepository = employeeInfoRepository;
        this.departmentRepository = departmentRepository;
    }

    /**
     * Upsert a KPI1 rating. HR_ADMIN/SYSTEM_ADMIN are unrestricted; everyone else may only rate
     * employees in a department they actually manage (Department.managerId == evaluator), regardless
     * of their global role — so the HR/Finance department managers can rate their own staff even
     * though their role is HR_ADMIN/FINANCE_ADMIN rather than MANAGER.
     */
    @Transactional
    public Kpi1RatingResponse upsert(Kpi1RatingRequest req, String evaluatorId, boolean unrestricted) {
        String rating = req.getRating() != null ? req.getRating().toUpperCase() : null;
        if (!VALID_RATINGS.contains(rating)) {
            throw new BadRequestException("Rating must be A, B or C.");
        }
        if (!unrestricted) {
            String targetDept = departmentOf(req.getEmployeeId());
            Set<String> managedDeptIds = departmentRepository
                    .findByEmployeeInfo_EmployeeIdAndDeleteFlagFalse(evaluatorId)
                    .stream().map(Department::getDepartmentId).collect(Collectors.toSet());
            if (targetDept == null || !managedDeptIds.contains(targetDept)) {
                throw new BadRequestException("Bạn chỉ được chấm HS1 cho nhân viên thuộc phòng ban mình quản lý.");
            }
        }

        Kpi1Rating r = kpi1RatingRepository
                .findByEmployeeInfo_EmployeeIdAndYearAndMonth(req.getEmployeeId(), req.getYear(), req.getMonth())
                .orElseGet(() -> Kpi1Rating.builder()
                        .id(UUID.randomUUID().toString())
                        .employeeInfo(employeeInfoRepository.getReferenceById(req.getEmployeeId()))
                        .year(req.getYear())
                        .month(req.getMonth())
                        .build());
        r.setRating(rating);
        r.setNote(req.getNote());
        r.setEvaluatorId(evaluatorId);
        kpi1RatingRepository.save(r);
        return toResponse(r);
    }

    @Transactional(readOnly = true)
    public List<Kpi1RatingResponse> getForPeriod(int year, int month) {
        return kpi1RatingRepository.findByYearAndMonth(year, month).stream().map(this::toResponse).toList();
    }

    /** Rating value (A/B/C) for an employee in a period, if any — used by the payroll engine. */
    @Transactional(readOnly = true)
    public Optional<String> getRating(String employeeId, int year, int month) {
        return kpi1RatingRepository.findByEmployeeInfo_EmployeeIdAndYearAndMonth(employeeId, year, month)
                .map(Kpi1Rating::getRating);
    }

    /** Employee ids that already have a KPI1 rating for the period. */
    @Transactional(readOnly = true)
    public List<String> ratedEmployeeIds(int year, int month) {
        return kpi1RatingRepository.findRatedEmployeeIds(year, month);
    }

    /** Map of employeeId → KPI1 rating (A/B/C) for the whole period. */
    @Transactional(readOnly = true)
    public Map<String, String> ratingsForPeriod(int year, int month) {
        return kpi1RatingRepository.findByYearAndMonth(year, month).stream()
                .collect(Collectors.toMap(
                        k -> k.getEmployeeInfo().getEmployeeId(), Kpi1Rating::getRating, (a, b) -> a));
    }

    private String departmentOf(String employeeId) {
        if (employeeId == null) return null;
        return employeeInfoRepository.findById(employeeId)
                .map(EmployeeInfo::getDepartment)
                .map(d -> d != null ? d.getDepartmentId() : null)
                .orElse(null);
    }

    private Kpi1RatingResponse toResponse(Kpi1Rating r) {
        return Kpi1RatingResponse.builder()
                .id(r.getId())
                .employeeId(r.getEmployeeInfo() != null ? r.getEmployeeInfo().getEmployeeId() : null)
                .employeeName(r.getEmployeeInfo() != null ? r.getEmployeeInfo().getName() : null)
                .year(r.getYear())
                .month(r.getMonth())
                .rating(r.getRating())
                .evaluatorId(r.getEvaluatorId())
                .note(r.getNote())
                .build();
    }
}
