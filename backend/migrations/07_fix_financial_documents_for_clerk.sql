-- Fix financial_documents table for Clerk authentication
-- This script safely handles existing tables and migrates them to TEXT user_id

-- Step 1: Check if table exists and drop if it has UUID user_id
DO $$ 
BEGIN
    -- Check if table exists with UUID user_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'financial_documents' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Table exists with wrong type, drop it
        RAISE NOTICE 'Dropping existing financial_documents table with UUID user_id';
        DROP TABLE IF EXISTS financial_documents CASCADE;
    END IF;
END $$;

-- Step 2: Create the table with correct structure
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

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_documents_user_id ON financial_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_type ON financial_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_financial_documents_uploaded_at ON financial_documents(uploaded_at DESC);

-- Step 4: Enable RLS
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DROP POLICY IF EXISTS financial_documents_select ON financial_documents;
DROP POLICY IF EXISTS financial_documents_insert ON financial_documents;
DROP POLICY IF EXISTS financial_documents_update ON financial_documents;
DROP POLICY IF EXISTS financial_documents_delete ON financial_documents;

-- Step 6: Create helper function to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claim.sub', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create RLS policies for Clerk authentication
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

-- Step 8: Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_financial_documents_updated_at ON financial_documents;

CREATE TRIGGER update_financial_documents_updated_at
    BEFORE UPDATE ON financial_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add comment explaining the table
COMMENT ON TABLE financial_documents IS 'Financial documents table compatible with Clerk authentication. Uses TEXT user_id to store Clerk user IDs.';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ financial_documents table created successfully with TEXT user_id for Clerk authentication';
END $$;
