# 🔧 Complete Migration Guide: UUID to TEXT for Clerk

## **The Issue:**
RLS policies prevent changing the column type directly. We need to:
1. Drop all RLS policies
2. Change column types
3. Recreate RLS policies

---

## **✅ SOLUTION: Run This Complete Migration Script**

### **File:** `fix_user_id_with_policies.sql`

This script does everything in the correct order:
1. ✅ Drops all RLS policies on all 5 tables
2. ✅ Changes `user_id` from UUID to TEXT
3. ✅ Recreates all RLS policies (compatible with TEXT)
4. ✅ Verifies the changes

---

## **📋 Steps:**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Open the file:** `fix_user_id_with_policies.sql`
4. **Copy ALL the SQL** (entire file)
5. **Paste into SQL Editor**
6. **Click "Run"**
7. **Check the output** - should see success message

---

## **What Gets Changed:**

### **Tables Modified:**
- ✅ `employee_info.user_id` → TEXT
- ✅ `cogs_settings.user_id` → TEXT
- ✅ `company_settings.user_id` → TEXT

### **Policies Recreated:**
- ✅ `employee_info` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `pay_periods` - 4 policies (via employee_info join)
- ✅ `employee_daily_records` - 4 policies (via pay_periods join)
- ✅ `cogs_settings` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `company_settings` - 4 policies (SELECT, INSERT, UPDATE, DELETE)

**Total: 20 policies recreated**

---

## **Expected Output:**

At the end of the script, you should see:

```
table_name       | column_name | data_type
-----------------+-------------+----------
company_settings | user_id     | text
cogs_settings    | user_id     | text
employee_info    | user_id     | text

status
-------------------------------------------------------
Migration completed successfully! user_id columns are now TEXT type.
```

---

## **After Running:**

1. **Refresh your app**
2. **EmployeeSetupDialog should appear**
3. **Fill in employee info**
4. **Click "Create Employee Profile"**
5. **Should save successfully!** ✅

---

## **Why This Works:**

The RLS policies use:
```sql
current_setting('request.jwt.claims', true)::json->>'sub'
```

This extracts the Clerk user ID from the JWT token, which is already a TEXT string. So the policies work perfectly with TEXT columns!

---

## **Troubleshooting:**

### **If you get "policy already exists":**
The script uses `IF EXISTS` so it should be safe to run multiple times.

### **If you get other errors:**
1. Check that you're running the ENTIRE script
2. Make sure you have admin access to the database
3. Check that all 5 tables exist

### **If it succeeds but app still errors:**
1. Hard refresh your browser (Ctrl+Shift+R)
2. Check browser console for new errors
3. Verify the column types changed (run the SELECT query at the end)

---

## **Files Created:**
- ✅ `fix_user_id_with_policies.sql` - Complete migration script
- ✅ `COMPLETE_MIGRATION_GUIDE.md` - This guide

**Run the complete SQL script and your app will work with Clerk!** 🚀
