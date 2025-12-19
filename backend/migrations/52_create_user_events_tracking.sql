-- Migration: Create user events tracking for adaptive learning
-- Purpose: Foundation for tracking user behavior to personalize and improve the app
-- Date: December 16, 2025

-- ============================================
-- USER EVENTS TABLE
-- Captures individual user actions/events
-- ============================================
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Event classification
    event_type TEXT NOT NULL,           -- 'page_view', 'feature_use', 'action', 'error'
    event_name TEXT NOT NULL,           -- 'add_employee', 'refresh_kpis', 'upload_csv', etc.
    
    -- Context
    page_route TEXT,                    -- '/employee-ler', '/kpi-dashboard', etc.
    metadata JSONB DEFAULT '{}',        -- Additional event-specific data
    
    -- Session tracking
    session_id TEXT,                    -- Groups events within a session
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT user_events_event_type_check CHECK (
        event_type IN ('page_view', 'feature_use', 'action', 'error', 'navigation')
    )
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_user_date ON user_events(user_id, created_at DESC);

-- ============================================
-- USER INSIGHTS TABLE (Aggregated)
-- Computed periodically to summarize user behavior
-- ============================================
CREATE TABLE IF NOT EXISTS user_insights (
    user_id TEXT PRIMARY KEY,
    
    -- Usage patterns
    total_sessions INTEGER DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    most_used_features JSONB DEFAULT '[]',      -- Top 5 features by usage count
    feature_usage_counts JSONB DEFAULT '{}',    -- { "add_employee": 45, "refresh_kpis": 12 }
    
    -- Engagement metrics
    avg_session_duration_seconds INTEGER,
    pages_per_session NUMERIC(5,2),
    
    -- Preferences (for future personalization)
    preferred_workflow TEXT,                     -- 'employee-focused', 'kpi-focused', etc.
    ui_preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    first_seen_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    insights_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
DROP POLICY IF EXISTS "Users can view own events" ON user_events;
CREATE POLICY "Users can view own events" ON user_events
    FOR SELECT USING (
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'sub',
            current_setting('request.jwt.claims', true)::json->>'user_id'
        )
    );

-- Users can insert their own events
DROP POLICY IF EXISTS "Users can insert own events" ON user_events;
CREATE POLICY "Users can insert own events" ON user_events
    FOR INSERT WITH CHECK (
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'sub',
            current_setting('request.jwt.claims', true)::json->>'user_id'
        )
    );

-- Users can view their own insights
DROP POLICY IF EXISTS "Users can view own insights" ON user_insights;
CREATE POLICY "Users can view own insights" ON user_insights
    FOR SELECT USING (
        user_id = COALESCE(
            current_setting('request.jwt.claims', true)::json->>'sub',
            current_setting('request.jwt.claims', true)::json->>'user_id'
        )
    );

-- Service role can do everything (for aggregation jobs)
DROP POLICY IF EXISTS "Service role full access events" ON user_events;
CREATE POLICY "Service role full access events" ON user_events
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access insights" ON user_insights;
CREATE POLICY "Service role full access insights" ON user_insights
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTION: Update user insights
-- Call this periodically (daily) or on-demand
-- ============================================
CREATE OR REPLACE FUNCTION update_user_insights(target_user_id TEXT)
RETURNS void AS $$
DECLARE
    feature_counts JSONB;
    top_features JSONB;
    total_events_count INTEGER;
    total_sessions_count INTEGER;
    first_event TIMESTAMPTZ;
    last_event TIMESTAMPTZ;
BEGIN
    -- Get feature usage counts
    SELECT 
        jsonb_object_agg(event_name, cnt),
        COUNT(DISTINCT session_id),
        COUNT(*),
        MIN(created_at),
        MAX(created_at)
    INTO feature_counts, total_sessions_count, total_events_count, first_event, last_event
    FROM (
        SELECT event_name, COUNT(*) as cnt, session_id, created_at
        FROM user_events
        WHERE user_id = target_user_id
        AND event_type IN ('feature_use', 'action')
        GROUP BY event_name, session_id, created_at
    ) sub;

    -- Get top 5 features
    SELECT jsonb_agg(feature ORDER BY cnt DESC)
    INTO top_features
    FROM (
        SELECT event_name as feature, COUNT(*) as cnt
        FROM user_events
        WHERE user_id = target_user_id
        AND event_type IN ('feature_use', 'action')
        GROUP BY event_name
        ORDER BY cnt DESC
        LIMIT 5
    ) sub;

    -- Upsert insights
    INSERT INTO user_insights (
        user_id,
        total_sessions,
        total_events,
        most_used_features,
        feature_usage_counts,
        first_seen_at,
        last_active_at,
        insights_updated_at
    ) VALUES (
        target_user_id,
        COALESCE(total_sessions_count, 0),
        COALESCE(total_events_count, 0),
        COALESCE(top_features, '[]'),
        COALESCE(feature_counts, '{}'),
        first_event,
        last_event,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_sessions = COALESCE(total_sessions_count, 0),
        total_events = COALESCE(total_events_count, 0),
        most_used_features = COALESCE(top_features, '[]'),
        feature_usage_counts = COALESCE(feature_counts, '{}'),
        last_active_at = last_event,
        insights_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE user_events IS 'Tracks individual user actions for analytics and personalization';
COMMENT ON TABLE user_insights IS 'Aggregated user behavior insights for adaptive UX';
COMMENT ON FUNCTION update_user_insights IS 'Recalculates user insights from raw events';
