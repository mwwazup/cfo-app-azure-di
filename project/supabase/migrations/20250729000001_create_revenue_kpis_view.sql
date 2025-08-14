-- Ensure RLS is enabled on the base table
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for revenue_entries table
CREATE POLICY "Users can only see their own revenue entries" ON revenue_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Create revenue_kpis view for backward compatibility
-- This view calculates KPIs from the revenue_entries table
CREATE OR REPLACE VIEW revenue_kpis 
WITH (security_invoker=on) AS
WITH yearly_revenue AS (
  SELECT 
    user_id,
    year,
    SUM(COALESCE(actual_revenue, 0)) as total_revenue,
    AVG(COALESCE(actual_revenue, 0)) as avg_monthly_revenue,
    SUM(COALESCE(desired_revenue, 0)) as annual_fir_target,
    COUNT(*) as months_with_data
  FROM revenue_entries
  GROUP BY user_id, year
),
previous_year_revenue AS (
  SELECT 
    user_id,
    year + 1 as next_year,
    total_revenue as prev_year_revenue
  FROM yearly_revenue
)
SELECT 
  yr.user_id,
  yr.year,
  yr.total_revenue,
  yr.avg_monthly_revenue,
  yr.annual_fir_target,
  (yr.annual_fir_target - yr.total_revenue) as gap_to_target,
  COALESCE(pyr.prev_year_revenue, 0) as prev_year_revenue,
  yr.months_with_data,
  CURRENT_TIMESTAMP as updated_at
FROM yearly_revenue yr
LEFT JOIN previous_year_revenue pyr ON yr.user_id = pyr.user_id AND yr.year = pyr.next_year;

-- Grant necessary permissions
GRANT SELECT ON revenue_kpis TO authenticated;
GRANT SELECT ON revenue_kpis TO service_role;
