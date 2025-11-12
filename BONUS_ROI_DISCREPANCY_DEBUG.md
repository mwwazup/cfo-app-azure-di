# Bonus ROI Data Discrepancy - Debugging Guide

## Issue Reported
When filtering for **May 2025**:

### Bonus ROI Page Shows:
- **Total Bonuses Paid**: $1,450
- **Service Profitability Revenue**: $72,403

### Employee LER Page Shows:
- **Total Bonuses**: $1,480 (difference: $30)
- **Total Revenue**: $74,071.77 (difference: $1,668.77)

---

## Potential Root Causes

### 1. **Pay Period Filtering Mismatch**
The backend filters by pay period `start_date.month`, which might not match the actual dates of the records.

**Example Problem:**
- Pay period starts April 28, ends May 11
- `start_date.month` = 4 (April)
- But records include May 1-11
- **Result**: May records excluded when filtering for month 5

### 2. **Missing Records in Service Breakdown**
Service profitability only includes records that have `service_breakdown` data.

**If some records are missing this field:**
- Main totals include ALL records
- Service profitability totals only include records WITH service_breakdown
- **Result**: Service totals < Main totals

### 3. **Data Type or Precision Issues**
- Floating point rounding errors
- NULL values treated as 0 vs excluded
- Different aggregation methods

---

## Debug Logging Added

I've added comprehensive logging to `backend/api/bonus_roi.py`:

### What to Look For:

```
[Bonus ROI] Filtering for month 5 (calendar month 1-12)
[Bonus ROI]   Pay period 123: start_date=2025-04-28T00:00:00Z, month=4
[Bonus ROI]     ✗ EXCLUDED (month 4 != 5)
[Bonus ROI]   Pay period 124: start_date=2025-05-01T00:00:00Z, month=5
[Bonus ROI]     ✓ INCLUDED
```

```
[Bonus ROI] Found 32 daily records
[Bonus ROI] Data from 3 unique employees: {1, 2, 3}
[Bonus ROI] Date range: 2025-05-01 to 2025-05-31
[Bonus ROI] Unique dates: 11
```

```
[Bonus ROI] Main Totals: Bonuses=$1450.00, Revenue=$72403.00, Profit=$45000.00
```

```
[Bonus ROI] Found 28 records with service breakdown data
[Bonus ROI] Service Breakdown Totals: Revenue=$72403.00, Bonuses=$1450.00
[Bonus ROI] Discrepancy Check: Revenue diff=$0.00, Bonus diff=$0.00
```

---

## Verification Steps

### Step 1: Restart Backend
```bash
cd backend
python main.py
```

### Step 2: Refresh Bonus ROI Page
1. Open Bonus ROI Analysis page
2. Select **Year: 2025**
3. Select **Month: May**
4. Watch backend terminal for logs

### Step 3: Check Backend Logs

**Look for these key indicators:**

#### A. Pay Period Filtering
```
[Bonus ROI] Filtering for month 5 (calendar month 1-12)
```
- Are the correct pay periods being INCLUDED?
- Are any pay periods being EXCLUDED that should be included?

#### B. Record Count
```
[Bonus ROI] Found X daily records
```
- Compare this to the LER page record count for May
- Should be the same number

#### C. Date Range
```
[Bonus ROI] Date range: 2025-05-01 to 2025-05-31
```
- Does this match the expected May date range?
- Are there dates outside May?

#### D. Main Totals
```
[Bonus ROI] Main Totals: Bonuses=$X, Revenue=$Y
```
- Compare to LER page totals
- Should match exactly

#### E. Service Breakdown
```
[Bonus ROI] Found X records with service breakdown data
[Bonus ROI] Service Breakdown Totals: Revenue=$Y, Bonuses=$Z
[Bonus ROI] Discrepancy Check: Revenue diff=$A, Bonus diff=$B
```
- If diff > 0, some records are missing service_breakdown
- This explains why service totals don't match main totals

---

## Expected Findings

### Scenario 1: Pay Period Boundary Issue
**Symptoms:**
- Fewer records than expected
- Date range doesn't cover full month
- Pay periods excluded due to start_date in previous month

**Solution:**
Filter by actual record dates, not pay period start dates.

### Scenario 2: Missing Service Breakdown Data
**Symptoms:**
- Main totals match LER page
- Service totals are lower than main totals
- "Found X records with service breakdown data" < total records

**Solution:**
Run "Calculate All" on Employee LER page to regenerate service_breakdown for all records.

### Scenario 3: Both Issues
**Symptoms:**
- Record count is low (pay period issue)
- Service totals don't match main totals (missing data)

**Solution:**
Fix pay period filtering AND regenerate service data.

---

## How LER Page Filters

The Employee LER page filters differently:

```typescript
// LER page filtering logic
const filtered = allRecords.filter(record => {
  const recordDate = parseLocalDate(record.date);
  
  // Month filter (0-indexed in JS, so May = 4)
  if (filterMonth !== 'all' && recordDate.getMonth() !== filterMonth) {
    return false;
  }
  
  return true;
});
```

**Key Difference:**
- LER filters by **actual record date**
- Bonus ROI filters by **pay period start_date**
- This can cause mismatches for cross-month pay periods

---

## Recommended Fix

### Option 1: Filter by Record Date (Preferred)
Change backend to filter records by their actual `date` field, not by pay period `start_date`:

```python
# Get ALL pay periods for the year
pay_period_ids = [pp['id'] for pp in all_pay_periods]

# Get all records for these pay periods
records_result = supabase.table('employee_daily_records').select('*').in_('pay_period_id', pay_period_ids).execute()
all_records = records_result.data or []

# Filter by month if specified (using record date, not pay period start_date)
if month:
    from datetime import datetime
    records = []
    for r in all_records:
        record_date = datetime.fromisoformat(r['date'].replace('Z', '+00:00'))
        if record_date.month == month:
            records.append(r)
else:
    records = all_records
```

### Option 2: Include Cross-Month Pay Periods
Include pay periods where start_date OR end_date falls in the target month.

---

## Next Steps

1. ✅ **Check backend logs** - See what's actually being filtered
2. ⏳ **Identify root cause** - Pay period filtering? Missing data? Both?
3. ⏳ **Apply fix** - Based on findings
4. ⏳ **Verify** - Ensure Bonus ROI matches LER page exactly

---

## Questions to Answer from Logs

1. **How many pay periods were found for May?**
2. **How many daily records were found?**
3. **What is the date range of the records?**
4. **Do the main totals match the LER page?**
5. **Do the service totals match the main totals?**
6. **How many records have service_breakdown data?**

Once we see the logs, we'll know exactly what's wrong and how to fix it.
