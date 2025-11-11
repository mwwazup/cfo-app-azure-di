# Employee Data Loss - Diagnosis and Fix

## Problem Description

After adding the `employee_id` column to `employee_daily_records` table:
- **Jared**: Data is loading correctly
- **Daniel**: Data not loading, 2 of 3 pay periods missing
- **Seth**: Had data but now shows nothing

## Root Cause

When the `employee_id` column was added to the database, **existing records were not populated** with employee IDs. They have `NULL` for `employee_id`.

The updated code now filters records by employee:
```typescript
query = query.eq('employee_id', employeeId);
```

This filter **excludes records where `employee_id IS NULL`**, making them invisible in the UI.

## Why Different Employees Show Different Results

1. **Jared (Working)**: His records have `employee_id` populated correctly
2. **Daniel (Partial)**: Some records have `employee_id`, some are NULL
3. **Seth (Nothing)**: All his records have `employee_id = NULL`

## Diagnosis Steps

### Step 1: Run Diagnostic Query

Open Supabase SQL Editor and run `CHECK_EMPLOYEE_DATA.sql`:

```sql
-- This will show:
-- 1. If employee_id column exists
-- 2. Count of records per employee (including NULL)
-- 3. List of all employees
-- 4. Orphaned records (NULL employee_id)
-- 5. Records with employee_id assigned
```

**Expected Output:**
```
Total daily records: 150
Records with NULL employee_id: 100 (ORPHANED)
Records with employee_id: 50 (VISIBLE)
```

### Step 2: Identify Employee IDs

From the diagnostic query, note the employee IDs:
```
Jared:  abc123-uuid-here
Daniel: def456-uuid-here
Seth:   ghi789-uuid-here
```

## Fix Options

### Option 1: Assign All Records to Correct Employees (RECOMMENDED)

If you know which records belong to which employee, use `FIX_ORPHANED_RECORDS.sql`.

**Example: Assign by date range**
```sql
-- Seth's records (Jan-June 2024)
UPDATE employee_daily_records
SET employee_id = 'ghi789-uuid-here'
WHERE employee_id IS NULL
  AND date >= '2024-01-01'
  AND date <= '2024-06-30';

-- Daniel's records (July-Dec 2024)
UPDATE employee_daily_records
SET employee_id = 'def456-uuid-here'
WHERE employee_id IS NULL
  AND date >= '2024-07-01'
  AND date <= '2024-12-31';
```

**Example: Assign by base rate**
```sql
-- If Seth has base_rate = 25.00
UPDATE employee_daily_records
SET employee_id = 'ghi789-uuid-here'
WHERE employee_id IS NULL
  AND base_rate = 25.00;

-- If Daniel has base_rate = 30.00
UPDATE employee_daily_records
SET employee_id = 'def456-uuid-here'
WHERE employee_id IS NULL
  AND base_rate = 30.00;
```

**Example: Assign by pay period**
```sql
-- Check which pay periods belong to which employee
SELECT pp.period_name, pp.start_date, COUNT(edr.id) as record_count
FROM pay_periods pp
LEFT JOIN employee_daily_records edr ON pp.id = edr.pay_period_id
WHERE edr.employee_id IS NULL
GROUP BY pp.id, pp.period_name, pp.start_date
ORDER BY pp.start_date;

-- Then assign by pay period
UPDATE employee_daily_records
SET employee_id = 'ghi789-uuid-here'
WHERE employee_id IS NULL
  AND pay_period_id = 'pay-period-uuid-here';
```

### Option 2: Quick Fix for Single Employee

If all orphaned records belong to ONE employee:

```sql
DO $$
DECLARE
  target_employee_id UUID;
BEGIN
  -- Replace 'Seth' with the employee name
  SELECT id INTO target_employee_id 
  FROM employee_info 
  WHERE name = 'Seth';
  
  -- Assign all orphaned records to this employee
  UPDATE employee_daily_records
  SET employee_id = target_employee_id
  WHERE employee_id IS NULL;
  
  RAISE NOTICE 'Assigned % records to %', 
    (SELECT COUNT(*) FROM employee_daily_records WHERE employee_id = target_employee_id),
    'Seth';
END $$;
```

### Option 3: Temporary Fix - Show All Records (NOT RECOMMENDED)

If you need to see the data immediately while you figure out assignments, you can temporarily modify the query to include NULL records:

**In `employeeLERService.ts`:**
```typescript
export async function getDailyRecords(payPeriodId: string, employeeId?: string): Promise<DailyRecord[]> {
  let query = supabase
    .from('employee_daily_records')
    .select('*')
    .eq('pay_period_id', payPeriodId);
  
  // TEMPORARY: Include records with NULL employee_id OR matching employee_id
  if (employeeId) {
    query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
  }
  
  const { data, error } = await query.order('date', { ascending: true });
  // ...
}
```

**WARNING**: This will show orphaned records to ALL employees until you properly assign them.

## Verification Steps

After running your fix, verify in Supabase:

```sql
-- Check that all records are assigned
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN employee_id IS NULL THEN 1 END) as orphaned,
  COUNT(CASE WHEN employee_id IS NOT NULL THEN 1 END) as assigned
FROM employee_daily_records;

-- Should show: orphaned = 0

-- Check records per employee
SELECT 
  ei.name,
  COUNT(edr.id) as record_count,
  MIN(edr.date) as earliest,
  MAX(edr.date) as latest
FROM employee_info ei
LEFT JOIN employee_daily_records edr ON ei.id = edr.employee_id
GROUP BY ei.name
ORDER BY ei.name;
```

## Prevention for Future

When creating new records, the code now includes `employee_id`:

```typescript
// ✅ Correct - includes employee_id
await employeeLERService.createDailyRecord(payPeriodId, record, employeeId);

// ❌ Wrong - would create NULL employee_id
await employeeLERService.createDailyRecord(payPeriodId, record);
```

All new records will have `employee_id` populated automatically.

## Pay Period Issues

If pay periods are also missing, check:

```sql
-- Show all pay periods
SELECT * FROM pay_periods ORDER BY start_date DESC;

-- Pay periods are company-wide (not per-employee)
-- All employees should see the same pay periods
```

If pay periods are missing, they may have been accidentally deleted. You'll need to recreate them using the "Auto-Generate Pay Periods" feature in the UI.

## Summary

1. **Run**: `CHECK_EMPLOYEE_DATA.sql` to diagnose
2. **Identify**: Which records belong to which employee
3. **Fix**: Use `FIX_ORPHANED_RECORDS.sql` to assign records
4. **Verify**: Check that all records now have employee_id
5. **Test**: Switch between employees in UI and verify unique data

## Files Created

- `CHECK_EMPLOYEE_DATA.sql` - Diagnostic queries
- `FIX_ORPHANED_RECORDS.sql` - Fix scripts with multiple options
- `DATA_LOSS_DIAGNOSIS_AND_FIX.md` - This document

## Need Help?

If you're unsure how to assign records, provide:
1. Output from `CHECK_EMPLOYEE_DATA.sql`
2. How you can identify which records belong to which employee (dates, base rates, etc.)
3. I can write a custom assignment script for your specific situation
