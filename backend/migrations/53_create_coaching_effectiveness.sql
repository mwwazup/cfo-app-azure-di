-- Migration: Coaching Effectiveness Tracking
-- Purpose: Track AI coaching advice and correlate with actual metric improvements
-- Date: December 16, 2025

-- ============================================
-- COACHING SESSIONS TABLE
-- Records each AI coaching interaction
-- ============================================
CREATE TABLE IF NOT EXISTS coaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- What was asked/discussed
    question_text TEXT,                          -- User's question (truncated for privacy)
    question_category TEXT,                      -- 'crew_costs', 'cash_flow', 'ler', 'pricing', 'general'
    
    -- AI response details
    response_type TEXT,                          -- 'tactical', 'strategic', 'educational', 'motivational'
    advice_category TEXT,                        -- 'bonus_structure', 'pricing', 'scheduling', 'cost_reduction'
    key_recommendation TEXT,                     -- Brief summary of main advice given
    
    -- Engagement metrics
    response_length INTEGER,                     -- Character count of response
    time_spent_seconds INTEGER,                  -- How long user engaged with response
    user_asked_followup BOOLEAN DEFAULT FALSE,
    user_rated_helpful BOOLEAN,                  -- Optional thumbs up/down
    
    -- Context at time of advice
    context_metrics JSONB DEFAULT '{}',          -- Snapshot of relevant metrics when advice given
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COACHING EFFECTIVENESS TABLE
-- Links coaching sessions to metric outcomes
-- ============================================
CREATE TABLE IF NOT EXISTS coaching_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coaching_session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- The advice given
    advice_category TEXT NOT NULL,               -- 'bonus_structure', 'pricing', 'crew_optimization'
    date_given DATE NOT NULL,
    
    -- Metric being tracked
    metric_name TEXT NOT NULL,                   -- 'ler', 'gross_profit_pct', 'revenue', 'crew_cost'
    baseline_value NUMERIC(15,2),                -- Value when advice was given
    
    -- Outcome tracking (filled in by scheduled job)
    value_7_days NUMERIC(15,2),
    value_14_days NUMERIC(15,2),
    value_30_days NUMERIC(15,2),
    value_60_days NUMERIC(15,2),
    
    -- Implementation tracking
    implemented BOOLEAN,                         -- Did user take action?
    implementation_date DATE,
    days_to_implementation INTEGER,
    
    -- Calculated effectiveness
    improvement_pct NUMERIC(8,4),                -- % change from baseline to 30-day
    effectiveness_score NUMERIC(5,2),            -- Normalized 0-100 score
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ
);

-- ============================================
-- BEHAVIORAL LOGS TABLE
-- Granular decision tree of user actions
-- ============================================
CREATE TABLE IF NOT EXISTS user_behavioral_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_id TEXT,
    
    -- Action details
    action_type TEXT NOT NULL,                   -- 'viewed_metric', 'asked_ai', 'changed_setting', 'exported_data'
    action_target TEXT,                          -- What they interacted with
    
    -- Context
    screen_name TEXT,                            -- Which page/screen
    time_on_screen_seconds INTEGER,
    previous_action TEXT,                        -- For journey mapping
    
    -- For AI interactions
    ai_response_type TEXT,
    ai_response_category TEXT,
    user_followed_guidance BOOLEAN,
    
    -- Metric context (what metrics were visible/relevant)
    visible_metrics JSONB DEFAULT '{}',
    metric_values_at_time JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AGGREGATE INSIGHTS VIEW
-- What coaching advice actually works?
-- ============================================
CREATE OR REPLACE VIEW coaching_aggregate_insights AS
SELECT 
    advice_category,
    metric_name,
    COUNT(*) as total_instances,
    COUNT(CASE WHEN implemented THEN 1 END) as implemented_count,
    ROUND(100.0 * COUNT(CASE WHEN implemented THEN 1 END) / NULLIF(COUNT(*), 0), 1) as adoption_rate_pct,
    ROUND(AVG(improvement_pct), 2) as avg_improvement_pct,
    ROUND(AVG(days_to_implementation), 1) as avg_days_to_implement,
    ROUND(AVG(effectiveness_score), 1) as avg_effectiveness_score,
    COUNT(CASE WHEN improvement_pct > 0 THEN 1 END) as positive_outcomes,
    COUNT(CASE WHEN improvement_pct <= 0 THEN 1 END) as neutral_or_negative
FROM coaching_effectiveness
WHERE value_30_days IS NOT NULL
GROUP BY advice_category, metric_name
ORDER BY avg_improvement_pct DESC;

-- ============================================
-- SCREEN ENGAGEMENT VIEW
-- Which screens do users actually use?
-- ============================================
CREATE OR REPLACE VIEW screen_engagement_stats AS
SELECT 
    screen_name,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_views,
    ROUND(AVG(time_on_screen_seconds), 1) as avg_time_seconds,
    COUNT(CASE WHEN time_on_screen_seconds < 5 THEN 1 END) as bounce_count,
    ROUND(100.0 * COUNT(CASE WHEN time_on_screen_seconds < 5 THEN 1 END) / NULLIF(COUNT(*), 0), 1) as bounce_rate_pct
FROM user_behavioral_logs
WHERE action_type = 'viewed_metric' OR screen_name IS NOT NULL
GROUP BY screen_name
ORDER BY total_views DESC;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_category ON coaching_sessions(advice_category);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_date ON coaching_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_effectiveness_user ON coaching_effectiveness(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_effectiveness_category ON coaching_effectiveness(advice_category);
CREATE INDEX IF NOT EXISTS idx_coaching_effectiveness_date ON coaching_effectiveness(date_given);
CREATE INDEX IF NOT EXISTS idx_coaching_effectiveness_pending ON coaching_effectiveness(last_checked_at) 
    WHERE value_30_days IS NULL;

CREATE INDEX IF NOT EXISTS idx_behavioral_logs_user ON user_behavioral_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_logs_screen ON user_behavioral_logs(screen_name);
CREATE INDEX IF NOT EXISTS idx_behavioral_logs_date ON user_behavioral_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavioral_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
DROP POLICY IF EXISTS "Users own coaching_sessions" ON coaching_sessions;
CREATE POLICY "Users own coaching_sessions" ON coaching_sessions
    FOR ALL USING (
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'sub',
            current_setting('request.jwt.claims', true)::json->>'user_id'
        )
    );

DROP POLICY IF EXISTS "Users own coaching_effectiveness" ON coaching_effectiveness;
CREATE POLICY "Users own coaching_effectiveness" ON coaching_effectiveness
    FOR ALL USING (
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'sub',
            current_setting('request.jwt.claims', true)::json->>'user_id'
        )
    );

DROP POLICY IF EXISTS "Users own behavioral_logs" ON user_behavioral_logs;
CREATE POLICY "Users own behavioral_logs" ON user_behavioral_logs
    FOR ALL USING (
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'sub',
            current_setting('request.jwt.claims', true)::json->>'user_id'
        )
    );

-- Service role for aggregate analysis (anonymized)
DROP POLICY IF EXISTS "Service role coaching_sessions" ON coaching_sessions;
CREATE POLICY "Service role coaching_sessions" ON coaching_sessions
    FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role coaching_effectiveness" ON coaching_effectiveness;
CREATE POLICY "Service role coaching_effectiveness" ON coaching_effectiveness
    FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role behavioral_logs" ON user_behavioral_logs;
CREATE POLICY "Service role behavioral_logs" ON user_behavioral_logs
    FOR SELECT USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTION: Record coaching session
-- ============================================
CREATE OR REPLACE FUNCTION record_coaching_session(
    p_user_id TEXT,
    p_question_text TEXT,
    p_question_category TEXT,
    p_response_type TEXT,
    p_advice_category TEXT,
    p_key_recommendation TEXT,
    p_response_length INTEGER,
    p_context_metrics JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO coaching_sessions (
        user_id, question_text, question_category, response_type,
        advice_category, key_recommendation, response_length, context_metrics
    ) VALUES (
        p_user_id, p_question_text, p_question_category, p_response_type,
        p_advice_category, p_key_recommendation, p_response_length, p_context_metrics
    )
    RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Create effectiveness tracking
-- ============================================
CREATE OR REPLACE FUNCTION create_effectiveness_tracking(
    p_coaching_session_id UUID,
    p_user_id TEXT,
    p_advice_category TEXT,
    p_metric_name TEXT,
    p_baseline_value NUMERIC
)
RETURNS UUID AS $$
DECLARE
    tracking_id UUID;
BEGIN
    INSERT INTO coaching_effectiveness (
        coaching_session_id, user_id, advice_category,
        date_given, metric_name, baseline_value
    ) VALUES (
        p_coaching_session_id, p_user_id, p_advice_category,
        CURRENT_DATE, p_metric_name, p_baseline_value
    )
    RETURNING id INTO tracking_id;
    
    RETURN tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SCHEDULED JOB: Update effectiveness metrics
-- Run weekly to check 7/14/30/60 day outcomes
-- ============================================
CREATE OR REPLACE FUNCTION update_coaching_effectiveness_metrics()
RETURNS void AS $$
DECLARE
    rec RECORD;
    metric_value NUMERIC;
    days_since INTEGER;
BEGIN
    -- Find records that need checking
    FOR rec IN 
        SELECT ce.*
        FROM coaching_effectiveness ce
        WHERE (
            (ce.value_7_days IS NULL AND ce.date_given <= CURRENT_DATE - INTERVAL '7 days')
            OR (ce.value_14_days IS NULL AND ce.date_given <= CURRENT_DATE - INTERVAL '14 days')
            OR (ce.value_30_days IS NULL AND ce.date_given <= CURRENT_DATE - INTERVAL '30 days')
            OR (ce.value_60_days IS NULL AND ce.date_given <= CURRENT_DATE - INTERVAL '60 days')
        )
    LOOP
        days_since := CURRENT_DATE - rec.date_given;
        
        -- Get current metric value based on metric_name
        -- LER from employee_daily_records
        IF rec.metric_name = 'ler' THEN
            SELECT AVG(ler) INTO metric_value
            FROM employee_daily_records
            WHERE user_id = rec.user_id
            AND date >= CURRENT_DATE - INTERVAL '7 days';
        
        -- Revenue from revenue_entries
        ELSIF rec.metric_name = 'revenue' THEN
            SELECT actual_revenue INTO metric_value
            FROM revenue_entries
            WHERE user_id = rec.user_id
            AND year = EXTRACT(YEAR FROM CURRENT_DATE)
            AND month = EXTRACT(MONTH FROM CURRENT_DATE);
        
        -- Gross profit percentage
        ELSIF rec.metric_name = 'gross_profit_pct' THEN
            SELECT AVG(gross_profit_pct) INTO metric_value
            FROM employee_daily_records
            WHERE user_id = rec.user_id
            AND date >= CURRENT_DATE - INTERVAL '7 days';
        END IF;
        
        -- Update appropriate column based on days since
        IF days_since >= 7 AND days_since < 14 AND rec.value_7_days IS NULL THEN
            UPDATE coaching_effectiveness SET value_7_days = metric_value, last_checked_at = NOW() WHERE id = rec.id;
        ELSIF days_since >= 14 AND days_since < 30 AND rec.value_14_days IS NULL THEN
            UPDATE coaching_effectiveness SET value_14_days = metric_value, last_checked_at = NOW() WHERE id = rec.id;
        ELSIF days_since >= 30 AND days_since < 60 AND rec.value_30_days IS NULL THEN
            UPDATE coaching_effectiveness 
            SET value_30_days = metric_value,
                improvement_pct = CASE 
                    WHEN rec.baseline_value > 0 THEN ((metric_value - rec.baseline_value) / rec.baseline_value) * 100
                    ELSE NULL
                END,
                last_checked_at = NOW()
            WHERE id = rec.id;
        ELSIF days_since >= 60 AND rec.value_60_days IS NULL THEN
            UPDATE coaching_effectiveness SET value_60_days = metric_value, last_checked_at = NOW() WHERE id = rec.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE coaching_sessions IS 'Records AI coaching interactions for effectiveness analysis';
COMMENT ON TABLE coaching_effectiveness IS 'Tracks metric outcomes after coaching advice';
COMMENT ON TABLE user_behavioral_logs IS 'Granular user action logging for journey analysis';
COMMENT ON VIEW coaching_aggregate_insights IS 'Aggregate view of what coaching advice works best';
COMMENT ON VIEW screen_engagement_stats IS 'Which screens users engage with vs bounce from';
