-- Create voice coach conversation tables
-- Migration: 04_create_voice_coach_tables.sql

-- Create conversations table for voice coach interactions
CREATE TABLE IF NOT EXISTS voice_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_tags table for better tag management
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- Default accent color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tags
INSERT INTO conversation_tags (name, description, color) VALUES
    ('revenue', 'Questions about revenue and sales', '#10b981'),
    ('costs', 'Questions about expenses and costs', '#ef4444'),
    ('profit', 'Questions about profit margins and profitability', '#8b5cf6'),
    ('growth', 'Questions about business growth and expansion', '#06b6d4'),
    ('targets', 'Questions about goals and targets', '#f59e0b'),
    ('performance', 'Questions about monthly/quarterly performance', '#6366f1'),
    ('general', 'General business questions', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voice_conversations_user_id ON voice_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_created_at ON voice_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_conversations_tags ON voice_conversations USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for voice_conversations
CREATE POLICY "Users can view their own conversations" ON voice_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON voice_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON voice_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON voice_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for conversation_tags (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view conversation tags" ON conversation_tags
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_voice_conversations_updated_at
    BEFORE UPDATE ON voice_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_conversations_updated_at();

-- Create view for conversation analytics
CREATE OR REPLACE VIEW voice_conversation_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_conversations,
    AVG(duration_seconds) as avg_duration_seconds,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as conversations_last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as conversations_last_30_days,
    array_agg(DISTINCT tag) as all_tags_used,
    MIN(created_at) as first_conversation,
    MAX(created_at) as last_conversation
FROM voice_conversations
CROSS JOIN LATERAL unnest(tags) AS tag
GROUP BY user_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON voice_conversations TO authenticated;
GRANT SELECT ON conversation_tags TO authenticated;
GRANT SELECT ON voice_conversation_analytics TO authenticated;
