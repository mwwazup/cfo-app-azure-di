# YTD Radial Charts Fix

## Problem Identified
After fixing the YTD filter to show all documents, the radial charts disappeared when "Year to Date" was selected. Individual month filters showed charts correctly, but YTD mode showed only the document list without any charts.

### Root Cause
The `radialChartsData` useMemo had a guard condition that required BOTH `kpis` AND `selectedDocumentId`:

```typescript
// OLD CODE - Line 839
if (!kpis || !selectedDocumentId) {
  return null;
}
```

**The Problem:**
- **YTD mode**: Aggregates data from ALL documents, so there's no single `selectedDocumentId`
- **Single month mode**: Shows data from one selected document, so `selectedDocumentId` exists
- The guard was blocking YTD mode because `selectedDocumentId` was undefined

This caused the rendering check `radialChartsData?.hasData` to fail, showing the "no data" message instead of the charts.

## Solution Implemented

### Updated Guard Logic
Modified the guard to allow YTD mode without requiring a `selectedDocumentId`:

```typescript
// NEW CODE - Lines 838-844
// Process KPIs into radial chart data using memoization with guards
const radialChartsData = useMemo(() => {
  // Guard: only process if we have KPIs
  // For YTD mode, we don't need a selectedDocumentId (data is aggregated)
  // For single month mode, we need a selectedDocumentId
  const isYTDMode = filterMonth === 'ytd';
  if (!kpis || (!isYTDMode && !selectedDocumentId)) {
    return null;
  }
  // ... rest of the logic
```

**Logic Breakdown:**
- If `kpis` is missing → return null (no data to display)
- If NOT YTD mode AND no `selectedDocumentId` → return null (need a document selected)
- If YTD mode → proceed even without `selectedDocumentId` (data is aggregated)

### Updated Dependency Array
Added `filterMonth` and `filterYear` to the useMemo dependency array to ensure charts recalculate when filters change:

```typescript
// Line 1104
}, [kpis, selectedDocumentId, documents, filterMonth, filterYear]);
```

## Files Modified

### `project/src/components/financial/WhereDidTheMoneyGo.tsx`

**Lines 838-844:** Updated guard condition
```typescript
const isYTDMode = filterMonth === 'ytd';
if (!kpis || (!isYTDMode && !selectedDocumentId)) {
  return null;
}
```

**Line 1104:** Updated dependency array
```typescript
}, [kpis, selectedDocumentId, documents, filterMonth, filterYear]);
```

## How It Works

### YTD Mode Flow
1. User selects "Year to Date 2021"
2. `filterMonth` is set to `'ytd'`
3. `useEffect` (lines 310-452) aggregates all 2021 documents:
   - Sums revenue, COGS, opex, owner distributions
   - Sets `kpis` with `is_ytd: true`
4. `radialChartsData` useMemo runs:
   - Detects `isYTDMode = true`
   - Skips `selectedDocumentId` check
   - Processes aggregated KPIs into chart data
5. Charts render with YTD data

### Single Month Mode Flow
1. User selects "May 2021"
2. `filterMonth` is set to `5` (number)
3. User must select a document from the list
4. `selectedDocumentId` is set
5. `useEffect` processes that single document's KPIs
6. `radialChartsData` useMemo runs:
   - Detects `isYTDMode = false`
   - Requires `selectedDocumentId` (exists)
   - Processes single document KPIs into chart data
7. Charts render with single month data

## User Experience

### Before Fix
1. Select "Year to Date 2021"
2. Document list shows all 2021 documents ✅
3. Radial charts section shows: "No data available" ❌
4. Console shows: KPIs calculated and set correctly
5. But charts don't render

### After Fix
1. Select "Year to Date 2021"
2. Document list shows all 2021 documents ✅
3. Radial charts show aggregated YTD data ✅
   - Total Revenue (all 2021 months combined)
   - Cost of Goods (all 2021 months combined)
   - Operating Expenses (all 2021 months combined)
   - Net Profit (calculated from aggregated data)
   - Owner Distributions (all 2021 months combined)
   - Cash Left for Growth (calculated from aggregated data)
4. Date range displays: "YTD 2021 (Jan - December)"

## Testing Recommendations

1. **Test YTD mode:**
   - Select "Year to Date 2021" → Verify 6 radial charts appear
   - Check chart values match aggregated totals
   - Verify date range shows "YTD 2021 (Jan - December)"

2. **Test single month mode:**
   - Select "May 2021" → Select a document → Verify charts appear
   - Check chart values match single document data
   - Verify date range shows "May 2021"

3. **Test switching between modes:**
   - YTD → Single month → YTD (charts should update correctly)
   - Different years in YTD mode (2021 vs 2022)

## Benefits

- **YTD charts now work** - Shows aggregated financial data visually
- **Consistent behavior** - Charts appear for both YTD and single month modes
- **Better UX** - Users can see visual breakdown of where money went for entire year
- **Proper dependencies** - Charts recalculate when filters change

## Notes

The TypeScript warnings about unused `selectedPeriod` and `setSelectedPeriod` variables are harmless legacy props that may be used in future features. They don't affect functionality.

## Git Commit

Ready to commit with message:
```
Fix YTD radial charts not appearing

- Update guard condition to allow YTD mode without selectedDocumentId
- YTD aggregates data from all documents, doesn't need single document selection
- Add filterMonth and filterYear to useMemo dependencies
- Fixes issue where YTD showed document list but no charts
```
