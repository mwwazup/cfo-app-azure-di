# Debug: Table Not Updating After Edit

## Step-by-Step Debugging Process:

### 1. **Test the Edit Process**
1. Open the Financial Documents page
2. Click the blue edit button on a document
3. Change the netProfit value (e.g., from 25295.98 to 25296)
4. Click "Save Changes"
5. **Check browser console** for these logs:

**Expected Console Output:**
```
🔍 Editing document: {id: "...", summary_metrics: {...}}
✅ Database update successful!
🔍 Document ID: e12c02cc-9d2d-48db-8954-55723a684c98
🔍 Updated analysis_result that was saved: {...}
🔍 Document after save (from database): {...}
🔄 Force refreshing documents list...
🔄 Setting refreshed and transformed documents: [...]
```

### 2. **Check What's Actually Happening**
Look for these specific things in the console:

**A. Is the save working?**
- ✅ "Database update successful!" message
- ❌ Any error messages during save

**B. Is the data being saved correctly?**
- Check "Document after save (from database)" log
- Look for your edited value in `analysis_result.summary_metrics.netProfit`

**C. Is the UI state updating?**
- Check "Setting refreshed and transformed documents" log
- Look for your edited value in the transformed data

### 3. **Common Issues & Solutions**

**Issue 1: Save Fails Silently**
- Check for permission errors
- Verify Supabase user ID is correct

**Issue 2: Data Saves But UI Doesn't Update**
- Check if the transformation logic is working
- Verify the table is reading from the correct field

**Issue 3: Floating-Point Precision**
- Check if the rounding function is being applied
- Look for values like `25295.979999999996`

### 4. **Manual Database Check**
Run this in Supabase SQL Editor:
```sql
SELECT 
  id,
  analysis_result->'summary_metrics'->>'netProfit' as net_profit,
  analysis_result
FROM financial_documents 
WHERE id = 'e12c02cc-9d2d-48db-8954-55723a684c98';
```

### 5. **Force Refresh Test**
If the table still doesn't update:
1. Refresh the entire page (F5)
2. Check if the new values appear
3. This will tell us if it's a save issue or display issue

## Next Steps:
1. Follow the debugging process above
2. Share the console output with me
3. I'll help identify exactly where the issue is occurring
