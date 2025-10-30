-- Run this in Supabase SQL Editor to check for existing data

-- 1. Check if financial_documents table exists and has data
SELECT 
    COUNT(*) as total_documents,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN document_type = 'pnl' THEN 1 END) as pnl_documents
FROM financial_documents;

-- 2. Show all documents (if any)
SELECT 
    id,
    user_id,
    filename,
    document_type,
    start_date,
    end_date,
    status,
    uploaded_at
FROM financial_documents
ORDER BY uploaded_at DESC
LIMIT 10;

-- 3. Check for your specific user
SELECT 
    id,
    user_id,
    filename,
    document_type,
    start_date,
    end_date
FROM financial_documents
WHERE user_id = 'user_33fQP5vCktD5cLZwkg7fbysz2JS'
ORDER BY uploaded_at DESC;
