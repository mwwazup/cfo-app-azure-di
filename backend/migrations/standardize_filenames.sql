-- Migration: Standardize Financial Document Filenames
-- This SQL migration updates all financial document filenames to follow a consistent format:
-- {YYYY}_{MM}_{month_name}_{document_type}.{extension}

-- Create a helper function to generate standardized filenames
CREATE OR REPLACE FUNCTION generate_standard_filename(
    p_start_date DATE,
    p_document_type TEXT,
    p_original_filename TEXT
) RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_month_name TEXT;
    v_doc_type TEXT;
    v_extension TEXT;
    v_standardized_filename TEXT;
BEGIN
    -- Extract year and month from start_date
    v_year := EXTRACT(YEAR FROM p_start_date)::TEXT;
    v_month := LPAD(EXTRACT(MONTH FROM p_start_date)::TEXT, 2, '0');
    
    -- Get month name
    v_month_name := CASE EXTRACT(MONTH FROM p_start_date)
        WHEN 1 THEN 'january'
        WHEN 2 THEN 'february'
        WHEN 3 THEN 'march'
        WHEN 4 THEN 'april'
        WHEN 5 THEN 'may'
        WHEN 6 THEN 'june'
        WHEN 7 THEN 'july'
        WHEN 8 THEN 'august'
        WHEN 9 THEN 'september'
        WHEN 10 THEN 'october'
        WHEN 11 THEN 'november'
        WHEN 12 THEN 'december'
    END;
    
    -- Normalize document type
    v_doc_type := CASE LOWER(p_document_type)
        WHEN 'profit_loss' THEN 'pnl'
        WHEN 'p&l' THEN 'pnl'
        WHEN 'income_statement' THEN 'pnl'
        WHEN 'balance' THEN 'balance_sheet'
        WHEN 'cashflow' THEN 'cash_flow'
        WHEN 'cash' THEN 'cash_flow'
        ELSE LOWER(p_document_type)
    END;
    
    -- Determine file extension from original filename
    v_extension := CASE
        WHEN p_original_filename ILIKE '%.pdf' THEN '.pdf'
        WHEN p_original_filename ILIKE '%.png' THEN '.png'
        WHEN p_original_filename ILIKE '%.xlsx' THEN '.xlsx'
        WHEN p_original_filename ILIKE '%.xls' THEN '.xls'
        ELSE '.csv'
    END;
    
    -- Generate standardized filename
    v_standardized_filename := v_year || '_' || v_month || '_' || v_month_name || '_' || v_doc_type || v_extension;
    
    RETURN v_standardized_filename;
END;
$$ LANGUAGE plpgsql;

-- Preview changes (uncomment to see what would change)
-- SELECT 
--     id,
--     filename AS old_filename,
--     generate_standard_filename(start_date::DATE, document_type, filename) AS new_filename,
--     start_date,
--     document_type
-- FROM financial_documents
-- WHERE start_date IS NOT NULL
--   AND filename != generate_standard_filename(start_date::DATE, document_type, filename)
-- ORDER BY start_date DESC;

-- Update all filenames to standardized format
-- IMPORTANT: Review the preview query above before running this!
UPDATE financial_documents
SET filename = generate_standard_filename(start_date::DATE, document_type, filename)
WHERE start_date IS NOT NULL
  AND filename != generate_standard_filename(start_date::DATE, document_type, filename);

-- Show summary of changes
SELECT 
    COUNT(*) AS total_updated,
    MIN(start_date) AS earliest_document,
    MAX(start_date) AS latest_document
FROM financial_documents
WHERE start_date IS NOT NULL;

-- Clean up the helper function (optional - keep it if you want to use it later)
-- DROP FUNCTION IF EXISTS generate_standard_filename(DATE, TEXT, TEXT);

-- Example output after migration:
-- All filenames will follow this format:
-- 2025_06_june_pnl.csv
-- 2025_03_march_balance_sheet.pdf
-- 2024_12_december_cash_flow.xlsx
