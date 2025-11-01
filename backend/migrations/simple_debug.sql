-- Simple direct debug to see what's actually in the tables

-- First, list ALL tables in public schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Then show columns for revenue_entries (if it exists)
SELECT 'revenue_entries columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'revenue_entries' ORDER BY ordinal_position;

-- Then show columns for kpi_records (if it exists)  
SELECT 'kpi_records columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'kpi_records' ORDER BY ordinal_position;

-- Try to describe the tables directly (PostgreSQL command)
SELECT 'DESCRIBE revenue_entries:' as info;
\d revenue_entries;

SELECT 'DESCRIBE kpi_records:' as info;
\d kpi_records;
