# Employee LER Database Setup Guide

## Current Status

✅ **Already Exists:**
- `employee_info` - Employee information (name, position, base rate)
- `pay_periods` - Pay period tracking
- `employee_daily_records` - Daily performance records

❌ **Missing (Need to Create):**
- `cogs_settings` - User-configurable COGS per service
- `company_settings` - Company-wide settings (overhead, bonuses, overtime)

---

## Step 1: Check Existing Tables

Run the queries in `check_employee_tables.sql` in your Supabase SQL Editor to see:
1. What columns exist in the current tables
2. If any data is already stored
3. If `cogs_settings` and `company_settings` exist

---

## Step 2: Add Missing Tables

Run `add_missing_employee_tables.sql` in Supabase SQL Editor to:
1. Create `cogs_settings` table
2. Create `company_settings` table
3. Set up Row Level Security (RLS) policies
4. Add indexes for performance
5. Add auto-update triggers

**This script is safe to run multiple times** - it uses `CREATE TABLE IF NOT EXISTS` and `CREATE POLICY IF NOT EXISTS` patterns.

---

## Step 3: Verify Tables

After running the script, verify in Supabase:
1. Go to **Table Editor**
2. Check that you see:
   - `employee_info`
   - `pay_periods`
   - `employee_daily_records`
   - `cogs_settings` ✨ NEW
   - `company_settings` ✨ NEW

---

## Step 4: Seed Default Data (Optional)

If you want to pre-populate settings for existing users, uncomment the INSERT statements at the bottom of `add_missing_employee_tables.sql`:

```sql
-- Default COGS values
INSERT INTO cogs_settings (user_id, service_name, cost_per_service)
SELECT 
  id as user_id,
  service_name,
  cost_per_service
FROM auth.users
CROSS JOIN (
  VALUES 
    ('grill', 19.20),
    ('oven', 16.20),
    ('range', 15.00),
    ('ventHood', 20.00)
) AS defaults(service_name, cost_per_service)
ON CONFLICT (user_id, service_name) DO NOTHING;

-- Default company settings
INSERT INTO company_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

---

## Database Schema Overview

### `cogs_settings`
Stores per-service COGS values for each user.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| service_name | TEXT | Service type (e.g., 'grill', 'oven') |
| cost_per_service | DECIMAL(10,2) | Cost in dollars |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | Last updated |

**Unique Constraint:** `(user_id, service_name)` - Each user can only have one COGS value per service

### `company_settings`
Stores company-wide settings for each user.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | UUID | - | Primary key |
| user_id | UUID | - | References auth.users |
| overhead_percent | DECIMAL(5,2) | 32 | Overhead allocation % |
| bonus_threshold_min | DECIMAL(5,2) | 25 | Min profit % for bonus |
| bonus_threshold_max | DECIMAL(5,2) | 100 | Max profit % for bonus |
| overtime_hours_daily | DECIMAL(5,2) | 12 | OT after X hours/day |
| overtime_multiplier | DECIMAL(3,2) | 1.5 | OT pay multiplier |
| created_at | TIMESTAMP | NOW() | When created |
| updated_at | TIMESTAMP | NOW() | Last updated |

**Unique Constraint:** `user_id` - Each user can only have one company settings record

---

## Next Steps: Frontend Integration

Once tables are created, we need to:

1. **Create Supabase service functions** to:
   - Fetch COGS settings
   - Save COGS settings
   - Fetch company settings
   - Save company settings
   - CRUD operations for employee records

2. **Update the dialogs** to:
   - Load settings from Supabase on mount
   - Save settings to Supabase on submit
   - Show loading states

3. **Wire up employee data** to:
   - Load from Supabase instead of mock data
   - Save new records to database
   - Update/delete records in database

**Would you like me to implement the Supabase integration next?**

---

## Troubleshooting

### Error: "relation already exists"
✅ This is expected! The tables were created in a previous migration. Just run `add_missing_employee_tables.sql` to add the missing tables.

### Error: "permission denied"
❌ Check that RLS policies are set up correctly. The script includes all necessary policies.

### Settings not saving
❌ Check browser console for errors. Verify that:
1. User is authenticated
2. RLS policies allow the operation
3. Network tab shows successful API calls
