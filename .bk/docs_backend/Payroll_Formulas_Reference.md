# Payroll Calculation Rules & Formulas
## FACE-Z HRMS — Vietnam Labor Law Compliance

> **Effective:** January 1, 2026  
> **Legal Basis:** Law 109/2025/QH15 · Resolution 110/2025/UBTVQH15 · Decree 293/2025/NĐ-CP · Law 41/2024/QH15

---

## Table of Contents

1. [Core Payroll Formula](#1-core-payroll-formula)
2. [Gross Salary Components](#2-gross-salary-components)
3. [Social Insurance Deductions (BHXH / BHYT / BHTN)](#3-social-insurance-deductions)
4. [Personal Income Tax (PIT)](#4-personal-income-tax-pit)
5. [Net Salary Calculation](#5-net-salary-calculation)
6. [OT Pay Calculation](#6-ot-pay-calculation)
7. [Prorated Salary for Partial Month](#7-prorated-salary-for-partial-month)
8. [KPI Multiplier Rules](#8-kpi-multiplier-rules)
9. [JSON Config Structure](#9-json-config-structure)
10. [Complete Worked Examples](#10-complete-worked-examples)

---

## 1. Core Payroll Formula

### 1.1 Master Formula

```
GROSS = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt)
      + OT_Pay
      + Bonus

NET   = GROSS − BHXH_employee − BHYT_employee − BHTN_employee − PIT
```

### 1.2 Variable Definitions

| Variable | Vietnamese Name | Definition |
|---|---|---|
| `Lhq` | Lương hiệu quả | Performance salary agreed in employment contract |
| `KPItb` | Chỉ số KPI trung bình | Average of KPI1 (performance) and KPI2 (attendance) scores |
| `Li` | Hệ số lương chức danh | Salary coefficient from grade table, based on job code and step |
| `HTi` | Hỗ trợ bổ sung | Total applicable allowances (living, language, project) |
| `NCtt` | Ngày công thực tế | Actual working days attended in the month |
| `Nt` | Ngày công chuẩn | Standard working days in the month (company config, typically 26) |
| `OT_Pay` | Lương làm thêm giờ | Overtime pay from approved OT requests |
| `Bonus` | Thưởng | Approved variable bonuses for the month |

### 1.3 Calculation Order

```
Step 1  → Determine NCtt from attendance logs
Step 2  → Look up Li from salary grade JSON (position_code + salary_step)
Step 3  → Calculate KPItb = (KPI1 + KPI2) / 2
Step 4  → Sum HTi allowances, prorate by (NCtt / Nt)
Step 5  → Apply core formula → Base Gross
Step 6  → Add OT_Pay + Bonus → Total Gross
Step 7  → Calculate BHXH, BHYT, BHTN on insurance base salary (LCB)
Step 8  → Calculate taxable income → Apply PIT brackets
Step 9  → Net = Total Gross − insurance deductions − PIT
Step 10 → Save as DRAFT payroll record
```

---

## 2. Gross Salary Components

### 2.1 Performance Salary (Lhq)

- The contractual salary amount agreed between employee and company
- Reviewed annually at Career Path Review (December — S2 cycle)
- Stored in `contracts.base_salary`
- **Rule:** Must be ≥ applicable regional minimum wage

```
Lhq ≥ regional_minimum_wage
```

> Region I minimum (2026): **5,310,000 VND/month** — Decree 293/2025/NĐ-CP  
> For employees with vocational/university qualifications: Lhq ≥ minimum × 1.07

---

### 2.2 Position Salary Coefficient (Li)

- A fixed monthly amount based on the employee's **job grade code** and **salary step**
- Looked up from the salary grade JSON config (not stored in DB)
- Unit in JSON: thousand VND → multiply by 1,000 in code

```
Li = salary_grades[position_code]["steps"][salary_step - 1] × 1000
```

**Example:**
```
Employee: Senior Developer, code = NV1, step = 5
Li = salary_grades["NV1"]["steps"][4] × 1000
   = 9,200 × 1000
   = 9,200,000 VND
```

---

### 2.3 Allowances (HTi)

**Total allowance = sum of all applicable components:**

```
HTi = (HT2_living × proration_ratio)
    + HT1_japanese  (if eligible, not prorated)
    + HT3_odc       (if on ODC project, not prorated)
```

**HT2 Living Allowance — prorated by actual attendance:**
```
HT2_actual = HT2_full × (NCtt / Nt)
```

**HT1 Japanese — fixed, not prorated:**
```
HT1 = 5,000,000  (JLPT N1)
    = 2,000,000  (JLPT N2)
Condition: contract_type IN (FIXED_TERM, INDEFINITE)
           AND contract_duration_months >= 12
           AND position NOT IN (JAPANESE_TRANSLATOR)
           AND position_level < DEPT_HEAD
```

**HT3 ODC Project — fixed per project contract, not prorated:**
```
HT3 = odc_allowances[employee_id][project_id].amount
```

---

### 2.4 Proration Ratio

```
proration_ratio = NCtt / Nt

Where:
  NCtt = actual working days (from daily_attendance, excluding unpaid leave)
  Nt   = standard working days in the month (system config)
```

**What counts as a working day (NCtt):**
- Days physically present (check-in + check-out)
- Approved paid leave days (annual leave, sick leave, wedding, bereavement)
- National holidays (do not reduce NCtt)

**What does NOT count as NCtt:**
- Unpaid leave days
- Unauthorized absences

---

### 2.5 Base Gross (before OT and Bonus)

```
Base_Gross = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt)
```

**Expanded with allowance proration:**
```
Base_Gross = [(Lhq × KPItb) + Li + (HT2 × NCtt/Nt) + HT1 + HT3] × (NCtt / Nt)
```

> ⚠️ Note: HT1 and HT3 are inside the bracket so they are still subject to the attendance multiplier (NCtt/Nt). If business requirement is that HT1/HT3 are paid in full regardless of attendance — move them outside the bracket.

---

## 3. Social Insurance Deductions

### 3.1 Overview

Total contribution rate is 32% of the insurance base salary — employee contributes **10.5%** and employer contributes **21.5%**.

The payroll system only deducts the **employee's portion (10.5%)** from net salary.  
The employer's portion (21.5%) is an additional cost to the company — not deducted from employee salary.

---

### 3.2 Insurance Base Salary (LCB)

> The salary used as the base for insurance calculation.  
> **Not the same as Gross salary.**

```
LCB = salary stated in employment contract for insurance purposes
    = typically the base/fixed portion of compensation
```

**Constraints on LCB:**
```
LCB_min = applicable regional minimum wage
         = 5,310,000 VND (Region I, 2026)

LCB_max = 20 × government_base_salary
         = 20 × 2,340,000
         = 46,800,000 VND/month
```

> If employee's LCB > 46,800,000 → cap insurance calculation at 46,800,000  
> If employee's LCB < regional minimum → validation error, block payroll run

---

### 3.3 Employee Deduction Breakdown

Employee insurance deductions: BHXH 8% (pension fund), BHYT 1.5% (health insurance), BHTN 1% (unemployment insurance).

| Insurance | Rate | Fund Purpose | Legal Basis |
|---|---|---|---|
| BHXH (Social Insurance) | **8%** | Pension & survivor benefits | Law 41/2024/QH15, Art. 33–34 |
| BHYT (Health Insurance) | **1.5%** | Medical care | Decree 188/2025/NĐ-CP, Art. 6 |
| BHTN (Unemployment) | **1%** | Unemployment benefits | Law 74/2025/QH15, Art. 33 |
| **Total employee** | **10.5%** | | |

```
insurance_base = MIN(LCB, 46,800,000)

BHXH_employee = insurance_base × 8%
BHYT_employee = insurance_base × 1.5%
BHTN_employee = insurance_base × 1%

total_insurance_deduction = insurance_base × 10.5%
```

---

### 3.4 Employer Contribution (for reference, not deducted from salary)

| Insurance | Employer Rate | Fund |
|---|---|---|
| BHXH — Pension | 14% | Pension & survivor |
| BHXH — Sickness & Maternity | 3% | Sick leave & maternity pay |
| BHXH — Occupational Accident | 0.5% | Accident & illness |
| BHYT (Health) | 3% | Medical care |
| BHTN (Unemployment) | 1% | Unemployment |
| **Total employer** | **21.5%** | |

---

### 3.5 Insurance Exemption Rules

| Contract Type | BHXH | BHYT | BHTN |
|---|---|---|---|
| Indefinite-term HĐLĐ | ✅ | ✅ | ✅ |
| Fixed-term HĐLĐ (≥ 1 month) | ✅ | ✅ | ✅ |
| Probation contract | ❌ No deduction | ❌ | ❌ |
| Internship / Freelance | ❌ | ❌ | ❌ |
| Seasonal / Service contract | ❌ | ❌ | ❌ |

> **Probation note:** From 01/07/2025 (Decree 158/2025/NĐ-CP), employers are required to register probation employees for BHXH. However, the deduction rate during probation may differ — verify current implementation requirements.

---

## 4. Personal Income Tax (PIT)

### 4.1 Who Is Subject to PIT

- Vietnamese resident individuals with monthly salary income
- Applies after personal and dependent relief deductions
- Non-resident foreigners: flat 20% on gross (no relief deductions)

---

### 4.2 Taxable Income Formula

```
Taxable_Income = Gross_Income
               − BHXH_employee
               − BHYT_employee
               − BHTN_employee
               − personal_relief
               − (dependent_count × dependent_relief)
               − charitable_contributions  (if any, with documentation)
               − voluntary_pension_fund    (if any)

Where:
  Gross_Income = total income subject to tax
               = base_gross + OT_pay + bonuses + taxable_allowances
```

> ⚠️ Not all income is taxable. The following are **excluded from Gross_Income**:
> - One-time relocation support
> - Business trip per diems within government-approved limits
> - Funeral/wedding welfare within limits (500,000–1,000,000 VND)
> - Uniform/tools provided by the company

---

### 4.3 Personal Relief Amounts

From 01/01/2026, personal relief for the taxpayer is **15,500,000 VND/month** and dependent relief is **6,200,000 VND/month** per dependent.

| Relief Type | 2025 | 2026 | Change |
|---|---|---|---|
| Self (bản thân) | 11,000,000 VND/month | **15,500,000 VND/month** | +41% |
| Per dependent | 4,400,000 VND/month | **6,200,000 VND/month** | +41% |

```java
long getPersonalRelief(int taxYear) {
    return taxYear >= 2026 ? 15_500_000L : 11_000_000L;
}

long getDependentRelief(int taxYear) {
    return taxYear >= 2026 ? 6_200_000L : 4_400_000L;
}
```

---

### 4.4 PIT Brackets — 2025 (7 Brackets)

> Legal basis: Law 04/2007/QH12, Article 22  
> Applies to payroll periods Jan–Dec 2025

| Bracket | Monthly Taxable Income (VND) | Rate | Quick Formula |
|---|---|---|---|
| 1 | 0 → 5,000,000 | 5% | `income × 5%` |
| 2 | 5,000,001 → 10,000,000 | 10% | `income × 10% − 250,000` |
| 3 | 10,000,001 → 18,000,000 | 15% | `income × 15% − 750,000` |
| 4 | 18,000,001 → 32,000,000 | 20% | `income × 20% − 1,650,000` |
| 5 | 32,000,001 → 52,000,000 | 25% | `income × 25% − 3,250,000` |
| 6 | 52,000,001 → 80,000,000 | 30% | `income × 30% − 5,850,000` |
| 7 | > 80,000,000 | 35% | `income × 35% − 9,850,000` |

---

### 4.5 PIT Brackets — 2026 (5 Brackets) ⭐

> Legal basis: Law 109/2025/QH15 — effective 01/01/2026. Tax brackets reduced from 7 to 5. The 5% rate now applies to income up to 10,000,000 VND/month, and the top rate of 35% applies to income above 100,000,000 VND/month.

| Bracket | Monthly Taxable Income (VND) | Rate | Quick Formula |
|---|---|---|---|
| 1 | 0 → 10,000,000 | 5% | `income × 5%` |
| 2 | 10,000,001 → 30,000,000 | 10% | `income × 10% − 500,000` |
| 3 | 30,000,001 → 60,000,000 | 20% | `income × 20% − 3,500,000` |
| 4 | 60,000,001 → 100,000,000 | 30% | `income × 30% − 9,500,000` |
| 5 | > 100,000,000 | 35% | `income × 35% − 14,500,000` |

---

### 4.6 PIT Engine — Java Implementation

```java
public class PitEngine {

    public long calculate(long taxableIncome, int taxYear) {
        if (taxableIncome <= 0) return 0;

        if (taxYear >= 2026) {
            return calculate2026(taxableIncome);
        } else {
            return calculate2025(taxableIncome);
        }
    }

    private long calculate2026(long income) {
        // Law 109/2025/QH15 — 5 brackets
        if (income <= 10_000_000)  return (long)(income * 0.05);
        if (income <= 30_000_000)  return (long)(income * 0.10) -  500_000;
        if (income <= 60_000_000)  return (long)(income * 0.20) - 3_500_000;
        if (income <= 100_000_000) return (long)(income * 0.30) - 9_500_000;
        return                            (long)(income * 0.35) - 14_500_000;
    }

    private long calculate2025(long income) {
        // Law 04/2007/QH12 — 7 brackets
        if (income <= 5_000_000)   return (long)(income * 0.05);
        if (income <= 10_000_000)  return (long)(income * 0.10) -   250_000;
        if (income <= 18_000_000)  return (long)(income * 0.15) -   750_000;
        if (income <= 32_000_000)  return (long)(income * 0.20) - 1_650_000;
        if (income <= 52_000_000)  return (long)(income * 0.25) - 3_250_000;
        if (income <= 80_000_000)  return (long)(income * 0.30) - 5_850_000;
        return                            (long)(income * 0.35) - 9_850_000;
    }
}
```

---

### 4.7 Taxable Income Calculation — Java

```java
public long calculateTaxableIncome(PayrollInput input, int taxYear) {

    long personalRelief   = taxYear >= 2026 ? 15_500_000L : 11_000_000L;
    long dependentRelief  = taxYear >= 2026 ?  6_200_000L :  4_400_000L;

    long totalDeductions = input.bhxhEmployee
                         + input.bhytEmployee
                         + input.bhtnEmployee
                         + personalRelief
                         + (input.dependentCount * dependentRelief)
                         + input.charitableContributions
                         + input.voluntaryPension;

    long taxableIncome = input.grossIncome - totalDeductions;

    return Math.max(taxableIncome, 0); // never negative
}
```

---

## 5. Net Salary Calculation

### 5.1 Full Net Formula

```
Net_Salary = Gross_Income − BHXH_employee − BHYT_employee − BHTN_employee − PIT

Where:
  Gross_Income     = Base_Gross + OT_Pay + Bonus
  BHXH_employee    = MIN(LCB, 46,800,000) × 8%
  BHYT_employee    = MIN(LCB, 46,800,000) × 1.5%
  BHTN_employee    = MIN(LCB, 46,800,000) × 1%
  PIT              = f(Gross_Income − deductions − relief, taxYear)
```

### 5.2 Payslip Breakdown Fields

```
┌──────────────────────────────────────────────┐
│ EARNINGS                                     │
│  Performance salary (Lhq × KPI)   XX,XXX,XXX│
│  Position coefficient (Li)         X,XXX,XXX│
│  Living allowance (HT2)            X,XXX,XXX│
│  Language allowance (HT1)                  ─│
│  ODC allowance (HT3)                       ─│
│  OT pay                                     ─│
│  Bonus                                      ─│
│  ─────────────────────────────────────────── │
│  GROSS TOTAL                      XX,XXX,XXX│
├──────────────────────────────────────────────┤
│ DEDUCTIONS                                   │
│  BHXH (8% of LCB)                 X,XXX,XXX│
│  BHYT (1.5% of LCB)                 XXX,XXX│
│  BHTN (1% of LCB)                   XXX,XXX│
│  Personal Income Tax (PIT)          XXX,XXX│
│  ─────────────────────────────────────────── │
│  TOTAL DEDUCTIONS                  X,XXX,XXX│
├──────────────────────────────────────────────┤
│  NET SALARY (THỰC LĨNH)           XX,XXX,XXX│
└──────────────────────────────────────────────┘
```

---

## 6. OT Pay Calculation

### 6.1 OT Rate Rules (Labor Code 45/2019/QH14)

| Day Type | OT Rate | Multiplier |
|---|---|---|
| Regular weekday (after 8h) | 150% of hourly wage | × 1.5 |
| Weekend (Saturday / Sunday) | 200% of hourly wage | × 2.0 |
| Public holiday / paid leave day | 300% of hourly wage | × 3.0 |
| Night shift (22:00 – 06:00) | +30% on top of applicable rate | base_rate + 30% |

### 6.2 Hourly Wage Base

```
Hourly_wage = Lhq / (Nt × 8)

Where:
  Lhq = monthly performance salary (from contract)
  Nt  = standard working days in the month (typically 26)
  8   = standard working hours per day
```

### 6.3 OT Pay Formula

```
OT_Pay = Σ (OT_hours_i × Hourly_wage × OT_rate_i)

For each approved OT session:
  OT_Pay_session = OT_hours × (Lhq / (Nt × 8)) × rate_multiplier
```

**Night shift OT (after 22:00):**
```
Night_OT_rate = base_rate × (1 + 0.30)
Example: weekday night OT = 1.5 × 1.3 = 1.95 × hourly_wage
```

---

## 7. Prorated Salary for Partial Month

### 7.1 When Proration Applies

- Employee joined mid-month (new hire)
- Employee resigned mid-month
- Employee had unpaid leave days

### 7.2 Proration Formula

```
Prorated_amount = Full_month_amount × (NCtt / Nt)
```

**Applied to:**
- `Lhq × KPItb` — prorated
- `Li` — prorated
- `HT2` living allowance — prorated
- `HT1` Japanese allowance — NOT prorated (if contract is active whole month)
- `HT3` ODC allowance — NOT prorated

### 7.3 Insurance for Partial Month

Insurance contributions are still based on **full LCB**, not prorated — as long as the employee was enrolled in BHXH that month. Proration applies to salary, not to the insurance base.

---

## 8. KPI Multiplier Rules

### 8.1 KPI1 — Performance Rating

| Rating | Condition | Multiplier |
|---|---|---|
| A | Outstanding performance, significant contributions | `1.04` |
| B | Good performance, met all requirements (default) | `1.00` |
| C | Poor performance, failed to meet targets | `0.98` |

> **Input source:** Entered by Manager in performance review module  
> **Default if missing:** B (1.00) — flag record, notify HR

### 8.2 KPI2 — Attendance Compliance

| Rating | Condition | Multiplier |
|---|---|---|
| A | Zero violations AND zero leave days taken | `1.04` |
| B | Zero violations BUT had ≥ 1 approved leave | `1.02` |
| C | ≥ 1 attendance violation (late, early out, absent) | `1.00` |

> **Input source:** Auto-computed from attendance logs  
> **Violations detected:** late check-in, early check-out, no check-in/out, unauthorized absence

### 8.3 KPItb Calculation

```
KPItb = (KPI1_multiplier + KPI2_multiplier) / 2

Minimum possible: (0.98 + 1.00) / 2 = 0.99
Maximum possible: (1.04 + 1.04) / 2 = 1.04
```

### 8.4 KPI Scope by Position Level

| Employee Level | KPI1 Basis | KPI2 Basis |
|---|---|---|
| Director, Deputy Director | Average of whole company | Average of whole company |
| Department Head, Deputy Head | Average of own department | Average of own department |
| All other staff | Score from direct manager | Own attendance data |

---

## 9. JSON Config Structure

### 9.1 Design Principle

Config data that changes with government decrees (salary grades, tax brackets, relief amounts, minimum wages) is stored as **versioned JSON files** rather than database tables.

**Benefits:**
- Version control in Git — see exactly what changed and when
- Load once at startup, cache in memory — faster than DB queries
- Easy to update when new decrees are issued
- No DB migration scripts needed for regulatory changes

**One database table** tracks which config version is active:

```sql
CREATE TABLE payroll_config_versions (
    id             UUID PRIMARY KEY,
    config_type    VARCHAR(50),   -- SALARY_GRADE | ALLOWANCE | PIT | INSURANCE | MINIMUM_WAGE
    version        VARCHAR(10),   -- '2026', '2025'
    file_path      VARCHAR(200),  -- '/config/payroll/pit-2026.json'
    effective_date DATE NOT NULL,
    end_date       DATE,          -- NULL = currently active
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 9.2 salary-grades.json

```json
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "legal_basis": "VTI Salary Regulation v4.0 — updated to 2026 minimums",
  "unit": "thousand_vnd",
  "minimum_wage_region_I": 5310,
  "grades": {
    "BOD": {
      "title": "Director / Deputy Director (Company level)",
      "track": "management",
      "steps": [12000, 13500, 15000, 17000, 19000, 21500, 24000, 27000, 31000, 36000]
    },
    "BOD2": {
      "title": "Functional Unit Director",
      "track": "management",
      "steps": [10500, 12000, 13500, 15000, 17000, 19000, 21500, 24000, 27000, 31000]
    },
    "DL": {
      "title": "Deputy Unit Director / Dept Head / Chief Accountant",
      "track": "management",
      "steps": [9500, 10500, 12000, 13500, 15000, 17000, 19000, 21500, 24000, 27000]
    },
    "TL1": {
      "title": "Team Lead: Technical, QA, Solution Architect, PM",
      "track": "management",
      "steps": [8000, 8500, 9200, 10000, 11200, 13000, 14500, 16500, 18500, 21000]
    },
    "TL2": {
      "title": "Team Lead: HR, Admin, Recruitment, Training, IT",
      "track": "management",
      "steps": [7200, 7700, 8300, 9000, 9800, 11000, 12500, 14000, 16000, 18500]
    },
    "NV1": {
      "title": "Developer, BA, QA Engineer, Tester, Translator",
      "track": "employee",
      "steps": [6500, 7200, 7800, 8500, 9200, 10000, 10800, 11800, 12800, 14000]
    },
    "NV2": {
      "title": "HR, Accountant, Admin, Designer, Marketing, Lecturer",
      "track": "employee",
      "steps": [5500, 6000, 6500, 7000, 7700, 8400, 9200, 10000, 11000, 12000]
    }
  }
}
```

---

### 9.3 allowance-config.json

```json
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "living_allowance": {
    "prorated": true,
    "eligible_contracts": ["PROBATION", "FIXED_TERM", "INDEFINITE"],
    "levels": {
      "DIRECTOR":          { "meal": 1500000, "phone": 1000000, "transport": 1500000, "housing": 5000000 },
      "DEPUTY_DIRECTOR":   { "meal": 1400000, "phone":  800000, "transport": 1000000, "housing": 3000000 },
      "DEPT_HEAD":         { "meal": 1300000, "phone":  500000, "transport":  700000, "housing": 2500000 },
      "SENIOR_STAFF_NV1":  { "meal": 1000000, "phone":  300000, "transport":  500000, "housing": 2000000 },
      "NV2":               { "meal":  770000, "phone":  200000, "transport":  300000, "housing":       0 }
    }
  },
  "japanese_allowance": {
    "prorated": false,
    "eligible_contracts": ["FIXED_TERM", "INDEFINITE"],
    "min_contract_months": 12,
    "excluded_positions": ["JAPANESE_TRANSLATOR"],
    "excluded_levels": ["DEPT_HEAD", "DEPUTY_DIRECTOR", "DIRECTOR"],
    "levels": {
      "N1": 5000000,
      "N2": 2000000
    }
  }
}
```

---

### 9.4 pit-config.json

```json
{
  "configs": {
    "2025": {
      "legal_basis": "Law 04/2007/QH12",
      "resolution": "Resolution 954/2020/UBTVQH14",
      "personal_relief": 11000000,
      "dependent_relief": 4400000,
      "brackets": [
        { "from": 0,         "to": 5000000,   "rate": 0.05, "quick_deduction": 0        },
        { "from": 5000001,   "to": 10000000,  "rate": 0.10, "quick_deduction": 250000   },
        { "from": 10000001,  "to": 18000000,  "rate": 0.15, "quick_deduction": 750000   },
        { "from": 18000001,  "to": 32000000,  "rate": 0.20, "quick_deduction": 1650000  },
        { "from": 32000001,  "to": 52000000,  "rate": 0.25, "quick_deduction": 3250000  },
        { "from": 52000001,  "to": 80000000,  "rate": 0.30, "quick_deduction": 5850000  },
        { "from": 80000001,  "to": null,       "rate": 0.35, "quick_deduction": 9850000  }
      ]
    },
    "2026": {
      "legal_basis": "Law 109/2025/QH15",
      "resolution": "Resolution 110/2025/UBTVQH15",
      "personal_relief": 15500000,
      "dependent_relief": 6200000,
      "brackets": [
        { "from": 0,          "to": 10000000,  "rate": 0.05, "quick_deduction": 0        },
        { "from": 10000001,   "to": 30000000,  "rate": 0.10, "quick_deduction": 500000   },
        { "from": 30000001,   "to": 60000000,  "rate": 0.20, "quick_deduction": 3500000  },
        { "from": 60000001,   "to": 100000000, "rate": 0.30, "quick_deduction": 9500000  },
        { "from": 100000001,  "to": null,       "rate": 0.35, "quick_deduction": 14500000 }
      ]
    }
  }
}
```

---

### 9.5 insurance-config.json

```json
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "legal_basis": "Law 41/2024/QH15 + Decree 188/2025/NĐ-CP + Law 74/2025/QH15",
  "government_base_salary": 2340000,
  "insurance_ceiling": 46800000,
  "employee_rates": {
    "bhxh": 0.08,
    "bhyt": 0.015,
    "bhtn": 0.01,
    "total": 0.105
  },
  "employer_rates": {
    "bhxh_pension": 0.14,
    "bhxh_sickness_maternity": 0.03,
    "bhxh_accident": 0.005,
    "bhyt": 0.03,
    "bhtn": 0.01,
    "total": 0.215
  },
  "eligible_contract_types": ["FIXED_TERM", "INDEFINITE"],
  "probation_exempt": true,
  "note": "Probation: verify Decree 158/2025/NĐ-CP for current probation BHXH rules"
}
```

---

### 9.6 minimum-wage-config.json

```json
{
  "version": "2026",
  "effective_date": "2026-01-01",
  "legal_basis": "Decree 293/2025/NĐ-CP",
  "regions": {
    "I":   { "monthly": 5310000, "hourly": 25500,
             "description": "Hanoi, Ho Chi Minh City urban areas" },
    "II":  { "monthly": 4730000, "hourly": 22700,
             "description": "Provincial cities, suburban Hanoi/HCM" },
    "III": { "monthly": 4140000, "hourly": 20000,
             "description": "Remaining towns and districts" },
    "IV":  { "monthly": 3700000, "hourly": 17800,
             "description": "Rural and remote areas" }
  },
  "qualified_worker_premium": 0.07,
  "note": "Workers with vocational/university qualifications must earn ≥ 7% above minimum"
}
```

---

## 10. Complete Worked Examples

### Example 1 — Standard Employee (NV1, 2026)

**Profile:**
- Position: Senior Developer, code `NV1`, step 5
- Lhq (contract salary): 20,000,000 VND
- LCB (insurance base): 10,000,000 VND
- KPI1: B (1.00), KPI2: A (1.04) → KPItb = 1.02
- Allowances: HT2 NV1 = 1,000,000 + 300,000 + 500,000 = 1,800,000 VND
- NCtt = 24 days, Nt = 26 days
- No OT, no bonus, 0 dependents

**Step-by-step:**
```
1. Li = salary_grades["NV1"]["steps"][4] × 1000 = 9,200 × 1000 = 9,200,000 VND

2. KPItb = (1.00 + 1.04) / 2 = 1.02

3. HT2_prorated = 1,800,000 × (24/26) = 1,661,538 VND

4. Base_Gross = [(20,000,000 × 1.02) + 9,200,000 + 1,661,538] × (24/26)
             = [20,400,000 + 9,200,000 + 1,661,538] × 0.923
             = 31,261,538 × 0.923
             = 28,854,379 VND

5. Total Gross = 28,854,379 (no OT, no bonus)

6. Insurance base = MIN(10,000,000, 46,800,000) = 10,000,000 VND
   BHXH = 10,000,000 × 8%   =   800,000 VND
   BHYT = 10,000,000 × 1.5% =   150,000 VND
   BHTN = 10,000,000 × 1%   =   100,000 VND
   Total insurance            = 1,050,000 VND

7. Taxable Income = 28,854,379 − 1,050,000 − 15,500,000 (self) = 12,304,379 VND

8. PIT (2026 brackets, taxable = 12,304,379 — falls in bracket 2):
   PIT = 12,304,379 × 10% − 500,000 = 730,438 VND

9. NET = 28,854,379 − 1,050,000 − 730,438 = 27,073,941 VND
```

---

### Example 2 — Manager with OT and Dependents (TL1, 2026)

**Profile:**
- Position: Technical Team Lead, code `TL1`, step 3
- Lhq: 35,000,000 VND, LCB: 15,000,000 VND
- KPItb: 1.04 (both KPI1 and KPI2 = A)
- HT2 (DEPT_HEAD): 1,300,000 + 500,000 + 700,000 + 2,500,000 = 5,000,000 VND
- NCtt = 26 (full month), Nt = 26
- OT: 8 hours weekday + 4 hours weekend
- Dependents: 2 children

**Step-by-step:**
```
1. Li = salary_grades["TL1"]["steps"][2] × 1000 = 9,200 × 1000 = 9,200,000 VND

2. KPItb = 1.04

3. HT2_prorated = 5,000,000 × (26/26) = 5,000,000 VND (full month)

4. Base_Gross = [(35,000,000 × 1.04) + 9,200,000 + 5,000,000] × (26/26)
             = [36,400,000 + 9,200,000 + 5,000,000] × 1.0
             = 50,600,000 VND

5. Hourly wage = 35,000,000 / (26 × 8) = 168,269 VND/hour
   OT weekday  = 8 hours × 168,269 × 1.5 = 2,019,231 VND
   OT weekend  = 4 hours × 168,269 × 2.0 = 1,346,154 VND
   Total OT_Pay = 3,365,385 VND

6. Total Gross = 50,600,000 + 3,365,385 = 53,965,385 VND

7. Insurance base = MIN(15,000,000, 46,800,000) = 15,000,000 VND
   BHXH = 15,000,000 × 8%   = 1,200,000 VND
   BHYT = 15,000,000 × 1.5% =   225,000 VND
   BHTN = 15,000,000 × 1%   =   150,000 VND
   Total insurance            = 1,575,000 VND

8. Taxable Income = 53,965,385 − 1,575,000 − 15,500,000 − (2 × 6,200,000)
                  = 53,965,385 − 1,575,000 − 15,500,000 − 12,400,000
                  = 24,490,385 VND

9. PIT (2026 brackets, taxable = 24,490,385 — falls in bracket 2):
   PIT = 24,490,385 × 10% − 500,000 = 1,949,039 VND

10. NET = 53,965,385 − 1,575,000 − 1,949,039 = 50,441,346 VND
```

---

### Example 3 — High Earner Hitting Insurance Ceiling (BOD, 2026)

**Profile:**
- Position: Director, code `BOD`, step 8
- Lhq: 80,000,000 VND, LCB: 60,000,000 VND (exceeds ceiling)
- KPItb: 1.00 (B/B), NCtt = 26, Nt = 26, 1 dependent

```
1. Li = salary_grades["BOD"]["steps"][7] × 1000 = 19,000 × 1000 = 19,000,000

2. HT2 (DIRECTOR) = 1,500,000 + 1,000,000 + 1,500,000 + 5,000,000 = 9,000,000

3. Base_Gross = [(80,000,000 × 1.00) + 19,000,000 + 9,000,000] × 1.0
             = 108,000,000 VND

4. Insurance base = MIN(60,000,000, 46,800,000) = 46,800,000 VND  ← CAPPED
   BHXH = 46,800,000 × 8%   = 3,744,000 VND
   BHYT = 46,800,000 × 1.5% =   702,000 VND
   BHTN = 46,800,000 × 1%   =   468,000 VND
   Total insurance            = 4,914,000 VND

5. Taxable Income = 108,000,000 − 4,914,000 − 15,500,000 − 6,200,000
                  = 81,386,000 VND

6. PIT (2026 brackets, taxable = 81,386,000 — falls in bracket 4):
   PIT = 81,386,000 × 30% − 9,500,000 = 14,915,800 VND

7. NET = 108,000,000 − 4,914,000 − 14,915,800 = 88,170,200 VND
```

---

## Legal References

| Regulation | Subject | Effective |
|---|---|---|
| Decree 293/2025/NĐ-CP | Regional minimum wages 2026 | 01/01/2026 |
| Law 109/2025/QH15 | PIT reform — 5 brackets | 01/01/2026 (salary income) |
| Resolution 110/2025/UBTVQH15 | Personal relief 15.5M / dependent 6.2M | 01/01/2026 |
| Law 41/2024/QH15 (BHXH 2024) | Social insurance rates and base | 01/01/2026 |
| Decree 188/2025/NĐ-CP | BHYT contribution details | 01/01/2026 |
| Decree 158/2025/NĐ-CP | BHTN contribution details | 01/01/2026 |
| Decree 73/2024/NĐ-CP | Government base salary 2,340,000 VND | 01/07/2024 |
| Labor Code 45/2019/QH14 | OT rates, paid leave rules | 01/01/2021 |
| VTI Salary Regulation 01/2020/QC-VTI v4.0 | Internal KPI, allowance structure | 26/04/2021 |

---

*FACE-Z HRMS · Payroll Formula Reference · Vietnam · Effective January 2026*
