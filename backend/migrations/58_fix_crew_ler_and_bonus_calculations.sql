-- Migration: Fix Crew LER and Bonus Calculations
-- Date: 2025-12-22
-- Purpose: Recalculate crew LER and bonus values using CREW-level metrics
--          instead of individual employee metrics which caused negative LER
--
-- Problem: 
--   1. COGS was stored as full amount for each crew member instead of split
--   2. LER was calculated per-employee (negative due to split revenue)
--   3. Bonus was calculated from individual gross profit, not crew-level
--
-- Solution:
--   1. Recalculate LER at crew level: (Total Revenue - Total COGS - Total Labor) / Total Labor
--   2. Recalculate bonus based on crew LER qualification
--   3. Split bonus by designated percentage (from crew_members table)
--   4. Update daily_record_crew_members with correct attributed values

-- Step 1: Create a temporary table with crew-level calculations per date
CREATE TEMP TABLE crew_day_metrics AS
WITH crew_days AS (
  -- Get all crew job records grouped by crew_id and date
  SELECT 
    edr.crew_id,
    edr.date,
    -- Sum revenue across all crew members for this day (gives total crew revenue)
    SUM(edr.total_job_revenue) as total_crew_revenue,
    -- For COGS: Take the MAX value - COGS should be the same for all crew members
    -- but was sometimes stored incorrectly with different values per member
    -- The MAX is the correct total crew COGS (not split per member)
    MAX(edr.cogs_no_labor) as total_crew_cogs,
    -- Sum labor costs
    SUM(edr.employee_base_pay) as total_crew_labor,
    -- Count crew members
    COUNT(*) as crew_member_count,
    -- Get job count from first record (same for all members)
    MAX(edr.number_of_jobs) as total_jobs
  FROM employee_daily_records edr
  WHERE edr.is_crew_job = true 
    AND edr.crew_id IS NOT NULL
    AND edr.called_out = false
  GROUP BY edr.crew_id, edr.date
)
SELECT 
  cd.*,
  -- Calculate crew-level gross profit
  (cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) as crew_gross_profit,
  -- Calculate crew-level LER
  CASE 
    WHEN cd.total_crew_labor > 0 
    THEN (cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) / cd.total_crew_labor
    ELSE 0 
  END as crew_ler,
  -- Determine if crew qualifies for bonus (LER between 0.15 and 5.0)
  CASE 
    WHEN cd.total_crew_labor > 0 
      AND ((cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) / cd.total_crew_labor) >= 0.15
      AND ((cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) / cd.total_crew_labor) <= 5.0
    THEN true
    ELSE false
  END as qualifies_for_bonus,
  -- Calculate total crew bonus (10% of gross profit if qualified)
  CASE 
    WHEN cd.total_crew_labor > 0 
      AND ((cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) / cd.total_crew_labor) >= 0.15
      AND ((cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) / cd.total_crew_labor) <= 5.0
    THEN (cd.total_crew_revenue - cd.total_crew_cogs - cd.total_crew_labor) * 0.10
    ELSE 0
  END as total_crew_bonus
FROM crew_days cd;

-- Step 2: Update employee_daily_records with correct crew LER
UPDATE employee_daily_records edr
SET 
  ler = cdm.crew_ler,
  qualify_for_bonus = cdm.qualifies_for_bonus
FROM crew_day_metrics cdm
WHERE edr.crew_id = cdm.crew_id 
  AND edr.date = cdm.date
  AND edr.is_crew_job = true;

-- Step 3: Update daily_record_crew_members with correct bonus attribution
-- First, get the bonus percentages from crew_members table
WITH member_bonus_pct AS (
  SELECT 
    cm.crew_id,
    cm.employee_id,
    COALESCE(cr.bonus_percentage, 50) as bonus_percentage  -- Default 50% if not set
  FROM crew_members cm
  LEFT JOIN crew_roles cr ON cm.role_id = cr.id
),
-- Calculate each member's bonus share
member_bonus_calc AS (
  SELECT 
    drcm.id as crew_member_record_id,
    drcm.daily_record_id,
    drcm.employee_id,
    edr.crew_id,
    edr.date,
    cdm.total_crew_bonus,
    cdm.total_crew_revenue,
    cdm.crew_member_count,
    COALESCE(mbp.bonus_percentage, 100.0 / cdm.crew_member_count) as bonus_pct,
    -- Calculate this member's bonus share
    cdm.total_crew_bonus * COALESCE(mbp.bonus_percentage, 100.0 / cdm.crew_member_count) / 100 as member_bonus,
    -- Calculate attributed revenue (equal split)
    cdm.total_crew_revenue / cdm.crew_member_count as member_revenue
  FROM daily_record_crew_members drcm
  JOIN employee_daily_records edr ON drcm.daily_record_id = edr.id
  JOIN crew_day_metrics cdm ON edr.crew_id = cdm.crew_id AND edr.date = cdm.date
  LEFT JOIN member_bonus_pct mbp ON edr.crew_id = mbp.crew_id AND drcm.employee_id = mbp.employee_id
)
UPDATE daily_record_crew_members drcm
SET 
  attributed_bonus = mbc.member_bonus,
  attributed_revenue = mbc.member_revenue,
  bonus_percentage = mbc.bonus_pct
FROM member_bonus_calc mbc
WHERE drcm.id = mbc.crew_member_record_id;

-- Step 4: Also update the bonus fields in employee_daily_records
WITH member_bonuses AS (
  SELECT 
    edr.id as record_id,
    edr.crew_id,
    edr.date,
    edr.employee_id,
    cdm.total_crew_bonus,
    cdm.crew_member_count,
    COALESCE(
      (SELECT cr.bonus_percentage 
       FROM crew_members cm 
       JOIN crew_roles cr ON cm.role_id = cr.id 
       WHERE cm.crew_id = edr.crew_id AND cm.employee_id = edr.employee_id
       LIMIT 1),
      100.0 / cdm.crew_member_count
    ) as bonus_pct
  FROM employee_daily_records edr
  JOIN crew_day_metrics cdm ON edr.crew_id = cdm.crew_id AND edr.date = cdm.date
  WHERE edr.is_crew_job = true
)
UPDATE employee_daily_records edr
SET 
  bonus_qualified_for_percent = mb.total_crew_bonus * mb.bonus_pct / 100
FROM member_bonuses mb
WHERE edr.id = mb.record_id;

-- Step 5: Cleanup
DROP TABLE IF EXISTS crew_day_metrics;

-- Summary of changes:
-- 1. All crew job records now have the same LER (crew-level LER)
-- 2. Bonus qualification is based on crew LER (0.15 to 5.0 threshold)
-- 3. Bonus is split by designated percentage from crew_roles table
-- 4. If no role percentage is set, defaults to equal split

-- To verify the fix, run:
-- SELECT crew_id, date, COUNT(*) as members, 
--        MIN(ler) as min_ler, MAX(ler) as max_ler,
--        SUM(bonus_qualified_for_percent) as total_bonus
-- FROM employee_daily_records 
-- WHERE is_crew_job = true AND crew_id IS NOT NULL
-- GROUP BY crew_id, date
-- ORDER BY date DESC
-- LIMIT 20;
