package org.dummy.facez.domain.payroll.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayslipResponse {
    private String payrollId;
    private String employeeId;
    private String employeeName;
    private String bankAccountNumber;
    private String bankName;
    private int payrollYear;
    private int payrollMonth;
    private long performanceSalary;
    private long positionCoefficient;
    private long livingAllowance;
    private long languageAllowance;
    private long odcAllowance;
    private double kpiAverage;
    private int actualWorkingDays;
    private int standardWorkingDays;
    private long otPay;
    private double otWeekdayHours;
    private double otWeekendHours;
    private double otHolidayHours;
    private double otNightHours;
    private long bonus;
    private long totalGross;
    private long insuranceBase;
    private long bhxhEmployee;
    private long bhytEmployee;
    private long bhtnEmployee;
    private int dependentCount;
    private long taxableIncome;
    private long pit;
    private long netSalary;
    private String status;
}
