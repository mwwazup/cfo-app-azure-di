# Database Migration Order

Run these SQL files in Supabase SQL Editor in this exact order:

## Step 1: Drop Existing Policies (if re-running)
```sql
-- File: DROP_EXISTING_POLICIES.sql
-- This clears any existing policies that might conflict
```
Run: `DROP_EXISTING_POLICIES.sql`

## Step 2: Core Tables
```sql
-- File: backend/migrations/02_create_financial_tables.sql
-- Creates financial_statements and financial_categories tables
```
Run: `backend/migrations/02_create_financial_tables.sql`

## Step 3: Financial Documents (MOST IMPORTANT)
```sql
-- File: backend/migrations/07_fix_financial_documents_for_clerk.sql
-- Creates financial_documents table with TEXT user_id for Clerk
```
Run: `backend/migrations/07_fix_financial_documents_for_clerk.sql`

## Step 4: RLS Policies
```sql
-- File: backend/migrations/08_fix_financial_documents_rls.sql
-- Fixes Row Level Security policies for Clerk authentication
```
Run: `backend/migrations/08_fix_financial_documents_rls.sql`

## Step 5: Additional Tables (Optional)
If you need these features:
- `03_create_document_metrics_tables.sql` - For document metrics
- `03_create_service_mix_tables.sql` - For service mix tracking
- `05_create_video_tutorials.sql` - For video tutorials

## Verification

After running migrations, verify in Supabase:

1. **Tables exist:**
   - `financial_statements`
   - `financial_categories`
   - `financial_documents` ← Most important for your app

2. **Check financial_documents structure:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'financial_documents';
   ```
   
   Should show `user_id` as `text` (not `uuid`)

3. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'financial_documents';
   ```
   
   Should show `rowsecurity = true`

## After Migrations

1. ✅ Refresh your browser
2. ✅ Documents should load
3. ✅ Filter should work (already fixed in code)
4. ✅ Upload should work
5. ✅ Manual P&L entry should work

## Troubleshooting

**If you get "policy already exists" error:**
- Run `DROP_EXISTING_POLICIES.sql` first
- Then re-run the migration

**If you get "table already exists" error:**
- The migration uses `CREATE TABLE IF NOT EXISTS` so this shouldn't happen
- If it does, the table is already there - skip to next migration

**If you get "relation does not exist" error:**
- You're missing a prerequisite table
- Go back and run earlier migrations in order
