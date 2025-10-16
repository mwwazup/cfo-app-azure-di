-- Delete existing Revenue Velocity KPI records so they can be regenerated with new format
-- Run this, then click "Generate Historical KPIs" button in the dashboard

-- First, check what we're about to delete
SELECT 
  id,
  period,
  kpi_value,
  plain_explanation
FROM kpi_records
WHERE kpi_name = 'Revenue Velocity'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f'
ORDER BY period DESC;

-- Delete Revenue Velocity records for your user
DELETE FROM kpi_records
WHERE kpi_name = 'Revenue Velocity'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';

-- Verify deletion
SELECT COUNT(*) as remaining_velocity_kpis
FROM kpi_records
WHERE kpi_name = 'Revenue Velocity'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
