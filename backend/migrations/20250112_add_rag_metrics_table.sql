-- Create table to track RAG retrieval metrics for observability
CREATE TABLE IF NOT EXISTS rag_retrieval_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    retrieved_nodes INTEGER DEFAULT 0,
    retrieved_edges INTEGER DEFAULT 0,
    context_tokens INTEGER DEFAULT 0,
    retrieval_time_ms INTEGER DEFAULT 0,
    completeness_score TEXT CHECK (completeness_score IN ('complete', 'partial', 'insufficient')),
    similarity_threshold FLOAT DEFAULT 0.8,
    max_results INTEGER DEFAULT 10,
    response_length INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Enable RLS
    CONSTRAINT rag_metrics_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE rag_retrieval_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view own RAG metrics" ON rag_retrieval_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RAG metrics" ON rag_retrieval_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_rag_metrics_user_id ON rag_retrieval_metrics(user_id);
CREATE INDEX idx_rag_metrics_created_at ON rag_retrieval_metrics(created_at DESC);
CREATE INDEX idx_rag_metrics_completeness ON rag_retrieval_metrics(completeness_score);

-- Add comments
COMMENT ON TABLE rag_retrieval_metrics IS 'Tracks RAG retrieval performance metrics for optimization';
COMMENT ON COLUMN rag_retrieval_metrics.completeness_score IS 'Whether retrieved context was sufficient: complete, partial, or insufficient';
COMMENT ON COLUMN rag_retrieval_metrics.similarity_threshold IS 'Similarity threshold used for retrieval';
COMMENT ON COLUMN rag_retrieval_metrics.max_results IS 'Maximum number of results requested';
