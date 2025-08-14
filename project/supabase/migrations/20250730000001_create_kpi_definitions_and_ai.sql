-- Create KPI definitions table for coaching metadata
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  calculation_method TEXT,
  default_goal NUMERIC,
  is_higher_better BOOLEAN DEFAULT true,
  plain_explanation TEXT,
  why_it_matters TEXT,
  low_value_advice TEXT,
  high_value_advice TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create KPI AI commentary table
CREATE TABLE IF NOT EXISTS kpi_ai_commentary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID REFERENCES kpi_records(id) ON DELETE CASCADE,
  commentary TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on both tables
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_ai_commentary ENABLE ROW LEVEL SECURITY;

-- RLS policies for kpi_definitions (public read access)
CREATE POLICY "Anyone can read KPI definitions" ON kpi_definitions
  FOR SELECT USING (true);

-- RLS policies for kpi_ai_commentary
CREATE POLICY "Users can view their own AI commentary" ON kpi_ai_commentary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI commentary" ON kpi_ai_commentary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI commentary" ON kpi_ai_commentary
  FOR UPDATE USING (auth.uid() = user_id);

-- Create the combined view
CREATE OR REPLACE VIEW kpi_records_with_definitions_and_ai AS
SELECT
  kr.*,
  kd.display_name,
  kd.default_goal,
  kd.is_higher_better,
  kd.plain_explanation,
  kd.why_it_matters,
  kd.low_value_advice,
  kd.high_value_advice,
  ai.commentary as ai_commentary
FROM kpi_records kr
LEFT JOIN kpi_definitions kd ON kr.kpi_name = kd.kpi_name
LEFT JOIN kpi_ai_commentary ai ON kr.id = ai.kpi_id;

-- Grant permissions
GRANT SELECT ON kpi_definitions TO authenticated;
GRANT SELECT ON kpi_ai_commentary TO authenticated;
GRANT INSERT ON kpi_ai_commentary TO authenticated;
GRANT UPDATE ON kpi_ai_commentary TO authenticated;
GRANT SELECT ON kpi_records_with_definitions_and_ai TO authenticated;

-- Create function to update KPI goals
CREATE OR REPLACE FUNCTION update_kpi_goal(kpi_id UUID, new_goal NUMERIC)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE kpi_records
  SET goal_value = new_goal,
      updated_at = NOW()
  WHERE id = kpi_id
    AND user_id = auth.uid();
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_kpi_goal TO authenticated;

-- Insert KPI definitions with coaching metadata
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
) VALUES
-- Gross Profit Margin
(
  'gross_profit_margin',
  'Gross Profit Margin',
  'Percentage of revenue left after covering direct costs like materials and labor.',
  '(Revenue - Cost of Goods Sold) / Revenue',
  0.5,
  true,
  'You keep X cents from every dollar after paying for materials and labor.',
  'This shows how efficiently you deliver your product or service. If it''s low, your costs may be eating your profits.',
  'Review pricing. Are you undercharging? Can you reduce materials or delivery costs?',
  'You''re operating efficiently. Consider scaling or locking in favorable vendor terms.'
),

-- Net Profit Margin
(
  'net_profit_margin',
  'Net Profit Margin',
  'What percentage of total revenue becomes actual profit after all expenses.',
  'Net Profit / Revenue',
  0.15,
  true,
  'This shows what''s left after all business expenses. X cents of every dollar is true profit.',
  'It reflects your overall financial health. A low number could mean high overhead or poor pricing.',
  'Check for unnecessary expenses or subscriptions. Review admin and rent costs.',
  'You''re profitable! Consider reinvesting in marketing or capacity-building.'
),

-- Cash Runway
(
  'cash_runway',
  'Cash Runway (Months)',
  'How many months your business can survive at current spending levels if no new income comes in.',
  'Cash on Hand / Monthly Operating Expenses',
  3,
  true,
  'If income stopped today, you could keep going for X months.',
  'It tells you how long you can weather tough times. Too little runway is a cash crisis risk.',
  'Delay large purchases. Increase cash by collecting payments faster or reducing expenses.',
  'You have breathing room. Now plan for growth, not just survival.'
),

-- Revenue Growth Rate
(
  'revenue_growth_rate',
  'Revenue Growth Rate',
  'How much your sales increased or decreased compared to the prior month.',
  '(Current Revenue - Prior Revenue) / Prior Revenue',
  0.1,
  true,
  'Your revenue grew X% this month.',
  'It''s a sign of momentum. If it''s negative, your sales may be declining.',
  'Revisit lead generation or customer retention. What''s not working?',
  'Keep doing what works. Can you turn this into repeatable growth?'
),

-- Customer Acquisition Cost (CAC)
(
  'customer_acquisition_cost',
  'Customer Acquisition Cost',
  'The average amount you spend to gain a new customer.',
  'Marketing Spend / New Customers',
  100,
  false,
  'You spend $X to bring in one customer.',
  'This helps you understand how efficiently your sales and marketing are working.',
  'Try improving conversion rates or cutting underperforming ads.',
  'Your acquisition cost is solid. Scale without overspending.'
),

-- Monthly Revenue
(
  'monthly_revenue',
  'Monthly Revenue',
  'Total revenue generated in the current month.',
  'SUM(actual_revenue) for current month',
  10000,
  true,
  'You generated $X in revenue this month.',
  'This is your top-line growth indicator and cash flow driver.',
  'Focus on lead generation, sales conversion, or customer retention.',
  'Great momentum! Consider scaling your successful channels.'
),

-- Revenue Gap to Target
(
  'revenue_gap_to_target',
  'Revenue Gap to Target',
  'Difference between actual revenue and target revenue.',
  'Target Revenue - Actual Revenue',
  0,
  false,
  'You are $X away from your revenue target.',
  'This shows how close you are to meeting your business goals.',
  'Analyze what''s preventing you from hitting targets. Adjust strategy or goals.',
  'You''re on track! Maintain momentum and consider stretch goals.'
);
