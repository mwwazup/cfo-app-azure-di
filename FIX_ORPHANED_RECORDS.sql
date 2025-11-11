-- Fix Script: Assign Orphaned Daily Records to Employees
-- This script assigns records with NULL employee_id to the correct employees
-- 
-- IMPORTANT: Review the assignments before running the UPDATE statements!

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================
SELECT 
  'Current State' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN employee_id IS NULL THEN 1 END) as orphaned_records,
  COUNT(CASE WHEN employee_id IS NOT NULL THEN 1 END) as assigned_records
FROM employee_daily_records;

-- ============================================================================
-- STEP 2: Show employees and their IDs
-- ============================================================================
SELECT 
  id as employee_id,
  name,
  position,
  user_id
FROM employee_info
ORDER BY name;

-- ============================================================================
-- STEP 3: Preview orphaned records grouped by date range
-- ============================================================================
-- This helps you identify patterns to assign records to the right employee
SELECT 
  DATE_TRUNC('month', date::date) as month,
  COUNT(*) as record_count,
  SUM(total_job_revenue) as total_revenue,
  AVG(total_hours_worked) as avg_hours,
  MIN(date) as first_date,
  MAX(date) as last_date
FROM employee_daily_records
WHERE employee_id IS NULL
GROUP BY DATE_TRUNC('month', date::date)
ORDER BY month DESC;

-- ============================================================================
-- STEP 4: Show sample orphaned records
-- ============================================================================
SELECT 
  id,
  date,
  work_day,
  number_of_jobs,
  total_job_revenue,
  total_hours_worked,
  base_rate,
  pay_period_id
FROM employee_daily_records
WHERE employee_id IS NULL
ORDER BY date DESC
LIMIT 50;

-- ============================================================================
-- STEP 5: MANUAL ASSIGNMENT OPTIONS
-- ============================================================================
-- Option A: Assign ALL orphaned records to ONE employee
-- Replace 'EMPLOYEE_ID_HERE' with the actual employee ID from STEP 2

-- UNCOMMENT AND MODIFY THIS BLOCK:
/*
UPDATE employee_daily_records
SET employee_id = 'EMPLOYEE_ID_HERE'  -- Replace with actual employee UUID
WHERE employee_id IS NULL;
*/

-- ============================================================================
-- Option B: Assign records by date range to different employees
-- Useful if you know which employee worked during which periods

-- UNCOMMENT AND MODIFY THESE BLOCKS:
/*
-- Assign records from specific date range to Employee 1
UPDATE employee_daily_records
SET employee_id = 'EMPLOYEE_1_ID_HERE'
WHERE employee_id IS NULL
  AND date >= '2024-01-01'
  AND date <= '2024-06-30';

-- Assign records from another date range to Employee 2
UPDATE employee_daily_records
SET employee_id = 'EMPLOYEE_2_ID_HERE'
WHERE employee_id IS NULL
  AND date >= '2024-07-01'
  AND date <= '2024-12-31';
*/

-- ============================================================================
-- Option C: Assign records by pay period
-- If you know which employee each pay period belongs to

-- UNCOMMENT AND MODIFY THIS BLOCK:
/*
UPDATE employee_daily_records
SET employee_id = 'EMPLOYEE_ID_HERE'
WHERE employee_id IS NULL
  AND pay_period_id = 'PAY_PERIOD_ID_HERE';
*/

-- ============================================================================
-- Option D: Assign records by base_rate
-- If different employees have different base rates

-- UNCOMMENT AND MODIFY THESE BLOCKS:
/*
-- Assign records with base_rate = 25.00 to Employee 1
UPDATE employee_daily_records
SET employee_id = 'EMPLOYEE_1_ID_HERE'
WHERE employee_id IS NULL
  AND base_rate = 25.00;

-- Assign records with base_rate = 30.00 to Employee 2
UPDATE employee_daily_records
SET employee_id = 'EMPLOYEE_2_ID_HERE'
WHERE employee_id IS NULL
  AND base_rate = 30.00;
*/

-- ============================================================================
-- STEP 6: Verify the fix
-- ============================================================================
-- Run this after your UPDATE statements to verify
SELECT 
  'After Fix' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN employee_id IS NULL THEN 1 END) as orphaned_records,
  COUNT(CASE WHEN employee_id IS NOT NULL THEN 1 END) as assigned_records
FROM employee_daily_records;

-- Show records per employee
SELECT 
  ei.name as employee_name,
  COUNT(edr.id) as record_count,
  MIN(edr.date) as earliest_record,
  MAX(edr.date) as latest_record,
  SUM(edr.total_job_revenue) as total_revenue
FROM employee_info ei
LEFT JOIN employee_daily_records edr ON ei.id = edr.employee_id
GROUP BY ei.id, ei.name
ORDER BY ei.name;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. The migration added employee_id column but didn't populate it
-- 2. Records with NULL employee_id won't show in the UI (filtered out)
-- 3. You need to manually assign these records to the correct employees
-- 4. Use the employee IDs from STEP 2 in your UPDATE statements
-- 5. Test with a small batch first before updating all records
-- 6. Consider backing up the database before running UPDATE statements

-- ============================================================================
-- QUICK FIX: If you only have ONE employee
-- ============================================================================
-- If all records belong to one employee, use this:
/*
DO $$
DECLARE
  single_employee_id UUID;
BEGIN
  -- Get the first (and only) employee ID
  SELECT id INTO single_employee_id FROM employee_info LIMIT 1;
  
  -- Assign all orphaned records to this employee
  UPDATE employee_daily_records
  SET employee_id = single_employee_id
  WHERE employee_id IS NULL;
  
  RAISE NOTICE '✅ Assigned all orphaned records to employee: %', single_employee_id;
END $$;
*/
