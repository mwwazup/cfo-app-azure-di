-- Create document_metrics table for storing individual line items
CREATE TABLE IF NOT EXISTS document_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('revenue', 'expense', 'kpi')),
    metric_key TEXT NOT NULL, -- normalized key like 'revenue_total', 'cogs_total'
    label TEXT NOT NULL, -- original label from document
    value DECIMAL(15,2) NOT NULL DEFAULT 0,
    confidence DECIMAL(3,2) DEFAULT 0.85,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_kpis table for precomputed KPIs
CREATE TABLE IF NOT EXISTS document_kpis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
    revenue_total DECIMAL(15,2) DEFAULT 0,
    cogs_total DECIMAL(15,2) DEFAULT 0,
    opex_total DECIMAL(15,2) DEFAULT 0,
    gross_profit DECIMAL(15,2) DEFAULT 0,
    net_income DECIMAL(15,2) DEFAULT 0,
    gross_margin_percent DECIMAL(5,2) DEFAULT 0,
    net_margin_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_metrics_document_id ON document_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metrics_type_key ON document_metrics(metric_type, metric_key);
CREATE INDEX IF NOT EXISTS idx_document_kpis_document_id ON document_kpis(document_id);

-- Enable RLS
ALTER TABLE document_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_metrics
CREATE POLICY document_metrics_select ON document_metrics
    FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY document_metrics_insert ON document_metrics
    FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY document_metrics_update ON document_metrics
    FOR UPDATE
    USING (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY document_metrics_delete ON document_metrics
    FOR DELETE
    USING (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

-- RLS policies for document_kpis
CREATE POLICY document_kpis_select ON document_kpis
    FOR SELECT
    USING (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY document_kpis_insert ON document_kpis
    FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY document_kpis_update ON document_kpis
    FOR UPDATE
    USING (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY document_kpis_delete ON document_kpis
    FOR DELETE
    USING (
        document_id IN (
            SELECT id FROM financial_documents 
            WHERE user_id = auth.uid()
        )
    );
