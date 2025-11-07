-- Migration: Add Pay Schedule Configuration to Company Settings
-- Purpose: Store user's pay schedule preferences for automatic pay period generation
-- Date: 2025-11-07

-- Add pay schedule columns to company_settings table
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS pay_schedule TEXT DEFAULT 'bi-weekly' CHECK (pay_schedule IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly')),
ADD COLUMN IF NOT EXISTS pay_day_of_week INTEGER DEFAULT 5 CHECK (pay_day_of_week >= 0 AND pay_day_of_week <= 6),
ADD COLUMN IF NOT EXISTS pay_reference_date DATE,
ADD COLUMN IF NOT EXISTS pay_semi_monthly_dates TEXT DEFAULT '[1, 15]';

-- Add comments
COMMENT ON COLUMN company_settings.pay_schedule IS 'Pay frequency: weekly, bi-weekly, semi-monthly, or monthly';
COMMENT ON COLUMN company_settings.pay_day_of_week IS 'Day of week for weekly/bi-weekly pay (0=Sunday, 5=Friday)';
COMMENT ON COLUMN company_settings.pay_reference_date IS 'Reference start date for bi-weekly pay period calculations';
COMMENT ON COLUMN company_settings.pay_semi_monthly_dates IS 'JSON array of two dates for semi-monthly pay (e.g., [1, 15] for 1st-15th, 16th-end)';
