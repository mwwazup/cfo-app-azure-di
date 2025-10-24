# FIR Target Persistence Fix

## Problem
When setting FIR target to $799,000 and refreshing the page, it reverted back to $504,762.

## Root Cause
In `revenue-context.tsx` line 242, when loading data from the database, the code was calculating `targetRevenue` by **multiplying the first month's `desired_revenue` by 12**:

```typescript
const targetRevenue = sampleEntry ? ((sampleEntry.desired_revenue ?? sampleEntry.target_revenue ?? 0) * 12) : 0;
```

This is **incorrect** because:
1. Each month has a different `desired_revenue` value (seasonal distribution)
2. January's FIR target might be $42,063.46 (lower due to seasonality)
3. Multiplying $42,063.46 × 12 = $504,761.52 ❌

## The Fix
Changed to **sum all 12 months' `desired_revenue` values**:

```typescript
// Calculate targetRevenue by summing all 12 months' desired_revenue values
// (not multiplying first month by 12, since each month has different seasonal targets)
const targetRevenue = entries.reduce((sum, entry) => {
  return sum + (entry.desired_revenue ?? entry.target_revenue ?? 0);
}, 0);
```

Now:
- January: $42,063.46
- February: $46,916.27
- March: $52,789.33
- ... (all 12 months)
- **Total: $799,000** ✅

## Data Flow (Corrected)

### Saving:
1. User enters $799,000 in FIR input
2. `updateTargets()` calculates seasonal monthly distribution
3. Backend saves 12 rows to `revenue_entries` table:
   - Month 1: `desired_revenue = $42,063.46`
   - Month 2: `desired_revenue = $46,916.27`
   - ... etc.

### Loading (FIXED):
1. Fetch all 12 months from database
2. **Sum all `desired_revenue` values** → $799,000
3. Display $799,000 in FIR input ✅

## Files Modified
- `project/src/contexts/revenue-context.tsx` - Lines 241-248

## Testing
1. Set FIR target to $799,000
2. Wait 1 second for debounce to save
3. Refresh page
4. FIR input should show $799,000 (not $504,762)

## Related Systems
- **Debouncing**: FIR input debounces for 1 second before saving (see FIR_DEBOUNCE_KPI_OPTIMIZATION.md)
- **Seasonal Distribution**: Monthly FIR targets use intelligent seasonal patterns (see memory a84265e6)
- **Database Schema**: `revenue_entries.desired_revenue` stores monthly FIR targets
