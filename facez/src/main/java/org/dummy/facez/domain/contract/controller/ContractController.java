package org.dummy.facez.domain.contract.controller;

import jakarta.validation.Valid;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.contract.dto.ContractRequest;
import org.dummy.facez.domain.contract.dto.ContractResponse;
import org.dummy.facez.domain.contract.service.ContractService;
import org.dummy.facez.domain.employee.service.EmployeeService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractService contractService;
    private final EmployeeService employeeService;

    public ContractController(ContractService contractService, EmployeeService employeeService) {
        this.contractService = contractService;
        this.employeeService = employeeService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<ContractResponse>> create(@Valid @RequestBody ContractRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contractService.createContract(req), "Contract created"));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ContractResponse>>> getAll(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getAllContracts(pageable)));
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ContractResponse>> getMy(Authentication authentication) {
        String username   = ((UserDetails) authentication.getPrincipal()).getUsername();
        String employeeId = employeeService.getEmployeeIdByUsername(username);
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractByEmployeeId(employeeId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<ContractResponse>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractById(id)));
    }

    @GetMapping("/employee/{employeeId}/history")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getHistory(@PathVariable String employeeId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getContractHistoryByEmployee(employeeId)));
    }

    @GetMapping("/expiring-soon")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<ContractResponse>>> getExpiringSoon(
            @RequestParam(defaultValue = "30") int withinDays) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getExpiringSoon(withinDays)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<ContractResponse>> update(
            @PathVariable String id, @Valid @RequestBody ContractRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.updateContract(id, req), "Contract updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        contractService.deleteContract(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Contract deleted"));
    }

    /** DIRECTOR approves a pending contract → it becomes effective (current=true). */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<ContractResponse>> approve(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.approveContract(id), "Contract approved"));
    }

    /** DIRECTOR rejects a pending contract. */
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('DIRECTOR','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<ContractResponse>> reject(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.rejectContract(id), "Contract rejected"));
    }

    /** Upload (or replace) the contract document (PDF) into MinIO. */
    @PostMapping(value = "/{id}/document", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<ContractResponse>> uploadDocument(
            @PathVariable String id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok(
                contractService.uploadDocument(id, file), "Document uploaded"));
    }

    /** Returns a short-lived presigned URL to view the contract document. */
    @GetMapping("/{id}/document-url")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> getDocumentUrl(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", contractService.getDocumentUrl(id))));
    }
}
