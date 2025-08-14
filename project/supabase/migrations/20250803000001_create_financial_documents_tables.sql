-- Create financial_documents table for storing processed financial statements
CREATE TABLE IF NOT EXISTS financial_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('pnl', 'balance_sheet', 'cash_flow')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  raw_json JSONB, -- Raw Mindee response
  summary_metrics JSONB, -- Cleaned and structured financial data
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'mindee_upload',
  confidence_score DECIMAL(3,2), -- Mindee confidence score (0.00-1.00)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_metrics table for individual extracted metrics
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., 'net_profit', 'total_assets', 'cash_from_ops'
  value DECIMAL(15,2) NOT NULL,
  category TEXT NOT NULL, -- e.g., 'profitability', 'liquidity', 'cash_flow'
  subcategory TEXT, -- e.g., 'revenue', 'expenses', 'current_assets'
  confidence_score DECIMAL(3,2), -- Individual field confidence
  is_verified BOOLEAN DEFAULT FALSE, -- User has reviewed/approved this metric
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_documents_user_id ON financial_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_type_date ON financial_documents(document_type, start_date);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_document_id ON financial_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_category ON financial_metrics(category);

-- Enable Row Level Security (RLS)
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_documents
CREATE POLICY "Users can view their own financial documents" ON financial_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial documents" ON financial_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial documents" ON financial_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial documents" ON financial_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for financial_metrics
CREATE POLICY "Users can view metrics for their documents" ON financial_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM financial_documents 
      WHERE financial_documents.id = financial_metrics.document_id 
      AND financial_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their documents" ON financial_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_documents 
      WHERE financial_documents.id = financial_metrics.document_id 
      AND financial_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics for their documents" ON financial_metrics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM financial_documents 
      WHERE financial_documents.id = financial_metrics.document_id 
      AND financial_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete metrics for their documents" ON financial_metrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM financial_documents 
      WHERE financial_documents.id = financial_metrics.document_id 
      AND financial_documents.user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_documents_updated_at BEFORE UPDATE ON financial_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_metrics_updated_at BEFORE UPDATE ON financial_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
