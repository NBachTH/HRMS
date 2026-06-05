package org.dummy.facez.domain.contract.service;

import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.common.response.PageResponse;
import org.dummy.facez.domain.contract.repository.ContractRepository;
import org.dummy.facez.domain.contract.model.Contract;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.contract.dto.ContractRequest;
import org.dummy.facez.domain.contract.dto.ContractResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ContractService {

    private final ContractRepository contractRepository;

    public ContractService(ContractRepository contractRepository) {
        this.contractRepository = contractRepository;
    }

    @Transactional
    public ContractResponse createContract(ContractRequest req) {
        LocalDate today = LocalDate.now();
        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(req.getEmployeeId());

        Contract contract = Contract.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .contractType(req.getContractType())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .effectiveFrom(req.getEffectiveFrom() != null ? req.getEffectiveFrom() : today)
                .effectiveTo(null)
                .current(true)
                .terms(req.getTerms())
                .salaryRank(req.getSalaryRank())
                .status(req.getStatus() != null ? req.getStatus() : "ACTIVE")
                .baseSalary(req.getBaseSalary())
                .insuranceBase(req.getInsuranceBase())
                .positionCode(req.getPositionCode())
                .salaryStep(req.getSalaryStep())
                .dependentCount(req.getDependentCount() != null ? req.getDependentCount() : 0)
                .deleteFlag(false)
                .build();

        contractRepository.save(contract);
        return toResponse(contract);
    }

    public PageResponse<ContractResponse> getAllContracts(Pageable pageable) {
        return PageResponse.from(contractRepository.findByDeleteFlagFalse(pageable).map(this::toResponse));
    }

    public ContractResponse getContractById(String id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        return toResponse(contract);
    }

    public ContractResponse getContractByEmployeeId(String employeeId) {
        Contract contract = contractRepository.findContractByEmployeeInfo_EmployeeId(employeeId);
        if (contract == null) throw new ResourceNotFoundException("Contract", "employeeId", employeeId);
        return toResponse(contract);
    }

    public List<ContractResponse> getContractHistoryByEmployee(String employeeId) {
        return contractRepository.findByEmployeeInfo_EmployeeIdAndDeleteFlagFalseOrderByEffectiveFromDesc(employeeId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * Phase 5.2: Updating a contract creates a new history record.
     * The existing current record is superseded (effectiveTo = today, current = false).
     */
    @Transactional
    public ContractResponse updateContract(String id, ContractRequest req) {
        Contract existing = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));

        LocalDate today = LocalDate.now();

        // Supersede the existing record
        existing.setEffectiveTo(today);
        existing.setCurrent(false);
        existing.setUpdatedAt(LocalDateTime.now());
        contractRepository.save(existing);

        // Create a new record
        Contract newContract = Contract.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(existing.getEmployeeInfo())
                .contractType(req.getContractType() != null ? req.getContractType() : existing.getContractType())
                .startDate(req.getStartDate() != null ? req.getStartDate() : existing.getStartDate())
                .endDate(req.getEndDate() != null ? req.getEndDate() : existing.getEndDate())
                .effectiveFrom(req.getEffectiveFrom() != null ? req.getEffectiveFrom() : today)
                .effectiveTo(null)
                .current(true)
                .terms(req.getTerms() != null ? req.getTerms() : existing.getTerms())
                .salaryRank(req.getSalaryRank() != null ? req.getSalaryRank() : existing.getSalaryRank())
                .status(req.getStatus() != null ? req.getStatus() : existing.getStatus())
                .baseSalary(req.getBaseSalary() != null ? req.getBaseSalary() : existing.getBaseSalary())
                .insuranceBase(req.getInsuranceBase() != null ? req.getInsuranceBase() : existing.getInsuranceBase())
                .positionCode(req.getPositionCode() != null ? req.getPositionCode() : existing.getPositionCode())
                .salaryStep(req.getSalaryStep() != null ? req.getSalaryStep() : existing.getSalaryStep())
                .dependentCount(req.getDependentCount() != null ? req.getDependentCount() : existing.getDependentCount())
                .deleteFlag(false)
                .build();

        contractRepository.save(newContract);
        return toResponse(newContract);
    }

    @Transactional
    public void deleteContract(String id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        contract.setDeleteFlag(true);
        contractRepository.save(contract);
    }

    public List<ContractResponse> getExpiringSoon(int withinDays) {
        LocalDate today = LocalDate.now();
        LocalDate warningDate = today.plusDays(withinDays);
        return contractRepository.findByCurrentTrueAndEndDateBetween(today, warningDate)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private ContractResponse toResponse(Contract c) {
        ContractResponse.ContractResponseBuilder builder = ContractResponse.builder()
                .id(c.getId())
                .contractType(c.getContractType())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .effectiveFrom(c.getEffectiveFrom())
                .effectiveTo(c.getEffectiveTo())
                .current(c.isCurrent())
                .terms(c.getTerms())
                .salaryRank(c.getSalaryRank())
                .status(c.getStatus())
                .baseSalary(c.getBaseSalary())
                .insuranceBase(c.getInsuranceBase())
                .positionCode(c.getPositionCode())
                .salaryStep(c.getSalaryStep())
                .dependentCount(c.getDependentCount())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt());

        if (c.getEmployeeInfo() != null) {
            builder.employeeId(c.getEmployeeInfo().getEmployeeId())
                    .employeeName(c.getEmployeeInfo().getName());
        }
        return builder.build();
    }
}
