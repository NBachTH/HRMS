-- Phase 6.1: OT monthly summary view for limit query performance
CREATE OR REPLACE VIEW ot_monthly_summary AS
SELECT
    ot.employee_id,
    EXTRACT(YEAR  FROM ot.start_time)::INTEGER AS ot_year,
    EXTRACT(MONTH FROM ot.start_time)::INTEGER AS ot_month,
    SUM(EXTRACT(EPOCH FROM (ot.end_time - ot.start_time)) / 60) AS approved_minutes
FROM ot_request ot
WHERE ot.status = 'APPROVED'
  AND ot.delete_flag = false
GROUP BY ot.employee_id, ot_year, ot_month;
