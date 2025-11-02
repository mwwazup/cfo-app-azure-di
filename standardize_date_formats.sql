-- Migration: Standardize date formats in financial_documents table
-- Converts simple date strings to full ISO timestamps for consistency

-- Update start_date: convert '2025-02-01' to '2025-02-01T00:00:00.000Z'
UPDATE financial_documents 
SET start_date = start_date || 'T00:00:00.000Z'
WHERE start_date IS NOT NULL 
  AND start_date NOT LIKE '%T%'
  AND start_date ~ '^\d{4}-\d{2}-\d{2}$';  -- Only match YYYY-MM-DD format

-- Update end_date: convert '2025-02-28' to '2025-02-28T23:59:59.000Z'
UPDATE financial_documents 
SET end_date = end_date || 'T23:59:59.000Z'
WHERE end_date IS NOT NULL 
  AND end_date NOT LIKE '%T%'
  AND end_date ~ '^\d{4}-\d{2}-\d{2}$';  -- Only match YYYY-MM-DD format

-- Show migration results
SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN start_date LIKE '%T%' THEN 1 END) as documents_with_iso_timestamps,
  COUNT(CASE WHEN start_date NOT LIKE '%T%' THEN 1 END) as documents_with_simple_dates
FROM financial_documents;

-- Verify a few examples
SELECT id, filename, start_date, end_date, created_at 
FROM financial_documents 
ORDER BY created_at DESC 
LIMIT 5;
