/*
  # Add owner draws to revenue entries table

  1. Changes
    - Add `owner_draws` column to `revenue_entries` table
    - This tracks how much the owner took out as personal distributions
    - Used to calculate "Net Profit After Owner Draws" KPI

  2. Business Logic
    - owner_draws represents personal distributions taken by the owner
    - Net Profit After Draws = (actual_revenue * profit_margin/100) - owner_draws
    - This shows true leftover profit after paying the owner
*/

-- Add owner_draws column to revenue_entries table
ALTER TABLE revenue_entries 
ADD COLUMN owner_draws decimal(15,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN revenue_entries.owner_draws IS 'Amount taken by owner as personal distributions/draws from the business';
