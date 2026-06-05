package org.dummy.facez.domain.payroll.service;

import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.payroll.dto.*;
import org.dummy.facez.domain.payroll.model.Payroll;
import org.dummy.facez.domain.payroll.repository.PayrollRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PayrollReportService {

    private final PayrollRepository payrollRepository;

    public PayrollReportService(PayrollRepository payrollRepository) {
        this.payrollRepository = payrollRepository;
    }

    // ── Phase 7.2 — Labour cost report ───────────────────────────────────────

    public LabourCostResponse getLabourCostReport(int year, int month, String deptId) {
        List<Payroll> payrolls = payrollRepository.findByPeriodAndDepartment(year, month, deptId);

        long totalGross = 0, totalNet = 0, totalEmpIns = 0, totalErIns = 0, totalPit = 0, totalOt = 0, totalCost = 0;
        String departmentId = deptId;
        String departmentName = null;

        List<LabourCostItemResponse> items = new java.util.ArrayList<>();
        for (Payroll p : payrolls) {
            long empIns = p.getBhxhEmployee() + p.getBhytEmployee() + p.getBhtnEmployee();
            long erIns  = p.getTotalEmployerContributions();
            totalGross  += p.getTotalGross();
            totalNet    += p.getNetSalary();
            totalEmpIns += empIns;
            totalErIns  += erIns;
            totalPit    += p.getPit();
            totalOt     += p.getOtPay();
            totalCost   += p.getTotalEmploymentCost();

            EmployeeInfo emp = p.getEmployeeInfo();
            if (emp != null && emp.getDepartment() != null && departmentName == null) {
                departmentId   = emp.getDepartment().getDepartmentId();
                departmentName = emp.getDepartment().getDepartmentName();
            }

            items.add(LabourCostItemResponse.builder()
                    .employeeId(emp != null ? emp.getEmployeeId() : null)
                    .employeeName(emp != null ? emp.getName() : null)
                    .totalGross(p.getTotalGross())
                    .netSalary(p.getNetSalary())
                    .totalEmployeeInsurance(empIns)
                    .totalEmployerInsurance(erIns)
                    .pit(p.getPit())
                    .otPay(p.getOtPay())
                    .totalEmploymentCost(p.getTotalEmploymentCost())
                    .build());
        }

        return LabourCostResponse.builder()
                .period(year + "/" + String.format("%02d", month))
                .departmentId(departmentId)
                .departmentName(departmentName)
                .headcount(payrolls.size())
                .totalGross(totalGross)
                .totalNetSalary(totalNet)
                .totalEmployeeInsurance(totalEmpIns)
                .totalEmployerInsurance(totalErIns)
                .totalPit(totalPit)
                .totalOtPay(totalOt)
                .totalEmploymentCost(totalCost)
                .byEmployee(items)
                .build();
    }

    // ── Phase 7.3 — Insurance remittance report ───────────────────────────────

    public InsuranceRemittanceResponse getInsuranceRemittanceReport(int year, int month) {
        List<Payroll> payrolls = payrollRepository.findByPeriodAndDepartment(year, month, null);

        long totalEmpIns = 0, totalErIns = 0;
        List<InsuranceRemittanceItemResponse> items = new java.util.ArrayList<>();
        for (Payroll p : payrolls) {
            long empIns = p.getBhxhEmployee() + p.getBhytEmployee() + p.getBhtnEmployee();
            long erIns  = p.getTotalEmployerContributions();
            totalEmpIns += empIns;
            totalErIns  += erIns;

            EmployeeInfo emp = p.getEmployeeInfo();
            items.add(InsuranceRemittanceItemResponse.builder()
                    .employeeId(emp != null ? emp.getEmployeeId() : null)
                    .employeeName(emp != null ? emp.getName() : null)
                    .socialInsuranceCode(emp != null ? emp.getSocialInsuranceCode() : null)
                    .insuranceBase(p.getInsuranceBase())
                    .bhxhEmployee(p.getBhxhEmployee())
                    .bhytEmployee(p.getBhytEmployee())
                    .bhtnEmployee(p.getBhtnEmployee())
                    .totalEmployeeInsurance(empIns)
                    .bhxhEmployer(p.getBhxhEmployer())
                    .bhytEmployer(p.getBhytEmployer())
                    .bhtnEmployer(p.getBhtnEmployer())
                    .workplaceAccidentInsurance(p.getWorkplaceAccidentInsurance())
                    .totalEmployerInsurance(erIns)
                    .build());
        }

        return InsuranceRemittanceResponse.builder()
                .period(year + "/" + String.format("%02d", month))
                .headcount(payrolls.size())
                .totalEmployeeInsurance(totalEmpIns)
                .totalEmployerInsurance(totalErIns)
                .grandTotal(totalEmpIns + totalErIns)
                .items(items)
                .build();
    }

    // ── Phase 7.4 — PIT summary report ───────────────────────────────────────

    public PitSummaryResponse getPitSummaryReport(int year, int month) {
        List<Payroll> payrolls = payrollRepository.findByPeriodAndDepartment(year, month, null);

        long totalPit = 0;
        List<PitSummaryItemResponse> items = new java.util.ArrayList<>();
        for (Payroll p : payrolls) {
            totalPit += p.getPit();
            EmployeeInfo emp = p.getEmployeeInfo();
            items.add(PitSummaryItemResponse.builder()
                    .employeeId(emp != null ? emp.getEmployeeId() : null)
                    .employeeName(emp != null ? emp.getName() : null)
                    .taxCode(emp != null ? emp.getTaxCode() : null)
                    .dependentCount(p.getDependentCount())
                    .taxableIncome(p.getTaxableIncome())
                    .pit(p.getPit())
                    .build());
        }

        return PitSummaryResponse.builder()
                .period(year + "/" + String.format("%02d", month))
                .totalPit(totalPit)
                .items(items)
                .build();
    }
}
