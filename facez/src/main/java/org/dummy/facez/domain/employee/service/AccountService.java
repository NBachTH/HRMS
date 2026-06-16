package org.dummy.facez.domain.employee.service;

import org.dummy.facez.common.enums.Role;
import org.dummy.facez.common.exception.BadRequestException;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.dto.AccountResponse;
import org.dummy.facez.domain.employee.model.UserAccount;
import org.dummy.facez.domain.employee.repository.UserAccountRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** SYSTEM_ADMIN account management: list, enable/disable, reset password. */
@Service
public class AccountService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public PageResponse<AccountResponse> getAll(Pageable pageable) {
        return PageResponse.from(userAccountRepository.findAll(pageable).map(this::toResponse));
    }

    @Transactional
    public AccountResponse toggle(String employeeId) {
        UserAccount u = findById(employeeId);
        if (u.getRole() == Role.SYSTEM_ADMIN) {
            throw new BadRequestException("Cannot disable a system administrator account.");
        }
        u.setDeleteFlag(!u.isDeleteFlag());
        userAccountRepository.save(u);
        return toResponse(u);
    }

    @Transactional
    public void resetPassword(String employeeId) {
        UserAccount u = findById(employeeId);
        u.setPasswordHash(passwordEncoder.encode(EmployeeService.DEFAULT_PASSWORD));
        userAccountRepository.save(u);
    }

    private UserAccount findById(String employeeId) {
        return userAccountRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAccount", "employeeId", employeeId));
    }

    private AccountResponse toResponse(UserAccount u) {
        return AccountResponse.builder()
                .employeeId(u.getEmployeeId())
                .username(u.getUsername())
                .role(u.getRole() != null ? u.getRole().name() : null)
                .employeeName(u.getEmployeeInfo() != null ? u.getEmployeeInfo().getName() : null)
                .departmentName(u.getEmployeeInfo() != null && u.getEmployeeInfo().getDepartment() != null
                        ? u.getEmployeeInfo().getDepartment().getDepartmentName() : null)
                .enabled(!u.isDeleteFlag())
                .build();
    }
}
