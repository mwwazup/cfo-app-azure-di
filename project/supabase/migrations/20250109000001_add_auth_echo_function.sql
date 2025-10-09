-- Migration: Add auth_echo function for debugging Clerk-Supabase authentication
-- This function helps debug whether Clerk tokens are properly exchanged for Supabase sessions

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS auth_echo();

-- Create auth_echo function to return current authentication context
CREATE OR REPLACE FUNCTION auth_echo()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Return the current authentication context
  -- sub: subject (user identifier from JWT)
  -- uid: Supabase user ID (should match sub for proper sessions)
  SELECT json_build_object(
    'sub', auth.jwt() ->> 'sub',
    'uid', auth.uid()::text,
    'role', auth.role(),
    'iss', auth.jwt() ->> 'iss',
    'aud', auth.jwt() ->> 'aud'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth_echo() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION auth_echo() IS 'Debug function to check authentication state and JWT claims. Used to verify Clerk-Supabase session exchange is working properly.';
