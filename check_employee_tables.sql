-- Check existing employee tables structure
-- Run these queries in Supabase SQL Editor to see what exists

-- 1. Check employee_info table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employee_info'
ORDER BY ordinal_position;

-- 2. Check pay_periods table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pay_periods'
ORDER BY ordinal_position;

-- 3. Check employee_daily_records table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employee_daily_records'
ORDER BY ordinal_position;

-- 4. Check if cogs_settings exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cogs_settings'
ORDER BY ordinal_position;

-- 5. Check if company_settings exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'company_settings'
ORDER BY ordinal_position;

-- 6. Check existing data in employee_info
SELECT * FROM employee_info LIMIT 5;

-- 7. Check existing data in pay_periods
SELECT * FROM pay_periods LIMIT 5;

-- 8. Check existing data in employee_daily_records
SELECT * FROM employee_daily_records LIMIT 5;
