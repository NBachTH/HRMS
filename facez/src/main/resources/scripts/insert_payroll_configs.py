"""
Seed the typed, effective-dated payroll config tables from the JSON files in config/payroll/.

Populates (as PUBLISHED, append-only effective-dated versions):
  - salary_grade_config (+ salary_grade, salary_grade_step)
  - pit_config          (+ pit_bracket)          — one version per year in pit-config.json
  - insurance_config    (+ insurance_eligible_contract_type)
  - allowance_config    (+ allowance_level, japanese_allowance_level, allowance_rule_value)

Tables are TRUNCATEd first so re-running stays idempotent and never trips the
"one PUBLISHED per effective_from" unique index. Run after the schema (V27) is applied.
"""

import psycopg2
import json
import os
import uuid
from datetime import datetime

BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "payroll"))

conn = psycopg2.connect(
    host="localhost", port=5432,
    dbname="postgres", user="postgres", password="postgres",
)
conn.autocommit = False
cur = conn.cursor()

NOW = datetime.now()


def uid():
    return str(uuid.uuid4())


def read_first_json(path):
    """Parse only the first top-level JSON object (allowance-config.json has a stray second blob)."""
    with open(path, encoding="utf-8") as f:
        content = f.read().strip()
    obj, _ = json.JSONDecoder().raw_decode(content)
    return obj


def audit(*vals):
    """Append (created_at, created_by, updated_at, updated_by) to a row tuple."""
    return (*vals, NOW, "system", NOW, "system")


try:
    print("Truncating payroll config tables …")
    cur.execute("""
        TRUNCATE TABLE
            salary_grade_config, pit_config, insurance_config, allowance_config
        CASCADE
    """)

    # ── SALARY GRADE ──────────────────────────────────────────────────────────
    sg = read_first_json(os.path.join(BASE, "salary-grades.json"))
    sg_id = uid()
    cur.execute(
        """INSERT INTO salary_grade_config
               (id, effective_from, status, legal_basis, unit, minimum_wage_region_i,
                created_at, created_by, updated_at, updated_by)
           VALUES (%s,%s,'PUBLISHED',%s,%s,%s,%s,%s,%s,%s)""",
        audit(sg_id, sg["effective_date"], sg.get("legal_basis"),
              sg.get("unit", "thousand_vnd"), sg.get("minimum_wage_region_I")),
    )
    for code, grade in sg["grades"].items():
        g_id = uid()
        cur.execute(
            "INSERT INTO salary_grade (id, config_id, grade_code, title, track) VALUES (%s,%s,%s,%s,%s)",
            (g_id, sg_id, code, grade.get("title"), grade.get("track")),
        )
        for i, amount in enumerate(grade["steps"], start=1):
            cur.execute(
                "INSERT INTO salary_grade_step (id, grade_id, step_no, amount_thousand_vnd) VALUES (%s,%s,%s,%s)",
                (uid(), g_id, i, amount),
            )
    print(f"  salary_grade_config: 1 version, {len(sg['grades'])} grades")

    # ── PIT (one version per year) ────────────────────────────────────────────
    pit = read_first_json(os.path.join(BASE, "pit-config.json"))
    for year, cfg in sorted(pit["configs"].items()):
        p_id = uid()
        cur.execute(
            """INSERT INTO pit_config
                   (id, effective_from, status, legal_basis, resolution,
                    personal_relief, dependent_relief,
                    created_at, created_by, updated_at, updated_by)
               VALUES (%s,%s,'PUBLISHED',%s,%s,%s,%s,%s,%s,%s,%s)""",
            audit(p_id, f"{year}-01-01", cfg.get("legal_basis"), cfg.get("resolution"),
                  cfg["personal_relief"], cfg["dependent_relief"]),
        )
        for seq, b in enumerate(cfg["brackets"], start=1):
            cur.execute(
                """INSERT INTO pit_bracket (id, config_id, seq, income_from, income_to, rate, quick_deduction)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (uid(), p_id, seq, b["from"], b.get("to"), b["rate"], b.get("quick_deduction", 0)),
            )
    print(f"  pit_config: {len(pit['configs'])} versions")

    # ── INSURANCE ─────────────────────────────────────────────────────────────
    ins = read_first_json(os.path.join(BASE, "insurance-config.json"))
    ee, er = ins["employee_rates"], ins["employer_rates"]
    i_id = uid()
    cur.execute(
        """INSERT INTO insurance_config
               (id, effective_from, status, legal_basis,
                government_base_salary, insurance_ceiling, statutory_min_wage,
                ee_bhxh, ee_bhyt, ee_bhtn,
                er_bhxh_pension, er_bhxh_sickness_maternity, er_bhxh_accident, er_bhyt, er_bhtn,
                probation_exempt, created_at, created_by, updated_at, updated_by)
           VALUES (%s,%s,'PUBLISHED',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        audit(i_id, ins["effective_date"], ins.get("legal_basis"),
              ins.get("government_base_salary"), ins.get("insurance_ceiling"), ins.get("statutory_min_wage"),
              ee["bhxh"], ee["bhyt"], ee["bhtn"],
              er["bhxh_pension"], er["bhxh_sickness_maternity"], er["bhxh_accident"], er["bhyt"], er["bhtn"],
              ins.get("probation_exempt", True)),
    )
    for ct in ins.get("eligible_contract_types", []):
        cur.execute(
            "INSERT INTO insurance_eligible_contract_type (id, config_id, contract_type) VALUES (%s,%s,%s)",
            (uid(), i_id, ct),
        )
    print(f"  insurance_config: 1 version, {len(ins.get('eligible_contract_types', []))} eligible types")

    # ── ALLOWANCE ─────────────────────────────────────────────────────────────
    al = read_first_json(os.path.join(BASE, "allowance-config.json"))
    living = al["living_allowance"]
    jp = al["japanese_allowance"]
    a_id = uid()
    cur.execute(
        """INSERT INTO allowance_config
               (id, effective_from, status, legal_basis,
                living_prorated, japanese_prorated, japanese_min_contract_months,
                created_at, created_by, updated_at, updated_by)
           VALUES (%s,%s,'PUBLISHED',%s,%s,%s,%s,%s,%s,%s,%s)""",
        audit(a_id, al["effective_date"], al.get("legal_basis"),
              living.get("prorated", True), jp.get("prorated", False), jp.get("min_contract_months")),
    )
    for level_key, amts in living["levels"].items():
        cur.execute(
            """INSERT INTO allowance_level (id, config_id, level_key, meal, phone, transport, housing)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (uid(), a_id, level_key, amts.get("meal", 0), amts.get("phone", 0),
             amts.get("transport", 0), amts.get("housing", 0)),
        )
    for jlpt, amount in jp.get("levels", {}).items():
        cur.execute(
            "INSERT INTO japanese_allowance_level (id, config_id, jlpt_level, amount) VALUES (%s,%s,%s,%s)",
            (uid(), a_id, jlpt, amount),
        )

    rule_lists = [
        ("LIVING_ELIGIBLE", living.get("eligible_contracts", [])),
        ("JP_ELIGIBLE", jp.get("eligible_contracts", [])),
        ("JP_EXCLUDED_POSITION", jp.get("excluded_positions", [])),
        ("JP_EXCLUDED_LEVEL", jp.get("excluded_levels", [])),
    ]
    for kind, values in rule_lists:
        for v in values:
            cur.execute(
                "INSERT INTO allowance_rule_value (id, config_id, kind, value) VALUES (%s,%s,%s,%s)",
                (uid(), a_id, kind, v),
            )
    print(f"  allowance_config: 1 version, {len(living['levels'])} living levels, {len(jp.get('levels', {}))} JLPT")

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
print("\nRow counts:")
for t in ["salary_grade_config", "salary_grade", "salary_grade_step",
          "pit_config", "pit_bracket",
          "insurance_config", "insurance_eligible_contract_type",
          "allowance_config", "allowance_level", "japanese_allowance_level", "allowance_rule_value"]:
    cur2.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t:<34} {cur2.fetchone()[0]:>4} rows")

print("\nPublished versions by type (effective_from):")
for t in ["salary_grade_config", "pit_config", "insurance_config", "allowance_config"]:
    cur2.execute(f"SELECT effective_from, status FROM {t} ORDER BY effective_from")
    rows = ", ".join(f"{r[0]}({r[1]})" for r in cur2.fetchall())
    print(f"  {t:<22} {rows}")
cur2.close()
conn2.close()
