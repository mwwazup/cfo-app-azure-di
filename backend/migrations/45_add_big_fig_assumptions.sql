-- Migration: Add assumption fields to big_fig_goals for Lighthouse path
-- Purpose: Store average job value and jobs per crew per month with the Lighthouse goal
-- NOTE: Non-destructive. Uses ALTER TABLE and does not drop or delete any data.

ALTER TABLE big_fig_goals
    ADD COLUMN IF NOT EXISTS avg_job_value NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS jobs_per_crew_per_month NUMERIC(15,2);
