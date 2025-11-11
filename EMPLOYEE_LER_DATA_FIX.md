# Employee LER Data Discrepancy Fix

## Problem Identified

All employees were displaying identical data in the "Daily Performance Records" section on the Employee LER Tracking page. Each technician showed the same records instead of their unique data.

## Root Cause

The `employee_daily_records` table was missing an `employee_id` column to distinguish which employee each record belongs to. When the system was redesigned to use **company-wide pay periods** (Migration 14), the daily records table was never updated to include employee identification.

### Data Flow Issue:

```typescript
// BEFORE (BROKEN):
const periods = await employeeLERService.getPayPeriods(dbUserId);  // Company-wide periods
const records = await employeeLERService.getDailyRecords(period.id);  // ALL records for period
// Result: Every employee sees the same data
```

## Solution Implemented

### 1. Database Migration (23_add_employee_id_to_daily_records.sql)

Added `employee_id` column to `employee_daily_records` table:

```sql
ALTER TABLE employee_daily_records
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employee_info(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_daily_records_employee_id 
ON employee_daily_records(employee_id);
```

Updated RLS policies to filter by employee:

```sql
CREATE POLICY "Users can view own employee daily records"
  ON employee_daily_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employee_info 
      WHERE employee_info.id = employee_daily_records.employee_id 
      AND employee_info.user_id = (auth.jwt() ->> 'sub')
    )
  );
```

### 2. Service Layer Updates (employeeLERService.ts)

**Added `employee_id` to DailyRecord interface:**

```typescript
export interface DailyRecord {
  id?: string;
  pay_period_id?: string;
  employee_id?: string;  // NEW
  work_day: string;
  // ... rest of fields
}
```

**Updated `getDailyRecords` to filter by employee:**

```typescript
export async function getDailyRecords(payPeriodId: string, employeeId?: string): Promise<DailyRecord[]> {
  let query = supabase
    .from('employee_daily_records')
    .select('*')
    .eq('pay_period_id', payPeriodId);
  
  // Filter by employee if provided (for multi-employee support)
  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  
  const { data, error } = await query.order('date', { ascending: true });
  // ...
}
```

**Updated `createDailyRecord` to include employee_id:**

```typescript
export async function createDailyRecord(
  payPeriodId: string, 
  record: DailyRecord, 
  employeeId?: string  // NEW parameter
): Promise<DailyRecord | null> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .insert([{
      pay_period_id: payPeriodId,
      employee_id: employeeId || record.employee_id,  // Include employee_id
      // ... rest of fields
    }])
    .select()
    .single();
  // ...
}
```

**Updated `updateDailyRecord` to preserve employee_id:**

```typescript
export async function updateDailyRecord(recordId: string, record: DailyRecord): Promise<boolean> {
  const updateData: any = {
    // ... all fields
  };
  
  // Include employee_id if provided
  if (record.employee_id) {
    updateData.employee_id = record.employee_id;
  }
  
  const { error } = await supabase
    .from('employee_daily_records')
    .update(updateData)
    .eq('id', recordId);
  // ...
}
```

### 3. Page Component Updates (EmployeeLERPage.tsx)

**Updated data loading to filter by employee:**

```typescript
// Load daily records for each period (filtered by employee)
const periodsWithRecords = await Promise.all(
  periods.map(async (period) => {
    const records = await employeeLERService.getDailyRecords(period.id!, empInfo.id);  // Pass employee ID
    console.log(`📊 Period "${period.period_name}" for ${empInfo.name}:`, records.length, 'daily records');
    // ...
  })
);
```

**Updated CSV import to include employee_id:**

```typescript
// Create new record (include employee_id)
const createdRecord = await employeeLERService.createDailyRecord(
  payPeriod.id!, 
  dailyRecord, 
  employee.id  // Pass employee ID
);
```

**Updated manual record creation to include employee_id:**

```typescript
// Save daily record (include employee_id)
const supabaseRecord = convertToSupabaseFormat(record);
const savedRecord = await employeeLERService.createDailyRecord(
  currentPeriod.periodId, 
  supabaseRecord, 
  employeeInfo.id  // Pass employee ID
);
```

## Data Flow After Fix

```typescript
// AFTER (FIXED):
const periods = await employeeLERService.getPayPeriods(dbUserId);  // Company-wide periods
const records = await employeeLERService.getDailyRecords(period.id, empInfo.id);  // FILTERED by employee
// Result: Each employee sees only their own data
```

## Files Modified

### Backend:
- `backend/migrations/23_add_employee_id_to_daily_records.sql` (NEW)

### Frontend:
- `project/src/services/employeeLERService.ts`
  - Added `employee_id` to `DailyRecord` interface
  - Updated `getDailyRecords()` to accept and filter by `employeeId`
  - Updated `createDailyRecord()` to accept and save `employeeId`
  - Updated `updateDailyRecord()` to preserve `employee_id`

- `project/src/pages/EmployeeLERPage.tsx`
  - Line 410: Pass `empInfo.id` when loading daily records
  - Line 738: Pass `employee.id` when creating records via CSV import
  - Line 2402: Pass `employeeInfo.id` when creating manual records

## Testing Verification

### Before Fix:
- Switch between employees → Same data displayed for all
- Daily Performance Records section identical across all techs
- LER calculations showing same values for different employees

### After Fix:
- Switch between employees → Unique data for each employee
- Daily Performance Records filtered by selected employee
- Each employee's LER calculations based on their own records

## Important Notes

### Data Migration Concern:
If you already have daily records in the database without `employee_id`, you'll need to assign them to the correct employees. Options:

1. **Manual Assignment**: Update existing records in Supabase SQL Editor
2. **Data Cleanup Script**: Create a script to match records to employees based on dates/amounts
3. **Fresh Start**: If data is test data, delete and re-enter with proper employee_id

### Multi-Employee Architecture:
- **Pay Periods**: Company-wide (shared across all employees)
- **Daily Records**: Employee-specific (filtered by employee_id)
- **Company Settings**: Company-wide (overhead, bonuses, etc.)
- **Employee Info**: Individual (name, position, base rate)

### RLS Security:
The new RLS policies ensure users can only access daily records for employees they own (via `employee_info.user_id` check).

## Next Steps

1. **Verify Data**: Check that each employee now shows unique records
2. **Test CSV Import**: Import records for multiple employees and verify separation
3. **Test Manual Entry**: Create records for different employees and verify they don't overlap
4. **Data Cleanup**: If needed, assign existing records to correct employees

## Status

✅ **Migration Run**: Database schema updated with employee_id column  
✅ **Service Layer**: Updated to filter and save employee_id  
✅ **Page Component**: Updated to pass employee_id in all operations  
✅ **CSV Import**: Updated to include employee_id  
✅ **Manual Entry**: Updated to include employee_id  

**Ready for Testing**
