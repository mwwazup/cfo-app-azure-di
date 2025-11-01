-- Check the revenue_kpis table that's causing the error
-- This is the table the revenue-kpis endpoint is actually querying

-- Check if revenue_kpis table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'revenue_kpis';

-- Show all columns in revenue_kpis table
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'revenue_kpis' 
ORDER BY ordinal_position;

-- Check if there are any constraints on revenue_kpis
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'revenue_kpis'
ORDER BY tc.constraint_type;
