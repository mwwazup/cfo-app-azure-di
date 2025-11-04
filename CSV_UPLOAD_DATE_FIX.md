# CSV Upload Date Extraction Fix

## Problem Identified
When uploading multiple CSV files (e.g., 2021 and 2022 documents), all files were being saved with the **same start and end dates**, resulting in duplicate filenames in the `financial_documents` table.

### Root Cause
The CSV upload handler in `FinancialStatements.tsx` was using the **filter state** (`filterYear` and `filterMonth`) to set dates for ALL uploads, instead of extracting dates from each individual file.

```typescript
// OLD CODE - Used same dates for every upload
let year = filterYear;  // Always the same!
let month = typeof filterMonth === 'number' ? filterMonth : currentDate.getMonth() + 1;
```

This meant:
- Upload `2021_05_may_pnl.csv` → Saved as May 2025 (current filter)
- Upload `2022_08_august_pnl.csv` → Saved as May 2025 (same filter!)
- Result: Both files had filename `2025_05_may_pnl.csv` with different data

## Solution Implemented

### 1. Intelligent Date Extraction from Filename
The system now attempts to extract dates from the CSV filename using multiple patterns:

**Pattern 1: YYYY_MM format**
- `2021_05_may_pnl.csv` → Year: 2021, Month: 5
- `2022_08_august_pnl.csv` → Year: 2022, Month: 8

**Pattern 2: MM_YYYY format**
- `05_2021_pnl.csv` → Year: 2021, Month: 5

**Pattern 3: Month name + Year**
- `may_2021.csv` → Year: 2021, Month: 5
- `august_2022_pnl.csv` → Year: 2022, Month: 8

**Fallback: Filter state** (only if no date found in filename)
- Uses current `filterYear` and `filterMonth` as before

### 2. Enhanced Logging
Added detailed console logging to track date extraction:

```
📋 CSV parsed - Opening review modal
  Original file: 2021_05_may_pnl.csv
  Extracted dates: { startDate: '2021-05-01', endDate: '2021-05-31' }
  Standardized filename: 2021_05_may_pnl.csv
✅ Document ready for review - dates can be edited before saving
```

### 3. User Review Modal
The review modal (using `ManualPLFormSimplified`) now:
- Shows the **extracted dates** from the filename
- Allows users to **edit dates** before saving
- Displays both original filename and standardized filename
- Prevents duplicate filenames by using unique dates per upload

## Files Modified

### `project/src/components/financial/FinancialStatements.tsx`

**Lines 162-203:** Date extraction logic
```typescript
// Try to extract date from filename
const filenameMatch = file.name.match(/(\d{4})[_-](\d{1,2})|(\d{1,2})[_-](\d{4})/);
const monthMatch = file.name.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);

let year: number;
let month: number;

if (filenameMatch) {
  // Extract from YYYY_MM or MM_YYYY pattern
  if (filenameMatch[1]) {
    year = parseInt(filenameMatch[1]);
    month = parseInt(filenameMatch[2]);
  } else {
    year = parseInt(filenameMatch[4]);
    month = parseInt(filenameMatch[3]);
  }
} else if (monthMatch) {
  // Extract from month name
  const monthNames = ['january', 'february', ...];
  month = monthNames.indexOf(monthMatch[1].toLowerCase()) + 1;
  const yearMatch = file.name.match(/\b(20\d{2})\b/);
  year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
} else {
  // Fallback to filter state
  year = filterYear;
  month = typeof filterMonth === 'number' ? filterMonth : currentDate.getMonth() + 1;
}
```

**Lines 235, 250-259:** Enhanced logging and original filename tracking

## User Experience Improvements

### Before
1. Upload `2021_05_may_pnl.csv` → Dialog shows May 2025 (wrong!)
2. Click Save → Saved as `2025_05_may_pnl.csv`
3. Upload `2022_08_august_pnl.csv` → Dialog shows May 2025 (wrong!)
4. Click Save → Saved as `2025_05_may_pnl.csv` (duplicate!)
5. Database has 2 documents with same filename, different data

### After
1. Upload `2021_05_may_pnl.csv` → Dialog shows May 2021 (correct!)
2. User can edit dates if needed
3. Click Save → Saved as `2021_05_may_pnl.csv`
4. Upload `2022_08_august_pnl.csv` → Dialog shows August 2022 (correct!)
5. User can edit dates if needed
6. Click Save → Saved as `2022_08_august_pnl.csv`
7. Database has 2 documents with unique filenames

## Testing Recommendations

1. **Test filename patterns:**
   - `2021_05_may_pnl.csv` → Should extract May 2021
   - `05_2021_pnl.csv` → Should extract May 2021
   - `may_2021.csv` → Should extract May 2021
   - `random_name.csv` → Should use filter state as fallback

2. **Test multiple uploads:**
   - Upload 2021 file → Verify correct dates in review modal
   - Upload 2022 file → Verify different dates in review modal
   - Save both → Verify unique filenames in database

3. **Test date editing:**
   - Upload file with extracted dates
   - Edit dates in review modal
   - Save → Verify edited dates are used

## Benefits

- **Prevents duplicate filenames** - Each upload gets unique dates
- **Intelligent extraction** - Supports multiple filename formats
- **User control** - Dates can be edited before saving
- **Better logging** - Easy to debug date extraction issues
- **Backward compatible** - Falls back to filter state if no date in filename

## Git Commit

Ready to commit with message:
```
Fix CSV upload date extraction to prevent duplicate filenames

- Extract dates from CSV filename patterns (YYYY_MM, MM_YYYY, month names)
- Add fallback to filter state if no date found in filename
- Store original filename for reference
- Enhanced logging for date extraction debugging
- Prevents duplicate filenames when uploading multiple years/months
```
