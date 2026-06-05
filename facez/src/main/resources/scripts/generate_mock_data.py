"""
Generate mock_data.xlsx — one sheet per DB table for the FaceZ HRMS project.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()

# ── helpers ──────────────────────────────────────────────────────────────────

HEADER_FONT  = Font(bold=True, color="FFFFFF")
HEADER_FILL  = PatternFill("solid", fgColor="1F4E79")
ALT_FILL     = PatternFill("solid", fgColor="D6E4F0")
THIN = Side(style="thin")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

def write_sheet(wb, title, headers, rows, *, first=False):
    ws = wb.active if first else wb.create_sheet(title)
    ws.title = title

    # header row
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font   = HEADER_FONT
        cell.fill   = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER

    # data rows
    for row_idx, row in enumerate(rows, 2):
        fill = ALT_FILL if row_idx % 2 == 0 else None
        for col, val in enumerate(row, 1):
            cell = ws.cell(row=row_idx, column=col, value=val)
            if fill:
                cell.fill = fill
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            cell.border = BORDER

    # auto-width
    for col in range(1, len(headers) + 1):
        max_len = max(
            len(str(ws.cell(r, col).value or ""))
            for r in range(1, len(rows) + 2)
        )
        ws.column_dimensions[get_column_letter(col)].width = min(max_len + 4, 40)

    ws.row_dimensions[1].height = 22
    ws.freeze_panes = "A2"
    return ws


# ── 1. department ─────────────────────────────────────────────────────────────

write_sheet(wb, "department",
    headers=["department_id", "department_name", "manager_id", "delete_flag", "deleted_at"],
    rows=[
        ("dept-001", "Engineering",       "emp-003", False, None),
        ("dept-002", "Human Resources",   "emp-006", False, None),
        ("dept-003", "Sales & Marketing", "emp-007", False, None),
        ("dept-004", "Quality Assurance", "emp-008", False, None),
        ("dept-005", "DevOps",            None,      False, None),  # no manager yet
    ],
    first=True,
)

# ── 2. employee_info ──────────────────────────────────────────────────────────
# Note: admin001 is seeded by DataInitializerConfig; dept FK is nullable for admin

write_sheet(wb, "employee_info",
    headers=[
        "employee_id", "name", "department_id", "role",
        "email", "phone_number", "address",
        "date_of_joining", "emergency_contact",
        "status", "delete_flag", "deleted_at",
    ],
    rows=[
        ("admin001", "System Administrator",  None,       "SYSTEM_ADMIN", "admin@dummy.org",         "0900000000", "Hanoi HQ",                      "2022-01-01", None,                   "ACTIVE", False, None),
        ("emp-001",  "Nguyen Van An",          "dept-001", "EMPLOYEE",     "an.nguyen@dummy.org",     "0901234567", "123 Le Loi, Ha Noi",            "2023-03-15", "Nguyen Van Binh: 0900", "ACTIVE", False, None),
        ("emp-002",  "Tran Thi Bich",          "dept-001", "EMPLOYEE",     "bich.tran@dummy.org",     "0912345678", "45 Tran Hung Dao, Ha Noi",      "2023-04-01", "Tran Van Duc: 0911",    "ACTIVE", False, None),
        ("emp-003",  "Le Van Cuong",           "dept-001", "MANAGER",      "cuong.le@dummy.org",      "0923456789", "78 Nguyen Trai, Ha Noi",        "2022-06-01", "Le Thi Mai: 0922",      "ACTIVE", False, None),
        ("emp-004",  "Pham Thi Dung",          "dept-001", "EMPLOYEE",     "dung.pham@dummy.org",     "0934567890", "12 Ba Trieu, Ha Noi",           "2023-08-10", "Pham Van Long: 0933",   "ACTIVE", False, None),
        ("emp-005",  "Hoang Van Em",           "dept-001", "EMPLOYEE",     "em.hoang@dummy.org",      "0945678901", "99 Hai Ba Trung, Ha Noi",       "2024-01-15", "Hoang Thi Lan: 0944",   "ACTIVE", False, None),
        ("emp-006",  "Vu Thi Phuong",          "dept-002", "HR_ADMIN",     "phuong.vu@dummy.org",     "0956789012", "34 Ly Thuong Kiet, Ha Noi",     "2022-02-01", "Vu Van Nam: 0955",      "ACTIVE", False, None),
        ("emp-007",  "Bui Van Giang",          "dept-003", "MANAGER",      "giang.bui@dummy.org",     "0967890123", "56 Dinh Tien Hoang, Ha Noi",    "2022-09-01", "Bui Thi Hoa: 0966",     "ACTIVE", False, None),
        ("emp-008",  "Do Thi Huong",           "dept-004", "MANAGER",      "huong.do@dummy.org",      "0978901234", "7 Lang Ha, Ha Noi",             "2023-01-20", "Do Van Kiet: 0977",     "ACTIVE", False, None),
        ("emp-009",  "Nguyen Van Hung",        "dept-003", "EMPLOYEE",     "hung.nguyen2@dummy.org",  "0989012345", "88 Chua Lang, Ha Noi",          "2024-03-01", "Nguyen Thi Thu: 0988",  "ACTIVE", False, None),
        ("emp-010",  "Tran Van Khoa",          "dept-002", "EMPLOYEE",     "khoa.tran@dummy.org",     "0990123456", "22 Tay Son, Ha Noi",            "2024-06-01", "Tran Thi Lan: 0999",    "INACTIVE", False, None),
    ],
)

# ── 3. user_account ───────────────────────────────────────────────────────────
# passwordHash shown as BCrypt of "Pass@1234" (placeholder — real hash is longer)
BCRYPT = "$2a$10$exampleBcryptHashForMockDataOnly"

write_sheet(wb, "user_account",
    headers=[
        "employee_id (PK=FK)", "username", "password_hash",
        "last_password_hash", "role",
        "created_at", "updated_at", "delete_flag", "deleted_at",
    ],
    rows=[
        ("admin001", "admin",        "$2a$10$bcryptOf_admin123",   None, "SYSTEM_ADMIN", "2022-01-01 09:00:00", "2022-01-01 09:00:00", False, None),
        ("emp-001",  "an.nguyen",    BCRYPT, None, "EMPLOYEE",     "2023-03-15 08:30:00", "2023-03-15 08:30:00", False, None),
        ("emp-002",  "bich.tran",    BCRYPT, None, "EMPLOYEE",     "2023-04-01 08:30:00", "2024-01-10 10:00:00", False, None),
        ("emp-003",  "cuong.le",     BCRYPT, None, "MANAGER",      "2022-06-01 08:00:00", "2022-06-01 08:00:00", False, None),
        ("emp-004",  "dung.pham",    BCRYPT, None, "EMPLOYEE",     "2023-08-10 09:00:00", "2023-08-10 09:00:00", False, None),
        ("emp-005",  "em.hoang",     BCRYPT, None, "EMPLOYEE",     "2024-01-15 09:00:00", "2024-01-15 09:00:00", False, None),
        ("emp-006",  "phuong.vu",    BCRYPT, None, "HR_ADMIN",     "2022-02-01 08:00:00", "2022-02-01 08:00:00", False, None),
        ("emp-007",  "giang.bui",    BCRYPT, None, "MANAGER",      "2022-09-01 08:00:00", "2022-09-01 08:00:00", False, None),
        ("emp-008",  "huong.do",     BCRYPT, None, "MANAGER",      "2023-01-20 08:00:00", "2023-01-20 08:00:00", False, None),
        ("emp-009",  "hung.nguyen2", BCRYPT, None, "EMPLOYEE",     "2024-03-01 09:00:00", "2024-03-01 09:00:00", False, None),
        ("emp-010",  "khoa.tran",    BCRYPT, None, "EMPLOYEE",     "2024-06-01 09:00:00", "2025-01-01 00:00:00", True,  "2025-01-01 00:00:00"),
    ],
)

# ── 4. benefit ────────────────────────────────────────────────────────────────

write_sheet(wb, "benefit",
    headers=[
        "benefit_id", "employee_level", "salary_rank",
        "base_salary", "housing_benefit", "meal_benefit",
        "vehicle_benefit", "delete_flag", "deleted_at",
    ],
    rows=[
        ("ben-001", "LEVEL_1",       1, "8,000,000",  "500,000",   "600,000", None,        False, None),
        ("ben-002", "LEVEL_1",       2, "9,000,000",  "500,000",   "600,000", None,        False, None),
        ("ben-003", "LEVEL_2",       3, "12,000,000", "800,000",   "700,000", None,        False, None),
        ("ben-004", "LEVEL_2",       4, "14,000,000", "1,000,000", "700,000", None,        False, None),
        ("ben-005", "LEAD_LEVEL",    5, "18,000,000", "1,500,000", "800,000", "500,000",   False, None),
        ("ben-006", "LEAD_LEVEL",    6, "22,000,000", "2,000,000", "800,000", "500,000",   False, None),
        ("ben-007", "MANAGER_LEVEL", 7, "28,000,000", "3,000,000", "900,000", "1,000,000", False, None),
        ("ben-008", "MANAGER_LEVEL", 8, "35,000,000", "4,000,000", "900,000", "1,500,000", False, None),
    ],
)

# ── 5. contract ───────────────────────────────────────────────────────────────

write_sheet(wb, "contract",
    headers=[
        "id", "employee_id", "start_date", "end_date",
        "contract_type", "terms", "status", "salary_rank",
        "created_at", "updated_at", "delete_flag", "deleted_at",
    ],
    rows=[
        ("ctr-001", "emp-001", "2023-03-15", "2025-03-14", "FIXED_TERM",    "Standard 2-year contract, 40h/week",  "ACTIVE",    "2", "2023-03-14 17:00:00", "2023-03-14 17:00:00", False, None),
        ("ctr-002", "emp-002", "2023-04-01", "2025-03-31", "FIXED_TERM",    "Standard 2-year contract, 40h/week",  "ACTIVE",    "2", "2023-03-31 17:00:00", "2023-03-31 17:00:00", False, None),
        ("ctr-003", "emp-003", "2022-06-01", None,          "INDEFINITE",    "Permanent contract, senior engineer", "ACTIVE",    "5", "2022-05-31 17:00:00", "2022-05-31 17:00:00", False, None),
        ("ctr-004", "emp-004", "2023-08-10", "2024-08-09", "FIXED_TERM",    "1-year probation contract",            "EXPIRED",   "1", "2023-08-09 17:00:00", "2024-08-09 17:00:00", False, None),
        ("ctr-005", "emp-004", "2024-08-10", "2026-08-09", "FIXED_TERM",    "2-year renewal contract",              "ACTIVE",    "2", "2024-08-09 17:00:00", "2024-08-09 17:00:00", False, None),
        ("ctr-006", "emp-005", "2024-01-15", "2025-01-14", "PROBATION",     "6-month probation",                    "ACTIVE",    "1", "2024-01-14 17:00:00", "2024-01-14 17:00:00", False, None),
        ("ctr-007", "emp-006", "2022-02-01", None,          "INDEFINITE",    "Permanent HR admin contract",          "ACTIVE",    "6", "2022-01-31 17:00:00", "2022-01-31 17:00:00", False, None),
        ("ctr-008", "emp-007", "2022-09-01", None,          "INDEFINITE",    "Permanent sales manager contract",     "ACTIVE",    "7", "2022-08-31 17:00:00", "2022-08-31 17:00:00", False, None),
        ("ctr-009", "emp-009", "2024-03-01", "2025-02-28", "FIXED_TERM",    "1-year contract",                      "ACTIVE",    "1", "2024-02-28 17:00:00", "2024-02-28 17:00:00", False, None),
        ("ctr-010", "emp-010", "2024-06-01", "2025-05-31", "FIXED_TERM",    "1-year contract (terminated early)",   "TERMINATED","1", "2024-05-31 17:00:00", "2025-01-01 00:00:00", False, None),
    ],
)

# ── 6. device ─────────────────────────────────────────────────────────────────

write_sheet(wb, "device",
    headers=["device_id", "device_name", "log_type", "delete_flag", "deleted_at"],
    rows=[
        ("dev-001", "Main Entrance IN",   "IN",  False, None),
        ("dev-002", "Main Entrance OUT",  "OUT", False, None),
        ("dev-003", "Side Gate IN",       "IN",  False, None),
        ("dev-004", "Side Gate OUT",      "OUT", False, None),
        ("dev-005", "Server Room IN",     "IN",  False, None),
        ("dev-006", "Server Room OUT",    "OUT", False, None),
    ],
)

# ── 7. attendance ─────────────────────────────────────────────────────────────

write_sheet(wb, "attendance",
    headers=[
        "attendance_id", "employee_id",
        "check_in", "check_out",
        "late_hour", "working_hour", "paid_hour",
        "working_day", "paid_day", "violate",
        "created_at", "updated_at", "delete_flag", "deleted_at",
    ],
    rows=[
        # emp-001: on time, full day
        ("att-001", "emp-001", "2025-03-17 08:00:00", "2025-03-17 17:00:00", 0.00, 9.00, 9.00, 1.13, 1.13, False, "2025-03-17 08:00:00", "2025-03-17 17:00:00", False, None),
        # emp-001: 15 min late
        ("att-002", "emp-001", "2025-03-18 08:15:00", "2025-03-18 17:00:00", 0.25, 8.75, 8.50, 1.09, 1.06, True,  "2025-03-18 08:15:00", "2025-03-18 17:00:00", False, None),
        # emp-001: forgot checkout
        ("att-003", "emp-001", "2025-03-19 08:05:00", None,                  0.08, 0.00, 0.00, 0.00, 0.00, True,  "2025-03-19 08:05:00", None,                  False, None),
        # emp-002: on time
        ("att-004", "emp-002", "2025-03-17 07:55:00", "2025-03-17 17:10:00", 0.00, 9.25, 9.25, 1.16, 1.16, False, "2025-03-17 07:55:00", "2025-03-17 17:10:00", False, None),
        ("att-005", "emp-002", "2025-03-18 08:00:00", "2025-03-18 17:00:00", 0.00, 9.00, 9.00, 1.13, 1.13, False, "2025-03-18 08:00:00", "2025-03-18 17:00:00", False, None),
        # emp-003: on time full days
        ("att-006", "emp-003", "2025-03-17 08:00:00", "2025-03-17 17:30:00", 0.00, 9.50, 9.50, 1.19, 1.19, False, "2025-03-17 08:00:00", "2025-03-17 17:30:00", False, None),
        ("att-007", "emp-003", "2025-03-18 08:00:00", "2025-03-18 17:00:00", 0.00, 9.00, 9.00, 1.13, 1.13, False, "2025-03-18 08:00:00", "2025-03-18 17:00:00", False, None),
        ("att-008", "emp-003", "2025-03-19 08:00:00", "2025-03-19 17:00:00", 0.00, 9.00, 9.00, 1.13, 1.13, False, "2025-03-19 08:00:00", "2025-03-19 17:00:00", False, None),
        # emp-004: 30 min late
        ("att-009", "emp-004", "2025-03-17 08:30:00", "2025-03-17 17:00:00", 0.50, 8.50, 8.00, 1.06, 1.00, True,  "2025-03-17 08:30:00", "2025-03-17 17:00:00", False, None),
        ("att-010", "emp-004", "2025-03-18 08:00:00", "2025-03-18 17:00:00", 0.00, 9.00, 9.00, 1.13, 1.13, False, "2025-03-18 08:00:00", "2025-03-18 17:00:00", False, None),
        # emp-005
        ("att-011", "emp-005", "2025-03-17 08:00:00", "2025-03-17 17:00:00", 0.00, 9.00, 9.00, 1.13, 1.13, False, "2025-03-17 08:00:00", "2025-03-17 17:00:00", False, None),
        ("att-012", "emp-005", "2025-03-19 09:00:00", "2025-03-19 17:00:00", 1.00, 8.00, 7.00, 1.00, 0.88, True,  "2025-03-19 09:00:00", "2025-03-19 17:00:00", False, None),
    ],
)

# ── 8. check_in_log ───────────────────────────────────────────────────────────

write_sheet(wb, "check_in_log",
    headers=[
        "log_id", "device_id", "employee_id",
        "log_time", "attendance_id", "log_type",
        "delete_flag", "deleted_at",
    ],
    rows=[
        ("log-001", "dev-001", "emp-001", "2025-03-17 08:00:12", "att-001", "IN",  False, None),
        ("log-002", "dev-002", "emp-001", "2025-03-17 17:00:45", "att-001", "OUT", False, None),
        ("log-003", "dev-001", "emp-001", "2025-03-18 08:15:05", "att-002", "IN",  False, None),
        ("log-004", "dev-002", "emp-001", "2025-03-18 17:00:30", "att-002", "OUT", False, None),
        ("log-005", "dev-001", "emp-001", "2025-03-19 08:05:00", "att-003", "IN",  False, None),
        ("log-006", "dev-001", "emp-002", "2025-03-17 07:55:20", "att-004", "IN",  False, None),
        ("log-007", "dev-002", "emp-002", "2025-03-17 17:10:15", "att-004", "OUT", False, None),
        ("log-008", "dev-001", "emp-002", "2025-03-18 08:00:00", "att-005", "IN",  False, None),
        ("log-009", "dev-002", "emp-002", "2025-03-18 17:00:00", "att-005", "OUT", False, None),
        ("log-010", "dev-003", "emp-003", "2025-03-17 08:00:00", "att-006", "IN",  False, None),
        ("log-011", "dev-004", "emp-003", "2025-03-17 17:30:00", "att-006", "OUT", False, None),
        ("log-012", "dev-003", "emp-003", "2025-03-18 08:00:00", "att-007", "IN",  False, None),
        ("log-013", "dev-004", "emp-003", "2025-03-18 17:00:00", "att-007", "OUT", False, None),
        ("log-014", "dev-003", "emp-003", "2025-03-19 08:00:00", "att-008", "IN",  False, None),
        ("log-015", "dev-004", "emp-003", "2025-03-19 17:00:00", "att-008", "OUT", False, None),
        ("log-016", "dev-001", "emp-004", "2025-03-17 08:30:00", "att-009", "IN",  False, None),
        ("log-017", "dev-002", "emp-004", "2025-03-17 17:00:00", "att-009", "OUT", False, None),
        ("log-018", "dev-001", "emp-004", "2025-03-18 08:00:00", "att-010", "IN",  False, None),
        ("log-019", "dev-002", "emp-004", "2025-03-18 17:00:00", "att-010", "OUT", False, None),
        ("log-020", "dev-001", "emp-005", "2025-03-17 08:00:00", "att-011", "IN",  False, None),
        ("log-021", "dev-002", "emp-005", "2025-03-17 17:00:00", "att-011", "OUT", False, None),
        ("log-022", "dev-001", "emp-005", "2025-03-19 09:00:00", "att-012", "IN",  False, None),
        ("log-023", "dev-002", "emp-005", "2025-03-19 17:00:00", "att-012", "OUT", False, None),
    ],
)

# ── 9. leave_request ──────────────────────────────────────────────────────────

write_sheet(wb, "leave_request",
    headers=[
        "leave_request_id", "employee_id", "reason",
        "start_time", "end_time", "status",
        "created_at", "updated_at", "delete_flag", "deleted_at",
    ],
    rows=[
        ("lrq-001", "emp-001", "Personal errands",              "2025-03-20 08:00:00", "2025-03-20 17:00:00", "APPROVED",         "2025-03-10 09:00:00", "2025-03-18 14:00:00", False, None),
        ("lrq-002", "emp-002", "Family event",                  "2025-03-25 08:00:00", "2025-03-26 17:00:00", "MANAGER_APPROVED", "2025-03-15 10:00:00", "2025-03-17 09:00:00", False, None),
        ("lrq-003", "emp-003", "Medical appointment",           "2025-03-21 13:00:00", "2025-03-21 17:00:00", "LEADER_APPROVED",  "2025-03-18 08:00:00", "2025-03-19 08:30:00", False, None),
        ("lrq-004", "emp-004", "Sick leave — fever",            "2025-03-19 08:00:00", "2025-03-19 17:00:00", "TO_APPROVE",       "2025-03-19 07:45:00", None,                  False, None),
        ("lrq-005", "emp-005", "Personal trip",                 "2025-04-01 08:00:00", "2025-04-03 17:00:00", "DRAFT",            "2025-03-20 11:00:00", None,                  False, None),
        ("lrq-006", "emp-001", "Annual leave — summer holiday", "2025-07-14 08:00:00", "2025-07-18 17:00:00", "TO_APPROVE",       "2025-03-20 14:00:00", None,                  False, None),
        ("lrq-007", "emp-009", "Sick leave — cold",             "2025-03-18 08:00:00", "2025-03-18 17:00:00", "REJECTED",         "2025-03-17 22:00:00", "2025-03-18 07:00:00", False, None),
    ],
)

# ── 10. ot_request ────────────────────────────────────────────────────────────

write_sheet(wb, "ot_request",
    headers=[
        "ot_request_id", "employee_id",
        "start_time", "end_time", "status",
        "created_at", "updated_at", "delete_flag", "deleted_at",
    ],
    rows=[
        ("otr-001", "emp-001", "2025-03-17 17:00:00", "2025-03-17 20:00:00", "APPROVED",         "2025-03-14 09:00:00", "2025-03-16 15:00:00", False, None),
        ("otr-002", "emp-002", "2025-03-18 17:00:00", "2025-03-18 19:00:00", "MANAGER_APPROVED", "2025-03-15 10:00:00", "2025-03-17 10:00:00", False, None),
        ("otr-003", "emp-003", "2025-03-19 17:00:00", "2025-03-19 21:00:00", "LEADER_APPROVED",  "2025-03-17 16:00:00", "2025-03-18 09:00:00", False, None),
        ("otr-004", "emp-004", "2025-03-21 17:00:00", "2025-03-21 19:00:00", "TO_APPROVE",       "2025-03-19 17:30:00", None,                  False, None),
        ("otr-005", "emp-005", "2025-03-22 17:00:00", "2025-03-22 20:00:00", "DRAFT",            "2025-03-19 18:00:00", None,                  False, None),
        ("otr-006", "emp-001", "2025-03-24 17:00:00", "2025-03-24 19:30:00", "TO_APPROVE",       "2025-03-20 08:00:00", None,                  False, None),
        ("otr-007", "emp-009", "2025-03-17 17:00:00", "2025-03-17 19:00:00", "REJECTED",         "2025-03-15 17:30:00", "2025-03-16 08:00:00", False, None),
    ],
)

# ── save ──────────────────────────────────────────────────────────────────────

out = "mock_data.xlsx"
wb.save(out)
print(f"Saved: {out}  ({wb.sheetnames})")
