-- Create financial statements table
CREATE TABLE IF NOT EXISTS financial_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    data JSONB NOT NULL,
    processed_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create financial categories table
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES financial_categories(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_statements_user_id ON financial_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_statements_type ON financial_statements(type);
CREATE INDEX IF NOT EXISTS idx_financial_categories_user_id ON financial_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_type ON financial_categories(type);
CREATE INDEX IF NOT EXISTS idx_financial_categories_parent_id ON financial_categories(parent_id);

-- Add RLS policies for financial statements
ALTER TABLE financial_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financial statements"
    ON financial_statements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial statements"
    ON financial_statements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial statements"
    ON financial_statements FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial statements"
    ON financial_statements FOR DELETE
    USING (auth.uid() = user_id);

-- Add RLS policies for financial categories
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financial categories"
    ON financial_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own financial categories"
    ON financial_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial categories"
    ON financial_categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial categories"
    ON financial_categories FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_statements_updated_at
    BEFORE UPDATE ON financial_statements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_categories_updated_at
    BEFORE UPDATE ON financial_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
