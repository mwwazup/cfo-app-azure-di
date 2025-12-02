-- Migration: Add Appointment Bonus and Crew Capacity Settings to Company Settings
-- Purpose: Store appointment-based bonus configuration and crew capacity planning settings
-- Date: 2025-12-01

-- First, update pay_schedule constraint to include 'custom'
ALTER TABLE company_settings
DROP CONSTRAINT IF EXISTS company_settings_pay_schedule_check;

ALTER TABLE company_settings
ADD CONSTRAINT company_settings_pay_schedule_check 
CHECK (pay_schedule IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'custom'));

-- Add appointment bonus columns
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS enable_appointment_bonus BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS appointment_bonus_3_jobs DECIMAL(10, 2) DEFAULT 7,
ADD COLUMN IF NOT EXISTS appointment_bonus_4_jobs DECIMAL(10, 2) DEFAULT 10,
ADD COLUMN IF NOT EXISTS appointment_bonus_5_jobs DECIMAL(10, 2) DEFAULT 15,
ADD COLUMN IF NOT EXISTS appointment_bonus_6_plus_jobs DECIMAL(10, 2) DEFAULT 20;

-- Add crew capacity columns
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS number_of_crews INTEGER,
ADD COLUMN IF NOT EXISTS employees_per_crew INTEGER,
ADD COLUMN IF NOT EXISTS monthly_crew_capacity DECIMAL(12, 2);

-- Add comments for documentation
COMMENT ON COLUMN company_settings.enable_appointment_bonus IS 'Whether to apply appointment-based bonuses';
COMMENT ON COLUMN company_settings.appointment_bonus_3_jobs IS 'Bonus amount for completing 3 jobs in a day';
COMMENT ON COLUMN company_settings.appointment_bonus_4_jobs IS 'Bonus amount for completing 4 jobs in a day';
COMMENT ON COLUMN company_settings.appointment_bonus_5_jobs IS 'Bonus amount for completing 5 jobs in a day';
COMMENT ON COLUMN company_settings.appointment_bonus_6_plus_jobs IS 'Bonus amount for completing 6+ jobs in a day';
COMMENT ON COLUMN company_settings.number_of_crews IS 'Number of crews the company currently runs';
COMMENT ON COLUMN company_settings.employees_per_crew IS 'Average number of employees per crew';
COMMENT ON COLUMN company_settings.monthly_crew_capacity IS 'Expected monthly revenue capacity per crew at full utilization';
