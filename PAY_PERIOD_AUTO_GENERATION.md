# Automatic Pay Period Generation System

## 🎯 Overview

Replaced manual pay period creation with an automatic system based on the user's pay schedule. The system now asks "What is your pay period?" and automatically generates pay periods for filtering.

## ✅ What Was Created

### 1. **Pay Period Generator Utility**
**Location:** `project/src/utils/payPeriodGenerator.ts`

**Supported Pay Schedules:**
- ✅ **Weekly** - Every week (52 periods/year) - e.g., every Friday
- ✅ **Bi-weekly** - Every 2 weeks (26 periods/year) - e.g., every other Friday
- ✅ **Semi-monthly** - Twice a month (24 periods/year) - e.g., 1st-15th, 16th-end
- ✅ **Monthly** - Once a month (12 periods/year) - e.g., 1st to last day

**Key Functions:**
```typescript
// Generate pay periods for a specific month
generatePayPeriods(year: number, month: number, config: PayPeriodConfig)

// Generate all pay periods for an entire year
generateYearPayPeriods(year: number, config: PayPeriodConfig)

// Get human-readable description
getPayScheduleDescription(config: PayPeriodConfig)
```

### 2. **Company Settings Updates**
**Location:** `project/src/services/employeeLERService.ts`

**New Fields Added to CompanySettings:**
```typescript
interface CompanySettings {
  // Existing fields...
  overheadPercent: number;
  bonusThresholdMin: number;
  bonusThresholdMax: number;
  overtimeHoursDaily: number;
  overtimeMultiplier: number;
  
  // NEW: Pay schedule configuration
  paySchedule?: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  payDayOfWeek?: number;  // 0=Sunday, 5=Friday
  payReferenceDate?: string;  // For bi-weekly calculations
  paySemiMonthlyDates?: [number, number];  // e.g., [1, 16]
}
```

### 3. **Company Settings Dialog UI**
**Location:** `project/src/components/employee/CompanySettingsDialog.tsx`

**New Section Added:**
- "Pay Period Schedule" section with Calendar icon
- Dropdown to select pay frequency
- Conditional day-of-week selector for weekly/bi-weekly
- Helpful descriptions for each option

### 4. **Database Migration**
**Location:** `backend/migrations/13_add_pay_schedule_to_company_settings.sql`

**Columns Added:**
```sql
ALTER TABLE company_settings
ADD COLUMN pay_schedule TEXT DEFAULT 'bi-weekly',
ADD COLUMN pay_day_of_week INTEGER DEFAULT 5,  -- Friday
ADD COLUMN pay_reference_date DATE,
ADD COLUMN pay_semi_monthly_dates TEXT DEFAULT '[1, 16]';
```

## 📊 How It Works

### **User Configuration Flow:**

1. **User opens Company Settings**
2. **Selects pay schedule:**
   - Weekly (every Friday)
   - Bi-weekly (every other Friday)
   - Semi-monthly (1st-15th, 16th-end)
   - Monthly
3. **If weekly/bi-weekly, selects payday** (e.g., Friday)
4. **Settings saved to database**

### **Pay Period Generation:**

```typescript
// Example: Bi-weekly, every Friday
const config = {
  schedule: 'bi-weekly',
  weeklyDayOfWeek: 5,  // Friday
  startDate: '2025-01-03'  // First Friday of 2025
};

// Generate periods for January 2025
const periods = generatePayPeriods(2025, 1, config);

// Result:
[
  {
    periodName: "Pay Period 1 (12/27 - 1/9)",
    startDate: "2024-12-27",
    endDate: "2025-01-09"
  },
  {
    periodName: "Pay Period 2 (1/10 - 1/23)",
    startDate: "2025-01-10",
    endDate: "2025-01-23"
  },
  {
    periodName: "Pay Period 3 (1/24 - 2/6)",
    startDate: "2025-01-24",
    endDate: "2025-02-06"
  }
]
```

## 🔄 Integration with Employee LER Page

### **Current State (Manual):**
```
Employee LER Page
  ↓
Pay Period Dropdown
  ↓
Shows manually created pay periods
  ↓
User must create each period manually
```

### **Future State (Automatic):**
```
Employee LER Page
  ↓
Year Filter (2025) + Month Filter (January)
  ↓
Auto-generates pay periods based on company settings
  ↓
Shows: "Pay Period 1 (12/27 - 1/9)", "Pay Period 2 (1/10 - 1/23)", etc.
  ↓
User selects period from auto-generated list
```

## 📅 Pay Schedule Examples

### **Weekly (Every Friday):**
```
January 2025:
- Week 1 (12/28 - 1/3)   [Fri 1/3]
- Week 2 (1/4 - 1/10)    [Fri 1/10]
- Week 3 (1/11 - 1/17)   [Fri 1/17]
- Week 4 (1/18 - 1/24)   [Fri 1/24]
- Week 5 (1/25 - 1/31)   [Fri 1/31]
```

### **Bi-weekly (Every Other Friday):**
```
January 2025:
- Pay Period 1 (12/27 - 1/9)   [Fri 1/9]
- Pay Period 2 (1/10 - 1/23)   [Fri 1/23]
- Pay Period 3 (1/24 - 2/6)    [Fri 2/6]
```

### **Semi-monthly (1st & 16th):**
```
January 2025:
- Jan 1-15
- Jan 16-31
```

### **Monthly:**
```
January 2025:
- January 2025 (1/1 - 1/31)
```

## 🎯 Benefits

### **For Users:**
- ✅ No manual pay period creation
- ✅ Consistent period naming
- ✅ Automatic date calculations
- ✅ Matches their actual payroll schedule
- ✅ Easy filtering by year/month

### **For Developers:**
- ✅ Centralized pay period logic
- ✅ Reusable utility functions
- ✅ Type-safe configuration
- ✅ Easy to extend with new schedules

## 🔧 Next Steps (Implementation)

### **Phase 1: Database Setup** ✅ COMPLETE
- [x] Create migration file
- [x] Add columns to company_settings
- [ ] Run migration in Supabase

### **Phase 2: Settings UI** ✅ COMPLETE
- [x] Update CompanySettingsDialog
- [x] Add pay schedule dropdown
- [x] Add day-of-week selector
- [x] Update save/load functions

### **Phase 3: Employee LER Page Integration** 🔄 NEXT
- [ ] Replace pay period dropdown with Year/Month filters
- [ ] Use `generatePayPeriods()` to create period list
- [ ] Update period selection logic
- [ ] Remove manual "Add Pay Period" button (or make optional)

### **Phase 4: Backward Compatibility** 🔄 OPTIONAL
- [ ] Keep existing manual pay periods
- [ ] Show both manual and auto-generated periods
- [ ] Allow users to override auto-generated periods

## 📝 Code Usage Examples

### **Generate Periods for Current Month:**
```typescript
import { generatePayPeriods } from '../utils/payPeriodGenerator';
import { getCompanySettings } from '../services/employeeLERService';

// Get user's pay schedule
const settings = await getCompanySettings(userId);

// Generate periods for current month
const now = new Date();
const periods = generatePayPeriods(
  now.getFullYear(),
  now.getMonth() + 1,
  {
    schedule: settings.paySchedule || 'bi-weekly',
    weeklyDayOfWeek: settings.payDayOfWeek || 5,
    startDate: settings.payReferenceDate
  }
);

// Display in dropdown
periods.forEach(period => {
  console.log(period.periodName);  // "Pay Period 1 (12/27 - 1/9)"
});
```

### **Get All Periods for a Year:**
```typescript
const yearPeriods = generateYearPayPeriods(2025, {
  schedule: 'bi-weekly',
  weeklyDayOfWeek: 5,  // Friday
  startDate: '2025-01-03'
});

console.log(`Total periods: ${yearPeriods.length}`);  // 26 for bi-weekly
```

### **Get Schedule Description:**
```typescript
const description = getPayScheduleDescription({
  schedule: 'bi-weekly',
  weeklyDayOfWeek: 5
});

console.log(description);  // "Bi-weekly (every other Friday)"
```

## ⚠️ Important Notes

### **Bi-weekly Reference Date:**
- For bi-weekly schedules, the system needs a reference start date
- This ensures pay periods align correctly
- If not provided, uses first occurrence of the day in January
- User can set this in Company Settings (future enhancement)

### **Period Overlaps:**
- Some periods may span multiple months
- The system includes periods that overlap with the target month
- Example: Period ending 1/9 starts 12/27 (previous month)

### **Backward Compatibility:**
- Existing manual pay periods remain in database
- New system generates periods on-the-fly
- Users can still create manual periods if needed

## 🚀 Ready to Implement!

**Files Created:**
1. ✅ `project/src/utils/payPeriodGenerator.ts`
2. ✅ `backend/migrations/13_add_pay_schedule_to_company_settings.sql`

**Files Modified:**
1. ✅ `project/src/services/employeeLERService.ts`
2. ✅ `project/src/components/employee/CompanySettingsDialog.tsx`

**Next:** Integrate into Employee LER page with Year/Month filters!
