package org.dummy.facez.domain.employee.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.dummy.facez.common.enums.EmployeeLevels;

import java.time.LocalDateTime;

@Entity
@Table(name = "benefit")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Benefit {
    @Id
    private String benefitRank;

    @Enumerated(EnumType.STRING)
    private EmployeeLevels employeeLevel;

    private String housingBenefit;

    private String mealBenefit;

    private String vehicleBenefit;

    private String phoneBenefit;

    private boolean deleteFlag = false;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

}
