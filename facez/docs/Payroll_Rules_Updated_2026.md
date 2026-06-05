# FACE-Z HRMS — Payroll Calculation Rules

> **Source Document:** Quy Chế Tiền Lương — 01/2020/QC-VTI — Version 4.0 (Effective: 26/04/2021)  
> **Legal References Updated:** March 2026  
> **Applies to:** VTI Corporation, VTI Cloud, VTI Education and affiliated companies  
> **Module:** Payroll Engine — Business Rules Specification

---

## ⚠️ Legal Update Notice

> This document reflects Vietnamese labor and tax regulations effective **01/01/2026**.  
> Key changes from the original VTI salary document (2020/2021):
>
> | Item | Original (2021) | Updated (2026) | Legal Basis |
> |---|---|---|---|
> | Minimum wage (Region I) | 4,200,000 VND | **5,310,000 VND** | Decree 293/2025/NĐ-CP |
> | Personal tax relief (self) | 11,000,000 VND/month | **15,500,000 VND/month** | Resolution 110/2025/UBTVQH15 |
> | Dependent tax relief | 4,400,000 VND/month | **6,200,000 VND/month** | Resolution 110/2025/UBTVQH15 |
> | PIT tax brackets | 7 brackets | **5 brackets** | Law 109/2025/QH15 |
> | Salary grade floors | Based on 2020 minimums | **Recalibrated to 2026 floors** | This document |

---

## Table of Contents

1. [Core Salary Formula](#1-core-salary-formula)
2. [KPI Rules](#2-kpi-rules)
3. [Salary Grade Tables](#3-salary-grade-tables)
4. [Allowances & Benefits](#4-allowances--benefits)
5. [Special Salary Types](#5-special-salary-types)
6. [Paid Leave Rules](#6-paid-leave-rules)
7. [Bonus Rules](#7-bonus-rules)
8. [Salary Review Rules](#8-salary-review-rules)
9. [Payroll Schedule Rules](#9-payroll-schedule-rules)
10. [Social Insurance Deductions](#10-social-insurance-deductions)
11. [Personal Income Tax (PIT)](#11-personal-income-tax-pit)
12. [Payroll Calculation Flowchart](#12-payroll-calculation-flowchart)
13. [Implementation Notes](#13-implementation-notes)

---

## 1. Core Salary Formula

### Formula

```
Lt = [(Lhq × KPItb) + Li + HTi] × (NCtt / Nt)
```

### Variable Reference

| Variable | Name | Description | Data Source |
|---|---|---|---|
| `Lt` | Monthly Salary | Final gross salary for the month | Calculated |
| `Lhq` | Performance-based Salary | Agreed salary in employment contract, reviewed annually | `contracts.base_salary` |
| `KPItb` | Average KPI Score | Average of KPI1 and KPI2 scores | Calculated (see Section 2) |
| `Li` | Position Salary Coefficient | Fixed amount by job grade and step | `salary_grades` table |
| `HTi` | Total Allowances | Sum of all applicable allowances | `salary_allowances` table |
| `NCtt` | Actual Working Days | Days actually worked in the month | `daily_attendance` |
| `Nt` | Standard Working Days | Standard working days in the month | System config (typically 26) |

### Calculation Order

```
Step 1:  Calculate KPItb from KPI1 and KPI2
Step 2:  Look up Li from salary grade table (position code + step)
Step 3:  Sum all applicable HTi allowances (prorated by NCtt/Nt)
Step 4:  Apply formula → Monthly Gross
Step 5:  Add OT pay and approved bonuses
Step 6:  Deduct BHXH, BHYT, BHTN (on LCB)
Step 7:  Calculate PIT (on taxable income after deductions)
Step 8:  Output Net Salary
```

---

## 2. KPI Rules

### 2.1 KPI1 — Work Performance Score

Assigned monthly by department head or direct manager.

| Rating | Description | Weight |
|---|---|---|
| **A** | Outstanding — significant improvement contributions, substantially increased productivity | `1.04` |
| **B** | Good — completed all assigned tasks, met all requirements | `1.00` |
| **C** | Poor — failed to meet targets, did not keep up with work progress | `0.98` |

> **Input:** Entered by Manager/Department Head in the performance review module.  
> **Default if not entered by deadline:** Rating B (weight 1.00) — flag for HR review.

---

### 2.2 KPI2 — Attendance Compliance Score

Automatically calculated from attendance data each month.

| Rating | Condition | Weight |
|---|---|---|
| **A** | No attendance violations AND no leave taken in the entire month | `1.04` |
| **B** | No attendance violations BUT had ≥ 1 approved leave day | `1.02` |
| **C** | Had ≥ 1 violation: late check-in, early check-out, absence without notice, minimum office time breach | `1.00` |

> **Computed automatically** from `daily_attendance` and `attendance_logs`.

---

### 2.3 KPItb — Average KPI

```
KPItb = (KPI1_weight + KPI2_weight) / 2

Example: KPI1 = B (1.00) + KPI2 = A (1.04) → KPItb = 1.02
```

### 2.4 KPI Scope by Position Level

| Position Level | KPI1 Source | KPI2 Source |
|---|---|---|
| Director / Deputy Director | Average KPI1 of entire company | Average KPI2 of entire company |
| Department Head / Deputy | Average KPI1 of own department | Average KPI2 of own department |
| All other employees | Score entered by their direct manager | Individual attendance data |

---

## 3. Salary Grade Tables

### 3.1 Minimum Wage — Effective 01/01/2026

> **Legal basis:** Decree 293/2025/NĐ-CP (signed 10/11/2025, effective 01/01/2026)  
> Increase of 7.2% (250,000–350,000 VND/month) from Decree 74/2024/NĐ-CP.

| Region | Monthly Minimum | Hourly Minimum | Applies To |
|---|---|---|---|
| **Region I** | **5,310,000 VND** | 25,500 VND | Hanoi, Ho Chi Minh City urban districts |
| **Region II** | **4,730,000 VND** | 22,700 VND | Provincial cities, suburban Hanoi/HCM |
| **Region III** | **4,140,000 VND** | 20,000 VND | Remaining towns/districts |
| **Region IV** | **3,700,000 VND** | 17,800 VND | Rural and remote areas |

> **For employees with vocational/university qualifications:** Salary must be at least 7% above the applicable minimum wage (per Labor Code requirements).  
> **System config:** Store company's operating region — used to validate all salary entries.

---

### 3.2 Grade A — Management Track

> Unit: thousand VND (×1,000) — Updated to align with 2026 market rates and minimum wage floor.  
> Step gap ratio maintained from original VTI document (~10–15% per step).

| Code | Job Title | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Step 6 | Step 7 | Step 8 | Step 9 | Step 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `BOD` | Director / Deputy Director (Company level) | 12,000 | 13,500 | 15,000 | 17,000 | 19,000 | 21,500 | 24,000 | 27,000 | 31,000 | 36,000 |
| `BOD2` | Functional Unit Director (Production, Training, PMO, General Affairs) | 10,500 | 12,000 | 13,500 | 15,000 | 17,000 | 19,000 | 21,500 | 24,000 | 27,000 | 31,000 |
| `DL` | Deputy Unit Director, Dept Head/Deputy, Chief Accountant | 9,500 | 10,500 | 12,000 | 13,500 | 15,000 | 17,000 | 19,000 | 21,500 | 24,000 | 27,000 |
| `TL1` | Team Lead: Technical, QA, Translation, Testing, Solution Architect, Project Management | 8,000 | 8,500 | 9,200 | 10,000 | 11,200 | 13,000 | 14,500 | 16,500 | 18,500 | 21,000 |
| `TL2` | Team Lead: HR, Admin, Recruitment, PM Assistant, Training, IT | 7,200 | 7,700 | 8,300 | 9,000 | 9,800 | 11,000 | 12,500 | 14,000 | 16,000 | 18,500 |

### 3.3 Grade B — Employee Track

> Unit: thousand VND (×1,000) — Minimum floor set above Region I minimum (5,310,000 VND).

| Code | Job Title | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Step 6 | Step 7 | Step 8 | Step 9 | Step 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `NV1` | Developer, System Operator, Translator, Business Analyst, QA Engineer, Software Tester | 6,500 | 7,200 | 7,800 | 8,500 | 9,200 | 10,000 | 10,800 | 11,800 | 12,800 | 14,000 |
| `NV2` | HR, Recruiter, Accountant, Admin, Designer, IT Staff, Marketing, Trainer, Lecturer | 5,500 | 6,000 | 6,500 | 7,000 | 7,700 | 8,400 | 9,200 | 10,000 | 11,000 | 12,000 |

> **Validation rule:** All `Step 1` values must be ≥ applicable regional minimum wage.  
> `NV2 Step 1` (5,500,000) > Region I minimum (5,310,000) ✅

### 3.4 Salary Validation Rules

```java
void validateSalary(Employee emp, long salaryAmount) {
    long regionalMinimum = getRegionalMinimum(emp.getWorkRegion()); // e.g. 5,310,000

    // Vocational/university qualified employees must earn 7% above minimum
    if (emp.hasQualification()) {
        regionalMinimum = (long)(regionalMinimum * 1.07);
    }

    if (salaryAmount < regionalMinimum) {
        throw new PayrollValidationException(
            "Salary " + salaryAmount + " is below legal minimum " + regionalMinimum
        );
    }
}
```

---

## 4. Allowances & Benefits

### 4.1 HT1 — Japanese Language Support Allowance

| Certificate | Monthly Allowance |
|---|---|
| JLPT N1 | 5,000,000 VND |
| JLPT N2 | 2,000,000 VND |

**Eligibility Rules:**
- Contract duration must be ≥ 12 months (HĐLĐ)
- **Excluded positions:** Japanese Translator/Interpreter
- **Excluded levels:** Department Head or above (Trưởng/Phó phòng trở lên)
- **Excluded contract types:** Probation, Internship, Freelancer, Seasonal

---

### 4.2 HT2 — Living Support Allowance (VND/month)

> Applied at full rate then prorated: `Actual = Full × (NCtt / Nt)`

| Position Level | Meal | Phone | Transportation | Housing |
|---|---|---|---|---|
| Director | 1,500,000 | 1,000,000 | 1,500,000 | 5,000,000 |
| Deputy Director | 1,400,000 | 800,000 | 1,000,000 | 3,000,000 |
| Dept Head / Deputy / Chief Accountant | 1,300,000 | 500,000 | 700,000 | 2,500,000 |
| Senior Staff / NV1 | 1,000,000 | 300,000 | 500,000 | 2,000,000 |
| NV2 | 770,000 | 200,000 | 300,000 | — |

**Eligible contract types:** Probation, Fixed-term HĐLĐ, Indefinite-term HĐLĐ  
**Not eligible:** Freelancer, Seasonal contracts

---

### 4.3 HT3 — ODC Project Allowance

Applies to employees on long-term, fixed-headcount ODC (Offshore Development Center) projects.  
Amount is **project-specific and configurable** — not hardcoded.

```sql
CREATE TABLE odc_allowances (
    id              UUID PRIMARY KEY,
    project_id      UUID REFERENCES projects(id),
    employee_id     UUID REFERENCES employees(id),
    amount          DECIMAL(15,2),
    effective_date  DATE NOT NULL,
    end_date        DATE,
    created_by      UUID
);
```

### 4.4 Allowance Eligibility Matrix

| Allowance | Probation | Fixed HĐLĐ | Indefinite HĐLĐ | Freelancer | Seasonal |
|---|:---:|:---:|:---:|:---:|:---:|
| HT1 Japanese | ❌ | ✅ (≥12 months) | ✅ | ❌ | ❌ |
| HT2 Living | ✅ | ✅ | ✅ | ❌ | ❌ |
| HT3 ODC | Per project | ✅ | ✅ | ❌ | ❌ |

---

## 5. Special Salary Types

### 5.1 Probation Salary
```
Probation Salary ≥ 85% of official salary for the position
BHXH / BHYT / BHTN: NOT deducted during probation period
HT2 allowances: Still apply (prorated)
```

### 5.2 Contract-based (Khoán) Salary
- Project/task-based work with defined scope and timeline
- Governed by individual service contract — does NOT use the standard `Lt` formula
- Stored separately, excluded from standard monthly payroll runs

### 5.3 13th Month Salary
```
Eligibility:    Official HĐLĐ ≥ 6 months (excluding seasonal)
                Must still be employed at time of payment
Calculation:    (Lhq / 12) × monthsWorkedInYear
Payment timing: Per separate 13th Month Bonus Policy
```

---

## 6. Paid Leave Rules

Days below are compensated at full salary — NOT deducted from `NCtt`:

| Leave Type | Days | Notes |
|---|---|---|
| National Holidays / Tet | Per Labor Code | Use public holiday calendar config |
| Own wedding | 3 days | |
| Child's wedding (biological or legally adopted) | 1 day | |
| Death of: father, mother, father-in-law, mother-in-law, spouse, child | 3 days | Adopted relatives require legal authority documentation |
| Annual leave | Per contract | Employee must self-schedule; unused days must be taken |

**Validation:** Employees under probation or without signed HĐLĐ are not entitled to statutory leave benefits.

---

## 7. Bonus Rules

### 7.1 Holiday Bonus

| Holiday | Amount | Eligibility | Payroll Treatment |
|---|---|---|---|
| Liberation Day (30/04), Labor Day (01/05) | 300,000 VND | Official HĐLĐ | ✅ Added to that month's payslip |
| National Day (02/09) | 300,000 VND | Official HĐLĐ | ✅ Added to that month's payslip |

> Amount is configurable — may be adjusted by management each year.

### 7.2 Birthday Bonus
| Rule | Value |
|---|---|
| Amount | 500,000 VND |
| Eligibility | Official HĐLĐ (excluding seasonal) |
| Payroll treatment | ⚠️ Record in `welfare_records` — cash or gift, optional payslip inclusion |

### 7.3 Bonus Summary Matrix

| Bonus Type | Fixed | Variable | On Payslip | Configurable |
|---|:---:|:---:|:---:|:---:|
| Holiday bonus (30/4, 1/5, 2/9) | ✅ | ❌ | ✅ | ✅ |
| Birthday bonus | ✅ | ❌ | ⚠️ Optional | ❌ |
| 13th month salary | ❌ | ✅ | ✅ Separate run | ❌ |
| Annual revenue bonus | ❌ | ✅ | ✅ | ✅ |
| Performance / KAIZEN bonus | ❌ | ✅ | ✅ | ✅ |
| Project bonus | ❌ | ✅ | ✅ | ✅ |
| Referral bonus | ❌ | ✅ | ✅ | ✅ |
| Certification bonus | ❌ | ✅ | ✅ | ✅ |
| Welfare (wedding/funeral) | ✅ | ❌ | ❌ | ❌ |

---

## 8. Salary Review Rules

| Rule | Detail |
|---|---|
| Review frequency | Once per year |
| Standard review period | December — Career Path Review S2 |
| Eligibility | ≥ 6 months service (including probation period) |
| < 6 months | Reviewed at Career Path Review S1 (mid following year) |
| Review basis | Evaluation results + annual raise % + projected business performance |
| Approval | Board of Directors |

---

## 9. Payroll Schedule Rules

| Rule | Detail |
|---|---|
| Payment deadline | 8th – 10th of the **following** month |
| Attendance data period | 1st to last day of the **previous** month |
| Payment method | Cash or bank transfer |
| Data basis | Fingerprint / attendance card — fully approved by management |

---

## 10. Social Insurance Deductions

> Applied on **Base Salary (LCB)** — the salary stated in the employment contract for insurance purposes.  
> **NOT** applied during probation period.

| Deduction | Employee Rate | Basis |
|---|---|---|
| Social Insurance (BHXH) | 8% | LCB |
| Health Insurance (BHYT) | 1.5% | LCB |
| Unemployment Insurance (BHTN) | 1% | LCB |
| **Total** | **10.5%** | LCB |

### Insurance Contribution Ceiling (2026)

> **Legal basis:** Decree 73/2024/NĐ-CP — Base salary (lương cơ sở) = 2,340,000 VND/month  
> Maximum monthly contribution base = 20 × base salary = **46,800,000 VND/month**

```
If LCB > 46,800,000 VND → cap contributions at 46,800,000 VND
If LCB < regional minimum wage → invalid — reject payroll run
```

---

## 11. Personal Income Tax (PIT)

> **Legal basis:**
> - Biểu thuế 2025 (Jan–Dec 2025): Law 04/2007/QH12 — 7 brackets, relief 11M/month
> - Biểu thuế 2026 (from Jan 2026): Law 109/2025/QH15 — 5 brackets, relief 15.5M/month

---

### 11.1 Personal Relief (Giảm Trừ Gia Cảnh)

| Relief Type | 2025 | 2026 | Legal Basis |
|---|---|---|---|
| Self (bản thân) | 11,000,000 VND/month | **15,500,000 VND/month** | Resolution 110/2025/UBTVQH15 |
| Per dependent (người phụ thuộc) | 4,400,000 VND/month | **6,200,000 VND/month** | Resolution 110/2025/UBTVQH15 |

> **Effective date for 2026 rates:** 01/01/2026 (applies to full tax year 2026)

---

### 11.2 Taxable Income Formula

```
Taxable Income = Gross Income
               - BHXH deduction (8% of LCB)
               - BHYT deduction (1.5% of LCB)
               - BHTN deduction (1% of LCB)
               - Self relief (15,500,000 VND from 2026)
               - Dependent relief (6,200,000 × number of dependents)
               - Charitable contributions (if any, with documentation)
               - Voluntary pension fund contributions (if any)
```

---

### 11.3 PIT Brackets — 2025 (7 Brackets)

> Applies to tax year 2025 (Jan–Dec 2025). Legal basis: Law 04/2007/QH12, Article 22.

| Bracket | Taxable Income (VND/month) | Tax Rate | Tax on Bracket |
|---|---|---|---|
| 1 | 0 – 5,000,000 | 5% | Up to 250,000 |
| 2 | 5,000,001 – 10,000,000 | 10% | Up to 500,000 |
| 3 | 10,000,001 – 18,000,000 | 15% | Up to 1,200,000 |
| 4 | 18,000,001 – 32,000,000 | 20% | Up to 2,800,000 |
| 5 | 32,000,001 – 52,000,000 | 25% | Up to 5,000,000 |
| 6 | 52,000,001 – 80,000,000 | 30% | Up to 8,400,000 |
| 7 | Above 80,000,000 | 35% | No limit |

**Quick calculation formula (2025):**

| If taxable income is | PIT = |
|---|---|
| ≤ 5,000,000 | income × 5% |
| ≤ 10,000,000 | income × 10% − 250,000 |
| ≤ 18,000,000 | income × 15% − 750,000 |
| ≤ 32,000,000 | income × 20% − 1,650,000 |
| ≤ 52,000,000 | income × 25% − 3,250,000 |
| ≤ 80,000,000 | income × 30% − 5,850,000 |
| > 80,000,000 | income × 35% − 9,850,000 |

---

### 11.4 PIT Brackets — 2026 (5 Brackets) ⭐ NEW

> Applies from 01/01/2026. Legal basis: Law 109/2025/QH15.  
> Biểu thuế rút gọn từ 7 bậc xuống 5 bậc — simplifies calculation and reduces tax burden.

| Bracket | Taxable Income (VND/month) | Tax Rate | Change from 2025 |
|---|---|---|---|
| 1 | 0 – 10,000,000 | 5% | Expanded (was 0–5M at 5%) |
| 2 | 10,000,001 – 30,000,000 | 10% | Reduced (was 10–18M at 15%) |
| 3 | 30,000,001 – 60,000,000 | 20% | Reduced (was 32–52M at 25%) |
| 4 | 60,000,001 – 100,000,000 | 30% | Same rate, wider band |
| 5 | Above 100,000,000 | 35% | Threshold raised (was 80M) |

**Quick calculation formula (2026):**

| If taxable income is | PIT = |
|---|---|
| ≤ 10,000,000 | income × 5% |
| ≤ 30,000,000 | income × 10% − 500,000 |
| ≤ 60,000,000 | income × 20% − 3,500,000 |
| ≤ 100,000,000 | income × 30% − 9,500,000 |
| > 100,000,000 | income × 35% − 14,500,000 |

---

### 11.5 PIT Calculation Example (2026)

**Employee:** Senior Developer, 25,000,000 VND gross, 0 dependents, Region I

```
Gross income          = 25,000,000 VND
LCB (for insurance)   = 10,000,000 VND (as in contract)

BHXH  = 10,000,000 × 8%   =   800,000 VND
BHYT  = 10,000,000 × 1.5% =   150,000 VND
BHTN  = 10,000,000 × 1%   =   100,000 VND
Total insurance deduction  = 1,050,000 VND

Taxable income = 25,000,000 − 1,050,000 − 15,500,000 = 8,450,000 VND

PIT (Bracket 1 — ≤ 10,000,000 @ 5%) = 8,450,000 × 5% = 422,500 VND

NET SALARY = 25,000,000 − 1,050,000 − 422,500 = 23,527,500 VND
```

---

### 11.6 Implementation — PIT Engine

```java
public long calculatePIT(long taxableIncome, int taxYear) {
    if (taxYear >= 2026) {
        // Law 109/2025/QH15 — 5 brackets
        if (taxableIncome <= 10_000_000)  return (long)(taxableIncome * 0.05);
        if (taxableIncome <= 30_000_000)  return (long)(taxableIncome * 0.10) - 500_000;
        if (taxableIncome <= 60_000_000)  return (long)(taxableIncome * 0.20) - 3_500_000;
        if (taxableIncome <= 100_000_000) return (long)(taxableIncome * 0.30) - 9_500_000;
        return (long)(taxableIncome * 0.35) - 14_500_000;
    } else {
        // Law 04/2007/QH12 — 7 brackets (for 2025 and prior)
        if (taxableIncome <= 5_000_000)   return (long)(taxableIncome * 0.05);
        if (taxableIncome <= 10_000_000)  return (long)(taxableIncome * 0.10) - 250_000;
        if (taxableIncome <= 18_000_000)  return (long)(taxableIncome * 0.15) - 750_000;
        if (taxableIncome <= 32_000_000)  return (long)(taxableIncome * 0.20) - 1_650_000;
        if (taxableIncome <= 52_000_000)  return (long)(taxableIncome * 0.25) - 3_250_000;
        if (taxableIncome <= 80_000_000)  return (long)(taxableIncome * 0.30) - 5_850_000;
        return (long)(taxableIncome * 0.35) - 9_850_000;
    }
}

public long getPersonalRelief(int taxYear) {
    return taxYear >= 2026 ? 15_500_000L : 11_000_000L;
}

public long getDependentRelief(int taxYear) {
    return taxYear >= 2026 ? 6_200_000L : 4_400_000L;
}
```

---

## 12. Payroll Calculation Flowchart

```
INPUT: employee_id + period (YYYY-MM)
              │
              ▼
┌─────────────────────────────────────┐
│ 1. Load active contract             │
│    → Lhq (performance salary)       │
│    → LCB (base for insurance)       │
│    → position_code + salary_step    │
│    → contract_type, work_region     │
│    → dependent_count (for PIT)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Count NCtt from daily_attendance │
│    Get Nt from system config        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Calculate KPI2 (auto)            │
│    → Scan attendance_logs for       │
│      violations this month          │
│    → Count approved leave days      │
│    → Assign A/B/C → weight          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Get KPI1 (manual input)          │
│    → Load from performance_reviews  │
│    → Apply position scope rule      │
│    → Default B if not submitted     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. KPItb = (KPI1 + KPI2) / 2       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Look up Li                       │
│    salary_grades[code][step]        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 7. Calculate HTi                    │
│    HT2 living × (NCtt/Nt)          │
│    HT1 Japanese (check eligibility) │
│    HT3 ODC (if on ODC project)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 8. Core formula                     │
│    Gross = [(Lhq × KPItb)           │
│             + Li + HTi]             │
│             × (NCtt / Nt)           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 9. Add variable components          │
│    + OT Pay (approved OT requests)  │
│    + Holiday bonus (if applicable)  │
│    + Other approved bonuses         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 10. Insurance deductions (on LCB)   │
│    BHXH = LCB × 8%                 │
│    BHYT = LCB × 1.5%               │
│    BHTN = LCB × 1%                 │
│    Cap: LCB ≤ 46,800,000           │
│    Skip if contract_type=PROBATION  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 11. PIT calculation                 │
│    Taxable = Gross - Insurance      │
│              - selfRelief(year)     │
│              - deps × depRelief(yr) │
│    PIT = calculatePIT(taxable, yr)  │
│    Use 5-bracket table from 2026    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 12. Net Salary                      │
│    = Gross + Bonuses                │
│      - BHXH - BHYT - BHTN - PIT    │
└──────────────┬──────────────────────┘
               │
               ▼
OUTPUT: Save payroll_record (DRAFT)
        → HR review → CONFIRMED (locked)
        → Payment processed → PAID
        → Generate PDF payslip
        → Send email to employee
```

---

## 13. Implementation Notes

### 13.1 Tax Year Awareness — Critical

The system must store and use `tax_year` when calculating PIT. Payroll records from 2025 use different brackets than 2026+. Never assume the current year — always read from the `period` field.

```java
int taxYear = Integer.parseInt(period.substring(0, 4)); // "2026-03" → 2026
long pit = pitEngine.calculate(taxableIncome, taxYear);
```

### 13.2 Fields That Must Be Configurable (Never Hardcode)

| Field | Why Configurable |
|---|---|
| Regional minimum wage by zone | Updated by government decree (typically annually) |
| Standard working days per month (`Nt`) | Varies by month and company policy |
| Insurance base salary ceiling | Tied to government base salary — updated periodically |
| Annual salary raise percentage | Decided by Board each year |
| Annual revenue bonus amount | Decided by Board each year |
| ODC project allowance amounts | Per-project negotiation |
| Holiday bonus amount | May be adjusted by management |
| PIT relief amounts (self + dependent) | Updated by National Assembly resolution |

### 13.3 Payroll Record Status Machine

```
DRAFT → CONFIRMED → PAID

DRAFT:     Calculated, pending HR review
CONFIRMED: Locked — no edits allowed; corrections via adjustment record only
PAID:      Payment processed, payslip sent

UNIQUE constraint: (employee_id, period) — one record per employee per month
```

### 13.4 Welfare Records (Non-payroll Items)

```sql
CREATE TABLE welfare_records (
    id                  UUID PRIMARY KEY,
    employee_id         UUID REFERENCES employees(id),
    type                VARCHAR(50),
    -- WEDDING / FUNERAL / BIRTHDAY / HOLIDAY_GIFT / TRIP
    amount              DECIMAL(15,2),
    given_date          DATE,
    note                TEXT,
    included_in_payroll BOOLEAN DEFAULT FALSE,
    payroll_period      VARCHAR(7),  -- e.g. '2026-03', only if included_in_payroll=TRUE
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 13.5 Audit Requirements

Every payroll record must log:
- Who triggered the calculation run
- Who confirmed (locked) the record
- Status change timestamps
- All manual adjustments — field changed, old value, new value, reason, approver

---

## Appendix — Legal Reference Summary

| Regulation | Scope | Effective Date |
|---|---|---|
| Decree 293/2025/NĐ-CP | Regional minimum wages 2026 | 01/01/2026 |
| Decree 73/2024/NĐ-CP | Government base salary 2,340,000 VND (insurance ceiling) | 01/07/2024 |
| Law 109/2025/QH15 | PIT reform — 5 tax brackets, new rates | 01/01/2026 (salary income) |
| Resolution 110/2025/UBTVQH15 | Personal relief 15.5M, dependent relief 6.2M | 01/01/2026 |
| Labor Code 45/2019/QH14 | OT pay rates, paid leave entitlements | 01/01/2021 |
| Law 38/2013/QH13 | Unemployment insurance | Current |
| VTI Salary Regulation 01/2020/QC-VTI v4.0 | Internal salary structure, KPI, allowances | 26/04/2021 |

---

*FACE-Z HRMS · Payroll Rules Specification · Updated March 2026 · Reflects Law 109/2025/QH15 + Decree 293/2025/NĐ-CP*
