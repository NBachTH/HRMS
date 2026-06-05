package org.dummy.facez.domain.department.repository;

import org.dummy.facez.domain.department.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, String> {
}
