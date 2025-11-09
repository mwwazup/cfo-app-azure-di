-- Fix numeric field overflow in employee_daily_records table
-- Change bonus_qualified_for_percent from DECIMAL(5,2) to DECIMAL(15,2)
-- This field actually stores dollar amounts, not percentages

-- The field is misnamed - it stores the bonus dollar amount, not a percentage
-- Changing precision from 5,2 (max 999.99) to 15,2 (max 9,999,999,999,999.99)

ALTER TABLE employee_daily_records 
  ALTER COLUMN bonus_qualified_for_percent TYPE DECIMAL(15,2);

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'employee_daily_records' 
  AND column_name = 'bonus_qualified_for_percent';

SELECT 'bonus_qualified_for_percent field updated to DECIMAL(15,2)' AS status;
