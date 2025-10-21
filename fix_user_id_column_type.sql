-- Fix user_id column type to support Clerk user IDs
-- Clerk user IDs are strings like "user_33fQP5vCktD5cLZwkg7fbysz2JS", not UUIDs

-- 1. Drop existing foreign key constraints if any
-- (These tables don't reference auth.users, so this is safe)

-- 2. Change user_id column type from UUID to TEXT in all employee tables

-- employee_info table
ALTER TABLE employee_info 
ALTER COLUMN user_id TYPE TEXT;

-- pay_periods table (if it has user_id)
-- Note: pay_periods references employee_info.id, not user_id directly
-- So no change needed here

-- employee_daily_records table (if it has user_id)
-- Note: employee_daily_records references pay_periods.id, not user_id directly
-- So no change needed here

-- cogs_settings table
ALTER TABLE cogs_settings 
ALTER COLUMN user_id TYPE TEXT;

-- company_settings table
ALTER TABLE company_settings 
ALTER COLUMN user_id TYPE TEXT;

-- 3. Update RLS policies to work with TEXT user_id
-- The policies should already work since they just compare user_id values

-- 4. Verify the changes
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('employee_info', 'cogs_settings', 'company_settings')
    AND column_name = 'user_id'
ORDER BY table_name;

-- Expected output:
-- employee_info    | user_id | text
-- cogs_settings    | user_id | text
-- company_settings | user_id | text
