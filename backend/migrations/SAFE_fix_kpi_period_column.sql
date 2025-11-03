-- SAFE FIX: Rename kpi_period to period WITHOUT deleting data
-- This migration preserves all existing data

DO $$
BEGIN
    RAISE NOTICE '=== SAFE COLUMN RENAME: kpi_period -> period ===';
    
    -- Check if kpi_records table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'kpi_records'
    ) THEN
        RAISE NOTICE '❌ kpi_records table does not exist - creating it';
        
        CREATE TABLE kpi_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            kpi_name TEXT NOT NULL,
            kpi_value DECIMAL(12,2),
            period TEXT NOT NULL,  -- Using 'period' from the start
            target_value DECIMAL(12,2),
            status TEXT DEFAULT 'good',
            goal_value DECIMAL(12,2),
            trend_vs_last_month TEXT,
            kpi_category TEXT,
            action_suggestion TEXT,
            display_format TEXT,
            plain_explanation TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '✅ Created kpi_records table with period column';
        
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kpi_records' AND column_name = 'kpi_period'
    ) THEN
        -- Table exists with kpi_period column - rename it
        RAISE NOTICE '🔄 Renaming kpi_period to period (preserving all data)';
        ALTER TABLE kpi_records RENAME COLUMN kpi_period TO period;
        RAISE NOTICE '✅ Column renamed successfully - all data preserved';
        
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kpi_records' AND column_name = 'period'
    ) THEN
        RAISE NOTICE '✅ Column period already exists - no action needed';
        
    ELSE
        RAISE NOTICE '⚠️ kpi_records exists but has neither kpi_period nor period - adding period column';
        ALTER TABLE kpi_records ADD COLUMN period TEXT NOT NULL DEFAULT '2025-01-01';
        RAISE NOTICE '✅ Added period column';
    END IF;
    
    RAISE NOTICE '=== SAFE FIX COMPLETE ===';
END $$;

-- Verify the result
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'kpi_records' 
AND column_name IN ('period', 'kpi_period')
ORDER BY column_name;

-- Show row count to confirm data preservation
SELECT 
    'kpi_records' as table_name,
    COUNT(*) as row_count
FROM kpi_records;
