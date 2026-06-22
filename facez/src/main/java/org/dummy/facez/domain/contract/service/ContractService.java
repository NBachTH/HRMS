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

    /** Contract lifecycle (stored in Contract.status). */
    public static final String PENDING = "PENDING_APPROVAL";
    public static final String ACTIVE  = "ACTIVE";
    public static final String REJECTED = "REJECTED";
    public static final String EXPIRED  = "EXPIRED";

    private final ContractRepository contractRepository;
    private final org.dummy.facez.common.storage.StorageService storageService;
    private final org.dummy.facez.domain.employee.repository.TaxDependentRepository taxDependentRepository;

    public ContractService(ContractRepository contractRepository,
                           org.dummy.facez.common.storage.StorageService storageService,
                           org.dummy.facez.domain.employee.repository.TaxDependentRepository taxDependentRepository) {
        this.contractRepository = contractRepository;
        this.storageService = storageService;
        this.taxDependentRepository = taxDependentRepository;
    }

    /** Active tax-dependent count for an employee — the source of truth for a contract's dependentCount. */
    private int activeDependentCount(String employeeId) {
        return (int) taxDependentRepository.countByEmployeeInfo_EmployeeIdAndActiveTrue(employeeId);
    }

    /** Upload (replace) the contract document into MinIO and store its key. */
    @Transactional
    public ContractResponse uploadDocument(String id, org.springframework.web.multipart.MultipartFile file) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        String ct = file.getContentType();
        if (ct != null && !ct.equalsIgnoreCase("application/pdf")) {
            throw new org.dummy.facez.common.exception.BadRequestException("Only PDF files are allowed.");
        }
        if (contract.getDocumentKey() != null) {
            storageService.delete(contract.getDocumentKey());
        }
        String key = storageService.upload(file, "contracts/" + id);
        contract.setDocumentKey(key);
        contractRepository.save(contract);
        return toResponse(contract);
    }

    public String getDocumentUrl(String id) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        if (contract.getDocumentKey() == null) {
            throw new ResourceNotFoundException("Contract document", "contractId", id);
        }
        return storageService.presignedUrl(contract.getDocumentKey());
    }

    @Transactional
    public ContractResponse createContract(ContractRequest req) {
        LocalDate today = LocalDate.now();
        EmployeeInfo empRef = new EmployeeInfo();
        empRef.setEmployeeId(req.getEmployeeId());

        // New contracts are NOT effective until a DIRECTOR approves them (the contract's salary/
        // grade params drive payroll, so they need a second pair of eyes). current stays false.
        Contract contract = Contract.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(empRef)
                .contractType(req.getContractType())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .effectiveFrom(req.getEffectiveFrom() != null ? req.getEffectiveFrom() : today)
                .effectiveTo(null)
                .current(false)
                .terms(req.getTerms())
                .salaryRank(req.getSalaryRank())
                .status(PENDING)
                .baseSalary(req.getBaseSalary())
                .insuranceBase(req.getInsuranceBase())
                .positionCode(req.getPositionCode())
                .salaryStep(req.getSalaryStep())
                // dependentCount is derived from the employee's active tax dependents, not typed in.
                .dependentCount(activeDependentCount(req.getEmployeeId()))
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
        // Prefer the contract explicitly flagged current; otherwise fall back to the most
        // recent non-deleted contract (legacy/seeded rows may not have current=true set).
        Contract contract = contractRepository.findContractByEmployeeInfo_EmployeeId(employeeId);
        if (contract == null) {
            contract = contractRepository
                    .findByEmployeeInfo_EmployeeIdAndDeleteFlagFalseOrderByEffectiveFromDesc(employeeId)
                    .stream().findFirst().orElse(null);
        }
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
    /**
     * Editing produces a NEW pending version (current=false, PENDING_APPROVAL). The existing
     * contract stays active until a DIRECTOR approves the new one — at which point the old is
     * superseded. So a salary/grade change never takes effect without approval.
     */
    @Transactional
    public ContractResponse updateContract(String id, ContractRequest req) {
        Contract existing = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        String employeeId = existing.getEmployeeInfo().getEmployeeId();
        LocalDate today = LocalDate.now();

        Contract newContract = Contract.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(existing.getEmployeeInfo())
                .contractType(req.getContractType() != null ? req.getContractType() : existing.getContractType())
                .startDate(req.getStartDate() != null ? req.getStartDate() : existing.getStartDate())
                .endDate(req.getEndDate() != null ? req.getEndDate() : existing.getEndDate())
                .effectiveFrom(req.getEffectiveFrom() != null ? req.getEffectiveFrom() : today)
                .effectiveTo(null)
                .current(false)
                .terms(req.getTerms() != null ? req.getTerms() : existing.getTerms())
                .salaryRank(req.getSalaryRank() != null ? req.getSalaryRank() : existing.getSalaryRank())
                .status(PENDING)
                .baseSalary(req.getBaseSalary() != null ? req.getBaseSalary() : existing.getBaseSalary())
                .insuranceBase(req.getInsuranceBase() != null ? req.getInsuranceBase() : existing.getInsuranceBase())
                .positionCode(req.getPositionCode() != null ? req.getPositionCode() : existing.getPositionCode())
                .salaryStep(req.getSalaryStep() != null ? req.getSalaryStep() : existing.getSalaryStep())
                .dependentCount(activeDependentCount(employeeId))
                .deleteFlag(false)
                .build();

        contractRepository.save(newContract);
        return toResponse(newContract);
    }

    /** DIRECTOR approves a PENDING contract → it becomes the employee's ACTIVE/current one. */
    @Transactional
    public ContractResponse approveContract(String id) {
        Contract c = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        if (!PENDING.equals(c.getStatus())) {
            throw new org.dummy.facez.common.exception.BadRequestException(
                    "Chỉ duyệt được hợp đồng đang chờ duyệt (PENDING_APPROVAL).");
        }
        String employeeId = c.getEmployeeInfo().getEmployeeId();
        LocalDate today = LocalDate.now();

        // Supersede the employee's current contract, if any.
        contractRepository.findFirstByEmployeeInfo_EmployeeIdAndCurrentTrue(employeeId)
                .ifPresent(prev -> {
                    if (!prev.getId().equals(c.getId())) {
                        prev.setCurrent(false);
                        prev.setEffectiveTo(today);
                        prev.setStatus(EXPIRED);
                        contractRepository.save(prev);
                    }
                });

        c.setStatus(ACTIVE);
        c.setCurrent(true);
        contractRepository.save(c);
        return toResponse(c);
    }

    /** DIRECTOR rejects a PENDING contract → REJECTED, never effective. */
    @Transactional
    public ContractResponse rejectContract(String id) {
        Contract c = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", "id", id));
        if (!PENDING.equals(c.getStatus())) {
            throw new org.dummy.facez.common.exception.BadRequestException(
                    "Chỉ trả lại được hợp đồng đang chờ duyệt (PENDING_APPROVAL).");
        }
        c.setStatus(REJECTED);
        c.setCurrent(false);
        contractRepository.save(c);
        return toResponse(c);
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
                .hasDocument(c.getDocumentKey() != null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt());

        if (c.getEmployeeInfo() != null) {
            builder.employeeId(c.getEmployeeInfo().getEmployeeId())
                    .employeeName(c.getEmployeeInfo().getName());
        }
        return builder.build();
    }
}
