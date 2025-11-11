-- Diagnostic Query: Check Employee Daily Records Data
-- Run this in Supabase SQL Editor to diagnose the data loss issue

-- ============================================================================
-- PART 1: Check if employee_id column exists and has data
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_daily_records' 
  AND column_name = 'employee_id';

-- ============================================================================
-- PART 2: Count records by employee_id (including NULL)
-- ============================================================================
SELECT 
  employee_id,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM employee_daily_records
GROUP BY employee_id
ORDER BY employee_id NULLS FIRST;

-- ============================================================================
-- PART 3: Check employee_info table
-- ============================================================================
SELECT 
  id as employee_id,
  name,
  position,
  user_id,
  current_base_rate
FROM employee_info
ORDER BY name;

-- ============================================================================
-- PART 4: Records with NULL employee_id (orphaned records)
-- ============================================================================
SELECT 
  id,
  date,
  work_day,
  total_job_revenue,
  total_hours_worked,
  employee_id,
  pay_period_id
FROM employee_daily_records
WHERE employee_id IS NULL
ORDER BY date DESC
LIMIT 20;

-- ============================================================================
-- PART 5: Records WITH employee_id
-- ============================================================================
SELECT 
  edr.id,
  edr.date,
  edr.work_day,
  edr.total_job_revenue,
  edr.employee_id,
  ei.name as employee_name
FROM employee_daily_records edr
LEFT JOIN employee_info ei ON edr.employee_id = ei.id
WHERE edr.employee_id IS NOT NULL
ORDER BY edr.date DESC
LIMIT 20;

-- ============================================================================
-- PART 6: Pay periods check
-- ============================================================================
SELECT 
  id,
  period_name,
  start_date,
  end_date,
  user_id,
  year
FROM pay_periods
ORDER BY start_date DESC;

-- ============================================================================
-- PART 7: Count daily records per pay period
-- ============================================================================
SELECT 
  pp.period_name,
  pp.start_date,
  pp.end_date,
  COUNT(edr.id) as record_count,
  COUNT(DISTINCT edr.employee_id) as unique_employees
FROM pay_periods pp
LEFT JOIN employee_daily_records edr ON pp.id = edr.pay_period_id
GROUP BY pp.id, pp.period_name, pp.start_date, pp.end_date
ORDER BY pp.start_date DESC;

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
DECLARE
  total_records INT;
  null_employee_id INT;
  with_employee_id INT;
BEGIN
  SELECT COUNT(*) INTO total_records FROM employee_daily_records;
  SELECT COUNT(*) INTO null_employee_id FROM employee_daily_records WHERE employee_id IS NULL;
  SELECT COUNT(*) INTO with_employee_id FROM employee_daily_records WHERE employee_id IS NOT NULL;
  
  RAISE NOTICE '📊 SUMMARY:';
  RAISE NOTICE '   Total daily records: %', total_records;
  RAISE NOTICE '   Records with NULL employee_id: % (ORPHANED - will not show in UI)', null_employee_id;
  RAISE NOTICE '   Records with employee_id: % (VISIBLE in UI)', with_employee_id;
  
  IF null_employee_id > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % records have NULL employee_id and will not appear in the UI!', null_employee_id;
    RAISE NOTICE '   You need to assign these records to employees.';
  END IF;
END $$;
