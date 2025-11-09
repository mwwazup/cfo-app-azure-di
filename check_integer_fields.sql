-- Check all INTEGER columns in employee_daily_records table
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'employee_daily_records' 
  AND data_type = 'integer'
ORDER BY column_name;
