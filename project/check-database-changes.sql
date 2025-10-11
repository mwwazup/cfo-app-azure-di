-- Check the analysis_result column in financial_documents table
-- This is where your changes are being saved

SELECT 
  id,
  document_type,
  status,
  created_at,
  analysis_result->>'start_date' as start_date,
  analysis_result->>'end_date' as end_date,
  analysis_result->'summary_metrics'->>'totalRevenue' as total_revenue,
  analysis_result->'summary_metrics'->>'revenue' as revenue,
  analysis_result->'summary_metrics'->>'netProfit' as net_profit,
  analysis_result->'raw_json'->>'revenue' as raw_revenue,
  analysis_result -- Full JSON structure
FROM financial_documents 
WHERE user_id = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f'  -- Your Supabase UUID
ORDER BY created_at DESC;

-- This query will show you:
-- 1. The flattened data from analysis_result
-- 2. The full JSON structure in analysis_result column
-- 3. How the data is stored and updated
