# LER Trend Chart Debugging Instructions

## Issue
Added a record with date 1/02/25 but it's not showing in the LER Trend chart.
Chart currently shows: Mar 11, Mar 12, Mar 13, Mar 14, Mar 17

## Debugging Steps

### 1. Check Browser Console
Open the browser console (F12) and look for these logs:

```
📊 Building LER Trend Chart Data:
   Current Year: 2025
   Pay Periods: X
   Period: [Period Name], Records: X
      Record Date: 2025-01-02 -> Parsed: 1/2/2025 (Year: 2025)
      Record Date: 2025-03-11 -> Parsed: 3/11/2025 (Year: 2025)
   Total Records in Chart: X
```

### 2. What to Look For

**Check if your 1/02/25 record appears in the logs:**
- ✅ If you see `Record Date: 2025-01-02` - the record exists and is being processed
- ❌ If you don't see it - the record wasn't saved or the page needs to be refreshed

**Check the parsed year:**
- ✅ Should show `(Year: 2025)`
- ❌ If it shows `(Year: 2024)` or another year, it won't appear in the YTD chart

**Check the total count:**
- Should match the number of records you expect to see

### 3. Common Issues & Solutions

#### Issue: Record not in console logs at all
**Cause:** Data not loaded or page needs refresh
**Solution:** 
1. Refresh the page (F5)
2. Check if the record appears in the Daily Performance Records table
3. If it's in the table but not the chart, check the console logs again

#### Issue: Record shows "0 jobs" or "called out"
**Cause:** Chart filters out records with 0 jobs or called out days
**Solution:** 
- Make sure the record has `numberOfJobs > 0`
- Make sure `calledOut` is false

#### Issue: Date is in wrong year
**Cause:** Date was entered incorrectly
**Solution:**
- Edit the record and verify the date is 2025-01-02
- Check the date picker shows January 2, 2025

#### Issue: Record exists but chart doesn't update
**Cause:** React memo cache not invalidating
**Solution:**
1. Check if `payPeriodsData` is updating (look at console logs)
2. Try selecting a different pay period and then back
3. Hard refresh the page (Ctrl+Shift+R)

### 4. Expected Behavior

When working correctly, the chart should show dates in chronological order:
```
Jan 2, Mar 11, Mar 12, Mar 13, Mar 14, Mar 17
```

The chart title should show the total number of days:
```
LER Trend (YTD) - 6 days
```

### 5. Quick Test

To verify the chart is working:
1. Look at the "Daily Performance Records" table
2. Count how many records have jobs (not called out, not 0 jobs)
3. The chart should show the same number of data points
4. The dates should match what's in the table

### 6. Date Format Clarification

When you enter **1/02/25** in the date picker:
- It should be stored as: `2025-01-02` (YYYY-MM-DD)
- It should display as: `Jan 2, 2025` in the table
- It should appear as: `Jan 2` in the chart

If you're seeing different dates, there might be a timezone issue or date format confusion.
