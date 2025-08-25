-- Financial Document Processing Optimization Database Setup
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Create document_metrics table for storing normalized financial data
CREATE TABLE IF NOT EXISTS document_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'expense', 'kpi')),
    metric_key TEXT NOT NULL, -- normalized key like 'revenue_total', 'expense_cogs'
    label TEXT NOT NULL, -- original label from document
    value DECIMAL(15,2) NOT NULL DEFAULT 0,
    confidence DECIMAL(3,2) DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_kpis table for storing precomputed KPIs
CREATE TABLE IF NOT EXISTS document_kpis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
    revenue_total DECIMAL(15,2) DEFAULT 0,
    expense_total DECIMAL(15,2) DEFAULT 0,
    gross_profit DECIMAL(15,2) DEFAULT 0,
    gross_margin DECIMAL(5,4) DEFAULT 0, -- percentage as decimal
    net_income DECIMAL(15,2) DEFAULT 0,
    net_margin DECIMAL(5,4) DEFAULT 0, -- percentage as decimal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id) -- one KPI record per document
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_metrics_document_id ON document_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metrics_type ON document_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_document_metrics_key ON document_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_document_kpis_document_id ON document_kpis(document_id);

-- Enable Row Level Security (RLS)
ALTER TABLE document_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_kpis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_metrics
CREATE POLICY "Users can view their own document metrics" ON document_metrics
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own document metrics" ON document_metrics
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own document metrics" ON document_metrics
    FOR UPDATE USING (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own document metrics" ON document_metrics
    FOR DELETE USING (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for document_kpis
CREATE POLICY "Users can view their own document KPIs" ON document_kpis
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own document KPIs" ON document_kpis
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own document KPIs" ON document_kpis
    FOR UPDATE USING (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own document KPIs" ON document_kpis
    FOR DELETE USING (
        document_id IN (
            SELECT id FROM financial_documents WHERE user_id = auth.uid()
        )
    );

-- Create updated_at trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update the updated_at column
CREATE TRIGGER update_document_metrics_updated_at 
    BEFORE UPDATE ON document_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_kpis_updated_at 
    BEFORE UPDATE ON document_kpis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
