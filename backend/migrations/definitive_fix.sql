-- DEFINITIVE FIX: Handle all possible scenarios for UUID issue
-- This script will fix the problem no matter what state the tables are in

-- First, let's see what tables exist
DO $$
BEGIN
    RAISE NOTICE '=== STARTING DEFINITIVE FIX ===';
    
    -- Handle revenue_entries table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_entries') THEN
        RAISE NOTICE '✅ revenue_entries table exists';
        
        -- Check if user_id column exists and its type
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue_entries' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ user_id column exists in revenue_entries';
            
            -- Check if it's UUID type and fix it
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue_entries' AND column_name = 'user_id' AND data_type = 'uuid') THEN
                RAISE NOTICE '🔄 Fixing revenue_entries.user_id from UUID to TEXT';
                ALTER TABLE revenue_entries DROP CONSTRAINT IF EXISTS revenue_entries_user_id_fkey;
                ALTER TABLE revenue_entries ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
                RAISE NOTICE '✅ Fixed revenue_entries.user_id';
            ELSE
                RAISE NOTICE 'ℹ️ revenue_entries.user_id is already TEXT or not UUID';
            END IF;
        ELSE
            RAISE NOTICE '❌ user_id column does not exist in revenue_entries - adding it';
            ALTER TABLE revenue_entries ADD COLUMN IF NOT EXISTS user_id TEXT;
            RAISE NOTICE '✅ Added user_id column to revenue_entries';
        END IF;
    ELSE
        RAISE NOTICE '❌ revenue_entries table does not exist - creating it';
        CREATE TABLE IF NOT EXISTS revenue_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            actual_revenue DECIMAL(12,2) DEFAULT 0,
            desired_revenue DECIMAL(12,2) DEFAULT 0,
            profit_margin DECIMAL(5,2) DEFAULT 0,
            owner_draws DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created revenue_entries table with TEXT user_id';
    END IF;
    
    -- Handle kpi_records table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kpi_records') THEN
        RAISE NOTICE '✅ kpi_records table exists';
        
        -- Check if user_id column exists and its type
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_records' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ user_id column exists in kpi_records';
            
            -- Check if it's UUID type and fix it
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_records' AND column_name = 'user_id' AND data_type = 'uuid') THEN
                RAISE NOTICE '🔄 Fixing kpi_records.user_id from UUID to TEXT';
                ALTER TABLE kpi_records DROP CONSTRAINT IF EXISTS kpi_records_user_id_fkey;
                ALTER TABLE kpi_records ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
                RAISE NOTICE '✅ Fixed kpi_records.user_id';
            ELSE
                RAISE NOTICE 'ℹ️ kpi_records.user_id is already TEXT or not UUID';
            END IF;
        ELSE
            RAISE NOTICE '❌ user_id column does not exist in kpi_records - adding it';
            ALTER TABLE kpi_records ADD COLUMN IF NOT EXISTS user_id TEXT;
            RAISE NOTICE '✅ Added user_id column to kpi_records';
        END IF;
    ELSE
        RAISE NOTICE '❌ kpi_records table does not exist - creating it';
        CREATE TABLE IF NOT EXISTS kpi_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            kpi_name TEXT NOT NULL,
            kpi_value DECIMAL(12,2),
            kpi_period TEXT NOT NULL,
            target_value DECIMAL(12,2),
            status TEXT DEFAULT 'good',
            goal_value DECIMAL(12,2),
            trend_vs_last_month TEXT,
            kpi_category TEXT,
            action_suggestion TEXT,
            display_format TEXT,
            plain_explanation TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created kpi_records table with TEXT user_id';
    END IF;
    
    RAISE NOTICE '=== DEFINITIVE FIX COMPLETE ===';
END $$;

-- Show the final results
SELECT 
    table_name,
    column_name,
    data_type,
    'Final schema state' as status
FROM information_schema.columns 
WHERE table_name IN ('revenue_entries', 'kpi_records') 
AND column_name = 'user_id'
ORDER BY table_name;
