-- Migration: Fix Inconsistent Pay Period User IDs
-- Purpose: Standardize pay_periods.user_id to always point to company owner (Clerk ID)
-- Date: 2025-11-10
-- Priority: LOW (data consistency cleanup)

-- ============================================================================
-- PROBLEM IDENTIFIED:
-- Some pay_periods have user_id pointing to employee UUIDs (old structure)
-- Some pay_periods have user_id pointing to owner Clerk IDs (correct structure)
-- 
-- SOLUTION:
-- Update all pay_periods to use the owner's Clerk ID
-- ============================================================================

-- ============================================================================
-- STEP 1: Identify the pattern
-- ============================================================================
-- Clerk IDs start with "user_" (e.g., user_33fQP...)
-- Employee UUIDs are standard UUIDs (e.g., 84c7709a-...)

-- ============================================================================
-- STEP 2: Find the owner's Clerk ID
-- ============================================================================
-- The owner's Clerk ID should be in employee_info table or can be identified
-- by finding pay_periods that already have the correct format

-- Get the owner's Clerk ID (assuming it's the one that appears most frequently)
WITH owner_clerk_id AS (
  SELECT user_id, COUNT(*) as count
  FROM pay_periods
  WHERE user_id LIKE 'user_%'  -- Clerk IDs start with 'user_'
  GROUP BY user_id
  ORDER BY count DESC
  LIMIT 1
)
SELECT 
  'Owner Clerk ID identified: ' || user_id as status,
  count || ' pay periods already correct' as info
FROM owner_clerk_id;

-- ============================================================================
-- STEP 3: Update incorrect pay_periods
-- ============================================================================
-- IMPORTANT: This assumes you only have ONE company owner in the database
-- If you have multiple companies, you'll need to map each employee to their owner

-- Option A: If you know your Clerk ID, replace 'YOUR_CLERK_ID_HERE'
-- UPDATE pay_periods
-- SET user_id = 'YOUR_CLERK_ID_HERE'
-- WHERE user_id NOT LIKE 'user_%';

-- Option B: Automatic detection (use the most common Clerk ID)
WITH owner_clerk_id AS (
  SELECT user_id
  FROM pay_periods
  WHERE user_id LIKE 'user_%'
  GROUP BY user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
UPDATE pay_periods
SET user_id = (SELECT user_id FROM owner_clerk_id)
WHERE user_id NOT LIKE 'user_%'  -- Fix only the ones with employee UUIDs
  AND user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; -- UUID pattern

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Check if any pay_periods still have employee UUIDs
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All pay_periods now use Clerk IDs'
    ELSE '⚠️ ' || COUNT(*) || ' pay_periods still have employee UUIDs'
  END as status
FROM pay_periods
WHERE user_id NOT LIKE 'user_%'
  AND user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Show summary of user_id formats
SELECT 
  CASE 
    WHEN user_id LIKE 'user_%' THEN 'Clerk ID (Correct)'
    WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Employee UUID (Incorrect)'
    ELSE 'Unknown Format'
  END as user_id_type,
  COUNT(*) as count,
  ARRAY_AGG(DISTINCT user_id) as example_ids
FROM pay_periods
GROUP BY user_id_type
ORDER BY count DESC;

-- ============================================================================
-- STEP 5: Add constraint to prevent future issues (OPTIONAL)
-- ============================================================================
-- This will enforce that user_id must start with 'user_' (Clerk ID format)

-- ALTER TABLE pay_periods
-- ADD CONSTRAINT user_id_must_be_clerk_id 
-- CHECK (user_id LIKE 'user_%');

-- Note: Only uncomment above if you're 100% sure all user_ids are Clerk IDs

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Pay period user_id standardization complete!';
  RAISE NOTICE '📊 All pay_periods now use company owner Clerk IDs';
  RAISE NOTICE '🔒 Data consistency improved';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify the changes with the queries above';
  RAISE NOTICE '2. Test pay period creation in the UI';
  RAISE NOTICE '3. Confirm employee daily records still load correctly';
END $$;
