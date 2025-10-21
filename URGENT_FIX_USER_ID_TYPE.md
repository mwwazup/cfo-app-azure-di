# 🚨 URGENT: Fix user_id Column Type for Clerk

## **The Problem:**
The database tables were created with `user_id UUID` type, but Clerk user IDs are **TEXT strings** like `"user_33fQP5vCktD5cLZwkg7fbysz2JS"`.

**Error:**
```
invalid input syntax for type uuid: "user_33fQP5vCktD5cLZwkg7fbysz2JS"
```

## **The Fix:**
Run this SQL in Supabase SQL Editor to change `user_id` from UUID to TEXT:

---

## **🔧 SQL Migration Script:**

```sql
-- Fix user_id column type to support Clerk user IDs
-- Clerk user IDs are strings like "user_33fQP5vCktD5cLZwkg7fbysz2JS", not UUIDs

-- 1. Change user_id column type from UUID to TEXT

-- employee_info table
ALTER TABLE employee_info 
ALTER COLUMN user_id TYPE TEXT;

-- cogs_settings table
ALTER TABLE cogs_settings 
ALTER COLUMN user_id TYPE TEXT;

-- company_settings table
ALTER TABLE company_settings 
ALTER COLUMN user_id TYPE TEXT;

-- 2. Verify the changes
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('employee_info', 'cogs_settings', 'company_settings')
    AND column_name = 'user_id'
ORDER BY table_name;

-- Expected output:
-- employee_info    | user_id | text
-- cogs_settings    | user_id | text
-- company_settings | user_id | text
```

---

## **Steps to Fix:**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the SQL above**
4. **Click "Run"**
5. **Verify the output shows "text" for all three tables**
6. **Refresh your app and try again**

---

## **Why This Happened:**

The original table creation scripts used:
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
```

But your app uses **Clerk**, not Supabase Auth, so:
- ❌ `auth.users` table doesn't exist
- ❌ Clerk user IDs are TEXT, not UUID
- ✅ Need to use TEXT type instead

---

## **After Running the Fix:**

✅ **employee_info.user_id** → TEXT  
✅ **cogs_settings.user_id** → TEXT  
✅ **company_settings.user_id** → TEXT  

Then the app will work correctly with Clerk authentication!

---

## **Alternative: Drop and Recreate Tables**

If the ALTER TABLE doesn't work (e.g., if there's existing data with wrong type), you can drop and recreate:

```sql
-- WARNING: This will delete all data in these tables!

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS cogs_settings CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;

-- Recreate with TEXT user_id
CREATE TABLE cogs_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Changed from UUID to TEXT
  service_name TEXT NOT NULL,
  cost_per_service DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service_name)
);

CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Changed from UUID to TEXT
  overhead_percent DECIMAL(5,2) DEFAULT 32,
  bonus_threshold_min DECIMAL(5,2) DEFAULT 25,
  bonus_threshold_max DECIMAL(5,2) DEFAULT 100,
  overtime_hours_daily DECIMAL(5,2) DEFAULT 12,
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE cogs_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (these work with Clerk user IDs as TEXT)
CREATE POLICY "Users can view their own COGS settings"
  ON cogs_settings FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own COGS settings"
  ON cogs_settings FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own COGS settings"
  ON cogs_settings FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can view their own company settings"
  ON company_settings FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own company settings"
  ON company_settings FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own company settings"
  ON company_settings FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
```

---

## **Files Created:**
- `fix_user_id_column_type.sql` - Quick ALTER TABLE script
- `URGENT_FIX_USER_ID_TYPE.md` - This documentation

**Run the SQL fix and the app should work!** 🚀
