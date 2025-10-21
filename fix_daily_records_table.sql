-- Fix employee_daily_records table by dropping and recreating with correct structure
-- WARNING: This will delete any existing daily records data

-- ============================================
-- STEP 1: Drop existing table
-- ============================================
DROP TABLE IF EXISTS employee_daily_records CASCADE;

-- ============================================
-- STEP 2: Create table with ALL required columns
-- ============================================
CREATE TABLE employee_daily_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  
  -- Basic Info
  work_day TEXT NOT NULL,
  date DATE NOT NULL,
  called_out BOOLEAN DEFAULT FALSE,
  
  -- Job Details
  number_of_jobs INTEGER DEFAULT 0,
  job_types JSONB, -- CRITICAL: Stores {"grill": 2, "oven": 1, "range": 3, "ventHood": 1}
  total_job_revenue DECIMAL(15,2) DEFAULT 0,
  
  -- Time Tracking
  total_hours_worked DECIMAL(10,2) DEFAULT 0,
  total_job_time DECIMAL(10,2) DEFAULT 0,
  
  -- Pay Calculations
  employee_base_pay DECIMAL(15,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(15,2) DEFAULT 0,
  
  -- COGS & Overhead
  cogs_no_labor DECIMAL(15,2) DEFAULT 0,
  cogs_no_labor_percent DECIMAL(5,2) DEFAULT 0,
  overhead_costs_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Profit Before Bonus
  gross_profit_before_bonus DECIMAL(15,2) DEFAULT 0,
  gross_profit_before_bonus_percent DECIMAL(5,2) DEFAULT 0,
  
  -- LER & Bonus
  ler DECIMAL(10,2) DEFAULT 0,
  qualify_for_bonus BOOLEAN DEFAULT FALSE,
  bonus_qualified_for_percent DECIMAL(5,2) DEFAULT 0,
  appointment_based_bonus DECIMAL(15,2) DEFAULT 0,
  
  -- Additional Pay
  tip_amount DECIMAL(15,2) DEFAULT 0,
  total_employee_pay DECIMAL(15,2) DEFAULT 0,
  daily_hourly_with_tips_and_bonus DECIMAL(15,2) DEFAULT 0,
  
  -- Net Profit
  daily_net_profit_after_bonus DECIMAL(15,2) DEFAULT 0,
  daily_net_profit_after_bonus_percent DECIMAL(5,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STEP 3: Disable RLS
-- ============================================
ALTER TABLE employee_daily_records DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create indexes
-- ============================================
CREATE INDEX idx_daily_records_pay_period_id ON employee_daily_records(pay_period_id);
CREATE INDEX idx_daily_records_date ON employee_daily_records(date);

-- ============================================
-- STEP 5: Add updated_at trigger
-- ============================================
DROP TRIGGER IF EXISTS update_daily_records_updated_at ON employee_daily_records;
CREATE TRIGGER update_daily_records_updated_at
    BEFORE UPDATE ON employee_daily_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Verify structure
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_daily_records'
ORDER BY ordinal_position;

-- Check for job_types column specifically
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'employee_daily_records'
    AND column_name = 'job_types';

-- Expected: job_types | jsonb

SELECT 'employee_daily_records table fixed with job_types column!' AS status;
