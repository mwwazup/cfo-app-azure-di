-- Fix Revenue Gap to Target KPI to show absolute values and clear explanations
-- This handles the case where negative gaps (ahead of target) were confusing

-- First, check current Revenue Gap records
SELECT 
  period,
  kpi_value,
  plain_explanation
FROM kpi_records
WHERE kpi_name = 'Revenue Gap to Target'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f'
ORDER BY period DESC;

-- Update to use absolute values and better explanations
UPDATE kpi_records
SET 
  kpi_value = ABS(kpi_value),
  plain_explanation = CASE
    WHEN kpi_value < 0 THEN
      'Great news! You''re ahead of your annual target by $' || ABS(kpi_value)::numeric::text || '. Keep up the momentum!'
    ELSE
      'You need $' || kpi_value::numeric::text || ' more revenue to hit your annual target.'
  END,
  action_suggestion = CASE
    WHEN kpi_value < 0 THEN
      'Outstanding! You''re exceeding your annual target. Consider: (1) Setting a stretch goal for the remainder of the year, (2) Investing surplus in growth initiatives, or (3) Increasing owner distributions while maintaining business health.'
    ELSE
      'To close the gap, focus on accelerating sales efforts, launching promotions, upselling existing customers, or introducing new revenue streams.'
  END,
  updated_at = NOW()
WHERE kpi_name = 'Revenue Gap to Target'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';

-- Verify the updates
SELECT 
  period,
  kpi_value,
  plain_explanation,
  action_suggestion
FROM kpi_records
WHERE kpi_name = 'Revenue Gap to Target'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f'
ORDER BY period DESC;
