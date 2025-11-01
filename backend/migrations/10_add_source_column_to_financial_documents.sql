-- Add missing 'source' column to financial_documents table
-- This column is needed by the frontend when creating manual financial documents

ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS source TEXT;

-- Add comment to explain the source column
COMMENT ON COLUMN financial_documents.source IS 'Source of the financial document (e.g., "manual", "upload", "api")';
