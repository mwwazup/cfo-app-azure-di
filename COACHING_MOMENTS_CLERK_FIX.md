# Coaching Moments - Clerk Authentication Fix

## Problem Identified: November 10, 2025

### Error Message:
```
Error fetching coaching moments: {
  code: '22P02',
  message: 'invalid input syntax for type uuid: "user_33fQP5vCktD5cLZwkg7fbysz2JS"'
}
```

### Root Cause:
The `coaching_moments` table was created with `user_id UUID` type, but the application uses **Clerk authentication** which provides user IDs as TEXT strings (e.g., `"user_33fQP5vCktD5cLZwkg7fbysz2JS"`).

### Database Schema Issue:
```sql
-- OLD (Broken with Clerk):
CREATE TABLE coaching_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,  -- ❌ UUID type
  ...
);
```

**Problems:**
1. `user_id` is UUID type, but Clerk IDs are TEXT
2. Foreign key references `auth.users(id)` which doesn't exist with Clerk
3. RLS policies assume Supabase Auth, not Clerk

## Solution: Migration 22

### File: `backend/migrations/22_fix_coaching_moments_user_id_for_clerk.sql`

**Changes Made:**
1. **Drop foreign key constraint** to `auth.users` (doesn't exist with Clerk)
2. **Change `user_id` type** from UUID to TEXT
3. **Update RLS policies** to use Clerk JWT claims

### Migration Steps:
```sql
-- 1. Remove foreign key to auth.users
ALTER TABLE coaching_moments
DROP CONSTRAINT IF EXISTS coaching_moments_user_id_fkey;

-- 2. Change user_id from UUID to TEXT
ALTER TABLE coaching_moments
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 3. Update RLS policies for Clerk
CREATE POLICY "Users can view own coaching moments"
  ON coaching_moments FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
```

## How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `backend/migrations/22_fix_coaching_moments_user_id_for_clerk.sql`
3. Paste and run the migration
4. Verify no errors

### Option 2: Command Line
```bash
# If using Supabase CLI
supabase db push

# Or run migration directly
psql $DATABASE_URL -f backend/migrations/22_fix_coaching_moments_user_id_for_clerk.sql
```

## Verification Steps

### 1. Check Schema
```sql
-- Verify user_id is now TEXT
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'coaching_moments' AND column_name = 'user_id';

-- Expected result: data_type = 'text'
```

### 2. Check RLS Policies
```sql
-- List all policies on coaching_moments
SELECT * FROM pg_policies WHERE tablename = 'coaching_moments';

-- Should see 4 policies: SELECT, INSERT, UPDATE, DELETE
```

### 3. Test in Application
1. Refresh the app
2. Navigate to SMS Coach page
3. Check browser console - should see no UUID errors
4. Verify coaching moments load correctly

## Related Files

### Frontend:
- `project/src/services/coachingService.ts` - Service layer (already fixed)
- `project/src/pages/sms-coach.tsx` - SMS Coach page
- `project/src/hooks/useCoachingHistory.ts` - Coaching history hook

### Backend:
- `backend/migrations/22_fix_coaching_moments_user_id_for_clerk.sql` - Migration script

### Models:
- `project/src/models/CoachingMoment.ts` - TypeScript interface

## Consistency with Other Tables

This fix aligns `coaching_moments` with other Clerk-compatible tables:

**Already Using TEXT for user_id:**
- `employee_info`
- `pay_periods`
- `employee_daily_records`
- `company_settings`
- `cogs_settings`
- `service_labor_records`

**Pattern:**
```sql
CREATE TABLE example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ✅ TEXT for Clerk IDs
  ...
);
```

## RLS Policy Pattern for Clerk

**Standard Clerk RLS Policy:**
```sql
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
```

**How it Works:**
1. Clerk JWT token contains `sub` claim with user ID
2. `current_setting('request.jwt.claims', true)::json->>'sub'` extracts Clerk user ID
3. Compares with `user_id` column to ensure users only see their own data

## Testing Checklist

After running migration:

- [ ] Migration runs without errors
- [ ] `user_id` column is TEXT type
- [ ] Foreign key to `auth.users` is removed
- [ ] 4 RLS policies exist (SELECT, INSERT, UPDATE, DELETE)
- [ ] RLS is enabled on table
- [ ] App loads without UUID errors
- [ ] Coaching moments can be fetched
- [ ] New coaching moments can be created
- [ ] Users can only see their own coaching moments

## Rollback (If Needed)

**⚠️ WARNING:** Only rollback if absolutely necessary and no data has been created.

```sql
-- Rollback to UUID (will lose Clerk user ID data)
ALTER TABLE coaching_moments
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- Re-add foreign key (only if using Supabase Auth)
ALTER TABLE coaching_moments
ADD CONSTRAINT coaching_moments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

## Impact Assessment

**Breaking Changes:** None (table was not working with Clerk before)

**Data Migration:** 
- Existing UUID user IDs will be converted to TEXT
- If table is empty, no data migration needed

**User Impact:**
- Fixes broken coaching moments feature
- Enables SMS Coach functionality
- No user-facing changes

## Next Steps

1. **Run migration** in Supabase Dashboard
2. **Test** coaching moments functionality
3. **Verify** RLS policies work correctly
4. **Monitor** for any errors in production
5. **Document** in project knowledge base

## Related Issues

- Similar fixes applied to employee tables (Migrations 16, 17)
- Part of broader Clerk authentication migration
- Aligns with project-wide Clerk integration

## Status

- **Created:** November 10, 2025
- **Status:** Ready to apply
- **Priority:** High (blocks SMS Coach feature)
- **Tested:** No (awaiting migration run)

---

**Remember:** Always backup database before running migrations!
```bash
python backend/backup_database.py
```
