# Employee LER Numeric Overflow Fix

## Problem

When updating hours for a technician in the Employee LER system, the following error occurred:

```
Error updating daily record: 
code: "22003"
details: "A field with precision 5, scale 2 must round to an absolute value less than 10^3."
hint: null
message: "numeric field overflow"
```

## Root Cause

The `bonus_qualified_for_percent` field in the `employee_daily_records` table is defined as `DECIMAL(5,2)`, which can only store values up to **999.99**.

However, the code is storing the **bonus dollar amount** (not a percentage) in this field. When a technician earns a bonus greater than $999.99, the database rejects the value.

### Field Naming Issue

The field is **misnamed** in the database schema:
- **Field name:** `bonus_qualified_for_percent` (suggests it's a percentage)
- **Actual data:** Dollar amount of the bonus earned (e.g., $1,234.56)

### Code Location

In `EmployeeLERPage.tsx` line 695:
```typescript
bonus_qualified_for_percent: bonusQualified,  // bonusQualified is a dollar amount, not %
```

Where `bonusQualified` is calculated as:
```typescript
bonusQualified = grossProfit * 0.10;  // 10% of gross profit in dollars
```

## Solution

Run the SQL migration to change the field precision from `DECIMAL(5,2)` to `DECIMAL(15,2)`:

```sql
ALTER TABLE employee_daily_records 
  ALTER COLUMN bonus_qualified_for_percent TYPE DECIMAL(15,2);
```

This allows the field to store values up to **$9,999,999,999,999.99** instead of just **$999.99**.

## How to Apply

1. Open Supabase SQL Editor
2. Run the migration file: `fix_employee_daily_records_precision.sql`
3. Verify the change was applied successfully
4. Retry updating the technician's hours

## Expected Result

After applying this fix, you should be able to update hours for technicians who earn bonuses greater than $999.99 without encountering the numeric overflow error.

## Future Consideration

Consider renaming the field to better reflect its purpose:
- **Current:** `bonus_qualified_for_percent`
- **Suggested:** `bonus_amount` or `bonus_qualified_amount`

This would require updating both the database schema and the TypeScript code, so it's a larger change that can be done separately.

## Files Affected

- **Database:** `employee_daily_records` table
- **Migration:** `fix_employee_daily_records_precision.sql`
- **Code:** `EmployeeLERPage.tsx` (line 695)
