# Row Level Security (RLS) - Why It's Disabled

## Current Status: RLS Disabled ⚠️

The `services` and `service_activities` tables currently have **RLS disabled** for a specific technical reason.

## Why RLS is Disabled

### The Problem
Your app uses **Clerk for authentication**, not Supabase Auth. This creates a fundamental incompatibility:

1. **Supabase RLS** relies on `auth.uid()` function
2. `auth.uid()` returns the Supabase Auth user ID (UUID)
3. **Clerk** provides user IDs like `"user_33fQP5vCktD5cLZwkg7fbysz2JS"` (TEXT)
4. These two systems don't communicate with each other

### The Technical Issue
```sql
-- This doesn't work with Clerk:
CREATE POLICY "Users can view their own services"
    ON services FOR SELECT
    USING (auth.uid() = user_id);
-- ❌ auth.uid() returns NULL because there's no Supabase Auth session
-- ❌ Even if it worked, it returns UUID but user_id is TEXT
```

## Current Security Model

### Application-Level Security ✅
Security is enforced in your React application:

```typescript
// In useServices.ts
const { dbUserId } = useAuthContext(); // Gets Clerk user ID

// All queries filter by user ID
const { data } = await supabase
  .from('services')
  .select('*')
  .eq('user_id', dbUserId); // Only fetch user's own data
```

### How It Works
1. User logs in with Clerk
2. `useAuthContext()` provides the Clerk user ID
3. All database queries include `.eq('user_id', dbUserId)`
4. Users can only see/modify their own data

### Is This Secure?
**Yes, but with caveats:**

✅ **Secure for normal users**: They can only access their own data through the app
⚠️ **Not secure if someone has direct database access**: Anyone with Supabase credentials could query all data
⚠️ **Not secure if API keys are exposed**: Direct Supabase API calls could bypass filters

## Better Solution: Implement Custom RLS

### Option 1: Custom RLS Function (Recommended)

Create a function that validates Clerk tokens:

```sql
-- Create a function to get Clerk user ID from JWT
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT AS $$
DECLARE
  clerk_user_id TEXT;
BEGIN
  -- Extract Clerk user ID from JWT claims
  clerk_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
  RETURN clerk_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_activities ENABLE ROW LEVEL SECURITY;

-- Create policies using the custom function
CREATE POLICY "Users can view their own services"
    ON services FOR SELECT
    USING (user_id = get_clerk_user_id());

CREATE POLICY "Users can create their own services"
    ON services FOR INSERT
    WITH CHECK (user_id = get_clerk_user_id());

-- Repeat for all CRUD operations on both tables
```

### Option 2: Use Supabase Service Role Key

Keep RLS disabled but:
- Use service role key only on backend
- Never expose it to frontend
- All queries go through your backend API
- Backend validates Clerk tokens before querying

### Option 3: Migrate to Supabase Auth

Replace Clerk with Supabase Auth:
- More integrated with Supabase
- RLS works out of the box
- But requires migration effort

## Recommendation

For your current setup, I recommend **Option 1** (Custom RLS Function):

1. ✅ Maintains Clerk authentication
2. ✅ Adds database-level security
3. ✅ Prevents direct database access issues
4. ✅ Minimal code changes needed

## Implementation Steps

If you want to implement proper RLS:

1. **Configure Supabase to pass Clerk JWT**:
   - Update Supabase client to include Clerk token in headers
   - Configure JWT secret in Supabase

2. **Create custom RLS function**:
   - Run the SQL above to create `get_clerk_user_id()`

3. **Enable RLS and create policies**:
   - Enable RLS on both tables
   - Create policies for SELECT, INSERT, UPDATE, DELETE

4. **Test thoroughly**:
   - Verify users can only see their own data
   - Test with multiple users
   - Try direct database queries to confirm RLS works

## Current Risk Assessment

**Risk Level: Medium** 🟡

- ✅ Normal users cannot access other users' data through the app
- ⚠️ Direct database access could bypass security
- ⚠️ Exposed API keys could be exploited

**Mitigation**:
- Keep Supabase API keys secure
- Monitor database access logs
- Consider implementing Option 1 for production

## Summary

RLS is disabled because Clerk and Supabase Auth don't integrate automatically. Your app uses application-level security (filtering by `dbUserId`), which works but isn't as robust as database-level RLS. For production, consider implementing custom RLS with Clerk JWT validation.
