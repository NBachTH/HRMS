package org.dummy.facez.domain.employee.repository;

import org.dummy.facez.domain.employee.model.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, String> {
    Optional<UserAccount> findUserAccountByUsername(String username);
    boolean existsUserAccountByUsername(String username);

    Page<UserAccount> findByEmployeeInfo_Department_DepartmentId(String departmentId, Pageable pageable);
}
