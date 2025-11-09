-- Migration: Add 'custom' to Pay Schedule Options
-- Purpose: Allow users to manually create custom pay periods
-- Date: 2025-11-08

-- Drop the existing constraint
ALTER TABLE company_settings
DROP CONSTRAINT IF EXISTS company_settings_pay_schedule_check;

-- Add new constraint with 'custom' option
ALTER TABLE company_settings
ADD CONSTRAINT company_settings_pay_schedule_check 
CHECK (pay_schedule IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'custom'));

-- Update comment
COMMENT ON COLUMN company_settings.pay_schedule IS 'Pay frequency: weekly, bi-weekly, semi-monthly, monthly, or custom (manual creation)';
