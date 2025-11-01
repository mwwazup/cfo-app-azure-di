-- FORCE FIX: Change UUID columns to TEXT for Clerk compatibility
-- This will directly modify existing tables instead of dropping them

-- First, check if tables exist and modify them
DO $$
BEGIN
    -- Fix revenue_entries table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_entries') THEN
        -- Check if user_id column is UUID and change it to TEXT
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue_entries' AND column_name = 'user_id' AND data_type = 'uuid') THEN
            -- Drop foreign key constraint if it exists
            ALTER TABLE revenue_entries DROP CONSTRAINT IF EXISTS revenue_entries_user_id_fkey;
            -- Change column type from UUID to TEXT
            ALTER TABLE revenue_entries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
            RAISE NOTICE '✅ Fixed revenue_entries.user_id column type';
        ELSE
            RAISE NOTICE 'ℹ️ revenue_entries.user_id already TEXT or does not exist';
        END IF;
    ELSE
        RAISE NOTICE '❌ revenue_entries table does not exist';
    END IF;

    -- Fix kpi_records table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kpi_records') THEN
        -- Check if user_id column is UUID and change it to TEXT
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_records' AND column_name = 'user_id' AND data_type = 'uuid') THEN
            -- Drop foreign key constraint if it exists
            ALTER TABLE kpi_records DROP CONSTRAINT IF EXISTS kpi_records_user_id_fkey;
            -- Change column type from UUID to TEXT
            ALTER TABLE kpi_records ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
            RAISE NOTICE '✅ Fixed kpi_records.user_id column type';
        ELSE
            RAISE NOTICE 'ℹ️ kpi_records.user_id already TEXT or does not exist';
        END IF;
    ELSE
        RAISE NOTICE '❌ kpi_records table does not exist';
    END IF;
END $$;

-- Show the results
SELECT 
    table_name,
    column_name,
    data_type,
    'Current schema after fix' as status
FROM information_schema.columns 
WHERE table_name IN ('revenue_entries', 'kpi_records') 
AND column_name = 'user_id';
