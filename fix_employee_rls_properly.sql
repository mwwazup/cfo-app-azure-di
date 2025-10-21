-- Fix Employee LER RLS policies to work with Clerk authentication
-- This matches the pattern used in financial_documents but adapted for TEXT user_id

-- ============================================
-- STEP 1: Drop existing policies
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated access to employee_info" ON employee_info;
DROP POLICY IF EXISTS "Allow authenticated access to pay_periods" ON pay_periods;
DROP POLICY IF EXISTS "Allow authenticated access to daily_records" ON employee_daily_records;
DROP POLICY IF EXISTS "Allow authenticated access to cogs_settings" ON cogs_settings;
DROP POLICY IF EXISTS "Allow authenticated access to company_settings" ON company_settings;

DROP POLICY IF EXISTS "Users can view their own employees" ON employee_info;
DROP POLICY IF EXISTS "Users can insert their own employees" ON employee_info;
DROP POLICY IF EXISTS "Users can update their own employees" ON employee_info;
DROP POLICY IF EXISTS "Users can delete their own employees" ON employee_info;

DROP POLICY IF EXISTS "Users can view their own pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Users can insert their own pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Users can update their own pay periods" ON pay_periods;
DROP POLICY IF EXISTS "Users can delete their own pay periods" ON pay_periods;

DROP POLICY IF EXISTS "Users can view their own daily records" ON employee_daily_records;
DROP POLICY IF EXISTS "Users can insert their own daily records" ON employee_daily_records;
DROP POLICY IF EXISTS "Users can update their own daily records" ON employee_daily_records;
DROP POLICY IF EXISTS "Users can delete their own daily records" ON employee_daily_records;

DROP POLICY IF EXISTS "Users can view their own COGS settings" ON cogs_settings;
DROP POLICY IF EXISTS "Users can insert their own COGS settings" ON cogs_settings;
DROP POLICY IF EXISTS "Users can update their own COGS settings" ON cogs_settings;
DROP POLICY IF EXISTS "Users can delete their own COGS settings" ON cogs_settings;

DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can delete their own company settings" ON company_settings;

-- ============================================
-- STEP 2: Create helper function to get Clerk user ID from JWT
-- ============================================

-- This function extracts the Clerk user ID from the JWT token
-- Clerk tokens have the user ID in the 'sub' claim
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );
$$ LANGUAGE SQL STABLE;

-- ============================================
-- STEP 3: Create RLS policies matching financial_documents pattern
-- ============================================

-- Policies for employee_info
CREATE POLICY "select_own_employee_info"
  ON employee_info FOR SELECT
  TO authenticated
  USING (user_id = auth.clerk_user_id());

CREATE POLICY "insert_own_employee_info"
  ON employee_info FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.clerk_user_id());

CREATE POLICY "update_own_employee_info"
  ON employee_info FOR UPDATE
  TO authenticated
  USING (user_id = auth.clerk_user_id());

CREATE POLICY "delete_own_employee_info"
  ON employee_info FOR DELETE
  TO authenticated
  USING (user_id = auth.clerk_user_id());

-- Policies for pay_periods (via employee_info relationship)
CREATE POLICY "select_own_pay_periods"
  ON pay_periods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee_info 
      WHERE employee_info.id = pay_periods.employee_id 
      AND employee_info.user_id = auth.clerk_user_id()
    )
  );

CREATE POLICY "insert_own_pay_periods"
  ON pay_periods FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee_info 
      WHERE employee_info.id = pay_periods.employee_id 
      AND employee_info.user_id = auth.clerk_user_id()
    )
  );

CREATE POLICY "update_own_pay_periods"
  ON pay_periods FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee_info 
      WHERE employee_info.id = pay_periods.employee_id 
      AND employee_info.user_id = auth.clerk_user_id()
    )
  );

CREATE POLICY "delete_own_pay_periods"
  ON pay_periods FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee_info 
      WHERE employee_info.id = pay_periods.employee_id 
      AND employee_info.user_id = auth.clerk_user_id()
    )
  );

-- Policies for employee_daily_records (via pay_periods relationship)
CREATE POLICY "select_own_daily_records"
  ON employee_daily_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE pp.id = employee_daily_records.pay_period_id 
      AND ei.user_id = auth.clerk_user_id()
    )
  );

CREATE POLICY "insert_own_daily_records"
  ON employee_daily_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE pp.id = employee_daily_records.pay_period_id 
      AND ei.user_id = auth.clerk_user_id()
    )
  );

CREATE POLICY "update_own_daily_records"
  ON employee_daily_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE pp.id = employee_daily_records.pay_period_id 
      AND ei.user_id = auth.clerk_user_id()
    )
  );

CREATE POLICY "delete_own_daily_records"
  ON employee_daily_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pay_periods pp
      JOIN employee_info ei ON pp.employee_id = ei.id
      WHERE pp.id = employee_daily_records.pay_period_id 
      AND ei.user_id = auth.clerk_user_id()
    )
  );

-- Policies for cogs_settings
CREATE POLICY "select_own_cogs_settings"
  ON cogs_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.clerk_user_id());

CREATE POLICY "insert_own_cogs_settings"
  ON cogs_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.clerk_user_id());

CREATE POLICY "update_own_cogs_settings"
  ON cogs_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.clerk_user_id());

CREATE POLICY "delete_own_cogs_settings"
  ON cogs_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.clerk_user_id());

-- Policies for company_settings
CREATE POLICY "select_own_company_settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.clerk_user_id());

CREATE POLICY "insert_own_company_settings"
  ON company_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.clerk_user_id());

CREATE POLICY "update_own_company_settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.clerk_user_id());

CREATE POLICY "delete_own_company_settings"
  ON company_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.clerk_user_id());

-- ============================================
-- STEP 4: Verify
-- ============================================

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('employee_info', 'pay_periods', 'employee_daily_records', 'cogs_settings', 'company_settings')
ORDER BY tablename, cmd, policyname;

-- Test the clerk_user_id function
SELECT auth.clerk_user_id() AS current_clerk_user_id;

SELECT '✅ Employee LER RLS policies created matching financial_documents pattern!' AS status;
