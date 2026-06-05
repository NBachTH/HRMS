package org.dummy.facez.domain.employee.service;

import lombok.RequiredArgsConstructor;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.employee.dto.TaxDependentRequest;
import org.dummy.facez.domain.employee.dto.TaxDependentResponse;
import org.dummy.facez.domain.employee.model.EmployeeInfo;
import org.dummy.facez.domain.employee.model.TaxDependent;
import org.dummy.facez.domain.employee.repository.EmployeeInfoRepository;
import org.dummy.facez.domain.employee.repository.TaxDependentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaxDependentService {

    private final TaxDependentRepository taxDependentRepository;
    private final EmployeeInfoRepository employeeInfoRepository;

    public List<TaxDependentResponse> getByEmployee(String employeeId) {
        return taxDependentRepository.findByEmployeeInfo_EmployeeId(employeeId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TaxDependentResponse create(TaxDependentRequest req) {
        EmployeeInfo emp = employeeInfoRepository.findById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", "id", req.getEmployeeId()));

        TaxDependent dep = TaxDependent.builder()
                .id(UUID.randomUUID().toString())
                .employeeInfo(emp)
                .fullName(req.getFullName())
                .nationalId(req.getNationalId())
                .dateOfBirth(req.getDateOfBirth())
                .relationship(req.getRelationship())
                .registrationDate(req.getRegistrationDate())
                .active(req.isActive())
                .build();

        taxDependentRepository.save(dep);
        return toResponse(dep);
    }

    @Transactional
    public TaxDependentResponse update(String id, TaxDependentRequest req) {
        TaxDependent dep = taxDependentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TaxDependent", "id", id));
        if (req.getFullName() != null)         dep.setFullName(req.getFullName());
        if (req.getNationalId() != null)       dep.setNationalId(req.getNationalId());
        if (req.getDateOfBirth() != null)      dep.setDateOfBirth(req.getDateOfBirth());
        if (req.getRelationship() != null)     dep.setRelationship(req.getRelationship());
        if (req.getRegistrationDate() != null) dep.setRegistrationDate(req.getRegistrationDate());
        dep.setActive(req.isActive());
        taxDependentRepository.save(dep);
        return toResponse(dep);
    }

    @Transactional
    public void delete(String id) {
        TaxDependent dep = taxDependentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TaxDependent", "id", id));
        dep.setActive(false);
        taxDependentRepository.save(dep);
    }

    private TaxDependentResponse toResponse(TaxDependent d) {
        return TaxDependentResponse.builder()
                .id(d.getId())
                .employeeId(d.getEmployeeInfo().getEmployeeId())
                .fullName(d.getFullName())
                .nationalId(d.getNationalId())
                .dateOfBirth(d.getDateOfBirth())
                .relationship(d.getRelationship())
                .registrationDate(d.getRegistrationDate())
                .active(d.isActive())
                .build();
    }
}
