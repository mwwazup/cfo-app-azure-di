# Filter Refactor Summary - Matching KPI Service Pattern

## Problem
The financial documents filter was overly complex with separate `filterYear`, `filterMonth`, and `selectedPeriod` states that weren't syncing properly. The dropdown selections weren't triggering updates.

## Solution
Simplify to match the **existing working KPI service pattern** from `kpiRecordsService.ts`.

## KPI Service Pattern (Lines 67-96)
```typescript
// Simple period string that handles:
- 'current' or 'current_month' → Current month
- 'last_month' → Previous month  
- 'ytd' → Year to date
- 'YYYY-MM' format → Specific month (e.g., '2024-02')
- 'all' → Show everything
```

## Changes Made (Partial)

### WhereDidTheMoneyGo.tsx
1. ✅ Simplified state to single `period` string
2. ✅ Updated `availableDocuments` useMemo to use period-based filtering
3. ✅ Updated dropdown handler to just call `setPeriod(value)`
4. ✅ Updated props interface to only pass `selectedPeriod`

### FinancialStatements.tsx  
1. ✅ Removed `filterYear` and `filterMonth` state
2. ❌ **INCOMPLETE** - Still needs to:
   - Update WhereDidTheMoneyGo component props (remove filterYear/filterMonth)
   - Update document table filtering logic to use period
   - Remove all references to old filter variables

## What Still Needs to be Done

### 1. Update FinancialStatements.tsx WhereDidTheMoneyGo Props
**Find (around line 1012):**
```typescript
<WhereDidTheMoneyGo 
  selectedPeriod={selectedPeriod}
  setSelectedPeriod={setSelectedPeriod}
  filterYear={filterYear}        // ❌ Remove
  setFilterYear={setFilterYear}  // ❌ Remove
  filterMonth={filterMonth}      // ❌ Remove
  setFilterMonth={setFilterMonth} // ❌ Remove
/>
```

**Replace with:**
```typescript
<WhereDidTheMoneyGo 
  selectedPeriod={selectedPeriod}
  setSelectedPeriod={setSelectedPeriod}
/>
```

### 2. Update Document Table Filtering in FinancialStatements.tsx
**Find (around line 1057):**
```typescript
const filteredDocuments = documents.filter(doc => {
  // Complex year/month logic with filterYear and filterMonth
});
```

**Replace with same pattern as WhereDidTheMoneyGo:**
```typescript
const filteredDocuments = documents.filter(doc => {
  if (doc.document_type !== 'pnl') return false;
  if (!doc.start_date) return false;
  
  // Show all if period is 'all'
  if (selectedPeriod === 'all') return true;
  
  const docDate = new Date(doc.start_date + 'T00:00:00');
  const docYear = docDate.getFullYear();
  const docMonth = docDate.getMonth() + 1;
  const docPeriod = `${docYear}-${String(docMonth).padStart(2, '0')}`;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  switch (selectedPeriod) {
    case 'current_month':
      return docYear === currentYear && docMonth === currentMonth;
    case 'ytd':
      return docYear === currentYear && docMonth <= currentMonth;
    default:
      // Handle YYYY-MM format
      if (selectedPeriod.match(/^\d{4}-\d{2}$/)) {
        return docPeriod === selectedPeriod;
      }
      return true;
  }
});
```

### 3. Remove Debug Console Logs
Once working, remove excessive logging from:
- `console.log('📋 Document table filtering:'...)`
- `console.log('📋 Doc filter check:'...)`
- `console.log('📅 Rendering SelectItem:'...)`

## Benefits of This Approach

1. **Consistency** - Same pattern as working KPI service
2. **Simplicity** - One state variable instead of three
3. **Maintainability** - Easy to understand and debug
4. **Extensibility** - Easy to add new period types (e.g., 'last3months')

## Testing After Completion

1. Refresh page → Should show "All Periods" with all documents visible
2. Select "Feb 2024" → Should filter to only Feb 2024 document
3. Select "Jan 2024" → Should filter to only Jan 2024 document  
4. Select "Year to Date" → Should show all 2025 YTD documents (none currently)
5. Select "All Periods" → Should show all documents again

## Why This is Better Than Starting From Scratch

- Proven pattern already working in KPI service
- Minimal code changes needed
- Leverages existing infrastructure
- No need to reinvent filtering logic
