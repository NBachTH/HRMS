"""
FaceZ HRMS — Mock data generator v2
100+ employees, Jun 2025–Apr 2026 attendance, 30+ requests each type

Insertion order (respects FK constraints):
  0. TRUNCATE CASCADE
  1. department        (manager_id = NULL initially)
  2. employee_info     (department_id FK)
  3. department UPDATE (patch manager_id)
  4. user_account      (FK → employee_info)
  5. contract          (FK → employee_info)
  6. device            (no FK)
  7. attendance        (FK → employee_info)
  8. check_in_log      (FK → device, employee_info)
  9. leave_request     (FK → employee_info)
 10. ot_request        (FK → employee_info)
"""

import bcrypt
import psycopg2
import random
from psycopg2.extras import execute_values
from datetime import date, datetime, timedelta
from calendar import monthrange

SEED = 42
rng  = random.Random(SEED)

# ── connection ────────────────────────────────────────────────────────────────
conn = psycopg2.connect(
    host="localhost", port=5432,
    dbname="postgres", user="postgres", password="postgres",
)
conn.autocommit = False
cur = conn.cursor()

def run(sql, p=None):    cur.execute(sql, p)
def bulk(sql, rows):     execute_values(cur, sql, rows)
def hashed(s):           return bcrypt.hashpw(s.encode(), bcrypt.gensalt(10)).decode()
def dt(d, h, m=0):      return datetime(d.year, d.month, d.day, h, m)

def work_days(year, month):
    _, last = monthrange(year, month)
    return [date(year, month, day) for day in range(1, last + 1)
            if date(year, month, day).weekday() < 5]

# Jun 2025 → Apr 2026
MONTHS = []
y, mo = 2025, 6
while (y, mo) <= (2026, 4):
    MONTHS.append((y, mo))
    mo += 1
    if mo > 12:
        mo, y = 1, y + 1

print("Hashing passwords …")
EMP_HASH   = hashed("Pass@1234")
ADMIN_HASH = hashed("admin123")
print("Done.")

# ── Vietnamese name / address helpers ────────────────────────────────────────
LAST  = ["Nguyen","Tran","Le","Pham","Hoang","Vu","Do","Bui","Dang","Dinh","Ngo","Duong","Ly","Dao","Ha"]
MID_M = ["Van","Quoc","Minh","Duc","Tuan","Bao","Huu","Cong","Ngoc","Thai"]
MID_F = ["Thi","Ngoc","Thu","Xuan","Kim","Bich","Phuong","Lan","My","Hong"]
FNM   = ["An","Binh","Cuong","Dat","Giang","Hung","Khanh","Long","Minh","Nam","Phong","Quan","Son","Tuan","Vu","Hai","Lam","Loc","Phu","Hieu"]
FNF   = ["Anh","Bich","Chi","Giang","Huong","Lan","Linh","Mai","Ngoc","Oanh","Phuong","Quynh","Thu","Tuyet","Ha","Hoa","Yen","Loan","Nhung","Nhi"]
STRS  = ["Le Loi","Tran Hung Dao","Nguyen Trai","Ba Trieu","Ly Thuong Kiet",
         "Lang Ha","Tay Son","Chua Lang","Hai Ba Trung","Phan Chu Trinh",
         "Nguyen Hue","Hang Bai","Quan Thanh","Kim Ma","Xa Dan","Doi Can",
         "Giang Vo","Cat Linh","Van Bao","Lieu Giai"]

def vn_name(seed, female=False):
    r = random.Random(seed ^ 0xABCD)
    mid = r.choice(MID_F if female else MID_M)
    fn  = r.choice(FNF if female else FNM)
    return f"{r.choice(LAST)} {mid} {fn}"

def vn_phone(seed):
    r = random.Random(seed ^ 0xDEAD)
    return f"09{r.randint(10_000_000, 99_999_999)}"

def vn_addr(seed):
    r = random.Random(seed ^ 0xBEEF)
    return f"{r.randint(1, 200)} {r.choice(STRS)}, Ha Noi"

def vn_join(seed):
    r = random.Random(seed ^ 0xCAFE)
    return date(2020, 1, 1) + timedelta(days=r.randint(0, 4 * 365))

def slug(name):
    parts = name.lower().split()
    return parts[-1] + "." + parts[0]

# ── Department rows ───────────────────────────────────────────────────────────
DEPT_DATA = [
    ("dept-001", "Engineering"),
    ("dept-002", "Human Resources"),
    ("dept-003", "Sales & Marketing"),
    ("dept-004", "Quality Assurance"),
    ("dept-005", "DevOps"),
    ("dept-006", "Finance"),
    ("dept-007", "Product Management"),
    ("dept-008", "Customer Success"),
    ("dept-009", "Legal & Compliance"),
    ("dept-010", "Data Analytics"),
]

# Manager assignments: dept_id → emp_id
DEPT_MANAGERS = {
    "dept-001": "mgr-001",
    "dept-002": "hr-001",
    "dept-003": "mgr-002",
    "dept-004": "mgr-003",
    "dept-005": "mgr-004",
    "dept-006": "fin-001",
    "dept-007": "mgr-005",
    "dept-008": "mgr-006",
    "dept-009": "mgr-007",
    "dept-010": "mgr-008",
}

# ── Special (named) employees ─────────────────────────────────────────────────
# (id, name, dept_id, role, email, phone, address, join_date, status, emergency)
SPECIAL_EMPS = [
    ("admin001","System Administrator",None,          "SYSTEM_ADMIN", "admin@dummy.org",          "0900000000", "Hanoi HQ",      "2022-01-01","ACTIVE",None),
    ("dir-001", "Nguyen Thanh Dat",   "dept-006",    "DIRECTOR",     "dat.nguyen@dummy.org",     "0901111110", vn_addr(1),      "2021-06-01","ACTIVE","Nguyen Thi Lan: 0901234560"),
    ("fin-001", "Tran Thi Bao Ngoc", "dept-006",    "FINANCE_ADMIN","ngoc.tran@dummy.org",      "0902222220", vn_addr(2),      "2022-03-01","ACTIVE","Tran Van Hai: 0912345601"),
    ("hr-001",  "Vu Thi Phuong",     "dept-002",    "HR_ADMIN",     "phuong.vu@dummy.org",      "0956789012", vn_addr(3),      "2022-02-01","ACTIVE","Vu Van Nam: 0955678901"),
    ("hr-002",  "Le Ngoc Mai",       "dept-002",    "HR_ADMIN",     "mai.le@dummy.org",         "0944567890", vn_addr(4),      "2023-01-15","ACTIVE","Le Van Hung: 0944888901"),
    ("mgr-001", "Le Van Cuong",      "dept-001",    "MANAGER",      "cuong.le@dummy.org",       "0923456789", vn_addr(5),      "2022-06-01","ACTIVE","Le Thi Mai: 0922345678"),
    ("mgr-002", "Bui Van Giang",     "dept-003",    "MANAGER",      "giang.bui@dummy.org",      "0967890123", vn_addr(6),      "2022-09-01","ACTIVE","Bui Thi Hoa: 0966789012"),
    ("mgr-003", "Do Thi Huong",      "dept-004",    "MANAGER",      "huong.do@dummy.org",       "0978901234", vn_addr(7),      "2023-01-20","ACTIVE","Do Van Kiet: 0977890123"),
    ("mgr-004", "Pham Quoc Bao",     "dept-005",    "MANAGER",      "bao.pham@dummy.org",       "0933456789", vn_addr(8),      "2022-04-01","ACTIVE","Pham Thi Lan: 0933111789"),
    ("mgr-005", "Hoang Minh Duc",    "dept-007",    "MANAGER",      "duc.hoang@dummy.org",      "0944456789", vn_addr(9),      "2021-11-01","ACTIVE","Hoang Thi Thu: 0944111789"),
    ("mgr-006", "Dang Thi Kim Oanh", "dept-008",    "MANAGER",      "oanh.dang@dummy.org",      "0955567890", vn_addr(10),     "2022-07-01","ACTIVE","Dang Van Toan: 0955111890"),
    ("mgr-007", "Ngo Van Tuan",      "dept-009",    "MANAGER",      "tuan.ngo@dummy.org",       "0966678901", vn_addr(11),     "2022-08-01","ACTIVE","Ngo Thi Lan: 0966111901"),
    ("mgr-008", "Dao Thi Quynh",     "dept-010",    "MANAGER",      "quynh.dao@dummy.org",      "0977789012", vn_addr(12),     "2023-02-01","ACTIVE","Dao Van Minh: 0977111012"),
    ("ldr-001", "Nguyen Thi Lan",    "dept-001",    "LEADER",       "lan.nguyen@dummy.org",     "0911223344", vn_addr(13),     "2023-07-01","ACTIVE","Nguyen Van Tuan: 0911111344"),
    ("ldr-002", "Tran Van An",       "dept-003",    "LEADER",       "an.tran@dummy.org",        "0922334455", vn_addr(14),     "2023-05-01","ACTIVE","Tran Thi Bich: 0922111455"),
    ("ldr-003", "Pham Thi Giang",    "dept-004",    "LEADER",       "giang.pham@dummy.org",     "0933445566", vn_addr(15),     "2023-08-01","ACTIVE","Pham Van Long: 0933111566"),
    ("ldr-004", "Vu Minh Hung",      "dept-005",    "LEADER",       "hung.vu@dummy.org",        "0944556677", vn_addr(16),     "2023-06-01","ACTIVE","Vu Thi Lan: 0944111677"),
    ("ldr-005", "Do Thi Linh",       "dept-007",    "LEADER",       "linh.do@dummy.org",        "0955667788", vn_addr(17),     "2023-09-01","ACTIVE","Do Van Nam: 0955111788"),
    ("ldr-006", "Bui Van Son",       "dept-010",    "LEADER",       "son.bui@dummy.org",        "0966778899", vn_addr(18),     "2023-10-01","ACTIVE","Bui Thi Ngoc: 0966111899"),
    ("ldr-007", "Dang Minh Khoa",    "dept-002",    "LEADER",       "khoa.dang@dummy.org",      "0977889900", vn_addr(19),     "2023-11-01","ACTIVE","Dang Thi Thu: 0977111900"),
    ("ldr-008", "Ha Thi Ngoc Anh",   "dept-006",    "LEADER",       "anh.ha@dummy.org",         "0988990011", vn_addr(20),     "2024-01-10","ACTIVE","Ha Van Duc: 0988111011"),
]

# Bulk employees: emp-001 to emp-083
# Department pool (83 employees distributed across departments)
DEPT_POOL = (
    ["dept-001"] * 20 +   # Engineering: 20
    ["dept-002"] * 4  +   # HR: 4
    ["dept-003"] * 10 +   # Sales: 10
    ["dept-004"] * 8  +   # QA: 8
    ["dept-005"] * 8  +   # DevOps: 8
    ["dept-006"] * 4  +   # Finance: 4
    ["dept-007"] * 8  +   # Product: 8
    ["dept-008"] * 7  +   # Customer Success: 7
    ["dept-009"] * 4  +   # Legal: 4
    ["dept-010"] * 10     # Data Analytics: 10
)  # = 83 bulk employees

INACTIVE_IDXS = {15, 38, 62}  # make a few INACTIVE

BULK_EMPS = []
for i, dept_id in enumerate(DEPT_POOL, start=1):
    female = (i % 3 == 0)
    name   = vn_name(i * 17, female)
    email  = f"{slug(name)}{i}@dummy.org"
    phone  = vn_phone(i * 13)
    addr   = vn_addr(i * 11)
    jdate  = vn_join(i * 7).strftime("%Y-%m-%d")
    eid    = f"emp-{i:03d}"
    status = "INACTIVE" if i in INACTIVE_IDXS else "ACTIVE"
    emg    = f"{vn_name(i * 31, not female)}: {vn_phone(i * 29)}"
    BULK_EMPS.append((eid, name, dept_id, "EMPLOYEE", email, phone, addr, jdate, status, emg))

ALL_EMPS    = SPECIAL_EMPS + BULK_EMPS
ACTIVE_EMPS = [e for e in ALL_EMPS if e[8] == "ACTIVE" and e[0] != "admin001"]
ACTIVE_IDS  = [e[0] for e in ACTIVE_EMPS]

print(f"Total employees: {len(ALL_EMPS)}  Active (excl admin): {len(ACTIVE_EMPS)}")

# ── Contract helper ───────────────────────────────────────────────────────────
ROLE_CTR_CFG = {
    "SYSTEM_ADMIN":  ("BOD",  40_000_000, "rank-8"),
    "DIRECTOR":      ("BOD",  45_000_000, "rank-8"),
    "FINANCE_ADMIN": ("DL",   30_000_000, "rank-7"),
    "HR_ADMIN":      ("TL2",  22_000_000, "rank-6"),
    "MANAGER":       ("TL2",  25_000_000, "rank-7"),
    "LEADER":        ("TL1",  17_000_000, "rank-5"),
    "EMPLOYEE":      ("NV1",  10_000_000, "rank-3"),
}
EMP_SAL_OPTS = [8_000_000, 9_000_000, 10_000_000, 11_000_000, 12_000_000, 13_000_000, 15_000_000]

TODAY = date(2026, 5, 21)

def make_contract(emp, ctr_idx):
    eid, name, dept, role, email, phone, addr, jdate_str, status, emg = emp
    jdate  = date.fromisoformat(jdate_str)
    pos_code, base_sal, sal_rank = ROLE_CTR_CFG.get(role, ("NV1", 10_000_000, "rank-3"))

    if role == "EMPLOYEE":
        r = random.Random(hash(eid) ^ 0x1234)
        base_sal = r.choice(EMP_SAL_OPTS)
        sal_rank = "rank-3" if base_sal >= 10_000_000 else "rank-1"

    tenure = (TODAY - jdate).days / 365.0
    if tenure < 0.5:
        ctype, end_date, cstatus = "PROBATION", (jdate + timedelta(days=180)).strftime("%Y-%m-%d"), "ACTIVE"
    elif tenure < 3:
        ctype, end_date, cstatus = "FIXED_TERM", (jdate + timedelta(days=730)).strftime("%Y-%m-%d"), "ACTIVE"
    else:
        ctype, end_date, cstatus = "INDEFINITE", None, "ACTIVE"

    if status == "INACTIVE":
        cstatus = "TERMINATED"

    r  = random.Random(hash(eid) ^ 0x5678)
    dep_count = r.choice([0, 0, 0, 1, 1, 2])
    sal_step  = r.randint(1, 6)
    created   = (jdate - timedelta(days=1)).strftime("%Y-%m-%d") + " 17:00:00"

    return (
        f"ctr-{ctr_idx:04d}", eid,
        jdate_str, end_date, ctype,
        "Standard employment contract", cstatus,
        sal_rank, base_sal, base_sal, pos_code, sal_step, dep_count,
        created, created, False, None,
    )

# ── Attendance generation config ──────────────────────────────────────────────
IN_DEVS  = ["dev-001", "dev-003", "dev-005"]
OUT_DEVS = ["dev-002", "dev-004", "dev-006"]

# Per-employee absence/late probability seeded by employee id
def emp_prng(eid):
    return random.Random(hash(eid) ^ 0xF00D)

def absent_prob(eid):
    r = emp_prng(eid)
    return r.uniform(0.02, 0.08)  # 2–8% absence rate

def late_prob(eid):
    r = emp_prng(eid)
    r.random()  # advance state
    return r.uniform(0.05, 0.20)  # 5–20% late rate

def no_cout_prob(eid):
    return 0.03  # uniform 3%

# ── Main transaction ──────────────────────────────────────────────────────────
try:
    # 0. TRUNCATE
    print("Truncating tables …")
    run("""
        TRUNCATE TABLE
            timesheet, work_day,
            payroll, ot_request, ot_plan_employee, ot_plan, leave_request,
            check_in_log, attendance,
            contract, device,
            user_account, employee_info, department
        CASCADE
    """)
    print("Done.")

    # 1. department (manager_id = NULL for now)
    print("Inserting departments …")
    bulk(
        "INSERT INTO department (department_id, department_name, manager_id, delete_flag, deleted_at) VALUES %s",
        [(did, dname, None, False, None) for did, dname in DEPT_DATA],
    )

    # 2. employee_info
    print("Inserting employee_info …")
    emp_rows = [
        (eid, name, dept, role, email, phone, addr, jdate, emg, status, False, None)
        for eid, name, dept, role, email, phone, addr, jdate, status, emg in ALL_EMPS
    ]
    bulk(
        """
        INSERT INTO employee_info
            (employee_id, name, department_id, role, email, phone_number,
             address, date_of_joining, emergency_contact, status, delete_flag, deleted_at)
        VALUES %s
        """,
        emp_rows,
    )
    print(f"  {len(emp_rows)} employees inserted.")

    # 3. patch department managers
    print("Patching department managers …")
    for dept_id, mgr_id in DEPT_MANAGERS.items():
        run("UPDATE department SET manager_id = %s WHERE department_id = %s", (mgr_id, dept_id))

    # 4. user_account
    print("Inserting user_account …")
    ua_rows = []
    for eid, name, dept, role, email, phone, addr, jdate, status, emg in ALL_EMPS:
        username = slug(name) if eid != "admin001" else "admin"
        # make usernames unique by appending emp index when clashes possible
        if eid.startswith("emp-"):
            username = f"{slug(name)}.{eid.split('-')[1]}"
        pw_hash  = ADMIN_HASH if eid == "admin001" else EMP_HASH
        is_del   = status == "INACTIVE"
        del_at   = f"{jdate} 00:00:00" if is_del else None
        created  = f"{jdate} 08:30:00"
        ua_rows.append((eid, username, pw_hash, None, role, created, created, is_del, del_at))
    bulk(
        """
        INSERT INTO user_account
            (employee_id, username, password_hash, last_password_hash, role,
             created_at, updated_at, delete_flag, deleted_at)
        VALUES %s
        """,
        ua_rows,
    )
    print(f"  {len(ua_rows)} user accounts inserted.")

    # 5. contract
    print("Inserting contracts …")
    ctr_rows = [make_contract(emp, idx + 1) for idx, emp in enumerate(ALL_EMPS)]
    bulk(
        """
        INSERT INTO contract
            (id, employee_id, start_date, end_date, contract_type, terms, status,
             salary_rank, base_salary, insurance_base, position_code, salary_step, dependent_count,
             created_at, updated_at, delete_flag, deleted_at)
        VALUES %s
        """,
        ctr_rows,
    )
    print(f"  {len(ctr_rows)} contracts inserted.")

    # 6. device
    print("Inserting devices …")
    bulk(
        "INSERT INTO device (device_id, device_name, log_type, delete_flag, deleted_at) VALUES %s",
        [
            ("dev-001", "Main Entrance IN",  "IN",  False, None),
            ("dev-002", "Main Entrance OUT", "OUT", False, None),
            ("dev-003", "Side Gate IN",      "IN",  False, None),
            ("dev-004", "Side Gate OUT",     "OUT", False, None),
            ("dev-005", "Server Room IN",    "IN",  False, None),
            ("dev-006", "Server Room OUT",   "OUT", False, None),
        ],
    )

    # 7 & 8. attendance + check_in_log (Jun 2025 – Apr 2026)
    print("Generating attendance & check_in_log …")
    att_rows = []
    log_rows = []
    att_seq  = 1
    log_seq  = 1

    for emp_idx, eid in enumerate(ACTIVE_IDS):
        ab_p  = absent_prob(eid)
        la_p  = late_prob(eid)
        nc_p  = no_cout_prob(eid)
        in_d  = IN_DEVS[emp_idx % len(IN_DEVS)]
        out_d = OUT_DEVS[emp_idx % len(OUT_DEVS)]
        r_day = random.Random(hash(eid) ^ 0x1111)

        for year, month in MONTHS:
            for d in work_days(year, month):
                # Random attendance decision
                if r_day.random() < ab_p:
                    continue  # absent

                late_min = 0
                if r_day.random() < la_p:
                    late_min = r_day.randint(5, 45)

                has_cout = r_day.random() >= nc_p

                ci = dt(d, 8, late_min)
                co = dt(d, 17) if has_cout else None

                late_hour    = round(late_min / 60, 4)
                if has_cout:
                    working_hour = round((co - ci).total_seconds() / 3600, 4)
                    paid_hour    = round(max(0.0, working_hour - late_hour), 4)
                else:
                    working_hour = paid_hour = 0.0

                working_day = round(working_hour / 8, 4)
                paid_day    = round(paid_hour / 8, 4)
                violate     = late_hour > 0 or not has_cout

                att_id = f"att-{att_seq:06d}"
                att_seq += 1

                att_rows.append((
                    att_id, eid, d, ci, co,
                    late_hour, working_hour, paid_hour,
                    working_day, paid_day, violate,
                    ci, co or ci, False, None,
                ))

                log_rows.append((f"log-{log_seq:06d}", in_d, eid, ci, "IN", False, None))
                log_seq += 1

                if has_cout:
                    log_rows.append((f"log-{log_seq:06d}", out_d, eid, co, "OUT", False, None))
                    log_seq += 1

    bulk(
        """
        INSERT INTO attendance
            (attendance_id, employee_id, attendance_date,
             check_in, check_out,
             late_hour, working_hour, paid_hour, working_day, paid_day,
             violate, created_at, updated_at, delete_flag, deleted_at)
        VALUES %s
        """,
        att_rows,
    )
    print(f"  {len(att_rows)} attendance rows.")

    bulk(
        """
        INSERT INTO check_in_log
            (log_id, device_id, employee_id, log_time, log_type, delete_flag, deleted_at)
        VALUES %s
        """,
        log_rows,
    )
    print(f"  {len(log_rows)} check_in_log rows.")

    # 9. leave_request
    # Includes leave_type (NOT NULL) required since V10
    print("Inserting leave_request …")
    bulk(
        """
        INSERT INTO leave_request
            (leave_request_id, employee_id, leave_type, reason, start_time, end_time,
             status, created_at, updated_at, delete_flag, deleted_at)
        VALUES %s
        """,
        [
            # ── 2025-06 ──────────────────────────────────────────────────────
            ("lrq-001","emp-001","ANNUAL","Summer vacation","2025-06-16 08:00","2025-06-17 17:00",
             "APPROVED","2025-06-09 09:00","2025-06-13 14:00",False,None),
            ("lrq-002","emp-005","SICK","Flu symptoms","2025-06-23 08:00","2025-06-23 17:00",
             "APPROVED","2025-06-23 07:30","2025-06-24 08:00",False,None),
            ("lrq-003","mgr-002","ANNUAL","Family trip","2025-06-26 08:00","2025-06-27 17:00",
             "APPROVED","2025-06-18 10:00","2025-06-23 15:00",False,None),

            # ── 2025-07 ──────────────────────────────────────────────────────
            ("lrq-004","emp-010","SICK","Hospital visit","2025-07-07 08:00","2025-07-07 17:00",
             "APPROVED","2025-07-07 07:45","2025-07-08 09:00",False,None),
            ("lrq-005","ldr-001","ANNUAL","Extended weekend","2025-07-21 08:00","2025-07-22 17:00",
             "APPROVED","2025-07-14 09:00","2025-07-18 14:00",False,None),
            ("lrq-006","emp-003","UNPAID","Personal errands","2025-07-28 08:00","2025-07-29 17:00",
             "REJECTED","2025-07-21 10:00","2025-07-25 09:00",False,None),

            # ── 2025-08 ──────────────────────────────────────────────────────
            ("lrq-007","emp-001","ANNUAL","Annual leave week","2025-08-11 08:00","2025-08-15 17:00",
             "APPROVED","2025-08-01 09:00","2025-08-07 14:00",False,None),
            ("lrq-008","emp-020","SICK","Food poisoning","2025-08-18 08:00","2025-08-19 17:00",
             "APPROVED","2025-08-18 07:30","2025-08-20 08:00",False,None),
            ("lrq-009","ldr-002","MARRIAGE","Wedding ceremony","2025-08-25 08:00","2025-08-27 17:00",
             "APPROVED","2025-08-11 10:00","2025-08-20 15:00",False,None),

            # ── 2025-09 ──────────────────────────────────────────────────────
            ("lrq-010","emp-015","SICK","Back pain","2025-09-08 08:00","2025-09-09 17:00",
             "APPROVED","2025-09-08 08:00","2025-09-10 09:00",False,None),
            ("lrq-011","mgr-003","ANNUAL","Holiday trip","2025-09-15 08:00","2025-09-17 17:00",
             "APPROVED","2025-09-05 09:00","2025-09-11 14:00",False,None),
            ("lrq-012","emp-030","COMPENSATORY","Used comp day","2025-09-22 08:00","2025-09-22 17:00",
             "APPROVED","2025-09-15 10:00","2025-09-19 09:00",False,None),

            # ── 2025-10 ──────────────────────────────────────────────────────
            ("lrq-013","emp-001","ANNUAL","October break","2025-10-06 08:00","2025-10-07 17:00",
             "APPROVED","2025-09-29 09:00","2025-10-03 15:00",False,None),
            ("lrq-014","emp-045","SICK","Fever and cold","2025-10-13 08:00","2025-10-14 17:00",
             "APPROVED","2025-10-13 07:45","2025-10-15 08:00",False,None),
            ("lrq-015","ldr-004","BEREAVEMENT","Family bereavement","2025-10-20 08:00","2025-10-22 17:00",
             "APPROVED","2025-10-19 18:00","2025-10-20 10:00",False,None),
            ("lrq-016","emp-060","ANNUAL","Personal leave","2025-10-27 08:00","2025-10-27 17:00",
             "REJECTED","2025-10-20 09:00","2025-10-24 11:00",False,None),

            # ── 2025-11 ──────────────────────────────────────────────────────
            ("lrq-017","emp-008","SICK","Migraine","2025-11-10 08:00","2025-11-10 17:00",
             "APPROVED","2025-11-10 07:30","2025-11-11 09:00",False,None),
            ("lrq-018","mgr-001","ANNUAL","End-year trip","2025-11-17 08:00","2025-11-18 17:00",
             "APPROVED","2025-11-07 09:00","2025-11-13 15:00",False,None),
            ("lrq-019","emp-025","MATERNITY","Maternity leave start","2025-11-24 08:00","2026-02-20 17:00",
             "APPROVED","2025-11-10 10:00","2025-11-18 14:00",False,None),

            # ── 2025-12 ──────────────────────────────────────────────────────
            ("lrq-020","emp-001","ANNUAL","Christmas break","2025-12-22 08:00","2025-12-23 17:00",
             "APPROVED","2025-12-15 09:00","2025-12-18 14:00",False,None),
            ("lrq-021","emp-050","SICK","Year-end cold","2025-12-10 08:00","2025-12-11 17:00",
             "APPROVED","2025-12-10 07:45","2025-12-12 08:00",False,None),
            ("lrq-022","ldr-001","ANNUAL","Year-end vacation","2025-12-29 08:00","2025-12-31 17:00",
             "APPROVED","2025-12-15 10:00","2025-12-22 15:00",False,None),

            # ── 2026-01 ──────────────────────────────────────────────────────
            ("lrq-023","emp-001","ANNUAL","New Year extension","2026-01-02 08:00","2026-01-02 17:00",
             "APPROVED","2025-12-28 10:00","2025-12-30 15:00",False,None),
            ("lrq-024","emp-010","SICK","Dentist appointment","2026-01-08 08:00","2026-01-08 17:00",
             "APPROVED","2026-01-05 10:00","2026-01-07 11:00",False,None),
            ("lrq-025","emp-022","ANNUAL","Family wedding","2026-01-19 08:00","2026-01-20 17:00",
             "APPROVED","2026-01-12 09:00","2026-01-16 14:00",False,None),
            ("lrq-026","emp-040","SICK","Hospital check-up","2026-01-26 08:00","2026-01-26 17:00",
             "REJECTED","2026-01-23 17:00","2026-01-25 09:00",False,None),

            # ── 2026-02 ──────────────────────────────────────────────────────
            ("lrq-027","emp-001","ANNUAL","Tet extension","2026-02-02 08:00","2026-02-04 17:00",
             "APPROVED","2026-01-26 09:00","2026-01-30 14:00",False,None),
            ("lrq-028","mgr-002","ANNUAL","Post-Tet break","2026-02-16 08:00","2026-02-17 17:00",
             "APPROVED","2026-02-09 10:00","2026-02-13 09:00",False,None),
            ("lrq-029","ldr-003","SICK","Sick post-Tet","2026-02-23 08:00","2026-02-23 17:00",
             "APPROVED","2026-02-23 07:30","2026-02-24 09:00",False,None),
            ("lrq-030","emp-055","PATERNITY","Paternity leave","2026-02-09 08:00","2026-02-13 17:00",
             "APPROVED","2026-02-02 10:00","2026-02-06 15:00",False,None),

            # ── 2026-03 ──────────────────────────────────────────────────────
            ("lrq-031","emp-001","ANNUAL","March break","2026-03-09 08:00","2026-03-10 17:00",
             "APPROVED","2026-03-02 09:00","2026-03-06 14:00",False,None),
            ("lrq-032","emp-033","SICK","Food poisoning","2026-03-16 08:00","2026-03-16 17:00",
             "TO_APPROVE","2026-03-16 07:45",None,False,None),
            ("lrq-033","emp-070","ANNUAL","Personal day","2026-03-23 08:00","2026-03-23 17:00",
             "LEADER_APPROVED","2026-03-16 09:00","2026-03-20 14:00",False,None),
            ("lrq-034","ldr-001","ANNUAL","Summer preview leave","2026-03-30 08:00","2026-03-31 17:00",
             "MANAGER_APPROVED","2026-03-23 10:00","2026-03-27 09:00",False,None),

            # ── 2026-04 ──────────────────────────────────────────────────────
            ("lrq-035","emp-002","ANNUAL","April break","2026-04-13 08:00","2026-04-14 17:00",
             "APPROVED","2026-04-06 09:00","2026-04-10 14:00",False,None),
            ("lrq-036","emp-018","SICK","Spring cold","2026-04-20 08:00","2026-04-20 17:00",
             "TO_APPROVE","2026-04-20 07:30",None,False,None),
            ("lrq-037","hr-001","ANNUAL","HR conference","2026-04-27 08:00","2026-04-28 17:00",
             "DRAFT","2026-04-21 09:00",None,False,None),
            ("lrq-038","emp-075","COMPENSATORY","Comp day from OT","2026-04-06 08:00","2026-04-06 17:00",
             "APPROVED","2026-03-30 10:00","2026-04-03 15:00",False,None),
        ],
    )

    # 10. ot_request
    print("Inserting ot_request …")
    bulk(
        """
        INSERT INTO ot_request
            (ot_request_id, employee_id, start_time, end_time,
             status, created_at, updated_at, delete_flag, deleted_at)
        VALUES %s
        """,
        [
            # ── 2025-06 ──────────────────────────────────────────────────────
            ("otr-001","emp-001","2025-06-04 17:00","2025-06-04 20:00",
             "APPROVED","2025-06-02 09:00","2025-06-03 15:00",False,None),
            ("otr-002","ldr-001","2025-06-07 09:00","2025-06-07 14:00",
             "APPROVED","2025-06-04 10:00","2025-06-06 09:00",False,None),
            ("otr-003","emp-010","2025-06-11 17:00","2025-06-11 19:30",
             "APPROVED","2025-06-09 11:00","2025-06-10 14:00",False,None),
            ("otr-004","mgr-001","2025-06-18 22:00","2025-06-19 01:00",
             "APPROVED","2025-06-16 08:00","2025-06-17 10:00",False,None),
            ("otr-005","emp-020","2025-06-21 09:00","2025-06-21 13:00",
             "REJECTED","2025-06-18 17:00","2025-06-20 09:00",False,None),

            # ── 2025-07 ──────────────────────────────────────────────────────
            ("otr-006","emp-001","2025-07-02 17:00","2025-07-02 20:00",
             "APPROVED","2025-06-30 09:00","2025-07-01 15:00",False,None),
            ("otr-007","emp-015","2025-07-05 09:00","2025-07-05 14:00",
             "APPROVED","2025-07-02 10:00","2025-07-04 09:00",False,None),
            ("otr-008","ldr-002","2025-07-16 17:00","2025-07-16 21:00",
             "APPROVED","2025-07-14 11:00","2025-07-15 14:00",False,None),
            ("otr-009","emp-030","2025-07-19 09:00","2025-07-19 13:00",
             "REJECTED","2025-07-16 17:00","2025-07-18 09:00",False,None),

            # ── 2025-08 ──────────────────────────────────────────────────────
            ("otr-010","emp-001","2025-08-06 17:00","2025-08-06 19:30",
             "APPROVED","2025-08-04 09:00","2025-08-05 11:00",False,None),
            ("otr-011","mgr-003","2025-08-09 09:00","2025-08-09 15:00",
             "APPROVED","2025-08-06 08:00","2025-08-07 10:00",False,None),
            ("otr-012","emp-045","2025-08-20 22:00","2025-08-21 01:00",
             "APPROVED","2025-08-18 09:00","2025-08-19 15:00",False,None),
            ("otr-013","ldr-004","2025-08-27 17:00","2025-08-27 20:00",
             "LEADER_APPROVED","2025-08-25 11:00","2025-08-26 09:00",False,None),

            # ── 2025-09 ──────────────────────────────────────────────────────
            ("otr-014","emp-001","2025-09-03 17:00","2025-09-03 20:00",
             "APPROVED","2025-09-01 09:00","2025-09-02 15:00",False,None),
            ("otr-015","emp-060","2025-09-06 09:00","2025-09-06 14:00",
             "APPROVED","2025-09-03 10:00","2025-09-05 09:00",False,None),
            ("otr-016","mgr-004","2025-09-17 22:00","2025-09-18 01:00",
             "APPROVED","2025-09-15 08:00","2025-09-16 10:00",False,None),

            # ── 2025-10 ──────────────────────────────────────────────────────
            ("otr-017","emp-001","2025-10-08 17:00","2025-10-08 20:00",
             "APPROVED","2025-10-06 09:00","2025-10-07 15:00",False,None),
            ("otr-018","ldr-001","2025-10-11 09:00","2025-10-11 14:00",
             "APPROVED","2025-10-08 10:00","2025-10-10 09:00",False,None),
            ("otr-019","emp-035","2025-10-22 17:00","2025-10-22 19:00",
             "REJECTED","2025-10-20 17:30","2025-10-21 09:00",False,None),
            ("otr-020","mgr-005","2025-10-25 09:00","2025-10-25 15:00",
             "APPROVED","2025-10-22 08:00","2025-10-23 10:00",False,None),

            # ── 2025-11 ──────────────────────────────────────────────────────
            ("otr-021","emp-001","2025-11-05 17:00","2025-11-05 20:00",
             "APPROVED","2025-11-03 09:00","2025-11-04 15:00",False,None),
            ("otr-022","emp-050","2025-11-08 09:00","2025-11-08 14:00",
             "APPROVED","2025-11-05 10:00","2025-11-07 09:00",False,None),
            ("otr-023","ldr-006","2025-11-19 22:00","2025-11-20 01:00",
             "APPROVED","2025-11-17 09:00","2025-11-18 15:00",False,None),

            # ── 2025-12 ──────────────────────────────────────────────────────
            ("otr-024","emp-001","2025-12-03 17:00","2025-12-03 21:00",
             "APPROVED","2025-12-01 09:00","2025-12-02 15:00",False,None),
            ("otr-025","mgr-001","2025-12-06 09:00","2025-12-06 15:00",
             "APPROVED","2025-12-03 08:00","2025-12-04 10:00",False,None),
            ("otr-026","emp-070","2025-12-17 22:00","2025-12-18 01:00",
             "APPROVED","2025-12-15 09:00","2025-12-16 15:00",False,None),
            ("otr-027","ldr-002","2025-12-20 09:00","2025-12-20 14:00",
             "MANAGER_APPROVED","2025-12-17 10:00","2025-12-18 09:00",False,None),

            # ── 2026-01 ──────────────────────────────────────────────────────
            ("otr-028","emp-001","2026-01-07 17:00","2026-01-07 20:00",
             "APPROVED","2026-01-05 09:00","2026-01-06 15:00",False,None),
            ("otr-029","emp-022","2026-01-10 09:00","2026-01-10 14:00",
             "APPROVED","2026-01-07 10:00","2026-01-09 09:00",False,None),
            ("otr-030","ldr-001","2026-01-21 22:00","2026-01-22 01:00",
             "APPROVED","2026-01-19 09:00","2026-01-20 15:00",False,None),
            ("otr-031","emp-040","2026-01-28 17:00","2026-01-28 19:00",
             "REJECTED","2026-01-26 17:30",None,False,None),

            # ── 2026-02 ──────────────────────────────────────────────────────
            ("otr-032","emp-001","2026-02-04 17:00","2026-02-04 19:30",
             "APPROVED","2026-02-02 09:00","2026-02-03 11:00",False,None),
            ("otr-033","mgr-002","2026-02-07 09:00","2026-02-07 15:00",
             "APPROVED","2026-02-04 08:00","2026-02-06 09:00",False,None),
            ("otr-034","emp-055","2026-02-18 17:00","2026-02-18 20:00",
             "LEADER_APPROVED","2026-02-16 10:00","2026-02-17 09:00",False,None),

            # ── 2026-03 ──────────────────────────────────────────────────────
            ("otr-035","emp-001","2026-03-04 17:00","2026-03-04 20:00",
             "APPROVED","2026-03-02 09:00","2026-03-03 15:00",False,None),
            ("otr-036","emp-033","2026-03-07 09:00","2026-03-07 14:00",
             "APPROVED","2026-03-04 10:00","2026-03-06 09:00",False,None),
            ("otr-037","ldr-004","2026-03-18 22:00","2026-03-19 01:00",
             "TO_APPROVE","2026-03-17 17:30",None,False,None),
            ("otr-038","emp-075","2026-03-25 17:00","2026-03-25 19:00",
             "DRAFT","2026-03-24 18:00",None,False,None),

            # ── 2026-04 ──────────────────────────────────────────────────────
            ("otr-039","emp-001","2026-04-08 17:00","2026-04-08 20:00",
             "APPROVED","2026-04-06 09:00","2026-04-07 15:00",False,None),
            ("otr-040","mgr-004","2026-04-11 09:00","2026-04-11 15:00",
             "APPROVED","2026-04-08 08:00","2026-04-09 10:00",False,None),
            ("otr-041","ldr-005","2026-04-22 22:00","2026-04-23 01:00",
             "MANAGER_APPROVED","2026-04-20 09:00","2026-04-21 15:00",False,None),
            ("otr-042","emp-060","2026-04-25 09:00","2026-04-25 14:00",
             "TO_APPROVE","2026-04-24 17:30",None,False,None),
        ],
    )

    # 11. work_day — derive the per-day single source of truth so payroll
    #     (which reads WorkDay for NCtt + KPI2) produces correct results.
    print("Generating work_day records …")

    # 11a. PRESENT from attendance (check-in exists). No-checkout days stay PRESENT
    #      but keep violation=true so KPI2 reflects them.
    run("""
        INSERT INTO work_day
            (id, employee_id, work_date, type, source, check_in, check_out,
             late_hour, working_hour, ot_minutes, paid_day, working_day,
             violation, locked, attendance_id, created_at, updated_at)
        SELECT gen_random_uuid()::text, a.employee_id, a.attendance_date,
               'PRESENT', 'CHECKIN', a.check_in, a.check_out,
               COALESCE(a.late_hour,0), COALESCE(a.working_hour,0), 0,
               COALESCE(a.paid_day,0), COALESCE(a.working_day,0),
               COALESCE(a.violate,false), false, a.attendance_id,
               a.created_at, a.updated_at
        FROM attendance a
        WHERE a.delete_flag = false
        ON CONFLICT (employee_id, work_date) DO NOTHING
    """)

    # 11b. LEAVE from APPROVED leave requests, expanded to weekdays. Present wins on clash.
    run("""
        INSERT INTO work_day
            (id, employee_id, work_date, type, source, leave_type,
             late_hour, working_hour, ot_minutes, paid_day, working_day,
             violation, locked, leave_request_id, created_at, updated_at)
        SELECT gen_random_uuid()::text, lr.employee_id, g::date, 'LEAVE', 'LEAVE_REQUEST', lr.leave_type,
               0, 0, 0, CASE WHEN lr.leave_type = 'UNPAID' THEN 0 ELSE 1 END, 0,
               false, false, lr.leave_request_id, NOW(), NOW()
        FROM leave_request lr
        CROSS JOIN generate_series(lr.start_time::date, lr.end_time::date, interval '1 day') g
        WHERE lr.status = 'APPROVED' AND lr.delete_flag = false
          AND EXTRACT(ISODOW FROM g) < 6
        ON CONFLICT (employee_id, work_date) DO NOTHING
    """)

    # 11c. ABSENT fill for active employees on weekdays with nothing recorded.
    run("""
        INSERT INTO work_day
            (id, employee_id, work_date, type, source,
             late_hour, working_hour, ot_minutes, paid_day, working_day,
             violation, locked, created_at, updated_at)
        SELECT gen_random_uuid()::text, e.employee_id, g::date, 'ABSENT', 'SYSTEM',
               0, 0, 0, 0, 0, true, false, NOW(), NOW()
        FROM employee_info e
        CROSS JOIN generate_series(DATE '2025-06-01', DATE '2026-04-30', interval '1 day') g
        WHERE e.status = 'ACTIVE' AND e.delete_flag = false AND e.role <> 'SYSTEM_ADMIN'
          AND EXTRACT(ISODOW FROM g) < 6
          AND (e.date_of_joining IS NULL OR e.date_of_joining <= g::date)
          AND NOT EXISTS (
              SELECT 1 FROM work_day w WHERE w.employee_id = e.employee_id AND w.work_date = g::date)
    """)
    print("  work_day generated.")

    # 12. timesheet — monthly aggregate of work_day (same logic the app builds on close).
    #     KPI2 follows 01/2020/QC-VTI: violation→1.00(C), else leave→1.02(B), else 1.04(A).
    print("Generating timesheet records …")
    run("""
        INSERT INTO timesheet
            (id, employee_id, ts_year, ts_month, standard_working_days, actual_working_days, ot_hours,
             holiday_leave_days, annual_leave_days, comp_leave_days, bereavement_marriage_days,
             insurance_leave_days, unpaid_leave_days, old_rate_paid_days, new_rate_paid_days,
             total_paid_days, carry_over_prev_month, business_go_out_days, wfh_days,
             unexplained_absence_days, late_early_total_hours, violation_to_comp, violation_to_leave,
             violation_to_unpaid, unnotified_absence_count, under8h_count, attendance_request_errors,
             kpi2_deduction, kpi2_index, prev_month_violation_adjust, created_at, updated_at)
        SELECT gen_random_uuid()::text, w.employee_id,
               EXTRACT(YEAR FROM w.work_date)::int, EXTRACT(MONTH FROM w.work_date)::int,
               COUNT(*)::int,
               SUM(CASE WHEN w.type IN ('PRESENT','HOLIDAY_WORK') THEN w.paid_day ELSE 0 END),
               ROUND(COALESCE(SUM(w.ot_minutes),0)/60.0, 2),
               SUM(CASE WHEN w.type='HOLIDAY' THEN 1 ELSE 0 END),
               SUM(CASE WHEN w.type='LEAVE' AND w.leave_type='ANNUAL' THEN 1 ELSE 0 END),
               SUM(CASE WHEN w.type='LEAVE' AND w.leave_type='COMPENSATORY' THEN 1 ELSE 0 END),
               SUM(CASE WHEN w.type='LEAVE' AND w.leave_type IN ('BEREAVEMENT','MARRIAGE') THEN 1 ELSE 0 END),
               SUM(CASE WHEN w.type='LEAVE' AND w.leave_type IN ('SICK','MATERNITY','PATERNITY') THEN 1 ELSE 0 END),
               SUM(CASE WHEN w.type='LEAVE' AND w.leave_type='UNPAID' THEN 1 ELSE 0 END),
               0, SUM(w.paid_day), SUM(w.paid_day), 0, 0, 0,
               SUM(CASE WHEN w.type='ABSENT' THEN 1 ELSE 0 END),
               SUM(COALESCE(w.late_hour,0)),
               0, 0, 0,
               SUM(CASE WHEN w.type='ABSENT' THEN 1 ELSE 0 END)::int,
               SUM(CASE WHEN w.type IN ('PRESENT','HOLIDAY_WORK') AND COALESCE(w.working_hour,0) < 8 THEN 1 ELSE 0 END)::int,
               0, 0,
               CASE WHEN BOOL_OR(w.violation) THEN 1.00
                    WHEN BOOL_OR(w.type='LEAVE') THEN 1.02
                    ELSE 1.04 END,
               0, NOW(), NOW()
        FROM work_day w
        GROUP BY w.employee_id, EXTRACT(YEAR FROM w.work_date), EXTRACT(MONTH FROM w.work_date)
    """)
    print("  timesheet generated.")

    conn.commit()
    print("\nAll data committed.")

except Exception as e:
    conn.rollback()
    print(f"\nERROR — rolled back: {e}")
    raise
finally:
    cur.close()
    conn.close()

# ── verification ──────────────────────────────────────────────────────────────
conn2 = psycopg2.connect(host="localhost", port=5432,
                          dbname="postgres", user="postgres", password="postgres")
cur2  = conn2.cursor()
TABLES = [
    "department","employee_info","user_account","contract",
    "device","attendance","check_in_log","leave_request","ot_request",
    "work_day","timesheet",
]
print("\nRow counts:")
for t in TABLES:
    cur2.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t:<22} {cur2.fetchone()[0]:>6} rows")
cur2.close()
conn2.close()
