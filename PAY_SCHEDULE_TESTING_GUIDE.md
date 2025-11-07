# Pay Schedule Testing Guide

## ✅ Migration Complete - How to See the Changes

### **Step 1: Open the App**
- Navigate to: `http://localhost:5174`
- Go to the **Employee LER** page

### **Step 2: Open Company Settings**
- Look for the **Settings (gear) icon** in the top right corner
- Click it to open the Company Settings dialog

### **Step 3: Verify New Section Appears**
You should now see a **new section** at the bottom of the dialog:

```
┌─────────────────────────────────────────┐
│  📅 Pay Period Schedule                 │
├─────────────────────────────────────────┤
│  How often do you pay employees?        │
│  [Dropdown: Bi-weekly (26 periods/year)]│
│                                          │
│  What day of the week is payday?        │
│  [Dropdown: Friday]                      │
└─────────────────────────────────────────┘
```

### **Step 4: Test the Settings**

1. **Select a pay schedule:**
   - Weekly (52 periods/year)
   - Bi-weekly (26 periods/year) ← DEFAULT
   - Semi-monthly (24 periods/year)
   - Monthly (12 periods/year)

2. **If you selected Weekly or Bi-weekly:**
   - A second dropdown appears: "What day of the week is payday?"
   - Select your payday (Monday, Tuesday, ..., Friday, etc.)

3. **Click "Save Company Settings"**

4. **Verify it saved:**
   - You should see: "Company settings saved successfully!"
   - Close and reopen the dialog
   - Your selections should be preserved

### **Step 5: Check Database (Optional)**

Open Supabase and check the `company_settings` table:

```sql
SELECT 
  pay_schedule,
  pay_day_of_week,
  pay_reference_date,
  pay_semi_monthly_dates
FROM company_settings
WHERE user_id = 'your_user_id';
```

You should see:
- `pay_schedule`: 'bi-weekly' (or whatever you selected)
- `pay_day_of_week`: 5 (for Friday, or your selection)
- `pay_reference_date`: NULL (will be set automatically)
- `pay_semi_monthly_dates`: '[1, 16]'

## 🐛 Troubleshooting

### **Issue: Don't see the new section**

**Check 1: Clear browser cache**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**Check 2: Verify migration ran**
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'company_settings'
AND column_name IN ('pay_schedule', 'pay_day_of_week');
```

**Check 3: Check browser console for errors**
- Open DevTools (F12)
- Look for TypeScript or React errors
- Common issue: Select component not imported

### **Issue: Dropdown not working**

**Check:** Make sure the Select component is properly imported:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
```

### **Issue: Settings not saving**

**Check 1: User authenticated**
- Make sure you're logged in with Clerk
- Check `dbUserId` is not null

**Check 2: Database permissions**
- Verify RLS policies allow updates to `company_settings`

**Check 3: Check network tab**
- Look for Supabase API calls
- Verify no 401/403 errors

## 📊 What's Next?

Once the pay schedule is saved, you can:

1. **Use it in code:**
```typescript
const settings = await getCompanySettings(userId);
console.log(settings.paySchedule);  // 'bi-weekly'
console.log(settings.payDayOfWeek); // 5 (Friday)
```

2. **Generate pay periods:**
```typescript
import { generatePayPeriods } from '../utils/payPeriodGenerator';

const periods = generatePayPeriods(2025, 1, {
  schedule: settings.paySchedule,
  weeklyDayOfWeek: settings.payDayOfWeek
});

// Result: Auto-generated pay periods for January 2025
```

3. **Integrate into Employee LER filters** (Next phase)
   - Replace manual pay period dropdown
   - Add Year/Month filters
   - Auto-generate periods based on saved settings

## ✅ Success Criteria

You'll know it's working when:
- ✅ Settings dialog shows "Pay Period Schedule" section
- ✅ You can select a pay schedule
- ✅ Day-of-week dropdown appears for weekly/bi-weekly
- ✅ Settings save successfully
- ✅ Settings persist when you reopen the dialog
- ✅ Database shows the saved values

## 🎯 Current Status

**Completed:**
- ✅ Database migration
- ✅ Company settings interface updated
- ✅ UI dialog updated
- ✅ Save/load functions updated
- ✅ Pay period generator utility created

**Next:**
- 🔄 Integrate into Employee LER page filters
- 🔄 Replace manual pay period creation with auto-generation
- 🔄 Add Year/Month filter dropdowns
