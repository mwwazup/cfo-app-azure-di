# Diagnose User ID Issue - Employee LER Data Not Loading

## **Current Setup:**

### **Authentication Flow:**
```typescript
// auth-context.tsx line 38
dbUserId: clerkUserId  // Uses Clerk user ID directly
```

**This means:**
- `dbUserId` = Clerk user ID (e.g., "user_2abc123xyz")
- Employee LER queries use this to find records

---

## **Diagnostic Steps:**

### **Step 1: Check Your Clerk User ID**

**In the browser console (F12), run:**
```javascript
// Get current user info
const user = window.Clerk?.user;
console.log("Clerk User ID:", user?.id);
console.log("Email:", user?.primaryEmailAddress?.emailAddress);
```

**Expected Output:**
```
Clerk User ID: user_2abc123xyz
Email: your@email.com
```

**Copy this user ID - you'll need it for Step 2!**

---

### **Step 2: Check Database Records**

**Run these queries in Supabase SQL Editor:**

#### **A. Check employee_info table:**
```sql
-- Replace 'YOUR_CLERK_USER_ID' with the ID from Step 1
SELECT * FROM employee_info 
WHERE user_id = 'YOUR_CLERK_USER_ID';
```

**Expected:** Should return 1 row with your employee data

**If NO rows:**
- ❌ **Problem:** No employee record for this user_id
- ✅ **Solution:** Create employee through the app's "Employee Setup" dialog

**If 1+ rows:**
- ✅ Employee exists
- Note the `id` column value (e.g., "emp-abc-123")

---

#### **B. Check pay_periods table:**
```sql
-- Replace 'YOUR_EMPLOYEE_ID' with the id from query A
SELECT * FROM pay_periods 
WHERE employee_id = 'YOUR_EMPLOYEE_ID'
ORDER BY start_date DESC;
```

**Expected:** Should return your pay periods

**If NO rows:**
- ❌ **Problem:** No pay periods for this employee
- ✅ **Solution:** Create pay period through "Add Pay Period" button

**If 1+ rows:**
- ✅ Pay periods exist
- Note the `id` column values

---

#### **C. Check employee_daily_records table:**
```sql
-- Replace 'YOUR_PAY_PERIOD_ID' with a period id from query B
SELECT * FROM employee_daily_records 
WHERE pay_period_id = 'YOUR_PAY_PERIOD_ID'
ORDER BY date DESC;
```

**Expected:** Should return your daily records

**If NO rows:**
- ❌ **Problem:** No daily records for this pay period
- ✅ **Solution:** Add records through "Add Day" button

**If 1+ rows:**
- ✅ Daily records exist
- This is your data!

---

### **Step 3: Check for User ID Mismatch**

#### **Find ALL employee records:**
```sql
SELECT user_id, name, position 
FROM employee_info;
```

**Look for:**
1. Your name/data with a DIFFERENT user_id
2. Multiple records with different user_ids

**Common Issues:**

**Issue 1: Old UUID user_id**
```sql
-- If you see records with UUID format (not Clerk format)
user_id: "123e4567-e89b-12d3-a456-426614174000"  ← OLD (UUID)
user_id: "user_2abc123xyz"                       ← NEW (Clerk)
```

**Solution:** Update old records to use Clerk user ID:
```sql
UPDATE employee_info 
SET user_id = 'YOUR_CLERK_USER_ID' 
WHERE user_id = 'OLD_UUID_HERE';
```

---

**Issue 2: Different Clerk account**
```sql
-- If you see your data under a different Clerk user ID
user_id: "user_OLD123"  ← Old Clerk account
user_id: "user_NEW456"  ← Current Clerk account (logged in now)
```

**Solution:** Update to current Clerk user ID:
```sql
UPDATE employee_info 
SET user_id = 'YOUR_CURRENT_CLERK_USER_ID' 
WHERE user_id = 'OLD_CLERK_USER_ID';
```

---

### **Step 4: Verify RLS Policies**

**Check if RLS is blocking access:**
```sql
-- Check RLS policies on employee_info
SELECT * FROM pg_policies 
WHERE tablename = 'employee_info';
```

**Expected:** Should see policies like:
- `select_own_employee_info`
- `insert_own_employee_info`
- `update_own_employee_info`

**These policies use:** `public.get_clerk_user_id()`

**Test the helper function:**
```sql
-- This should return your Clerk user ID
SELECT public.get_clerk_user_id();
```

**Expected:** Returns your Clerk user ID (e.g., "user_2abc123xyz")

**If returns NULL:**
- ❌ **Problem:** Not authenticated or RLS helper broken
- ✅ **Solution:** Check if you're logged in, or RLS policies need update

---

## **Most Common Scenarios:**

### **Scenario 1: Fresh Start (No Data)**
```
employee_info: 0 rows
pay_periods: 0 rows
employee_daily_records: 0 rows
```

**Expected Behavior:**
- App shows "Employee Setup" dialog
- Create employee → Create pay period → Add daily records

**If NOT showing setup dialog:**
- Check console for errors
- Verify `dbUserId` is not null

---

### **Scenario 2: User ID Mismatch**
```
employee_info: 1 row with user_id = "user_OLD123"
Current Clerk ID: "user_NEW456"
```

**Problem:** Data exists but under different user_id

**Solution:**
```sql
-- Update all tables to use new user_id
UPDATE employee_info SET user_id = 'user_NEW456' WHERE user_id = 'user_OLD123';
UPDATE cogs_settings SET user_id = 'user_NEW456' WHERE user_id = 'user_OLD123';
UPDATE company_settings SET user_id = 'user_NEW456' WHERE user_id = 'user_OLD123';
```

---

### **Scenario 3: Data Exists But Not Loading**
```
employee_info: ✅ Has your data
pay_periods: ✅ Has your periods
employee_daily_records: ✅ Has your records
App: Shows empty or wrong data
```

**Possible Causes:**
1. **RLS blocking access** - Check RLS policies
2. **Wrong employee selected** - Check selectedPeriodIndex
3. **Cache issue** - Hard refresh (Ctrl+Shift+R)
4. **Console errors** - Check browser console for errors

---

## **Quick Diagnostic Script:**

**Run this in browser console:**
```javascript
// Get current auth state
const user = window.Clerk?.user;
console.log("=== AUTH STATE ===");
console.log("Clerk User ID:", user?.id);
console.log("Email:", user?.primaryEmailAddress?.emailAddress);
console.log("Signed In:", !!user);

// Check if dbUserId is set in React
console.log("\n=== REACT STATE ===");
console.log("Check React DevTools for dbUserId in EmployeeLERPage component");
```

---

## **SQL Diagnostic Query (All-in-One):**

```sql
-- Run this in Supabase SQL Editor
-- Replace 'YOUR_CLERK_USER_ID' with your actual Clerk user ID

WITH user_data AS (
  SELECT 'YOUR_CLERK_USER_ID' AS clerk_id
)
SELECT 
  'employee_info' AS table_name,
  COUNT(*) AS record_count,
  json_agg(json_build_object('id', id, 'name', name, 'user_id', user_id)) AS records
FROM employee_info, user_data
WHERE user_id = user_data.clerk_id

UNION ALL

SELECT 
  'pay_periods' AS table_name,
  COUNT(*) AS record_count,
  json_agg(json_build_object('id', id, 'period_name', period_name, 'employee_id', employee_id)) AS records
FROM pay_periods pp
JOIN employee_info ei ON pp.employee_id = ei.id
JOIN user_data ud ON ei.user_id = ud.clerk_id

UNION ALL

SELECT 
  'employee_daily_records' AS table_name,
  COUNT(*) AS record_count,
  json_agg(json_build_object('id', id, 'date', date, 'total_job_revenue', total_job_revenue)) AS records
FROM employee_daily_records edr
JOIN pay_periods pp ON edr.pay_period_id = pp.id
JOIN employee_info ei ON pp.employee_id = ei.id
JOIN user_data ud ON ei.user_id = ud.clerk_id;
```

**This will show:**
- How many records in each table
- Sample of the actual records
- All filtered by your Clerk user ID

---

## **Action Plan:**

1. ✅ Get your Clerk user ID from browser console
2. ✅ Run diagnostic SQL queries
3. ✅ Identify the issue (no data vs wrong user_id vs RLS)
4. ✅ Apply appropriate solution
5. ✅ Refresh app and verify data loads

**Let me know what you find and I'll help fix it!** 🎯
