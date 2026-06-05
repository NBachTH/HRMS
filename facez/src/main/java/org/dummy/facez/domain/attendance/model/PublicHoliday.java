package org.dummy.facez.domain.attendance.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "public_holiday")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicHoliday {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false)
    private int holidayYear;

    @Column(nullable = false)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false)
    private boolean compensatoryDay = false;
}
