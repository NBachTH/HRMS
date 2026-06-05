package org.dummy.facez.domain.attendance.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dummy.facez.common.response.ApiResponse;
import org.dummy.facez.domain.attendance.dto.PublicHolidayRequest;
import org.dummy.facez.domain.attendance.dto.PublicHolidayResponse;
import org.dummy.facez.domain.attendance.service.PublicHolidayService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public-holidays")
@RequiredArgsConstructor
public class PublicHolidayController {

    private final PublicHolidayService publicHolidayService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<List<PublicHolidayResponse>>> getByYear(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        return ResponseEntity.ok(ApiResponse.ok(publicHolidayService.getByYear(year)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<PublicHolidayResponse>> create(@Valid @RequestBody PublicHolidayRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(publicHolidayService.create(req), "Public holiday created"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_ADMIN','FINANCE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        publicHolidayService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Public holiday deleted"));
    }
}
