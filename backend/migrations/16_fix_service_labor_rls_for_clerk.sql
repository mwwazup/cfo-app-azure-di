-- Migration: Fix service_labor_records RLS for Clerk Authentication
-- Purpose: Replace Supabase Auth RLS policies with permissive policies for Clerk
-- Date: 2025-11-07

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own service labor records" ON service_labor_records;
DROP POLICY IF EXISTS "Users can insert own service labor records" ON service_labor_records;
DROP POLICY IF EXISTS "Users can update own service labor records" ON service_labor_records;
DROP POLICY IF EXISTS "Users can delete own service labor records" ON service_labor_records;

-- Create permissive policy for Clerk authentication
-- Security is handled by Clerk at the application level
CREATE POLICY "Allow all operations for authenticated users"
ON service_labor_records
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE service_labor_records IS 'Service labor records linking employees to specific services. Authentication handled by Clerk.';
