-- Fix the revenue_kpis table including RLS policies
-- RLS policies depend on user_id column, so we need to drop them first

DO $$
BEGIN
    RAISE NOTICE '=== FIXING revenue_kpis TABLE WITH RLS ===';
    
    -- Check if revenue_kpis table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_kpis') THEN
        RAISE NOTICE '✅ revenue_kpis table exists';
        
        -- Check if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue_kpis' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ user_id column exists in revenue_kpis';
            
            -- Check if it's UUID type and fix it
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue_kpis' AND column_name = 'user_id' AND data_type = 'uuid') THEN
                RAISE NOTICE '🔄 Fixing revenue_kpis.user_id from UUID to TEXT';
                
                -- Drop ALL RLS policies first (they depend on user_id)
                DROP POLICY IF EXISTS select_own_revenue_kpis ON revenue_kpis;
                DROP POLICY IF EXISTS insert_own_revenue_kpis ON revenue_kpis;
                DROP POLICY IF EXISTS update_own_revenue_kpis ON revenue_kpis;
                DROP POLICY IF EXISTS delete_own_revenue_kpis ON revenue_kpis;
                RAISE NOTICE '✅ Dropped RLS policies';
                
                -- Drop ALL foreign key constraints on user_id
                ALTER TABLE revenue_kpis DROP CONSTRAINT IF EXISTS revenue_kpis_user_id_fkey;
                ALTER TABLE revenue_kpis DROP CONSTRAINT IF EXISTS revenue_kpis_user_id_profiles_id_fk;
                RAISE NOTICE '✅ Dropped foreign key constraints';
                
                -- Drop the unique constraint (will need to recreate it)
                ALTER TABLE revenue_kpis DROP CONSTRAINT IF EXISTS revenue_kpis_user_id_year_month_key;
                RAISE NOTICE '✅ Dropped unique constraint';
                
                -- Now change column type from UUID to TEXT
                ALTER TABLE revenue_kpis ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
                RAISE NOTICE '✅ Changed user_id to TEXT';
                
                -- Recreate the unique constraint with TEXT user_id
                ALTER TABLE revenue_kpis ADD CONSTRAINT revenue_kpis_user_id_year_month_key 
                    UNIQUE (user_id, year, month);
                RAISE NOTICE '✅ Recreated unique constraint';
                
                -- Recreate RLS policies for Clerk compatibility
                CREATE POLICY select_own_revenue_kpis ON revenue_kpis
                    FOR SELECT USING (user_id = auth.jwt()->>'sub');
                    
                CREATE POLICY insert_own_revenue_kpis ON revenue_kpis
                    FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');
                    
                CREATE POLICY update_own_revenue_kpis ON revenue_kpis
                    FOR UPDATE USING (user_id = auth.jwt()->>'sub');
                    
                CREATE POLICY delete_own_revenue_kpis ON revenue_kpis
                    FOR DELETE USING (user_id = auth.jwt()->>'sub');
                
                RAISE NOTICE '✅ Recreated RLS policies for Clerk';
            ELSE
                RAISE NOTICE 'ℹ️ revenue_kpis.user_id is already TEXT or not UUID';
            END IF;
        ELSE
            RAISE NOTICE '❌ user_id column does not exist in revenue_kpis - adding it';
            ALTER TABLE revenue_kpis ADD COLUMN IF NOT EXISTS user_id TEXT;
            RAISE NOTICE '✅ Added user_id column to revenue_kpis';
        END IF;
    ELSE
        RAISE NOTICE '❌ revenue_kpis table does not exist - creating it';
        CREATE TABLE IF NOT EXISTS revenue_kpis (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            revenue_kpi_name TEXT,
            revenue_kpi_value DECIMAL(12,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (user_id, year, month)
        );
        
        -- Enable RLS and create policies for Clerk
        ALTER TABLE revenue_kpis ENABLE ROW LEVEL SECURITY;
        CREATE POLICY select_own_revenue_kpis ON revenue_kpis
            FOR SELECT USING (user_id = auth.jwt()->>'sub');
        CREATE POLICY insert_own_revenue_kpis ON revenue_kpis
            FOR INSERT WITH CHECK (user_id = auth.jwt()->>'sub');
        CREATE POLICY update_own_revenue_kpis ON revenue_kpis
            FOR UPDATE USING (user_id = auth.jwt()->>'sub');
        CREATE POLICY delete_own_revenue_kpis ON revenue_kpis
            FOR DELETE USING (user_id = auth.jwt()->>'sub');
        
        RAISE NOTICE '✅ Created revenue_kpis table with TEXT user_id and RLS';
    END IF;
    
    RAISE NOTICE '=== revenue_kpis WITH RLS FIX COMPLETE ===';
END $$;

-- Show the final results
SELECT 
    table_name,
    column_name,
    data_type,
    'Final schema state for revenue_kpis' as status
FROM information_schema.columns 
WHERE table_name = 'revenue_kpis' 
AND column_name = 'user_id';
