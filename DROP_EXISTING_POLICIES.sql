-- Drop existing policies before running migrations
-- Run this FIRST in Supabase SQL Editor

-- Drop financial_statements policies
DROP POLICY IF EXISTS "Users can view their own financial statements" ON financial_statements;
DROP POLICY IF EXISTS "Users can create their own financial statements" ON financial_statements;
DROP POLICY IF EXISTS "Users can update their own financial statements" ON financial_statements;
DROP POLICY IF EXISTS "Users can delete their own financial statements" ON financial_statements;

-- Drop financial_categories policies
DROP POLICY IF EXISTS "Users can view their own financial categories" ON financial_categories;
DROP POLICY IF EXISTS "Users can create their own financial categories" ON financial_categories;
DROP POLICY IF EXISTS "Users can update their own financial categories" ON financial_categories;
DROP POLICY IF EXISTS "Users can delete their own financial categories" ON financial_categories;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Existing policies dropped successfully';
END $$;
