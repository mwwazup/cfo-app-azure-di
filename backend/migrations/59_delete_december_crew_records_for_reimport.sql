-- Migration: Delete December 2025 Crew Records for Re-Import
-- Date: 2025-12-22
-- Purpose: Remove crew records from December 2025 that have incorrect COGS values
--          so they can be re-imported with the corrected CSV import logic
--
-- IMPORTANT: This script ONLY deletes crew records (is_crew_job = true) from December 2025
--            Solo records are NOT affected
--
-- After running this script:
-- 1. Re-import your December 2025 CSV file through the Employee LER page
-- 2. The corrected import logic will calculate proper crew-level LER and COGS

-- Step 1: Preview what will be deleted (RUN THIS FIRST to verify)
-- Uncomment and run this SELECT to see what records will be deleted:
/*
SELECT 
  edr.id,
  edr.date,
  edr.employee_id,
  edr.crew_id,
  edr.total_job_revenue,
  edr.cogs_no_labor,
  edr.ler,
  edr.is_crew_job
FROM employee_daily_records edr
WHERE edr.is_crew_job = true
  AND edr.date >= '2025-12-01'
  AND edr.date <= '2025-12-31'
ORDER BY edr.date, edr.crew_id;
*/

-- Step 2: Delete crew attributions first (foreign key constraint)
DELETE FROM daily_record_crew_members
WHERE daily_record_id IN (
  SELECT id FROM employee_daily_records
  WHERE is_crew_job = true
    AND date >= '2025-12-01'
    AND date <= '2025-12-31'
);

-- Step 3: Delete the December 2025 crew records
DELETE FROM employee_daily_records
WHERE is_crew_job = true
  AND date >= '2025-12-01'
  AND date <= '2025-12-31';

-- Summary of what was deleted:
-- Run this after to confirm:
/*
SELECT 
  'December 2025 crew records remaining:' as check_type,
  COUNT(*) as count
FROM employee_daily_records
WHERE is_crew_job = true
  AND date >= '2025-12-01'
  AND date <= '2025-12-31';
*/
