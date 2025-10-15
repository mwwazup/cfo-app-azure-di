-- Manual fix for KPI explanations
-- Run this in Supabase SQL Editor to update existing KPI records

-- Fix Revenue Velocity KPI (round percentage)
UPDATE kpi_records
SET plain_explanation = REPLACE(
  plain_explanation,
  SUBSTRING(plain_explanation FROM '\d+\.\d+%'),
  ROUND(CAST(SUBSTRING(plain_explanation FROM '\d+\.\d+') AS NUMERIC)) || '%'
)
WHERE kpi_name = 'Revenue Velocity'
AND plain_explanation LIKE '%Growing at%'
OR plain_explanation LIKE '%Declining at%';

-- Fix Profit Margin KPI (add net profit clarification and cents per dollar)
UPDATE kpi_records
SET plain_explanation = 
  'Current net profit margin of ' || ROUND(kpi_value) || '%. This means you are keeping $' || 
  TO_CHAR(kpi_value / 100, 'FM0.00') || ' cents per every $1 you make before owner distributions.'
WHERE kpi_name = 'Profit Margin';

-- Fix Monthly Growth Rate KPI (round and add dynamic explanation)
UPDATE kpi_records
SET plain_explanation = CASE
  WHEN kpi_value >= 0 THEN
    'Growth of ' || ROUND(ABS(kpi_value) * 10) / 10 || '% vs previous month. This can mean sales are up, changes in pricing, new customers, or operational improvements.'
  ELSE
    'Decline of ' || ROUND(ABS(kpi_value) * 10) / 10 || '% vs previous month. This can mean sales are down, changes in pricing, lost customers, or operational changes.'
END
WHERE kpi_name = 'Monthly Growth Rate';

-- Verify the changes
SELECT 
  kpi_name,
  kpi_value,
  plain_explanation,
  period
FROM kpi_records
WHERE kpi_name IN ('Revenue Velocity', 'Profit Margin', 'Monthly Growth Rate')
ORDER BY period DESC, kpi_name;
