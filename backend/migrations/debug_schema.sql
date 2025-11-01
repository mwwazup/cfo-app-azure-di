-- Debug script to check current database schema
-- Run this in Supabase SQL Editor to see what we're working with

-- Check if revenue_entries table exists and its columns
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'revenue_entries' 
ORDER BY ordinal_position;

-- Check if kpi_records table exists and its columns  
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'kpi_records'
ORDER BY ordinal_position;

-- Check if tables exist at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('revenue_entries', 'kpi_records');

-- Check what's in the tables (if they exist)
SELECT 'revenue_entries count:' as info, COUNT(*) as count FROM revenue_entries
UNION ALL
SELECT 'kpi_records count:', COUNT(*) FROM kpi_records;
