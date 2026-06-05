# 1. Attendance
 - is a record of a day's attendance information of an employee
 - employee view personal attendance by month
 - attendance is calculated at 0h by schedule job
 - attendance can be updated, deleted by sys_admin
 - can view each day's checkinLog.

## Attendance API Endpoints

Base path: `/api/attendances`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/attendances` | EMPLOYEE | List attendance records. Supports filters: `employeeId`, `date` (single day), `from`/`to` (date range). Paginated, sorted by `checkIn` desc. |
| GET | `/api/attendances/{id}` | Any authenticated | Get a single attendance record by ID. |
| PUT | `/api/attendances/{id}` | SYSTEM_ADMIN, HR_ADMIN | Update check-in/check-out times; recomputes all derived fields (lateHour, workingHour, paidHour, workingDay, paidDay, violate). |
| DELETE | `/api/attendances/{id}` | SYSTEM_ADMIN, HR_ADMIN | Soft-delete an attendance record (sets deleteFlag=true). |

### Attendance Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `attendanceId` | String | UUID |
| `employeeId` | String | |
| `employeeName` | String | |
| `date` | LocalDate | Derived from checkIn |
| `checkIn` | LocalDateTime | |
| `checkOut` | LocalDateTime | Null if employee hasn't checked out |
| `lateHour` | BigDecimal | Hours late past 08:30 |
| `workingHour` | BigDecimal | Total hours from checkIn to checkOut |
| `paidHour` | BigDecimal | workingHour − lateHour |
| `workingDay` | BigDecimal | workingHour / 8 |
| `paidDay` | BigDecimal | paidHour / 8 |
| `violate` | boolean | true if late or missing checkout |

### Schedule Job

`AttendanceSchedule` runs daily at `00:00` (`cron = "0 0 0 * * *"`).
Fetches all checkin logs for yesterday, groups by employee, and builds/saves one `Attendance` record per employee using the first IN log and last OUT log of the day.

> **Note:** `@EnableScheduling` must be present for the job to run.

---

## Check-in Log API Endpoints

Base path: `/api/checkin-logs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/checkin-logs` | Any authenticated | Real-time: record a single check-in/out event from a device. Saves the log; attendance is calculated by the nightly schedule job. |
| POST | `/api/checkin-logs/batch` | Any authenticated | Batch: upload accumulated logs from an offline device. Each log is processed independently; partial failures are reported in the response. |
| GET | `/api/checkin-logs?date=YYYY-MM-DD` | Any authenticated | List all check-in/out logs for a specific date. |

### CheckinLog Request Body (POST)

```json
{
  "deviceId": "dev-001",
  "employeeId": "emp-001",
  "logTime": "2025-03-17T08:00:00",
  "logType": "IN"
}
```
`logType`: `IN` or `OUT`

### Issues / Gaps

