-- Financial Intelligence Knowledge Base Schema
-- This replaces the need for Zep by storing financial insights and context

-- Table to store financial insights and coaching knowledge
CREATE TABLE financial_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT CHECK (insight_type IN ('trend', 'milestone', 'recommendation', 'concern', 'opportunity')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    financial_period TEXT NOT NULL, -- "2024-Q3", "2023-Annual", etc.
    metrics_involved TEXT[] DEFAULT '{}', -- ["revenue", "profit_margin", "cash_flow"]
    relevance_score INTEGER CHECK (relevance_score >= 1 AND relevance_score <= 10) DEFAULT 5,
    status TEXT CHECK (status IN ('active', 'resolved', 'outdated')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store coaching conversation summaries and context
CREATE TABLE coaching_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_date DATE NOT NULL,
    key_topics TEXT[] DEFAULT '{}', -- Topics discussed
    financial_focus_areas TEXT[] DEFAULT '{}', -- Areas of focus
    action_items TEXT[] DEFAULT '{}', -- Recommended actions
    user_concerns TEXT[] DEFAULT '{}', -- User's expressed concerns
    coaching_notes TEXT, -- Free-form coaching notes
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track financial milestones and achievements
CREATE TABLE financial_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_type TEXT CHECK (milestone_type IN ('revenue_goal', 'profit_target', 'cost_reduction', 'growth_rate', 'other')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    target_date DATE,
    achieved_date DATE,
    status TEXT CHECK (status IN ('planned', 'in_progress', 'achieved', 'missed')) DEFAULT 'planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_financial_insights_user_id ON financial_insights(user_id);
CREATE INDEX idx_financial_insights_status ON financial_insights(status);
CREATE INDEX idx_financial_insights_type ON financial_insights(insight_type);
CREATE INDEX idx_financial_insights_period ON financial_insights(financial_period);

CREATE INDEX idx_coaching_context_user_id ON coaching_context(user_id);
CREATE INDEX idx_coaching_context_date ON coaching_context(conversation_date);
CREATE INDEX idx_coaching_context_follow_up ON coaching_context(follow_up_needed, follow_up_date);

CREATE INDEX idx_financial_milestones_user_id ON financial_milestones(user_id);
CREATE INDEX idx_financial_milestones_status ON financial_milestones(status);
CREATE INDEX idx_financial_milestones_type ON financial_milestones(milestone_type);

-- Row Level Security (RLS) policies
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_milestones ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can access own financial insights" ON financial_insights
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own coaching context" ON coaching_context
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own financial milestones" ON financial_milestones
    FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_financial_insights_updated_at 
    BEFORE UPDATE ON financial_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion function for testing
CREATE OR REPLACE FUNCTION seed_financial_intelligence_sample_data(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Insert sample financial insights
    INSERT INTO financial_insights (user_id, insight_type, title, description, financial_period, metrics_involved, relevance_score) VALUES
    (target_user_id, 'trend', 'Revenue Growth Acceleration', '2024 Q3 shows 23% revenue growth compared to Q2, indicating strong momentum', '2024-Q3', ARRAY['revenue', 'growth_rate'], 9),
    (target_user_id, 'concern', 'Declining Profit Margins', 'Profit margins dropped from 35% to 28% due to increased supplier costs', '2024-Q3', ARRAY['profit_margin', 'costs'], 8),
    (target_user_id, 'opportunity', 'Seasonal Revenue Pattern', 'Q4 historically shows 40% higher revenue - prepare for scaling', '2024-Q4', ARRAY['revenue', 'seasonality'], 7);
    
    -- Insert sample coaching context
    INSERT INTO coaching_context (user_id, conversation_date, key_topics, financial_focus_areas, action_items, user_concerns) VALUES
    (target_user_id, CURRENT_DATE - INTERVAL '7 days', 
     ARRAY['cash flow management', 'growth planning'], 
     ARRAY['revenue optimization', 'cost control'],
     ARRAY['Review supplier contracts', 'Implement cash flow forecasting'],
     ARRAY['Seasonal cash flow gaps', 'Scaling challenges']);
     
    -- Insert sample milestone
    INSERT INTO financial_milestones (user_id, milestone_type, title, target_value, target_date, status) VALUES
    (target_user_id, 'revenue_goal', 'Reach $1M Annual Revenue', 1000000.00, '2024-12-31', 'in_progress');
END;
$$ LANGUAGE plpgsql;
