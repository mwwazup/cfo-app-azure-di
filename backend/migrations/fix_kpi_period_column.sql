-- Fix kpi_records column name mismatch
-- Application expects 'period' but table has 'kpi_period'

DO $$
BEGIN
    RAISE NOTICE '=== FIXING KPI_RECORDS PERIOD COLUMN ===';
    
    -- Check if kpi_period exists and period doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kpi_records' AND column_name = 'kpi_period'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kpi_records' AND column_name = 'period'
    ) THEN
        RAISE NOTICE '🔄 Renaming kpi_period to period';
        ALTER TABLE kpi_records RENAME COLUMN kpi_period TO period;
        RAISE NOTICE '✅ Column renamed successfully';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kpi_records' AND column_name = 'period'
    ) THEN
        RAISE NOTICE 'ℹ️ Column period already exists - no action needed';
    ELSE
        RAISE NOTICE '❌ Neither kpi_period nor period exists - adding period column';
        ALTER TABLE kpi_records ADD COLUMN period TEXT NOT NULL DEFAULT '2025-01-01';
        RAISE NOTICE '✅ Added period column';
    END IF;
    
    RAISE NOTICE '=== FIX COMPLETE ===';
END $$;

-- Verify the fix
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'kpi_records' 
AND column_name IN ('period', 'kpi_period')
ORDER BY column_name;
