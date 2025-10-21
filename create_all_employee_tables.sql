-- Create all Employee LER tables with correct structure matching the code
-- This ensures the database schema matches what the TypeScript code expects

-- ============================================
-- 1. EMPLOYEE_INFO TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  current_base_rate DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE employee_info DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_employee_info_user_id ON employee_info(user_id);

-- ============================================
-- 2. PAY_PERIODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pay_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee_info(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_pay DECIMAL(15,2) DEFAULT 0,
  total_bonus DECIMAL(15,2) DEFAULT 0,
  total_net_profit DECIMAL(15,2) DEFAULT 0,
  average_ler DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE pay_periods DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pay_periods_employee_id ON pay_periods(employee_id);

-- ============================================
-- 3. EMPLOYEE_DAILY_RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_daily_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  work_day TEXT NOT NULL,
  date DATE NOT NULL,
  called_out BOOLEAN DEFAULT FALSE,
  number_of_jobs INTEGER DEFAULT 0,
  job_types JSONB, -- Stores job counts: {"grill": 2, "oven": 1, "range": 3, "ventHood": 1}
  total_job_revenue DECIMAL(15,2) DEFAULT 0,
  total_hours_worked DECIMAL(10,2) DEFAULT 0,
  total_job_time DECIMAL(10,2) DEFAULT 0,
  employee_base_pay DECIMAL(15,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(15,2) DEFAULT 0,
  cogs_no_labor DECIMAL(15,2) DEFAULT 0,
  cogs_no_labor_percent DECIMAL(5,2) DEFAULT 0,
  overhead_costs_percent DECIMAL(5,2) DEFAULT 0,
  gross_profit_before_bonus DECIMAL(15,2) DEFAULT 0,
  gross_profit_before_bonus_percent DECIMAL(5,2) DEFAULT 0,
  ler DECIMAL(10,2) DEFAULT 0,
  qualify_for_bonus BOOLEAN DEFAULT FALSE,
  bonus_qualified_for_percent DECIMAL(5,2) DEFAULT 0,
  appointment_based_bonus DECIMAL(15,2) DEFAULT 0,
  tip_amount DECIMAL(15,2) DEFAULT 0,
  total_employee_pay DECIMAL(15,2) DEFAULT 0,
  daily_hourly_with_tips_and_bonus DECIMAL(15,2) DEFAULT 0,
  daily_net_profit_after_bonus DECIMAL(15,2) DEFAULT 0,
  daily_net_profit_after_bonus_percent DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE employee_daily_records DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_daily_records_pay_period_id ON employee_daily_records(pay_period_id);

-- ============================================
-- 4. COGS_SETTINGS TABLE
-- ============================================
DROP TABLE IF EXISTS cogs_settings CASCADE;

CREATE TABLE cogs_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  cost_per_service DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

ALTER TABLE cogs_settings DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cogs_settings_user_id ON cogs_settings(user_id);

-- ============================================
-- 5. COMPANY_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  overhead_percent DECIMAL(5,2) DEFAULT 32,
  bonus_threshold_min DECIMAL(5,2) DEFAULT 25,
  bonus_threshold_max DECIMAL(5,2) DEFAULT 100,
  overtime_hours_daily DECIMAL(5,2) DEFAULT 12,
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- ============================================
-- 6. ADD TRIGGERS FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employee_info_updated_at ON employee_info;
CREATE TRIGGER update_employee_info_updated_at
    BEFORE UPDATE ON employee_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pay_periods_updated_at ON pay_periods;
CREATE TRIGGER update_pay_periods_updated_at
    BEFORE UPDATE ON pay_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_records_updated_at ON employee_daily_records;
CREATE TRIGGER update_daily_records_updated_at
    BEFORE UPDATE ON employee_daily_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cogs_settings_updated_at ON cogs_settings;
CREATE TRIGGER update_cogs_settings_updated_at
    BEFORE UPDATE ON cogs_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. VERIFY
-- ============================================

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('employee_info', 'pay_periods', 'employee_daily_records', 'cogs_settings', 'company_settings')
ORDER BY table_name;

-- Check RLS is disabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('employee_info', 'pay_periods', 'employee_daily_records', 'cogs_settings', 'company_settings')
ORDER BY tablename;

SELECT 'All Employee LER tables created with correct structure!' AS status;
