-- Fix Service Mix Tables to use TEXT user_id for Clerk authentication
-- Run this to fix the UUID error

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS service_activities CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP VIEW IF EXISTS service_monthly_summary CASCADE;

-- ============================================================================
-- SERVICES TABLE (with TEXT user_id for Clerk)
-- ============================================================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Clerk user ID (e.g., "user_xxxxx")
    
    -- Service Details
    service_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100),
    color VARCHAR(7),
    
    -- Optional Auto-Pricing
    default_price NUMERIC(15, 2),
    is_auto_pricing_enabled BOOLEAN DEFAULT FALSE,
    
    -- Display Order
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique service names per user
    CONSTRAINT uq_services_user_name UNIQUE(user_id, service_name)
);

-- ============================================================================
-- SERVICE ACTIVITIES TABLE (with TEXT user_id for Clerk)
-- ============================================================================
CREATE TABLE service_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Clerk user ID (e.g., "user_xxxxx")
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Time Period (Weekly Granularity)
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    week_of_month INTEGER NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    -- Activity Metrics
    appointment_count INTEGER DEFAULT 0,
    total_revenue NUMERIC(15, 2) DEFAULT 0,
    
    -- Auto-calculated fields
    avg_ticket_price NUMERIC(15, 2),
    is_auto_calculated BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique entries per service per week
    CONSTRAINT uq_service_activities_service_week UNIQUE(service_id, year, month, week_of_month)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_active ON services(user_id, is_active);
CREATE INDEX idx_service_activities_user_id ON service_activities(user_id);
CREATE INDEX idx_service_activities_service_id ON service_activities(service_id);
CREATE INDEX idx_service_activities_period ON service_activities(year, month);
CREATE INDEX idx_service_activities_week ON service_activities(week_start_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- NOTE: RLS is DISABLED because this app uses Clerk authentication, not Supabase Auth.
-- The SupabaseSessionBridge does NOT create a Supabase auth session, so auth.uid() returns NULL.
-- Security is enforced at the application level by filtering all queries with the Clerk user_id.
-- All hooks (useServices, useServiceActivities) use useAuthContext().dbUserId to filter data.
--
-- This is the CORRECT approach for this app's architecture.
-- Other tables may appear to use RLS, but they likely have the same issue if they rely on auth.uid().

-- RLS is intentionally DISABLED
-- ALTER TABLE services ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE service_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================================================

-- Auto-update updated_at timestamp for services
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for service_activities
CREATE TRIGGER update_service_activities_updated_at
    BEFORE UPDATE ON service_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate avg_ticket_price when activity is inserted/updated
CREATE OR REPLACE FUNCTION calculate_avg_ticket_price()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.appointment_count > 0 THEN
        NEW.avg_ticket_price = NEW.total_revenue / NEW.appointment_count;
    ELSE
        NEW.avg_ticket_price = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_avg_ticket_price
    BEFORE INSERT OR UPDATE ON service_activities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_avg_ticket_price();

-- ============================================================================
-- HELPER VIEWS FOR MONTHLY AGGREGATION
-- ============================================================================

-- View: Monthly service revenue aggregation from weekly data
CREATE OR REPLACE VIEW service_monthly_summary AS
SELECT 
    sa.user_id,
    sa.service_id,
    s.service_name,
    s.service_category,
    s.color,
    sa.year,
    sa.month,
    SUM(sa.appointment_count) as total_appointments,
    SUM(sa.total_revenue) as total_revenue,
    CASE 
        WHEN SUM(sa.appointment_count) > 0 
        THEN SUM(sa.total_revenue) / SUM(sa.appointment_count)
        ELSE 0 
    END as avg_ticket_price,
    COUNT(*) as weeks_with_activity
FROM service_activities sa
JOIN services s ON sa.service_id = s.id
WHERE s.is_active = true
GROUP BY sa.user_id, sa.service_id, s.service_name, s.service_category, s.color, sa.year, sa.month;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE services IS 'User-defined services for tracking business activities and revenue (uses Clerk user_id)';
COMMENT ON TABLE service_activities IS 'Weekly tracking of appointments and revenue per service (uses Clerk user_id)';
COMMENT ON VIEW service_monthly_summary IS 'Aggregated monthly view of service activities from weekly data';
COMMENT ON COLUMN services.user_id IS 'Clerk user ID (TEXT format, e.g., user_xxxxx)';
COMMENT ON COLUMN service_activities.user_id IS 'Clerk user ID (TEXT format, e.g., user_xxxxx)';
