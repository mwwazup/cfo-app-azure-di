/*
  # Add Net Profit After Owner Draws KPI Definition

  1. Purpose
    - Clarifies the difference between net profit and actual available cash
    - Shows sustainable profit after owner distributions
    - Helps business owners understand "where did the money go?"

  2. Business Logic
    - Calculation: Net Profit - Owner Distributions
    - Triggers coaching when draws exceed profits
    - Provides actionable insights for better cash management
*/

-- Insert the new KPI definition
INSERT INTO kpi_definitions (
  kpi_name,
  display_name,
  description,
  calculation_method,
  default_goal,
  is_higher_better,
  plain_explanation,
  why_it_matters,
  low_value_advice,
  high_value_advice
) VALUES (
  'net_profit_after_draws',
  'Net Profit After Owner Draws',
  'Your true leftover profit after paying yourself.',
  'Net Profit - Owner Distributions',
  0,
  true,
  'This shows how much is left after you pay yourself.',
  'It reflects how sustainable your business is. If it''s negative, you may be over-drawing from your profits.',
  'Reduce personal draws or increase margin so the business can support your income.',
  'You''re in a strong position. Your business funds both your lifestyle and future growth.'
);

-- Add coaching prompts for this KPI
INSERT INTO ai_coaching_prompts (
  kpi_name,
  trigger_condition,
  prompt_template,
  coaching_tone
) VALUES (
  'net_profit_after_draws',
  'value < 0',
  'The user''s business has {net_profit_percentage}% net profit, but they took ${owner_draws} as an owner draw, leaving ${net_profit_after_draws} leftover. Explain in simple terms why they feel like they''re not seeing the profit in their bank. Offer 1 actionable insight for better balance.',
  'supportive'
),
(
  'net_profit_after_draws',
  'value > 0 AND value < (net_profit * 0.1)',
  'The user has positive net profit but very little left after owner draws. Explain why this creates cash flow risk and suggest strategies for building a stronger financial buffer.',
  'educational'
),
(
  'net_profit_after_draws',
  'value > (net_profit * 0.3)',
  'The user has strong profit retention after owner draws. Acknowledge their discipline and suggest growth opportunities with their healthy cash position.',
  'encouraging'
);
