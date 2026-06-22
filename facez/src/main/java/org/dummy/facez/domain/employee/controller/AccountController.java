package org.dummy.facez.domain.employee.controller;

import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.employee.dto.AccountResponse;
import org.dummy.facez.domain.employee.service.AccountService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@PreAuthorize("hasAuthority('SYSTEM_ADMIN')")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AccountResponse>>> getAll(
            @PageableDefault(size = 20, sort = "username", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(accountService.getAll(pageable)));
    }

    @PatchMapping("/{employeeId}/toggle")
    public ResponseEntity<ApiResponse<AccountResponse>> toggle(@PathVariable String employeeId) {
        AccountResponse res = accountService.toggle(employeeId);
        return ResponseEntity.ok(ApiResponse.ok(res, res.isEnabled() ? "Account enabled" : "Account disabled"));
    }

    @PatchMapping("/{employeeId}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@PathVariable String employeeId) {
        accountService.resetPassword(employeeId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Password reset to the system default."));
    }
}
