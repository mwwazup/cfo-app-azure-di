-- Update financial_documents table to support Azure Document Intelligence custom model schema
-- This migration adds columns to store the detailed Azure financial data including breakdown arrays

-- Add columns for Azure custom model data
ALTER TABLE financial_documents 
ADD COLUMN IF NOT EXISTS azure_data JSONB, -- Full Azure custom model response
ADD COLUMN IF NOT EXISTS reporting_period TEXT, -- Reporting period from Azure document
ADD COLUMN IF NOT EXISTS azure_document_type TEXT CHECK (azure_document_type IN ('P&L', 'Balance Sheet', 'Cash Flow'));

-- Add columns for P&L data
ALTER TABLE financial_documents 
ADD COLUMN IF NOT EXISTS pnl_total_revenue DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_cost_of_goods_sold DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_gross_profit DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_operating_expenses DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_net_income DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_other_income DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_other_expenses DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS pnl_expense_breakdown JSONB; -- Array of expense breakdown items

-- Add columns for Balance Sheet data
ALTER TABLE financial_documents 
ADD COLUMN IF NOT EXISTS bs_total_assets DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS bs_total_liabilities DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS bs_total_equity DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS bs_current_assets DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS bs_current_liabilities DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS bs_asset_breakdown JSONB; -- Array of asset breakdown items

-- Add columns for Cash Flow data
ALTER TABLE financial_documents 
ADD COLUMN IF NOT EXISTS cf_cash_from_operations DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cf_cash_from_investing DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cf_cash_from_financing DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cf_net_cash_flow DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cf_cash_at_beginning DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cf_cash_at_end DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS cf_cash_movements JSONB; -- Array of cash movement items

-- Update indexes to include new columns
CREATE INDEX IF NOT EXISTS idx_financial_documents_azure_doc_type ON financial_documents(azure_document_type);
CREATE INDEX IF NOT EXISTS idx_financial_documents_reporting_period ON financial_documents(reporting_period);

-- Update RLS policies if needed (they should still work with new columns)
-- No changes needed to existing policies as they're based on user_id and document_id relationships

-- Add comments to document the new columns
COMMENT ON COLUMN financial_documents.azure_data IS 'Full Azure Document Intelligence custom model response';
COMMENT ON COLUMN financial_documents.reporting_period IS 'Reporting period extracted from Azure document';
COMMENT ON COLUMN financial_documents.azure_document_type IS 'Document type as identified by Azure model (P&L, Balance Sheet, Cash Flow)';
COMMENT ON COLUMN financial_documents.pnl_expense_breakdown IS 'Array of expense breakdown items from Azure P&L';
COMMENT ON COLUMN financial_documents.bs_asset_breakdown IS 'Array of asset breakdown items from Azure Balance Sheet';
COMMENT ON COLUMN financial_documents.cf_cash_movements IS 'Array of cash movement items from Azure Cash Flow';
