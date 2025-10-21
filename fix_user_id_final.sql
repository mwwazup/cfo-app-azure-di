-- Fix user_id column type from UUID to TEXT for Clerk authentication
-- This script drops foreign keys, RLS policies, changes column types, then recreates policies

-- ============================================
-- STEP 1: Drop Foreign Key Constraints
-- ============================================

-- Drop foreign key from employee_info to auth.users (doesn't exist with Clerk)
ALTER TABLE employee_info 
DROP CONSTRAINT IF EXISTS employee_info_user_id_fkey;

-- Drop foreign key from cogs_settings to auth.users (doesn't exist with Clerk)
ALTER TABLE cogs_settings 
DROP CONSTRAINT IF EXISTS cogs_settings_user_id_fkey;

-- Drop foreign key from company_settings to auth.users (doesn't exist with Clerk)
ALTER TABLE company_settings 
DROP CONSTRAINT IF EXISTS company_settings_user_id_fkey;

-- ============================================
-- STEP 2: Drop RLS Policies
-- ============================================

-- Drop policies on employee_info
DROP POLICY IF EXISTS "Users can view their own employees" ON employee_info;
DROP POLICY IF EXISTS "Users can insert their own employees" ON employee_info;
DROP POLICY IF EXISTS "Users can update their own employees" ON employee_info;
DROP POLICY IF EXISTS "Users can delete their own employees" ON employee_info;

-- Drop policies on pay_periods
DROP POLICY IF EXISTS "Users can view their own pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Users can insert their own pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Users can update their own pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Users can delete their own pay periods" ON pay_periods;

-- Drop policies on employee_daily_records
DROP POLICY IF EXISTS "Users can view their own daily records" ON employee_daily_records;
DROP POLICY IF EXISTS "Users can insert their own daily records" ON employee_daily_records;
DROP POLICY IF EXISTS "Users can update their own daily records" ON employee_daily_records;
DROP POLICY IF EXISTS "Users can delete their own daily records" ON employee_daily_records;

-- Drop policies on cogs_settings
DROP POLICY IF EXISTS "Users can view their own COGS settings" ON cogs_settings;
DROP POLICY IF EXISTS "Users can insert their own COGS settings" ON cogs_settings;
DROP POLICY IF EXISTS "Users can update their own COGS settings" ON cogs_settings;
DROP POLICY IF EXISTS "Users can delete their own COGS settings" ON cogs_settings;

-- Drop policies on company_settings
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can delete their own company settings" ON company_settings;

-- ============================================
-- STEP 3: Change Column Types from UUID to TEXT
-- ============================================

-- Change employee_info.user_id
ALTER TABLE employee_info 
ALTER COLUMN user_id TYPE TEXT;

-- Change cogs_settings.user_id
ALTER TABLE cogs_settings 
ALTER COLUMN user_id TYPE TEXT;

-- Change company_settings.user_id
ALTER TABLE company_settings 
ALTER COLUMN user_id TYPE TEXT;

-- ============================================
-- STEP 4: Recreate RLS Policies with TEXT user_id
-- ============================================

-- Policies for employee_info
CREATE POLICY "Users can view their own employees"
  ON employee_info FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own employees"
  ON employee_info FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own employees"
  ON employee_info FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own employees"
  ON employee_info FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policies for pay_periods (references employee_info)
CREATE POLICY "Users can view their own pay periods"
  ON pay_periods FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employee_info 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can insert their own pay periods"
  ON pay_periods FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employee_info 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can update their own pay periods"
  ON pay_periods FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM employee_info 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can delete their own pay periods"
  ON pay_periods FOR DELETE
  USING (
    employee_id IN (
      SELECT id FROM employee_info 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Policies for employee_daily_records (references pay_periods)
CREATE POLICY "Users can view their own daily records"
  ON employee_daily_records FOR SELECT
  USING (
    pay_period_id IN (
      SELECT pp.id FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE ei.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can insert their own daily records"
  ON employee_daily_records FOR INSERT
  WITH CHECK (
    pay_period_id IN (
      SELECT pp.id FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE ei.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can update their own daily records"
  ON employee_daily_records FOR UPDATE
  USING (
    pay_period_id IN (
      SELECT pp.id FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE ei.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

CREATE POLICY "Users can delete their own daily records"
  ON employee_daily_records FOR DELETE
  USING (
    pay_period_id IN (
      SELECT pp.id FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE ei.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Policies for cogs_settings
CREATE POLICY "Users can view their own COGS settings"
  ON cogs_settings FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own COGS settings"
  ON cogs_settings FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own COGS settings"
  ON cogs_settings FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own COGS settings"
  ON cogs_settings FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policies for company_settings
CREATE POLICY "Users can view their own company settings"
  ON company_settings FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own company settings"
  ON company_settings FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own company settings"
  ON company_settings FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own company settings"
  ON company_settings FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================
-- STEP 5: Verify Changes
-- ============================================

-- Check column types
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('employee_info', 'cogs_settings', 'company_settings')
    AND column_name = 'user_id'
ORDER BY table_name;

-- Expected output:
-- company_settings | user_id | text
-- cogs_settings    | user_id | text
-- employee_info    | user_id | text

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE tablename IN ('employee_info', 'pay_periods', 'employee_daily_records', 'cogs_settings', 'company_settings')
ORDER BY tablename, policyname;

-- Check foreign keys (should be none on user_id columns)
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('employee_info', 'cogs_settings', 'company_settings')
  AND kcu.column_name = 'user_id';

-- Should return no rows (no foreign keys on user_id)

-- Success message
SELECT '✅ Migration completed successfully! user_id columns are now TEXT type and ready for Clerk.' AS status;
