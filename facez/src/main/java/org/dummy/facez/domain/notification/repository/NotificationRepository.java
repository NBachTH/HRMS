package org.dummy.facez.domain.notification.repository;

import org.dummy.facez.domain.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, String> {

    Page<Notification> findByRecipient_EmployeeIdOrderByCreatedAtDesc(String employeeId, Pageable pageable);

    long countByRecipient_EmployeeIdAndReadFalse(String employeeId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.employeeId = :employeeId AND n.read = false")
    int markAllReadByEmployee(@Param("employeeId") String employeeId);
}
