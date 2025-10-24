# Custom Goal Logic Removal

## Problem
Even after removing the Edit Goal button from the UI, old custom goals were still persisting in the database and being used instead of FIR targets.

### Example from Console:
```javascript
🎯 Monthly Revenue - Custom Goal Check: {
  period: '2025-10-01', 
  customGoal: 75000,  // Old edited goal from database
  userId: '...'
}
🎯 Monthly Revenue - Using FIR target: {
  targetRevenue: 75000,      // Using old custom goal ❌
  isCustomGoal: true, 
  firTarget: 63761.92        // Should use this instead ✅
}
```

## Root Cause
The KPI generation code was still checking for existing custom goals in the database via `getExistingCustomGoal()` function. Even though users couldn't create new custom goals (Edit button removed), old ones persisted and took priority over FIR targets.

## Solution
Removed all custom goal checking logic from KPI generation:

### 1. Monthly Revenue KPI
**Before:**
```typescript
// Check if user has set a custom goal
const customGoal = await this.getExistingCustomGoal(userId, 'Monthly Revenue', period);
const targetRevenue = customGoal || monthData.desired_revenue || monthData.target_revenue || 0;
const isCustomGoal = customGoal !== null;
const goalLabel = isCustomGoal ? 'your custom goal' : 'FIR target';
```

**After:**
```typescript
// Always use FIR target (desired_revenue) - custom goals removed
const targetRevenue = monthData.desired_revenue || monthData.target_revenue || 0;
// No custom goal checking
// Always labeled as "FIR target"
```

### 2. YTD Revenue KPI
**Before:**
```typescript
// Check if user has set a custom goal
const customGoal = await this.getExistingCustomGoal(userId, 'YTD Revenue', period);
const finalTarget = customGoal || ytdTarget;
const isCustomGoal = customGoal !== null;
const goalLabel = isCustomGoal ? 'your custom goal' : 'FIR target';
```

**After:**
```typescript
// Always use FIR target - custom goals removed
const finalTarget = ytdTarget;
// No custom goal checking
// Always labeled as "FIR target"
```

## Files Modified
- `project/src/services/revenueKPIGenerator.ts`
  - Updated `generateMonthlyRevenueKPI()` - Removed custom goal logic
  - Updated `generateYTDKPI()` - Removed custom goal logic

## Result
Now when KPIs refresh:
```javascript
🎯 Monthly Revenue - Using FIR target: {
  targetRevenue: 63761.92,  // Using FIR target ✅
  firTarget: 63761.92
}
```

## Testing
1. ✅ Refresh KPIs
2. ✅ Check console logs - should show FIR target being used
3. ✅ Check KPI card - should show FIR target ($63,761.92 not $75,000)
4. ✅ Verify no "customGoal" in console logs

## Database Cleanup (Optional)
Old custom goals still exist in the `kpi_records` table but are now ignored. They can be cleaned up with:

```sql
-- Clear custom goals that don't match FIR targets
UPDATE kpi_records 
SET goal_value = (
  SELECT desired_revenue 
  FROM revenue_entries 
  WHERE revenue_entries.user_id = kpi_records.user_id 
    AND revenue_entries.year = EXTRACT(YEAR FROM kpi_records.period::date)
    AND revenue_entries.month = EXTRACT(MONTH FROM kpi_records.period::date)
)
WHERE kpi_name IN ('Monthly Revenue', 'YTD Revenue');
```

But this is optional - the code now ignores them anyway.

## Philosophy
**Custom goals were a mistake.** They created:
- Data inconsistency (graph vs KPIs)
- User confusion ("which target is real?")
- Maintenance burden (syncing custom goals with FIR changes)

**FIR targets are the single source of truth.** Period.
