-- Add unique constraint to revenue_entries for upsert operations
-- This allows the API to use ON CONFLICT (user_id, year, month) for upserts

-- First, check if constraint already exists and drop it if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'revenue_entries_user_year_month_unique'
    ) THEN
        ALTER TABLE revenue_entries DROP CONSTRAINT revenue_entries_user_year_month_unique;
        RAISE NOTICE 'Dropped existing constraint revenue_entries_user_year_month_unique';
    END IF;
END $$;

-- Add the unique constraint
ALTER TABLE revenue_entries 
ADD CONSTRAINT revenue_entries_user_year_month_unique 
UNIQUE (user_id, year, month);

-- Verify the constraint was added
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'revenue_entries_user_year_month_unique'
    ) THEN
        RAISE NOTICE '✅ Successfully added unique constraint: revenue_entries_user_year_month_unique';
    ELSE
        RAISE EXCEPTION '❌ Failed to add unique constraint';
    END IF;
END $$;
