"""
Insert mock data for four supplementary tables:
  - attendance_period_close
  - leave_balance
  - notification
  - api_key
"""

import psycopg2
import hashlib
import uuid
from datetime import datetime, date
from psycopg2.extras import execute_values

conn = psycopg2.connect(
    host="localhost", port=5432,
    dbname="postgres", user="postgres", password="postgres",
)
conn.autocommit = False
cur = conn.cursor()

def bulk(sql, rows):
    execute_values(cur, sql, rows)

def uid():
    return str(uuid.uuid4())

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()

now = datetime.now()

try:
    # ── 0. Clean target tables ────────────────────────────────────────────────
    cur.execute("""
        TRUNCATE TABLE
            attendance_period_close,
            leave_balance,
            notification,
            api_key
        CASCADE
    """)

    # ── 1. attendance_period_close ────────────────────────────────────────────
    # Close all months Jun 2025 → Apr 2026 (11 months)
    print("Inserting attendance_period_close …")

    closed_months = [
        (2025, 6,  "hr-001", "2025-07-02 09:00:00", "Jun 2025 closed — 22 working days"),
        (2025, 7,  "hr-001", "2025-08-01 09:00:00", "Jul 2025 closed — 23 working days"),
        (2025, 8,  "hr-001", "2025-09-02 09:00:00", "Aug 2025 closed — 21 working days"),
        (2025, 9,  "hr-001", "2025-10-01 09:00:00", "Sep 2025 closed — 22 working days"),
        (2025, 10, "hr-001", "2025-11-03 09:00:00", "Oct 2025 closed — 23 working days"),
        (2025, 11, "hr-001", "2025-12-01 09:00:00", "Nov 2025 closed — 20 working days"),
        (2025, 12, "hr-002", "2026-01-02 09:00:00", "Dec 2025 closed — 23 working days"),
        (2026, 1,  "hr-001", "2026-02-02 09:00:00", "Jan 2026 closed — 22 working days. Tet holiday included."),
        (2026, 2,  "hr-001", "2026-03-02 09:00:00", "Feb 2026 closed — 20 working days"),
        (2026, 3,  "hr-001", "2026-04-01 09:00:00", "Mar 2026 closed — 22 working days"),
        (2026, 4,  "hr-002", "2026-05-04 09:00:00", "Apr 2026 closed — 22 working days. Liberation Day included."),
    ]

    bulk(
        """
        INSERT INTO attendance_period_close
            (id, close_year, close_month, closed_by, closed_at, notes)
        VALUES %s
        """,
        [(uid(), yr, mo, by, closed_at, notes) for yr, mo, by, closed_at, notes in closed_months],
    )
    print(f"  {len(closed_months)} periods inserted.")

    # ── 2. leave_balance ──────────────────────────────────────────────────────
    # Entitlement by role (days/year):
    #   DIRECTOR / SYSTEM_ADMIN  → 16 ANNUAL, 30 SICK
    #   FINANCE_ADMIN / HR_ADMIN → 14 ANNUAL, 30 SICK
    #   MANAGER / LEADER         → 13 ANNUAL, 30 SICK
    #   EMPLOYEE                 → 12 ANNUAL, 30 SICK
    print("Inserting leave_balance …")

    # (employee_id, role_tier)
    # tier: 0=Director/Admin, 1=HR/Finance Admin, 2=Manager/Leader, 3=Employee
    SPECIAL_EMP_TIERS = [
        ("admin001", 0), ("dir-001", 0),
        ("fin-001",  1), ("hr-001",  1), ("hr-002",  1),
        ("mgr-001",  2), ("mgr-002", 2), ("mgr-003", 2), ("mgr-004", 2),
        ("mgr-005",  2), ("mgr-006", 2), ("mgr-007", 2), ("mgr-008", 2),
        ("ldr-001",  2), ("ldr-002", 2), ("ldr-003", 2), ("ldr-004", 2),
        ("ldr-005",  2), ("ldr-006", 2), ("ldr-007", 2), ("ldr-008", 2),
    ]
    # Sample bulk employees (skip inactive 15, 38, 62)
    BULK_EMP_SAMPLE = [f"emp-{i:03d}" for i in range(1, 31) if i not in {15}]

    ANNUAL_ENT = [16, 14, 13, 12]
    SICK_ENT   = [30, 30, 30, 30]

    lb_rows = []

    def add_annual(eid, tier, year, used, carried=0, pending=0):
        ent = ANNUAL_ENT[tier]
        remaining = round(ent + carried - used - pending, 1)
        lb_rows.append((
            uid(), eid, year, "ANNUAL",
            ent, carried, pending, used, max(0, remaining), 5,
        ))

    def add_sick(eid, tier, year, used=0):
        ent = SICK_ENT[tier]
        lb_rows.append((
            uid(), eid, year, "SICK",
            ent, 0, 0, used, max(0, ent - used), 0,
        ))

    def add_type(eid, year, ltype, ent, used=0, pending=0):
        remaining = max(0, ent - used - pending)
        lb_rows.append((uid(), eid, year, ltype, ent, 0, pending, used, remaining, 0))

    # ── Special employees (2025 + 2026) ──────────────────────────────────────
    for eid, tier in SPECIAL_EMP_TIERS:
        if eid == "admin001":
            continue  # system admin doesn't take leave
        # 2025
        add_annual(eid, tier, 2025, used=2, carried=0)
        add_sick(eid, tier, 2025, used=1)
        # 2026
        add_annual(eid, tier, 2026, used=1, carried=2, pending=0)
        add_sick(eid, tier, 2026, used=0)

    # Extra leave types for a few named employees (2026)
    add_type("ldr-002",   2026, "MARRIAGE",     3, used=3)        # ldr-002 got married (lrq-009)
    add_type("ldr-004",   2026, "BEREAVEMENT",  3, used=3)        # ldr-004 bereavement (lrq-015)
    add_type("emp-025",   2026, "MATERNITY",    90, used=60, pending=30)  # emp-025 maternity
    add_type("emp-055",   2026, "PATERNITY",    5,  used=5)        # emp-055 paternity (lrq-030)
    add_type("emp-030",   2026, "COMPENSATORY", 2,  used=1)        # comp days
    add_type("emp-075",   2026, "COMPENSATORY", 1,  used=1)        # comp days

    # ── Bulk employees — ANNUAL + SICK 2026 ──────────────────────────────────
    import random
    rng = random.Random(42)
    for eid in BULK_EMP_SAMPLE:
        used = rng.randint(0, 4)
        pending = rng.randint(0, 2)
        add_annual(eid, 3, 2026, used=used, pending=pending)
        add_sick(eid, 3, 2026, used=rng.randint(0, 3))

    bulk(
        """
        INSERT INTO leave_balance
            (id, employee_id, leave_year, leave_type,
             entitlement_days, carried_over_days, pending_days, used_days,
             remaining_days, carry_over_cap)
        VALUES %s
        """,
        lb_rows,
    )
    print(f"  {len(lb_rows)} leave_balance rows inserted.")

    # ── 3. notification ───────────────────────────────────────────────────────
    print("Inserting notification …")

    notif_rows = [
        # ── Leave-related ─────────────────────────────────────────────────────
        (uid(), "emp-001", "Leave Request Approved",
         "Your annual leave request (Jan 2–2, 2026) has been approved.",
         "LEAVE", True,  "2025-12-30 15:00:00"),
        (uid(), "emp-001", "Leave Request Approved",
         "Your annual leave request (Aug 11–15, 2025) has been approved.",
         "LEAVE", True,  "2025-08-07 14:00:00"),
        (uid(), "mgr-001", "Leave Approval Required",
         "Nguyen Van An submitted a leave request for Aug 11–15. Please review.",
         "LEAVE", True,  "2025-08-01 09:00:00"),
        (uid(), "emp-003", "Leave Request Rejected",
         "Your unpaid leave request (Jul 28–29, 2025) has been rejected by your manager.",
         "LEAVE", True,  "2025-07-25 09:00:00"),
        (uid(), "ldr-002", "Leave Request Approved",
         "Your marriage leave (Aug 25–27, 2025) has been fully approved. Congratulations!",
         "LEAVE", True,  "2025-08-20 15:00:00"),
        (uid(), "ldr-004", "Leave Request Approved",
         "Your bereavement leave (Oct 20–22, 2025) has been approved. We are sorry for your loss.",
         "LEAVE", True,  "2025-10-20 10:00:00"),
        (uid(), "emp-033", "Leave Approval Required",
         "Sick leave request from an employee on Mar 16, 2026 is awaiting your approval.",
         "LEAVE", False, "2026-03-16 07:45:00"),
        (uid(), "emp-070", "Leave Request Status Updated",
         "Your leave request for Mar 23, 2026 has been approved by your leader.",
         "LEAVE", False, "2026-03-20 14:00:00"),

        # ── OT-related ────────────────────────────────────────────────────────
        (uid(), "emp-001", "OT Request Approved",
         "Your overtime request (Jun 4, 2025, 17:00–20:00) has been approved.",
         "INFO",  True,  "2025-06-03 15:00:00"),
        (uid(), "mgr-001", "OT Approval Required",
         "emp-001 submitted an OT request for Jun 4, 2025. Please review.",
         "INFO",  True,  "2025-06-02 09:00:00"),
        (uid(), "emp-020", "OT Request Rejected",
         "Your weekend overtime request (Jun 21, 2025) has been rejected.",
         "INFO",  True,  "2025-06-20 09:00:00"),
        (uid(), "ldr-004", "OT Request Pending Manager Approval",
         "Your OT request (Apr 22, 2026, night shift) has been approved by your leader and is awaiting manager approval.",
         "INFO",  False, "2026-04-21 15:00:00"),

        # ── Payroll-related ───────────────────────────────────────────────────
        (uid(), "emp-001", "Payslip Available",
         "Your payslip for October 2025 is now available. Net pay: 9,450,000 VND.",
         "PAYROLL", True, "2025-11-05 08:00:00"),
        (uid(), "emp-001", "Payslip Available",
         "Your payslip for November 2025 is now available. Net pay: 9,450,000 VND.",
         "PAYROLL", True, "2025-12-05 08:00:00"),
        (uid(), "dir-001", "Payroll Batch Ready for Approval",
         "Finance has submitted the payroll batch for March 2026. 98 records pending your approval.",
         "PAYROLL", False, "2026-04-03 09:00:00"),
        (uid(), "fin-001", "Payroll Batch Completed",
         "Batch payroll calculation for March 2026 completed successfully. 100 records generated.",
         "PAYROLL", True, "2026-04-02 23:45:00"),
        (uid(), "mgr-001", "Department Payroll Summary",
         "Engineering department payroll for Q4 2025 has been processed. Total cost: 248,000,000 VND.",
         "PAYROLL", True, "2026-01-05 09:00:00"),

        # ── Contract-related ──────────────────────────────────────────────────
        (uid(), "emp-001", "Contract Expiry Notice",
         "Your fixed-term contract expires within 90 days. Please contact HR to discuss renewal.",
         "CONTRACT", False, "2026-01-15 09:00:00"),
        (uid(), "emp-009", "Contract Expiry Notice",
         "Your fixed-term contract expires within 60 days (Feb 28, 2026). Please contact HR.",
         "CONTRACT", False, "2026-01-01 09:00:00"),
        (uid(), "hr-001", "Contract Expiry Alert",
         "3 employee contracts are expiring within the next 90 days. Review required.",
         "CONTRACT", True, "2026-01-01 08:00:00"),
        (uid(), "emp-004", "Contract Renewed",
         "Your employment contract has been renewed for 2 years (Aug 10, 2024 – Aug 9, 2026).",
         "CONTRACT", True, "2024-08-10 09:00:00"),

        # ── System / general ─────────────────────────────────────────────────
        (uid(), "hr-001", "Attendance Period Closed",
         "The attendance period for April 2026 has been closed. Payroll processing can begin.",
         "INFO", False, "2026-05-04 09:00:00"),
        (uid(), "hr-001", "Attendance Period Closed",
         "The attendance period for March 2026 has been closed successfully.",
         "INFO", True,  "2026-04-01 09:00:00"),
        (uid(), "fin-001", "System Configuration Updated",
         "PIT tax brackets for 2026 (Law 109/2025/QH15) have been activated.",
         "INFO", True,  "2026-01-02 10:00:00"),
        (uid(), "admin001", "New Device API Key Generated",
         "A new API key has been generated for device dev-003 (Side Gate IN).",
         "INFO", True,  "2025-06-01 08:00:00"),
        (uid(), "hr-001", "Leave Balance Carryover Applied",
         "Annual leave carryover for 2025→2026 has been applied for 98 active employees.",
         "INFO", True,  "2026-01-02 08:30:00"),
        (uid(), "emp-025", "Maternity Leave Confirmed",
         "Your maternity leave starting Nov 24, 2025 has been confirmed. Duration: 6 months.",
         "LEAVE", True,  "2025-11-18 14:00:00"),

        # ── Warning-level ─────────────────────────────────────────────────────
        (uid(), "hr-001", "Attendance Violations Detected",
         "12 employees recorded late arrivals or missing checkouts in April 2026. Review attendance report.",
         "WARNING", False, "2026-05-02 09:00:00"),
        (uid(), "mgr-001", "Team Member Missing Checkout",
         "emp-005 did not record a checkout on Feb 24, 2026. Please verify attendance.",
         "WARNING", True,  "2026-02-25 08:30:00"),
        (uid(), "fin-001", "Insurance Ceiling Exceeded",
         "2 employees exceed the BHXH insurance ceiling (46,800,000 VND). Insurance base capped.",
         "WARNING", True,  "2026-04-02 10:00:00"),
    ]

    bulk(
        """
        INSERT INTO notification
            (id, employee_id, title, message, type, read_flag, created_at)
        VALUES %s
        """,
        notif_rows,
    )
    print(f"  {len(notif_rows)} notifications inserted.")

    # ── 4. api_key ────────────────────────────────────────────────────────────
    # One active key per device. Raw key = deterministic test string.
    # key_hash = SHA-256(raw_key), matching ApiKeyService.sha256Hex()
    # IMPORTANT: record the raw keys below — the filter reads the header value,
    # hashes it, and looks up in DB. Use these in X-Device-API-Key header.
    print("Inserting api_key …")

    # (device_id, raw_key_for_testing)
    device_keys = [
        ("dev-001", "vti-hrms-main-entrance-in-2026"),
        ("dev-002", "vti-hrms-main-entrance-out-2026"),
        ("dev-003", "vti-hrms-side-gate-in-2026"),
        ("dev-004", "vti-hrms-side-gate-out-2026"),
        ("dev-005", "vti-hrms-server-room-in-2026"),
        ("dev-006", "vti-hrms-server-room-out-2026"),
    ]

    api_rows = [
        (uid(), sha256(raw_key), device_id, True,
         "2026-01-01 08:00:00", "2026-05-20 17:05:12")
        for device_id, raw_key in device_keys
    ]

    bulk(
        """
        INSERT INTO api_key
            (id, key_hash, device_id, active, created_at, last_used_at)
        VALUES %s
        """,
        api_rows,
    )
    print(f"  {len(api_rows)} API keys inserted.")

    conn.commit()
    print("\nAll data committed.")

    # ── Print test API key table ───────────────────────────────────────────────
    print("\nTest API keys (use in X-Device-API-Key header):")
    print(f"  {'Device':<10}  {'Raw key (send in header)':<40}  SHA-256 prefix")
    for device_id, raw_key in device_keys:
        h = sha256(raw_key)
        print(f"  {device_id:<10}  {raw_key:<40}  {h[:16]}…")

except Exception as e:
    conn.rollback()
    print(f"\nERROR — rolled back: {e}")
    raise
finally:
    cur.close()
    conn.close()

# ── Verify ────────────────────────────────────────────────────────────────────
conn2 = psycopg2.connect(
    host="localhost", port=5432,
    dbname="postgres", user="postgres", password="postgres",
)
cur2 = conn2.cursor()
tables = ["attendance_period_close", "leave_balance", "notification", "api_key"]
print("\nRow counts:")
for t in tables:
    cur2.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t:<30} {cur2.fetchone()[0]:>5} rows")
cur2.close()
conn2.close()
