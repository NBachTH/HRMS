package org.dummy.facez.domain.employee.service;

import org.dummy.facez.common.enums.EmployeeStatus;
import org.dummy.facez.common.enums.Gender;
import org.dummy.facez.common.enums.Role;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.department.repository.DepartmentRepository;
import org.dummy.facez.domain.employee.repository.UserAccountRepository;
import org.dummy.facez.domain.department.model.Department;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.employee.dto.EmployeeCreateRequest;
import org.dummy.facez.domain.employee.dto.EmployeeResponse;
import org.dummy.facez.domain.employee.dto.EmployeeUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class EmployeeService {

    private final UserAccountRepository userAccountRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(UserAccountRepository userAccountRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public EmployeeResponse createEmployee(EmployeeCreateRequest req) {
        // check username uniqueness
        if (userAccountRepository.existsUserAccountByUsername(req.getUsername())) {
            throw new BadRequestException("Username already exists: " + req.getUsername());
        }

        // resolve department
        Department department = null;
        if (req.getDepartmentId() != null && !req.getDepartmentId().isBlank()) {
            department = departmentRepository.findById(req.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", "id", req.getDepartmentId()));
        }

        Role role;
        try {
            role = Role.valueOf(req.getRole());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + req.getRole());
        }

        Gender gender = null;
        if (req.getGender() != null && !req.getGender().isBlank()) {
            try { gender = Gender.valueOf(req.getGender().toUpperCase()); }
            catch (IllegalArgumentException ignored) {}
        }

        // create EmployeeInfo
        EmployeeInfo employeeInfo = EmployeeInfo.builder()
                .employeeId(req.getEmployeeId())
                .name(req.getName())
                .role(role)
                .email(req.getEmail())
                .phoneNumber(req.getPhoneNumber())
                .address(req.getAddress())
                .dateOfJoining(req.getDateOfJoining())
                .emergencyContact(req.getEmergencyContact())
                .department(department)
                .status(EmployeeStatus.ACTIVE)
                .nationalId(req.getNationalId())
                .nationalIdIssueDate(req.getNationalIdIssueDate())
                .nationalIdIssuePlace(req.getNationalIdIssuePlace())
                .taxCode(req.getTaxCode())
                .socialInsuranceCode(req.getSocialInsuranceCode())
                .bankAccountNumber(req.getBankAccountNumber())
                .bankName(req.getBankName())
                .bankBranch(req.getBankBranch())
                .dateOfBirth(req.getDateOfBirth())
                .gender(gender)
                .hometown(req.getHometown())
                .build();

        // create UserAccount
        UserAccount userAccount = UserAccount.builder()
                .employeeId(req.getEmployeeId())
                .username(req.getUsername())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(role)
                .employeeInfo(employeeInfo)
                .build();

        userAccountRepository.save(userAccount);

        return toResponse(userAccount);
    }

    public PageResponse<EmployeeResponse> getAllEmployees(String departmentId, Pageable pageable) {
        Page<UserAccount> page = (departmentId != null && !departmentId.isBlank())
                ? userAccountRepository.findByEmployeeInfo_Department_DepartmentId(departmentId, pageable)
                : userAccountRepository.findAll(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    public EmployeeResponse getEmployeeById(String employeeId) {
        UserAccount user = userAccountRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        return toResponse(user);
    }

    @Transactional
    public EmployeeResponse updateEmployee(String employeeId, EmployeeUpdateRequest req) {
        UserAccount user = userAccountRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));

        EmployeeInfo info = user.getEmployeeInfo();
        if (info == null) {
            throw new ResourceNotFoundException("EmployeeInfo", "employeeId", employeeId);
        }

        if (req.getName() != null)
            info.setName(req.getName());
        if (req.getEmail() != null)
            info.setEmail(req.getEmail());
        if (req.getPhoneNumber() != null)
            info.setPhoneNumber(req.getPhoneNumber());
        if (req.getAddress() != null)
            info.setAddress(req.getAddress());
        if (req.getDateOfJoining() != null)
            info.setDateOfJoining(req.getDateOfJoining());
        if (req.getEmergencyContact() != null)
            info.setEmergencyContact(req.getEmergencyContact());
        if (req.getStatus() != null) {
            try {
                info.setStatus(EmployeeStatus.valueOf(req.getStatus()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status: " + req.getStatus());
            }
        }
        if (req.getRole() != null) {
            try {
                Role role = Role.valueOf(req.getRole());
                info.setRole(role);
                user.setRole(role);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role: " + req.getRole());
            }
        }
        if (req.getDepartmentId() != null) {
            if (req.getDepartmentId().isBlank()) {
                info.setDepartment(null);
            } else {
                Department dept = departmentRepository.findById(req.getDepartmentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Department", "id", req.getDepartmentId()));
                info.setDepartment(dept);
            }
        }
        if (req.getNationalId() != null)           info.setNationalId(req.getNationalId());
        if (req.getNationalIdIssueDate() != null)  info.setNationalIdIssueDate(req.getNationalIdIssueDate());
        if (req.getNationalIdIssuePlace() != null) info.setNationalIdIssuePlace(req.getNationalIdIssuePlace());
        if (req.getTaxCode() != null)              info.setTaxCode(req.getTaxCode());
        if (req.getSocialInsuranceCode() != null)  info.setSocialInsuranceCode(req.getSocialInsuranceCode());
        if (req.getBankAccountNumber() != null)    info.setBankAccountNumber(req.getBankAccountNumber());
        if (req.getBankName() != null)             info.setBankName(req.getBankName());
        if (req.getBankBranch() != null)           info.setBankBranch(req.getBankBranch());
        if (req.getDateOfBirth() != null)          info.setDateOfBirth(req.getDateOfBirth());
        if (req.getGender() != null && !req.getGender().isBlank()) {
            try { info.setGender(Gender.valueOf(req.getGender().toUpperCase())); }
            catch (IllegalArgumentException ignored) {}
        }
        if (req.getHometown() != null) info.setHometown(req.getHometown());

        user.setUpdatedAt(LocalDateTime.now());
        userAccountRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public void deleteEmployee(String employeeId) {
        UserAccount user = userAccountRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", employeeId));
        // Soft delete
        EmployeeInfo info = user.getEmployeeInfo();
        if (info != null) {
            info.setDeleteFlag(true);
            info.setStatus(EmployeeStatus.TERMINATED);
        }
        userAccountRepository.save(user);
    }

    public String getEmployeeIdByUsername(String username) {
        UserAccount user = userAccountRepository.findUserAccountByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "username", username));
        return user.getEmployeeId();
    }

    private EmployeeResponse toResponse(UserAccount user) {
        EmployeeInfo info = user.getEmployeeInfo();
        EmployeeResponse.EmployeeResponseBuilder builder = EmployeeResponse.builder()
                .employeeId(user.getEmployeeId())
                .username(user.getUsername())
                .role(user.getRole() != null ? user.getRole().name() : null);

        if (info != null) {
            builder
                    .name(info.getName())
                    .email(info.getEmail())
                    .phoneNumber(info.getPhoneNumber())
                    .address(info.getAddress())
                    .dateOfJoining(info.getDateOfJoining())
                    .emergencyContact(info.getEmergencyContact())
                    .status(info.getStatus() != null ? info.getStatus().name() : null)
                    .nationalId(info.getNationalId())
                    .nationalIdIssueDate(info.getNationalIdIssueDate())
                    .nationalIdIssuePlace(info.getNationalIdIssuePlace())
                    .taxCode(info.getTaxCode())
                    .socialInsuranceCode(info.getSocialInsuranceCode())
                    .bankAccountNumber(info.getBankAccountNumber())
                    .bankName(info.getBankName())
                    .bankBranch(info.getBankBranch())
                    .dateOfBirth(info.getDateOfBirth())
                    .gender(info.getGender() != null ? info.getGender().name() : null)
                    .hometown(info.getHometown())
                    .profilePictureUrl(info.getProfilePictureUrl());
            if (info.getDepartment() != null) {
                builder.departmentId(info.getDepartment().getDepartmentId())
                        .departmentName(info.getDepartment().getDepartmentName());
            }
        }
        return builder.build();
    }
}
