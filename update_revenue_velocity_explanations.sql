-- Update Revenue Velocity KPI explanations with improved, detailed descriptions
-- This updates existing records to match the new format

-- First, let's see what we're working with
SELECT 
  id,
  user_id,
  kpi_value,
  period,
  plain_explanation,
  action_suggestion
FROM kpi_records
WHERE kpi_name = 'Revenue Velocity'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f'
ORDER BY period DESC
LIMIT 5;

-- Update Revenue Velocity explanations
-- Note: We can't recalculate the exact dollar amounts from the database alone,
-- so we'll create a simpler but still improved explanation

UPDATE kpi_records
SET 
  plain_explanation = CASE
    WHEN kpi_value >= 0 THEN
      'Your revenue is accelerating at ' || ROUND(ABS(kpi_value))::text || '% year-over-year. This "velocity" measures how much your revenue grew compared to the same month last year, which is critical for long-term business success. Strong year-over-year growth indicates healthy business momentum.'
    ELSE
      'Your revenue is declining at ' || ROUND(ABS(kpi_value))::text || '% year-over-year. This negative "velocity" means your business is shrinking compared to the same month last year, which requires immediate attention. Year-over-year decline is a serious warning sign.'
  END,
  action_suggestion = CASE
    WHEN kpi_value >= 15 THEN
      'Outstanding ' || ROUND(ABS(kpi_value))::text || '% growth! You''re exceeding the 15% target. Keep this momentum by doubling down on what''s working - whether that''s marketing, new products, or customer retention.'
    WHEN kpi_value >= 0 THEN
      'You''re growing at ' || ROUND(ABS(kpi_value))::text || '%, but below the 15% target. To accelerate: (1) Analyze what drove growth this year, (2) Increase marketing spend, (3) Launch new offerings, or (4) raise prices strategically.'
    ELSE
      'Declining ' || ROUND(ABS(kpi_value))::text || '% year-over-year is a red flag. Immediate actions: (1) Identify why customers left, (2) Review pricing strategy, (3) Audit marketing effectiveness, (4) Consider new revenue streams. This trend must reverse.'
  END,
  updated_at = NOW()
WHERE kpi_name = 'Revenue Velocity'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';

-- Verify the updates
SELECT 
  period,
  kpi_value,
  plain_explanation,
  action_suggestion
FROM kpi_records
WHERE kpi_name = 'Revenue Velocity'
  AND user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f'
ORDER BY period DESC
LIMIT 3;
