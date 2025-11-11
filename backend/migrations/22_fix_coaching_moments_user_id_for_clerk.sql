-- Migration 22: Fix coaching_moments.user_id for Clerk Authentication
-- Change user_id from UUID to TEXT to support Clerk user IDs (e.g., "user_33fQP5vCktD5cLZwkg7fbysz2JS")
-- Created: 2025-11-10

-- Step 1: Drop ALL existing RLS policies FIRST (they depend on user_id column)
-- These are the exact 8 policies that exist in the database:
DROP POLICY IF EXISTS "coaching_moments_delete_own" ON coaching_moments;
DROP POLICY IF EXISTS "coaching_moments_insert_own" ON coaching_moments;
DROP POLICY IF EXISTS "coaching_moments_select_own" ON coaching_moments;
DROP POLICY IF EXISTS "coaching_moments_update_own" ON coaching_moments;
DROP POLICY IF EXISTS "delete_own_coaching_moments" ON coaching_moments;
DROP POLICY IF EXISTS "insert_own_coaching_moments" ON coaching_moments;
DROP POLICY IF EXISTS "select_own_coaching_moments" ON coaching_moments;
DROP POLICY IF EXISTS "update_own_coaching_moments" ON coaching_moments;

-- Step 2: Drop ALL foreign key constraints (they reference UUID columns)
ALTER TABLE coaching_moments
DROP CONSTRAINT IF EXISTS coaching_moments_user_id_fkey;

ALTER TABLE coaching_moments
DROP CONSTRAINT IF EXISTS coaching_moments_user_id_profiles_id_fk;

-- Step 3: NOW change user_id column type from UUID to TEXT
ALTER TABLE coaching_moments
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Step 4: Create new RLS policies for Clerk authentication
CREATE POLICY "Users can view own coaching moments"
  ON coaching_moments FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own coaching moments"
  ON coaching_moments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own coaching moments"
  ON coaching_moments FOR UPDATE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own coaching moments"
  ON coaching_moments FOR DELETE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Ensure RLS is enabled
ALTER TABLE coaching_moments ENABLE ROW LEVEL SECURITY;
