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
    employeeId: string;
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

// --- OT Request (master–detail, VMS-style) ---
export type OTCategory = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

/** Compensatory rate multiplier by OT category (Bộ Luật Lao Động 2019, Điều 98). */
export const OT_RATE_BY_CATEGORY: Record<OTCategory, number> = {
    WEEKDAY: 1.5,
    WEEKEND: 2.0,
    HOLIDAY: 3.0,
};

/** One OT line within a monthly OT registration. */
export interface OTRequestLine {
    id?: string;
    workDate: string;            // yyyy-MM-dd
    fromTime: string;            // HH:mm
    toTime: string;              // HH:mm
    otCategory: OTCategory;
    wfh: boolean;                // work-from-home / business-zone flag
    reason: string;
    registrationHours?: number;  // computed from from/to
    actualHours?: number;        // filled during approval
    paidHours?: number;          // filled during approval
    evidenceName?: string;       // front-end captured file name
}

export interface OTRequest {
    otRequestId: string;
    employeeId: string;
    employeeName: string;
    projectId?: string;
    projectName?: string;
    otMonth?: string;            // yyyy-MM
    startTime: string;           // kept for backward compatibility (first line)
    endTime: string;
    totalRegistrationHours?: number;
    totalActualHours?: number;
    totalPaidHours?: number;
    lines?: OTRequestLine[];
    status: string;
    createdAt: string;
    updatedAt: string;
}

/** Master–detail create payload: one registration → many OT lines. */
export interface OTRequestCreate {
    employeeId: string;
    projectId?: string;
    otMonth: string;             // yyyy-MM
    lines: OTRequestLine[];
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
    kpi1Rating?: 'A' | 'B' | 'C';
    kpi2Rating?: 'A' | 'B' | 'C' | null;
    standardWorkingDays?: number;
    bonus?: number;
    japaneseLevel?: 'N1' | 'N2' | null;
    odcAllowance?: number;
    notes?: string;
}

export interface PayrollBatchCalculateRequest {
    payrollYear: number;
    payrollMonth: number;
    standardWorkingDays?: number;
    kpi1Rating?: 'A' | 'B' | 'C';
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

// --- Checkin Log ---
export interface CheckinLog {
    id: string;
    employeeId: string;
    employeeName: string;
    deviceId: string;
    deviceName?: string;
    logTime: string;
    logType: 'IN' | 'OUT';
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
