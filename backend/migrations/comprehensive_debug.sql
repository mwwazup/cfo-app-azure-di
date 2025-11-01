-- Comprehensive debug script to see exactly what's in the tables
-- This will show us ALL columns and their types

-- Show ALL columns for revenue_entries
SELECT 
    'revenue_entries' as table_name,
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'revenue_entries' 
ORDER BY ordinal_position;

-- Show ALL columns for kpi_records
SELECT 
    'kpi_records' as table_name,
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'kpi_records'
ORDER BY ordinal_position;

-- Also check if there are any constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('revenue_entries', 'kpi_records')
ORDER BY tc.table_name, tc.constraint_type;
