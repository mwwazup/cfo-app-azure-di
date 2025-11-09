-- Check ALL columns in employee_daily_records table with DECIMAL(5,2) precision
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'employee_daily_records' 
  AND data_type = 'numeric'
  AND numeric_precision = 5
  AND numeric_scale = 2
ORDER BY column_name;
