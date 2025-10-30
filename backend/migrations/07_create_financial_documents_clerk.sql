-- Create financial_documents table compatible with Clerk authentication
-- This table uses TEXT for user_id to support Clerk's user ID format (user_xxxxx)

CREATE TABLE IF NOT EXISTS financial_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Clerk user ID (e.g., user_33fQP5vCktD5cLZwkg7fbysz2JS)
    filename TEXT,
    document_type TEXT DEFAULT 'pnl',
    status TEXT DEFAULT 'pending',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_date TEXT,
    end_date TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.85,
    
    -- Financial data fields
    analysis_result JSONB,
    summary_metrics JSONB,
    raw_json JSONB,
    
    -- Metadata
    file_size BIGINT,
    mime_type TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_documents_user_id ON financial_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_type ON financial_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_financial_documents_uploaded_at ON financial_documents(uploaded_at DESC);

-- Enable RLS
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

-- Create helper function to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claim.sub', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for financial_documents using Clerk user IDs
CREATE POLICY financial_documents_select ON financial_documents
    FOR SELECT
    TO authenticated
    USING (user_id = public.get_clerk_user_id());

CREATE POLICY financial_documents_insert ON financial_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY financial_documents_update ON financial_documents
    FOR UPDATE
    TO authenticated
    USING (user_id = public.get_clerk_user_id())
    WITH CHECK (user_id = public.get_clerk_user_id());

CREATE POLICY financial_documents_delete ON financial_documents
    FOR DELETE
    TO authenticated
    USING (user_id = public.get_clerk_user_id());

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_financial_documents_updated_at
    BEFORE UPDATE ON financial_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the table
COMMENT ON TABLE financial_documents IS 'Financial documents table compatible with Clerk authentication. Uses TEXT user_id to store Clerk user IDs.';
