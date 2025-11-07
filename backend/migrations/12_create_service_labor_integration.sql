-- Migration: Service Labor Integration
-- Purpose: Link employee labor costs to specific services for true profitability analysis
-- Date: 2025-11-06
-- Backup Timestamp: 2025-11-06 10:23:00 UTC-07:00

-- ============================================================================
-- PART 1: Create service_labor_records table
-- ============================================================================
-- This table links employee work to specific services
-- Allows tracking labor costs per service for accurate profitability

CREATE TABLE IF NOT EXISTS service_labor_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (manager/owner)
  employee_id UUID NOT NULL REFERENCES employee_info(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Job metrics
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  hours_worked NUMERIC(5,2) NOT NULL DEFAULT 0,
  revenue_generated NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Labor costs breakdown
  base_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(10,2) DEFAULT 0,
  bonuses NUMERIC(10,2) DEFAULT 0,
  tips NUMERIC(10,2) DEFAULT 0,
  total_labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_jobs CHECK (jobs_completed >= 0),
  CONSTRAINT positive_hours CHECK (hours_worked >= 0),
  CONSTRAINT positive_revenue CHECK (revenue_generated >= 0),
  CONSTRAINT positive_labor_cost CHECK (total_labor_cost >= 0)
);

-- ============================================================================
-- PART 2: Add service breakdown to employee_daily_records
-- ============================================================================
-- Add JSONB column to store service breakdown for each day
-- This allows flexible tracking without complex joins

ALTER TABLE employee_daily_records
ADD COLUMN IF NOT EXISTS service_breakdown JSONB DEFAULT '{"services": []}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN employee_daily_records.service_breakdown IS 
'JSON structure: {"services": [{"service_id": "uuid", "service_name": "string", "jobs": number, "hours": number, "revenue": number}]}';

-- ============================================================================
-- PART 3: Create indexes for performance
-- ============================================================================

-- Index for querying by user and date range
CREATE INDEX IF NOT EXISTS idx_service_labor_user_date 
ON service_labor_records(user_id, date DESC);

-- Index for querying by service
CREATE INDEX IF NOT EXISTS idx_service_labor_service 
ON service_labor_records(service_id, date DESC);

-- Index for querying by employee
CREATE INDEX IF NOT EXISTS idx_service_labor_employee 
ON service_labor_records(employee_id, date DESC);

-- Index for querying by pay period
CREATE INDEX IF NOT EXISTS idx_service_labor_period 
ON service_labor_records(pay_period_id);

-- Composite index for common queries (user + service + date range)
CREATE INDEX IF NOT EXISTS idx_service_labor_user_service_date 
ON service_labor_records(user_id, service_id, date DESC);

-- Index for service breakdown JSONB queries
CREATE INDEX IF NOT EXISTS idx_daily_records_service_breakdown 
ON employee_daily_records USING gin(service_breakdown);

-- ============================================================================
-- PART 4: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on service_labor_records
ALTER TABLE service_labor_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own service labor records
CREATE POLICY "Users can view own service labor records"
ON service_labor_records
FOR SELECT
USING (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can insert their own service labor records
CREATE POLICY "Users can insert own service labor records"
ON service_labor_records
FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can update their own service labor records
CREATE POLICY "Users can update own service labor records"
ON service_labor_records
FOR UPDATE
USING (auth.jwt() ->> 'sub' = user_id)
WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can delete their own service labor records
CREATE POLICY "Users can delete own service labor records"
ON service_labor_records
FOR DELETE
USING (auth.jwt() ->> 'sub' = user_id);

-- ============================================================================
-- PART 5: Create helper function for calculating total labor cost
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_total_labor_cost(
  p_base_pay NUMERIC,
  p_overtime_pay NUMERIC,
  p_bonuses NUMERIC,
  p_tips NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(p_base_pay, 0) + 
         COALESCE(p_overtime_pay, 0) + 
         COALESCE(p_bonuses, 0) + 
         COALESCE(p_tips, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 6: Create trigger to auto-update total_labor_cost
-- ============================================================================

CREATE OR REPLACE FUNCTION update_service_labor_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_labor_cost := calculate_total_labor_cost(
    NEW.base_pay,
    NEW.overtime_pay,
    NEW.bonuses,
    NEW.tips
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_labor_total
BEFORE INSERT OR UPDATE ON service_labor_records
FOR EACH ROW
EXECUTE FUNCTION update_service_labor_total();

-- ============================================================================
-- PART 7: Create view for easy service profitability queries
-- ============================================================================

CREATE OR REPLACE VIEW service_profitability_summary AS
SELECT 
  slr.user_id,
  slr.service_id,
  s.service_name,
  DATE_TRUNC('month', slr.date) AS month,
  
  -- Revenue metrics
  SUM(slr.revenue_generated) AS total_revenue,
  SUM(slr.jobs_completed) AS total_jobs,
  AVG(slr.revenue_generated / NULLIF(slr.jobs_completed, 0)) AS avg_revenue_per_job,
  
  -- Labor metrics
  SUM(slr.hours_worked) AS total_hours,
  SUM(slr.total_labor_cost) AS total_labor_cost,
  AVG(slr.total_labor_cost / NULLIF(slr.hours_worked, 0)) AS avg_hourly_labor_cost,
  
  -- Profitability (before COGS)
  SUM(slr.revenue_generated) - SUM(slr.total_labor_cost) AS gross_profit_after_labor,
  CASE 
    WHEN SUM(slr.revenue_generated) > 0 
    THEN ((SUM(slr.revenue_generated) - SUM(slr.total_labor_cost)) / SUM(slr.revenue_generated)) * 100
    ELSE 0
  END AS gross_margin_after_labor_percent
  
FROM service_labor_records slr
JOIN services s ON s.id = slr.service_id
GROUP BY slr.user_id, slr.service_id, s.service_name, DATE_TRUNC('month', slr.date);

-- Grant access to the view
GRANT SELECT ON service_profitability_summary TO authenticated;

-- ============================================================================
-- PART 8: Verification queries
-- ============================================================================

-- Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'service_labor_records'
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'service_labor_records';

-- Verify RLS policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'service_labor_records';

-- Verify service_breakdown column was added
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'employee_daily_records' 
  AND column_name = 'service_breakdown';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Service Labor Integration migration completed successfully!';
  RAISE NOTICE '📊 Created: service_labor_records table';
  RAISE NOTICE '📝 Modified: employee_daily_records (added service_breakdown)';
  RAISE NOTICE '🔒 Applied: RLS policies for data security';
  RAISE NOTICE '⚡ Created: Indexes for query performance';
  RAISE NOTICE '📈 Created: service_profitability_summary view';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update Employee LER page to capture service breakdown';
  RAISE NOTICE '2. Create useServiceLaborData hook';
  RAISE NOTICE '3. Update Business Intelligence page with net profitability';
END $$;
