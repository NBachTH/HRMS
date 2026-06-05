package org.dummy.facez.domain.attendance.service;

import lombok.RequiredArgsConstructor;
import org.dummy.facez.common.exception.ResourceNotFoundException;
import org.dummy.facez.domain.attendance.dto.PublicHolidayRequest;
import org.dummy.facez.domain.attendance.dto.PublicHolidayResponse;
import org.dummy.facez.domain.attendance.model.PublicHoliday;
import org.dummy.facez.domain.attendance.repository.PublicHolidayRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicHolidayService {

    private final PublicHolidayRepository publicHolidayRepository;

    public List<PublicHolidayResponse> getByYear(int year) {
        return publicHolidayRepository.findByHolidayYear(year)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PublicHolidayResponse create(PublicHolidayRequest req) {
        PublicHoliday holiday = PublicHoliday.builder()
                .id(UUID.randomUUID().toString())
                .holidayYear(req.getHolidayDate().getYear())
                .holidayDate(req.getHolidayDate())
                .name(req.getName())
                .compensatoryDay(req.isCompensatoryDay())
                .build();
        publicHolidayRepository.save(holiday);
        return toResponse(holiday);
    }

    @Transactional
    public void delete(String id) {
        PublicHoliday holiday = publicHolidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PublicHoliday", "id", id));
        publicHolidayRepository.delete(holiday);
    }

    private PublicHolidayResponse toResponse(PublicHoliday h) {
        return PublicHolidayResponse.builder()
                .id(h.getId())
                .holidayYear(h.getHolidayYear())
                .holidayDate(h.getHolidayDate())
                .name(h.getName())
                .compensatoryDay(h.isCompensatoryDay())
                .build();
    }
}
