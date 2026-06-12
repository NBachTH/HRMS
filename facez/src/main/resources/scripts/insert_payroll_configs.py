"""
Insert payroll configuration JSON files into the system_config table.

Reads the four config files from config/payroll/, clears any existing records
for those types, then inserts fresh records with active=true.

PIT is special: both 2025 and 2026 brackets are inserted; only 2026 is active.
"""

import psycopg2
import json
import uuid
from datetime import datetime

# Resolve config/payroll relative to this script (…/resources/scripts/ → …/resources/config/payroll)
import os
BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "payroll"))

conn = psycopg2.connect(
    host="localhost", port=5432,
    dbname="postgres", user="postgres", password="postgres",
)
conn.autocommit = False
cur = conn.cursor()

now = datetime.now()

def read_first_json(path):
    """
    Parse only the first top-level JSON object in a file.
    Handles allowance-config.json which has a stray second blob appended.
    """
    with open(path, encoding="utf-8") as f:
        content = f.read().strip()
    obj, _ = json.JSONDecoder().raw_decode(content)
    return obj

def upsert(config_type, version, effective_date, legal_basis, data):
    cur.execute(
        "DELETE FROM system_config WHERE config_type = %s AND version = %s",
        (config_type, version),
    )
    cur.execute(
        "UPDATE system_config SET active = false WHERE config_type = %s AND active = true",
        (config_type,),
    )
    cur.execute(
        """
        INSERT INTO system_config
            (id, config_type, version, effective_date, legal_basis, config_data, active,
             created_at, updated_at, created_by, updated_by)
        VALUES (%s, %s, %s, %s, %s, %s::jsonb, true, %s, %s, 'system', 'system')
        """,
        (str(uuid.uuid4()), config_type, version, effective_date,
         legal_basis, json.dumps(data, ensure_ascii=False), now, now),
    )
    print(f"  Inserted {config_type:<15} v{version}  active=True")

try:
    # ── SALARY_GRADE ──────────────────────────────────────────────────────────
    sg = read_first_json(rf"{BASE}\salary-grades.json")
    upsert(
        "SALARY_GRADE", sg["version"], sg["effective_date"],
        sg.get("legal_basis"), sg,
    )

    # ── ALLOWANCE ─────────────────────────────────────────────────────────────
    al = read_first_json(rf"{BASE}\allowance-config.json")
    upsert(
        "ALLOWANCE", al["version"], al["effective_date"],
        al.get("legal_basis"), al,
    )

    # ── INSURANCE ─────────────────────────────────────────────────────────────
    ins = read_first_json(rf"{BASE}\insurance-config.json")
    upsert(
        "INSURANCE", ins["version"], ins["effective_date"],
        ins.get("legal_basis", ins.get("note")), ins,
    )

    # ── PIT — both 2025 and 2026 brackets; only 2026 active ──────────────────
    pit_file = read_first_json(rf"{BASE}\pit-config.json")
    # Clear all existing PIT rows first so we can set active correctly
    cur.execute("DELETE FROM system_config WHERE config_type = 'PIT'")

    for year, pit_cfg in sorted(pit_file["configs"].items()):
        is_active = (year == "2026")
        cur.execute(
            """
            INSERT INTO system_config
                (id, config_type, version, effective_date, legal_basis, config_data, active,
                 created_at, updated_at, created_by, updated_by)
            VALUES (%s, 'PIT', %s, %s, %s, %s::jsonb, %s, %s, %s, 'system', 'system')
            """,
            (
                str(uuid.uuid4()), year, f"{year}-01-01",
                pit_cfg.get("legal_basis"),
                json.dumps(pit_cfg, ensure_ascii=False),
                is_active, now, now,
            ),
        )
        print(f"  Inserted PIT            v{year}  active={is_active}")

    conn.commit()
    print("\nAll payroll configs committed.")

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
cur2.execute(
    "SELECT config_type, version, active, effective_date FROM system_config ORDER BY config_type, version"
)
print("\nsystem_config rows:")
for config_type, version, active, eff in cur2.fetchall():
    print(f"  {config_type:<15} v{version:<10} active={str(active):<6} effective={eff}")
cur2.close()
conn2.close()
