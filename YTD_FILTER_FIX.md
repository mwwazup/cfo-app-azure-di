# YTD Filter Fix - Financial Documents

## Problem Identified
When selecting "Year to Date 2021" (or any year), the "Your Financial Documents" section was not showing any documents, even though individual month filters worked correctly.

### Root Causes

**Issue 1: Value Mismatch in WhereDidTheMoneyGo.tsx**
The dropdown was setting `filterMonth` to the **number** `0` when "Year to Date" was selected, but the filtering logic was checking for the **string** `'ytd'`.

```typescript
// OLD CODE - Line 1224
onValueChange={(value) => setFilterMonth(Number(value))}

// Dropdown option - Line 1230
<SelectItem value="0">Year to Date</SelectItem>

// Filter check - Line 317
if (filterMonth === 'ytd') {  // Never matched because filterMonth was 0, not 'ytd'
```

**Issue 2: Incorrect YTD Logic in FinancialStatements.tsx**
The YTD filter was checking if documents were before the **current month** instead of showing all months in the selected year.

```typescript
// OLD CODE - Line 522
if (filterMonth === 'ytd') {
  return docYear === filterYear && docMonth <= currentDate.getMonth() + 1;
  // This would only show Jan-Nov when viewing 2021 in November 2025!
}
```

## Solution Implemented

### 1. Fixed WhereDidTheMoneyGo.tsx

**Changed dropdown value from "0" to "ytd":**
```typescript
// Line 1237
<SelectItem value="ytd">Year to Date</SelectItem>
```

**Updated onValueChange handler to preserve 'ytd' as string:**
```typescript
// Lines 1224-1231
onValueChange={(value) => {
  // Handle YTD as string 'ytd', otherwise convert to number
  if (value === 'ytd') {
    setFilterMonth('ytd');
  } else {
    setFilterMonth(Number(value));
  }
}}
```

**Updated local state type to support 'ytd':**
```typescript
// Line 234
const [localFilterMonth, setLocalFilterMonth] = useState<number | 'ytd'>(currentDate.getMonth() + 1);
```

**Cleaned up display logic:**
```typescript
// Removed checks for filterMonth === 0, now only checks for 'ytd'
{filterMonth === 'ytd' ? 'Year to Date' : new Date(filterYear, (filterMonth as number) - 1).toLocaleDateString('en-US', { month: 'long' })}
```

### 2. Fixed FinancialStatements.tsx

**Simplified YTD filter to show ALL months in selected year:**
```typescript
// Line 520-522
if (filterMonth === 'ytd') {
  // Year to date filter - show ALL months for the selected year
  return docYear === filterYear;  // No month restriction!
}
```

**Updated display logic:**
```typescript
// Removed checks for filterMonth === 0
{filterMonth === 'ytd' ? `Year to Date ${filterYear}` : ...}
```

## Files Modified

### `project/src/components/financial/WhereDidTheMoneyGo.tsx`
- **Line 234**: Updated local state type to `number | 'ytd'`
- **Lines 1224-1231**: Fixed onValueChange handler to preserve 'ytd' string
- **Line 1237**: Changed dropdown value from "0" to "ytd"
- **Line 1183**: Removed `filterMonth === 0` check
- **Line 900**: Removed `filterMonth === 0` check

### `project/src/components/financial/FinancialStatements.tsx`
- **Line 522**: Simplified YTD filter to show all months in year
- **Line 484**: Removed `filterMonth === 0` check
- **Line 546**: Removed `filterMonth === 0` check

## User Experience

### Before
1. Select "Year to Date 2021" from dropdown
2. "Your Financial Documents" shows: "No documents found for year to date 2021"
3. But documents exist in database!
4. Individual month filters work fine

### After
1. Select "Year to Date 2021" from dropdown
2. "Your Financial Documents" shows ALL 2021 documents (Jan-Dec)
3. Radial charts aggregate all 2021 data correctly
4. Individual month filters still work as before

## Testing Recommendations

1. **Test YTD filter:**
   - Select "Year to Date 2021" → Should show all 2021 documents
   - Select "Year to Date 2022" → Should show all 2022 documents
   - Verify radial charts aggregate correctly

2. **Test individual month filters:**
   - Select "May 2021" → Should show only May 2021 document
   - Select "August 2022" → Should show only August 2022 document

3. **Test year switching:**
   - Change year dropdown → Documents should update
   - YTD should always show all months for selected year

## Benefits

- **YTD filter now works** - Shows all documents for selected year
- **Consistent behavior** - YTD uses string 'ytd', not number 0
- **Cleaner code** - Removed confusing `filterMonth === 0` checks
- **Type safety** - Proper TypeScript types for `number | 'ytd'`
- **Better UX** - Users can now view full year data

## Notes

The unused `selectedPeriod` and `setSelectedPeriod` variables in WhereDidTheMoneyGo.tsx are legacy props that may be needed for future features. They can be safely ignored for now.

## Git Commit

Ready to commit with message:
```
Fix YTD filter to show all documents for selected year

- Change YTD dropdown value from "0" to "ytd" string
- Update onValueChange handler to preserve 'ytd' as string
- Simplify YTD filter logic to show all months in year (not just up to current month)
- Remove confusing filterMonth === 0 checks throughout
- Update TypeScript types to support number | 'ytd'
- Fixes issue where YTD filter showed no documents
```
