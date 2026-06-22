// === Shared TypeScript Types matching Backend DTOs ===

// --- Auth ---
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    username: string;
    role: string;
    employeeId: string;
}

export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

// --- API Response Wrapper (matches ApiResponse<T> from backend) ---
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
}

// --- Employee ---
export interface Employee {
    employeeId: string;
    name: string;
    role: string;
    email: string;
    phoneNumber: string;
    address: string;
    dateOfJoining: string;
    emergencyContact: string;
    status: string;
    departmentId: string;
    departmentName: string;
    username: string;
    // Statutory fields
    nationalId?: string;
    nationalIdIssueDate?: string;
    nationalIdIssuePlace?: string;
    taxCode?: string;
    socialInsuranceCode?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankBranch?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    hometown?: string;
    profilePictureUrl?: string;
}

export interface EmployeeCreateRequest {
    employeeId: string;
    name: string;
    role: string;
    email: string;
    phoneNumber?: string;
    address?: string;
    dateOfJoining?: string;
    emergencyContact?: string;
    departmentId?: string;
    username: string;
    password: string;
    nationalId?: string;
    taxCode?: string;
    socialInsuranceCode?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankBranch?: string;
    dateOfBirth?: string;
    gender?: string;
    hometown?: string;
}

export interface EmployeeUpdateRequest {
    name?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    dateOfJoining?: string;
    emergencyContact?: string;
    departmentId?: string;
    status?: string;
    role?: string;
    nationalId?: string;
    taxCode?: string;
    socialInsuranceCode?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankBranch?: string;
    dateOfBirth?: string;
    gender?: string;
    hometown?: string;
}

// --- Tax Dependent ---
export interface TaxDependent {
    id: string;
    employeeId: string;
    fullName: string;
    nationalId?: string;
    dateOfBirth?: string;
    relationship: string;
    registrationDate?: string;
    active: boolean;
}

export interface TaxDependentRequest {
    employeeId: string;
    fullName: string;
    nationalId?: string;
    dateOfBirth?: string;
    relationship: string;
    registrationDate?: string;
}

// --- Department ---
export interface Department {
    departmentId: string;
    departmentName: string;
    managerId: string;
    managerName: string;
    parentId?: string;
}

export interface DepartmentRequest {
    departmentId: string;
    departmentName: string;
    managerId?: string;
    parentId?: string;
}

// --- Contract ---
export interface Contract {
    id: string;
    employeeId: string;
    employeeName: string;
    contractType: string;
    startDate: string;
    endDate?: string;
    terms?: string;
    salaryRank?: string;
    baseSalary?: number;
    insuranceBase?: number;
    positionCode?: string;
    salaryStep?: number;
    dependentCount?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
    current?: boolean;
    status: string;
    notes?: string;
    hasDocument?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ContractRequest {
    employeeId: string;
    contractType: string;
    startDate: string;
    endDate?: string;
    terms?: string;
    baseSalary?: number;
    insuranceBase?: number;
    positionCode?: string;
    salaryStep?: number;
    dependentCount?: number;
    effectiveFrom?: string;
    notes?: string;
}

// --- Attendance ---
export interface Attendance {
    attendanceId: string;
    employeeId: string;
    employeeName: string;
    date: string;           // YYYY-MM-DD
    checkIn: string;        // ISO datetime
    checkOut: string | null;
    lateHour: number;
    workingHour: number;
    paidHour: number;
    workingDay: number;
    paidDay: number;
    violate: boolean;
}

export interface AttendanceRequest {
    checkIn: string;
    checkOut?: string;
}

// --- Attendance Period Close ---
export interface PeriodCloseRequest {
    year: number;
    month: number;
    notes?: string;
    forceClose?: boolean;
}

export interface PeriodCloseResponse {
    id?: string;
    year: number;
    month: number;
    closedBy?: string;
    closedAt?: string;
    notes?: string;
    unexplainedAbsences: UnexplainedAbsenceDto[];
    closed: boolean;
    message: string;
}

export interface UnexplainedAbsenceDto {
    employeeId: string;
    employeeName: string;
    missingDates: string[];
}

// --- Public Holiday ---
export interface PublicHoliday {
    id: string;
    holidayYear: number;
    holidayDate: string;
    name: string;
    compensatoryDay?: string;
}

export interface PublicHolidayRequest {
    holidayYear: number;
    holidayDate: string;
    name: string;
    compensatoryDay?: string;
}

// --- Leave Request ---
export interface LeaveRequest {
    leaveRequestId: string;
    employeeId: string;
    employeeName: string;
    reason: string;
    leaveType?: LeaveType;
    durationHours?: number;
    balanceDeducted?: boolean;
    startTime: string;
    endTime: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface LeaveCreateRequest {
    employeeId?: string;         // server derives identity from JWT; client value is ignored
    projectId?: string;          // optional project context (VMS-style routing)
    reason: string;
    startTime: string;
    endTime: string;
    leaveType: LeaveType;
    halfDay?: boolean;           // half-day leave (0.5 day)
    attachmentName?: string;     // front-end captured file name (multipart upload TBD backend)
}

// --- Leave Balance ---
export interface LeaveBalance {
    id: string;
    employeeId: string;
    leaveYear: number;
    leaveType: LeaveType;
    entitlementDays: number;
    carriedOverDays: number;
    pendingDays: number;
    usedDays: number;
    remainingDays: number;
    carryOverCap?: number;
}

// --- OT Plan (LEADER creates → MANAGER approves) ---
export interface OTPlanEmployee {
    employeeId: string;
    employeeName: string;
}

export interface OTPlan {
    id: string;
    otDate: string;              // yyyy-MM-dd
    plannedStartTime?: string;   // HH:mm[:ss]
    plannedEndTime?: string;
    departmentId?: string;
    reason?: string;
    status: string;              // TO_APPROVE | APPROVED | REJECTED
    rejectionReason?: string;
    employees: OTPlanEmployee[];
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface OTPlanCreateRequest {
    otDate: string;
    plannedStartTime?: string;
    plannedEndTime?: string;
    departmentId?: string;
    reason?: string;
    employeeIds: string[];
}

// --- OT Request (one actual session logged against an approved plan; auto-approved) ---
export interface OTRequest {
    otRequestId: string;
    employeeId: string;
    employeeName: string;
    otPlanId?: string;
    startTime: string;           // actual start
    endTime: string;             // actual end
    status: string;
    coefficient?: number;        // pay multiplier: weekday 1.5 / weekend 2.0 / holiday 3.0
    createdAt: string;
    updatedAt: string;
}

export interface OTRequestCreate {
    employeeId?: string;         // server derives identity from JWT; client value is ignored
    otPlanId: string;
    actualStartTime: string;     // yyyy-MM-ddTHH:mm:ss
    actualEndTime: string;
}

// --- Project (lightweight context for OT/Leave routing) ---
export interface Project {
    projectId: string;
    name: string;
    code?: string;
    projectManagerId?: string;
    projectManagerName?: string;
}

// --- Payroll ---
export interface Payroll {
    payrollId: string;
    locked?: boolean;
    payrollRunId?: string;
    employeeId: string;
    employeeName: string;
    payrollYear: number;
    payrollMonth: number;

    // Earnings
    performanceSalary: number;
    positionCoefficient: number;
    livingAllowance: number;
    languageAllowance: number;
    odcAllowance: number;
    kpi1Score: number;
    kpi2Score: number;
    kpiAverage: number;
    actualWorkingDays: number;
    standardWorkingDays: number;
    otPay: number;
    otWeekdayHours?: number;
    otWeekendHours?: number;
    otHolidayHours?: number;
    otNightHours?: number;
    bonus: number;

    // Computed
    baseGross: number;
    totalGross: number;

    // Deductions
    insuranceBase: number;
    bhxhEmployee: number;
    bhytEmployee: number;
    bhtnEmployee: number;
    dependentCount: number;
    taxableIncome: number;
    pit: number;

    // Employer contributions
    bhxhEmployer?: number;
    bhytEmployer?: number;
    bhtnEmployer?: number;
    workplaceAccidentInsurance?: number;
    totalEmployerContributions?: number;
    totalEmploymentCost?: number;

    // Net
    netSalary: number;

    status: string;
    rejectionReason?: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PayrollCalculateRequest {
    employeeId: string;
    payrollYear: number;
    payrollMonth: number;
    // HS1 (điểm cấp trên), HS2/Nt/NCtt suy tự động. Không nhập tay JP/ODC/bonus/note.
}

export interface PayrollBatchCalculateRequest {
    payrollYear: number;
    payrollMonth: number;
}

export interface PayrollJobResponse {
    jobId: string;
    state: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    year: number;
    month: number;
    standardWorkingDays: number;
    startedAt: string | null;
    completedAt: string | null;
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
    errors: string[];
    failureReason: string | null;
}

export interface PayrollRejectRequest {
    reason: string;
}

// --- Payslip (employee self-service) ---
export interface Payslip {
    payrollId: string;
    employeeId: string;
    employeeName: string;
    bankAccountNumber?: string;
    bankName?: string;
    payrollYear: number;
    payrollMonth: number;
    performanceSalary: number;
    positionCoefficient: number;
    livingAllowance: number;
    languageAllowance: number;
    odcAllowance: number;
    kpiAverage: number;
    actualWorkingDays: number;
    standardWorkingDays: number;
    otPay: number;
    bonus: number;
    totalGross: number;
    insuranceBase: number;
    bhxhEmployee: number;
    bhytEmployee: number;
    bhtnEmployee: number;
    dependentCount: number;
    taxableIncome: number;
    pit: number;
    netSalary: number;
    status: string;
}

// --- Reports ---
export interface LabourCostResponse {
    period: string;
    departmentId?: string;
    departmentName?: string;
    headcount: number;
    totalGross: number;
    totalNetSalary: number;
    totalEmployeeInsurance: number;
    totalEmployerInsurance: number;
    totalPit: number;
    totalOtPay: number;
    totalEmploymentCost: number;
    byEmployee: LabourCostItem[];
}

export interface LabourCostItem {
    employeeId: string;
    employeeName: string;
    totalGross: number;
    netSalary: number;
    totalEmployeeInsurance: number;
    totalEmployerInsurance: number;
    pit: number;
    otPay: number;
    totalEmploymentCost: number;
}

export interface InsuranceRemittanceResponse {
    period: string;
    headcount: number;
    totalEmployeeInsurance: number;
    totalEmployerInsurance: number;
    grandTotal: number;
    items: InsuranceRemittanceItem[];
}

export interface InsuranceRemittanceItem {
    employeeId: string;
    employeeName: string;
    socialInsuranceCode?: string;
    insuranceBase: number;
    bhxhEmployee: number;
    bhytEmployee: number;
    bhtnEmployee: number;
    totalEmployeeInsurance: number;
    bhxhEmployer: number;
    bhytEmployer: number;
    bhtnEmployer: number;
    workplaceAccidentInsurance: number;
    totalEmployerInsurance: number;
}

export interface PitSummaryResponse {
    period: string;
    totalPit: number;
    items: PitSummaryItem[];
}

export interface PitSummaryItem {
    employeeId: string;
    employeeName: string;
    taxCode?: string;
    dependentCount: number;
    taxableIncome: number;
    pit: number;
}

// --- Notification ---
export interface Notification {
    notificationId: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
}

// --- System Config ---
export type ConfigType = 'SALARY_GRADE' | 'ALLOWANCE' | 'PIT' | 'INSURANCE';

export interface SystemConfig {
    id: string;
    configType: ConfigType;
    version: string;
    effectiveDate: string | null;
    legalBasis: string | null;
    configData: Record<string, unknown>;
    active: boolean;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface SystemConfigCreateRequest {
    configType: ConfigType;
    version: string;
    effectiveDate?: string;
    legalBasis?: string;
    configData: Record<string, unknown>;
}

// --- Payroll Config (typed, effective-dated) ---
export type ConfigStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED';

interface ConfigMeta {
    id: string;
    effectiveFrom: string;
    status: ConfigStatus;
    legalBasis?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

// SALARY_GRADE
export interface SalaryGradeItem {
    gradeCode: string;
    title?: string | null;
    track?: string | null;
    steps: number[]; // thousand VND, ordered step 1..N
}
export interface SalaryGradeConfig extends ConfigMeta {
    unit?: string | null;
    minimumWageRegionI?: number | null;
    grades: SalaryGradeItem[];
}
export interface SalaryGradeConfigRequest {
    effectiveFrom: string;
    legalBasis?: string;
    unit?: string;
    minimumWageRegionI?: number | null;
    grades: SalaryGradeItem[];
}

// PIT
export interface PitBracketItem {
    seq?: number;
    incomeFrom: number;
    incomeTo: number | null; // null = open-ended top bracket
    rate: number;            // fraction, e.g. 0.05
    quickDeduction: number;
}
export interface PitConfig extends ConfigMeta {
    resolution?: string | null;
    personalRelief: number;
    dependentRelief: number;
    brackets: PitBracketItem[];
}
export interface PitConfigRequest {
    effectiveFrom: string;
    legalBasis?: string;
    resolution?: string;
    personalRelief: number;
    dependentRelief: number;
    brackets: PitBracketItem[];
}

// INSURANCE
export interface InsuranceConfig extends ConfigMeta {
    governmentBaseSalary?: number | null;
    insuranceCeiling?: number | null;
    statutoryMinWage?: number | null;
    eeBhxh: number; eeBhyt: number; eeBhtn: number;
    erBhxhPension: number; erBhxhSicknessMaternity: number; erBhxhAccident: number;
    erBhyt: number; erBhtn: number;
    probationExempt: boolean;
    eligibleContractTypes: string[];
}
export interface InsuranceConfigRequest {
    effectiveFrom: string;
    legalBasis?: string;
    governmentBaseSalary?: number | null;
    insuranceCeiling?: number | null;
    statutoryMinWage?: number | null;
    eeBhxh: number; eeBhyt: number; eeBhtn: number;
    erBhxhPension: number; erBhxhSicknessMaternity: number; erBhxhAccident: number;
    erBhyt: number; erBhtn: number;
    probationExempt: boolean;
    eligibleContractTypes: string[];
}

// ALLOWANCE
export interface AllowanceLivingLevel {
    levelKey: string;
    meal: number; phone: number; transport: number; housing: number;
}
export interface AllowanceJpLevel { jlptLevel: string; amount: number; }
export interface AllowanceConfig extends ConfigMeta {
    livingProrated: boolean;
    japaneseProrated: boolean;
    japaneseMinContractMonths?: number | null;
    levels: AllowanceLivingLevel[];
    japaneseLevels: AllowanceJpLevel[];
    livingEligibleContracts: string[];
    japaneseEligibleContracts: string[];
    japaneseExcludedPositions: string[];
    japaneseExcludedLevels: string[];
}
export interface AllowanceConfigRequest {
    effectiveFrom: string;
    legalBasis?: string;
    livingProrated: boolean;
    japaneseProrated: boolean;
    japaneseMinContractMonths?: number | null;
    levels: AllowanceLivingLevel[];
    japaneseLevels: AllowanceJpLevel[];
    livingEligibleContracts: string[];
    japaneseEligibleContracts: string[];
    japaneseExcludedPositions: string[];
    japaneseExcludedLevels: string[];
}

// --- Checkin Log ---
export interface CheckinLog {
    logId: string;
    employeeId: string;
    employeeName: string;
    deviceId: string;
    deviceName?: string;
    logTime: string;
    logType: 'IN' | 'OUT';
}

// --- WorkDay & Timesheet ---
export interface WorkDay {
    id: string;
    employeeId: string;
    employeeName: string;
    workDate: string;            // yyyy-MM-dd
    type: string;                // PRESENT | LEAVE | HOLIDAY | ABSENT | HOLIDAY_WORK
    source: string;              // CHECKIN | LEAVE_REQUEST | PUBLIC_HOLIDAY | MANUAL | SYSTEM | CONFLICT
    leaveType?: string;
    checkIn?: string;
    checkOut?: string;
    lateHour?: number;
    workingHour?: number;
    otMinutes?: number;
    paidDay?: number;
    workingDay?: number;
    violation: boolean;
    locked: boolean;
}

export interface Timesheet {
    id: string;
    employeeId: string;
    employeeName: string;
    departmentId?: string;
    year: number;
    month: number;
    standardWorkingDays: number;
    actualWorkingDays: number;
    otHours: number;
    holidayLeaveDays: number;
    annualLeaveDays: number;
    compLeaveDays: number;
    bereavementMarriageDays: number;
    insuranceLeaveDays: number;
    unpaidLeaveDays: number;
    oldRatePaidDays: number;
    newRatePaidDays: number;
    totalPaidDays: number;
    carryOverPrevMonth: number;
    businessGoOutDays: number;
    wfhDays: number;
    unexplainedAbsenceDays: number;
    lateEarlyTotalHours: number;
    violationToComp: number;
    violationToLeave: number;
    violationToUnpaid: number;
    unnotifiedAbsenceCount: number;
    under8hCount: number;
    attendanceRequestErrors: number;
    kpi2Deduction: number;
    kpi2Index: number;
    prevMonthViolationAdjust: number;
    notes?: string;
}

// --- Attendance Adjustment (Bổ sung chấm công) ---
export interface AttendanceAdjustment {
    id: string;
    employeeId: string;
    employeeName: string;
    workDate: string;            // yyyy-MM-dd
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason: string;
    status: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AttendanceAdjustmentCreate {
    employeeId?: string;         // server derives identity from JWT; client value is ignored
    workDate: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason: string;
}

// --- Device ---
export interface Device {
    deviceId: string;
    deviceName: string;
    location: string;
    active: boolean;
    createdAt: string;
    apiKeyActive?: boolean;
}

export interface DeviceCreateRequest {
    deviceName: string;
    location: string;
}

export interface ApiKeyCreateResponse {
    keyId: string;
    rawKey: string;
    createdAt: string;
}

// --- Enums ---
export type Role = 'EMPLOYEE' | 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'LEADER' | 'MANAGER' | 'FINANCE_ADMIN' | 'DIRECTOR';
export type RequestStatus = 'DRAFT' | 'TO_APPROVE' | 'LEADER_APPROVED' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type PayrollStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID';
export type LeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATERNITY' | 'BEREAVEMENT' | 'MARRIAGE' | 'UNPAID' | 'PUBLIC_HOLIDAY' | 'COMPENSATORY';
