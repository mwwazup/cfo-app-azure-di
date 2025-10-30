# Quick Select Periods Feature - October 29, 2025

## Problem Solved

**User Feedback:**
> "Uploading a csv for a full year doesn't work with the current calendar drop down. That calendar drop down is good for a month but not a year"

The calendar picker was designed for selecting individual dates, making it tedious to set up full-year or quarterly periods for CSV uploads.

## Solution Implemented

Added **Quick Select** buttons to the calendar dropdown for instant period selection.

## Features

### Quick Select Options

**1. Full Year {YYYY}**
- Sets: January 1 - December 31 of selected year
- Perfect for: Annual P&L statements, yearly CSV uploads
- Example: "Full Year 2025" → 1/1/2025 - 12/31/2025

**2. Current Quarter**
- Automatically detects current quarter based on selected month
- Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
- Perfect for: Quarterly financial statements

**3. Current Month**
- Sets: First day to last day of selected month
- Perfect for: Monthly P&L statements
- Example: October 2025 → 10/1/2025 - 10/31/2025

**4. Year to Date**
- Sets: January 1 to current date
- Perfect for: YTD financial reports
- Example: Today is Oct 29, 2025 → 1/1/2025 - 10/29/2025

## User Experience

### Before
1. Click calendar dropdown
2. Navigate to January
3. Click January 1
4. Navigate to December
5. Click December 31
6. Click "Done"
**Total: 6+ clicks**

### After
1. Click calendar dropdown
2. Click "Full Year 2025"
3. Click "Done"
**Total: 3 clicks** ✅

## UI Design

```
┌─────────────────────────────────────┐
│ Quick Select                        │
├─────────────────┬───────────────────┤
│ Full Year 2025  │ Current Quarter   │
├─────────────────┼───────────────────┤
│ Current Month   │ Year to Date      │
└─────────────────┴───────────────────┘
```

- **Location**: Top of calendar dropdown
- **Layout**: 2x2 grid
- **Style**: Clean, bordered buttons with hover effects
- **Separator**: Border below Quick Select section

## Technical Implementation

### Code Changes

**File:** `FinancialStatements.tsx`

**Added Quick Select Section:**
```tsx
<div className="mb-4 pb-4 border-b border-gray-200">
  <h5 className="text-xs font-medium text-gray-600 mb-2">Quick Select</h5>
  <div className="grid grid-cols-2 gap-2">
    {/* Full Year Button */}
    <button onClick={() => {
      const year = calendarView.year;
      setSelectedStartDate(new Date(year, 0, 1));
      setSelectedEndDate(new Date(year, 11, 31));
    }}>
      Full Year {calendarView.year}
    </button>
    
    {/* Quarter, Month, YTD buttons... */}
  </div>
</div>
```

### Date Calculations

**Full Year:**
```typescript
Start: new Date(year, 0, 1)    // January 1
End: new Date(year, 11, 31)    // December 31
```

**Current Quarter:**
```typescript
const quarter = Math.floor(month / 3);
const startMonth = quarter * 3;
const endMonth = startMonth + 2;
Start: new Date(year, startMonth, 1)
End: new Date(year, endMonth + 1, 0)  // Last day of quarter
```

**Current Month:**
```typescript
Start: new Date(year, month, 1)
End: new Date(year, month + 1, 0)  // Last day of month
```

**Year to Date:**
```typescript
const today = new Date();
Start: new Date(year, 0, 1)
End: new Date(year, month, today.getDate())
```

## Use Cases

### CSV Upload - Full Year
1. Upload annual P&L CSV
2. Click "Full Year 2024"
3. Approve → Done! ✅

### Quarterly Report
1. Upload Q3 financial statement
2. Navigate to July (Q3 start)
3. Click "Current Quarter"
4. Approve → Sets Jul 1 - Sep 30 ✅

### Monthly Statement
1. Upload October P&L
2. Navigate to October
3. Click "Current Month"
4. Approve → Sets Oct 1 - Oct 31 ✅

### YTD Report
1. Upload year-to-date summary
2. Click "Year to Date"
3. Approve → Sets Jan 1 - Today ✅

## Benefits

1. **Faster Data Entry**: 3 clicks instead of 6+
2. **Fewer Errors**: No manual date selection mistakes
3. **Better UX**: Intuitive, common period selections
4. **CSV-Friendly**: Perfect for annual CSV uploads
5. **Flexible**: Still allows manual date selection if needed

## Integration with CSV Upload

The Quick Select feature works seamlessly with the new CSV upload capability:

1. User uploads annual P&L CSV
2. CSV parser extracts financial data
3. Review modal shows parsed data
4. User clicks "Full Year 2025" → Instant date selection
5. User clicks "Approve" → Document saved

**No more tedious date clicking!** 🎉

## Future Enhancements

Potential additions:
- **Custom Periods**: "Last 6 Months", "Last 90 Days"
- **Fiscal Year**: Support for non-calendar fiscal years
- **Previous Year**: Quick select for prior year periods
- **Multi-Year**: "Last 3 Years" for trend analysis
- **Saved Presets**: User-defined custom periods

## Testing

Test scenarios:
1. ✅ Full Year 2025 → Verify Jan 1 - Dec 31
2. ✅ Current Quarter (Oct) → Verify Q4 (Oct 1 - Dec 31)
3. ✅ Current Month (Oct) → Verify Oct 1 - Oct 31
4. ✅ Year to Date → Verify Jan 1 - Today
5. ✅ Works with CSV upload workflow
6. ✅ Works with manual date selection
7. ✅ Calendar still functional for custom ranges

## Documentation Updated

- ✅ CSV_UPLOAD_GUIDE.md - Added Quick Select instructions
- ✅ This feature document created
- ✅ Inline code comments added

## User Feedback Addressed

✅ **Original Issue**: "Calendar dropdown is good for a month but not a year"
✅ **Solution**: Quick Select "Full Year" button
✅ **Result**: One-click full year selection

The Quick Select feature makes period selection fast, intuitive, and perfect for CSV uploads! 🚀
