package org.dummy.facez.domain.attendance.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BatchCheckinResponse {
    private int total;
    private int success;
    private int failed;
    private List<BatchCheckinItem> results;

    @Data
    @Builder
    public static class BatchCheckinItem {
        private int index;
        private boolean success;
        private String errorMessage;
        private CheckinLogResponse data;
    }
}
