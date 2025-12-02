-- Migration: Lighthouse Goal Integration
-- Purpose: Add columns to link revenue_entries and kpi_records to Lighthouse goals
-- This enables the app to track which FIR targets are synced with Lighthouse plan
-- NOTE: Non-destructive. Uses ALTER TABLE only.

-- ============================================================================
-- 1. Add lighthouse_synced column to revenue_entries
-- Tracks whether the FIR target (desired_revenue) is synced with Lighthouse step
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'revenue_entries' AND column_name = 'lighthouse_synced'
    ) THEN
        ALTER TABLE revenue_entries ADD COLUMN lighthouse_synced BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added lighthouse_synced column to revenue_entries';
    ELSE
        RAISE NOTICE 'lighthouse_synced column already exists in revenue_entries';
    END IF;
END $$;

-- ============================================================================
-- 2. Add lighthouse_step_year column to revenue_entries
-- Tracks which Lighthouse step year this entry corresponds to (e.g., "Year 2 of 5")
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'revenue_entries' AND column_name = 'lighthouse_step_year'
    ) THEN
        ALTER TABLE revenue_entries ADD COLUMN lighthouse_step_year INTEGER;
        RAISE NOTICE 'Added lighthouse_step_year column to revenue_entries';
    ELSE
        RAISE NOTICE 'lighthouse_step_year column already exists in revenue_entries';
    END IF;
END $$;

-- ============================================================================
-- 3. Add lighthouse_goal_id column to revenue_entries (optional FK reference)
-- Links to the big_fig_goals table for data integrity
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'revenue_entries' AND column_name = 'lighthouse_goal_id'
    ) THEN
        ALTER TABLE revenue_entries ADD COLUMN lighthouse_goal_id UUID;
        RAISE NOTICE 'Added lighthouse_goal_id column to revenue_entries';
    ELSE
        RAISE NOTICE 'lighthouse_goal_id column already exists in revenue_entries';
    END IF;
END $$;

-- ============================================================================
-- 4. Add lighthouse_step_year column to kpi_records
-- Tracks which Lighthouse step year a KPI belongs to for historical analysis
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kpi_records' AND column_name = 'lighthouse_step_year'
    ) THEN
        ALTER TABLE kpi_records ADD COLUMN lighthouse_step_year INTEGER;
        RAISE NOTICE 'Added lighthouse_step_year column to kpi_records';
    ELSE
        RAISE NOTICE 'lighthouse_step_year column already exists in kpi_records';
    END IF;
END $$;

-- ============================================================================
-- 5. Create a view for Lighthouse progress tracking
-- Aggregates data to show progress toward Lighthouse goal across years
-- ============================================================================
CREATE OR REPLACE VIEW lighthouse_progress AS
SELECT 
    bg.user_id,
    bg.target_annual_revenue AS lighthouse_target,
    bg.years_to_goal,
    bg.target_year AS lighthouse_target_year,
    bg.target_owner_pay,
    bg.target_profit_margin,
    bg.plan_status,
    bg.notes AS lighthouse_story,
    -- Current year actual revenue
    COALESCE(
        (SELECT SUM(actual_revenue) 
         FROM revenue_entries re 
         WHERE re.user_id = bg.user_id 
         AND re.year = EXTRACT(YEAR FROM CURRENT_DATE)),
        0
    ) AS current_year_revenue,
    -- Current year FIR target
    COALESCE(
        (SELECT SUM(desired_revenue) 
         FROM revenue_entries re 
         WHERE re.user_id = bg.user_id 
         AND re.year = EXTRACT(YEAR FROM CURRENT_DATE)),
        0
    ) AS current_year_fir_target,
    -- Calculate which step year we're in (1-based)
    CASE 
        WHEN bg.years_to_goal > 0 THEN
            GREATEST(1, bg.years_to_goal - (bg.target_year - EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER) + 1)
        ELSE 1
    END AS current_step_year,
    -- Calculate overall progress percentage toward lighthouse
    CASE 
        WHEN bg.target_annual_revenue > 0 THEN
            ROUND(
                (COALESCE(
                    (SELECT SUM(actual_revenue) 
                     FROM revenue_entries re 
                     WHERE re.user_id = bg.user_id 
                     AND re.year = EXTRACT(YEAR FROM CURRENT_DATE)),
                    0
                ) / bg.target_annual_revenue) * 100,
                1
            )
        ELSE 0
    END AS progress_to_lighthouse_pct,
    bg.created_at,
    bg.updated_at
FROM big_fig_goals bg;

-- Grant access to the view
GRANT SELECT ON lighthouse_progress TO authenticated;

-- ============================================================================
-- 6. Add index for faster lighthouse-related queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_revenue_entries_lighthouse_synced 
ON revenue_entries(lighthouse_synced) 
WHERE lighthouse_synced = TRUE;

CREATE INDEX IF NOT EXISTS idx_revenue_entries_lighthouse_goal_id 
ON revenue_entries(lighthouse_goal_id) 
WHERE lighthouse_goal_id IS NOT NULL;

-- ============================================================================
-- Summary of changes
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== LIGHTHOUSE INTEGRATION MIGRATION COMPLETE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'New columns added to revenue_entries:';
    RAISE NOTICE '  - lighthouse_synced (BOOLEAN): Is FIR synced with Lighthouse step?';
    RAISE NOTICE '  - lighthouse_step_year (INTEGER): Which step year (1, 2, 3...)';
    RAISE NOTICE '  - lighthouse_goal_id (UUID): Reference to big_fig_goals';
    RAISE NOTICE '';
    RAISE NOTICE 'New columns added to kpi_records:';
    RAISE NOTICE '  - lighthouse_step_year (INTEGER): Which step year for this KPI';
    RAISE NOTICE '';
    RAISE NOTICE 'New view created:';
    RAISE NOTICE '  - lighthouse_progress: Aggregated progress toward Lighthouse goal';
    RAISE NOTICE '';
END $$;
