package org.dummy.facez.domain.attendance.repository;

import org.dummy.facez.domain.attendance.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeviceRepository extends JpaRepository<Device, String> {

    List<Device> findByDeleteFlagFalseOrderByCreatedAtDesc();
}
