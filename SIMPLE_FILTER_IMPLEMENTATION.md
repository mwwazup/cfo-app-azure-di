# Simple Filter Implementation - Based on KPI Service

## Current Problem
- Documents from 2024 are uploaded but filter defaults to 2025
- Dropdown selections don't update the displayed documents
- Complex state management with `filterYear`, `filterMonth`, and `selectedPeriod`

## Solution: Copy KPI Service Pattern

The `kpiRecordsService.ts` already has a working, simple filter. Let's use the exact same approach.

## Implementation Plan

### Step 1: Keep Current State Structure (No Breaking Changes)
Don't remove existing props - just make them work properly.

### Step 2: Fix the Dropdown Handler
The issue is the dropdown `onValueChange` isn't properly updating state because of how props are passed.

### Step 3: Fix Default Filter
Change default from current month to 'all' to show all documents.

## Actual Code Changes Needed

### Change 1: FinancialStatements.tsx - Default to 'all'
```typescript
// Line ~25
const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
const [filterYear, setFilterYear] = useState<number>(currentDate.getFullYear());
const [filterMonth, setFilterMonth] = useState<number | 'all' | 'ytd'>('all'); // Change from currentDate.getMonth() + 1
```

### Change 2: WhereDidTheMoneyGo.tsx - Default to 'all'  
```typescript
// Line ~192
const [localFilterMonth, setLocalFilterMonth] = useState<number | 'all' | 'ytd'>('all'); // Change from currentDate.getMonth() + 1
```

### Change 3: WhereDidTheMoneyGo.tsx - Add Document Periods to Dropdown
```typescript
// After line ~897 (after "Year to Date" SelectItem)
{/* Show actual document periods from uploaded documents */}
{availableDocuments.length > 0 && (
  <>
    {availableDocuments.map((doc) => {
      const startDate = new Date(doc.start_date + 'T00:00:00');
      const monthValue = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      const displayLabel = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return (
        <SelectItem key={doc.id} value={monthValue}>
          {displayLabel}
        </SelectItem>
      );
    })}
  </>
)}
```

### Change 4: WhereDidTheMoneyGo.tsx - Fix Year Filter Logic
```typescript
// Line ~315 (in availableDocuments filter)
// BEFORE:
if (filterMonth !== 'all' && docYear !== filterYear) {
  return false;
}

// AFTER: Skip year filter when showing all
if (filterMonth !== 'all' && docYear !== filterYear) {
  console.log('❌ Year mismatch:', { docYear, filterYear });
  return false;
}
```

Actually, the logic is already correct! The issue is just the default value.

## That's It!

Just 3 simple changes:
1. ✅ Default `filterMonth` to `'all'` instead of current month (2 places)
2. ✅ Add document periods to dropdown
3. ✅ Done!

The existing filter logic already works correctly - it just needs to default to showing everything.

## Why This Works

- When `filterMonth === 'all'`, the year filter is skipped (line 315)
- When user selects a specific month like "2024-02", it updates both year and month
- The dropdown handler already has the logic to parse YYYY-MM format (line 904-908)

## Testing
1. Refresh → Should show all documents (Jan & Feb 2024)
2. Select "Feb 2024" → Should filter to Feb only
3. Select "Jan 2024" → Should filter to Jan only
4. Select "All Periods" → Should show all again
