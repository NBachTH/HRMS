package org.dummy.facez.domain.attendance.controller;

import jakarta.validation.Valid;
import org.dummy.facez.domain.attendance.dto.BatchCheckinResponse;
import org.dummy.facez.domain.attendance.dto.CheckinLogRequest;
import org.dummy.facez.domain.attendance.dto.CheckinLogResponse;
import org.dummy.facez.domain.attendance.service.CheckinLogService;
import org.dummy.facez.common.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/checkin-logs")
public class CheckinLogController {

    private final CheckinLogService checkinLogService;

    public CheckinLogController(CheckinLogService checkinLogService) {
        this.checkinLogService = checkinLogService;
    }

    /**
     * Real-time endpoint — called by a check-in device immediately when an employee taps in/out.
     * Saves the log and updates the Attendance record in a single transaction.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CheckinLogResponse>> realTime(
            @Valid @RequestBody CheckinLogRequest req) {
        CheckinLogResponse response = checkinLogService.processRealTime(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Check-in log processed"));
    }

    /**
     * Batch endpoint — called when an offline device reconnects and uploads accumulated logs.
     * Each log is processed independently; partial failures are reported in the response.
     */
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<BatchCheckinResponse>> batch(
            @Valid @RequestBody List<CheckinLogRequest> requests) {
        BatchCheckinResponse response = checkinLogService.processBatch(requests);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response,
                        "Batch processed: " + response.getSuccess() + "/" + response.getTotal() + " succeeded"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CheckinLogResponse>>> getAllByDate(@RequestParam(name = "date") LocalDate date) {
        List<CheckinLogResponse> responses = checkinLogService.findByCheckinDateWithEmployee(date);
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }
}
