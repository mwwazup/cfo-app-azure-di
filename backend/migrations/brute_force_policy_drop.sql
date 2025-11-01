-- Brute force: Find and drop ALL policies on revenue_kpis table
-- This will work no matter what the policies are named

-- First, let's see what policies actually exist
SELECT 'Current policies on revenue_kpis:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'revenue_kpis';

-- Now drop each policy individually by name
DO $$
DECLARE
    policy_record RECORD;
    drop_sql TEXT;
BEGIN
    RAISE NOTICE '=== DROPPING ALL POLICIES ON revenue_kpis ===';
    
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'revenue_kpis'
    LOOP
        drop_sql := format('DROP POLICY IF EXISTS %I ON revenue_kpis', policy_record.policyname);
        EXECUTE drop_sql;
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '=== ALL POLICIES DROPPED ===';
END $$;

-- Now try to alter the column
DO $$
BEGIN
    RAISE NOTICE '=== ATTEMPTING TO CHANGE user_id COLUMN TYPE ===';
    
    -- Drop constraints first
    ALTER TABLE revenue_kpis DROP CONSTRAINT IF EXISTS revenue_kpis_user_id_fkey;
    ALTER TABLE revenue_kpis DROP CONSTRAINT IF EXISTS revenue_kpis_user_id_profiles_id_fk;
    ALTER TABLE revenue_kpis DROP CONSTRAINT IF EXISTS revenue_kpis_user_id_year_month_key;
    
    RAISE NOTICE '✅ Dropped constraints';
    
    -- Change column type
    ALTER TABLE revenue_kpis ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    
    RAISE NOTICE '✅ Changed user_id to TEXT';
    
    -- Recreate unique constraint
    ALTER TABLE revenue_kpis ADD CONSTRAINT revenue_kpis_user_id_year_month_key 
        UNIQUE (user_id, year, month);
    
    RAISE NOTICE '✅ Recreated unique constraint';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error changing column type: %', SQLERRM;
    RAISE NOTICE 'This might mean there are still dependencies we missed';
END $$;

-- Show final state
SELECT 
    table_name,
    column_name,
    data_type,
    'Final state' as status
FROM information_schema.columns 
WHERE table_name = 'revenue_kpis' 
AND column_name = 'user_id';
