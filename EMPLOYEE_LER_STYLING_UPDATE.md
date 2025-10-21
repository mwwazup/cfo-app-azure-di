# Employee LER Page - Styling Update & Data Management

## ✅ Changes Applied

### 1. **New Gold Accent Styling**

All components now use the modern gold accent color palette:

#### **KPI Cards**
- **Background**: `bg-muted/30` - Subtle grey with 30% opacity
- **Border**: `border-accent/50` - Gold accent at 50% opacity
- **Icon Container**: `p-3 rounded-lg bg-accent/20` - Gold background at 20% opacity
- **Icons**: `h-5 w-5 text-accent` - Gold accent color
- **Labels**: `text-sm text-muted-foreground` - Muted grey text
- **Values**: `text-2xl font-bold text-foreground` - Large bold white text

#### **All Cards Updated**
✅ KPI Cards (4 cards)
✅ Pay Period Selector
✅ LER Trend Chart
✅ Job Type Distribution Chart
✅ Daily Records Table
✅ Period Summary
✅ LER Explanation Card

### 2. **Color Palette Applied**

```css
/* Gold Accent Variations */
text-accent          /* Full gold for icons and emphasis */
bg-accent/10         /* Very light gold background */
bg-accent/20         /* Light gold for icon containers */
bg-accent/50         /* Medium gold for borders */
bg-accent            /* Full gold for buttons */

/* Grey Backgrounds */
bg-muted/30          /* Card backgrounds */
bg-muted/50          /* Darker sections */

/* Text Colors */
text-foreground      /* Primary white text */
text-muted-foreground /* Secondary grey text */
text-accent          /* Gold accent text */
```

### 3. **Data Management Features**

#### **Current Data Structure**

The page currently shows **dummy data from your CSV** with:
- **1 Pay Period**: "12/26 thru 1/10"
- **3 Daily Records**: Sample days from the CSV
- All calculations are based on this sample data

#### **How to Add More Data**

The page is now set up with state management to allow adding/editing records:

**State Variables Added:**
```typescript
const [payPeriodsData, setPayPeriodsData] = useState<PayPeriod[]>([]);
const [isAddingRecord, setIsAddingRecord] = useState(false);
const [editingRecordIndex, setEditingRecordIndex] = useState<number | null>(null);
```

**"Add Day" Button:**
- Located in the Daily Records table header
- Gold accent styling: `bg-accent hover:bg-accent/90`
- Click to add new daily records

### 4. **Next Steps to Make Data Editable**

To fully enable data management, you'll need to add:

#### **A. Add Record Dialog/Form**

Create a form component to add new daily records:

```typescript
interface DailyRecordForm {
  workDay: string;          // e.g., "Monday"
  date: string;             // e.g., "12/27/24"
  numberOfJobs: number;
  jobTypes: {
    grill: number;
    oven: number;
    range: number;
    ventHood: number;
  };
  totalJobRevenue: number;
  totalHoursWorked: number;
  tipAmount: number;
  notes: string;
}
```

#### **B. Add Functions to Manage Data**

```typescript
// Add new daily record
const addDailyRecord = (record: DailyRecord) => {
  const updatedPeriods = [...payPeriodsData];
  updatedPeriods[selectedPeriodIndex].dailyRecords.push(record);
  
  // Recalculate period totals
  updatedPeriods[selectedPeriodIndex].periodTotals = calculatePeriodTotals(
    updatedPeriods[selectedPeriodIndex].dailyRecords
  );
  
  setPayPeriodsData(updatedPeriods);
};

// Edit existing record
const updateDailyRecord = (index: number, record: DailyRecord) => {
  const updatedPeriods = [...payPeriodsData];
  updatedPeriods[selectedPeriodIndex].dailyRecords[index] = record;
  
  // Recalculate period totals
  updatedPeriods[selectedPeriodIndex].periodTotals = calculatePeriodTotals(
    updatedPeriods[selectedPeriodIndex].dailyRecords
  );
  
  setPayPeriodsData(updatedPeriods);
};

// Delete record
const deleteDailyRecord = (index: number) => {
  const updatedPeriods = [...payPeriodsData];
  updatedPeriods[selectedPeriodIndex].dailyRecords.splice(index, 1);
  
  // Recalculate period totals
  updatedPeriods[selectedPeriodIndex].periodTotals = calculatePeriodTotals(
    updatedPeriods[selectedPeriodIndex].dailyRecords
  );
  
  setPayPeriodsData(updatedPeriods);
};

// Calculate period totals from daily records
const calculatePeriodTotals = (records: DailyRecord[]) => {
  const workingRecords = records.filter(r => !r.calledOut && r.numberOfJobs > 0);
  
  return {
    totalJobs: workingRecords.reduce((sum, r) => sum + r.numberOfJobs, 0),
    totalRevenue: workingRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
    totalHoursWorked: workingRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
    avgLER: workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length,
    totalBonuses: workingRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0),
    totalTips: workingRecords.reduce((sum, r) => sum + r.tipAmount, 0),
    totalEmployeePay: workingRecords.reduce((sum, r) => sum + r.totalEmployeePay, 0),
    avgGrossProfitPercent: workingRecords.reduce((sum, r) => sum + r.grossProfitBeforeBonusPercent, 0) / workingRecords.length,
    netProfitAfterBonusPercent: workingRecords.reduce((sum, r) => sum + r.dailyNetProfitAfterBonusPercent, 0) / workingRecords.length
  };
};
```

#### **C. Add Edit/Delete Buttons to Table Rows**

Add action buttons to each row in the daily records table:

```tsx
<td className="py-3 px-4">
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        setEditingRecordIndex(index);
        setIsAddingRecord(true);
      }}
    >
      <Edit className="w-4 h-4 text-accent" />
    </Button>
    <Button
      size="sm"
      variant="ghost"
      onClick={() => deleteDailyRecord(index)}
    >
      <Trash2 className="w-4 h-4 text-red-500" />
    </Button>
  </div>
</td>
```

#### **D. Add More Pay Periods**

Create a function to add new pay periods:

```typescript
const addPayPeriod = (periodName: string, startDate: string, endDate: string) => {
  const newPeriod: PayPeriod = {
    periodName,
    startDate,
    endDate,
    dailyRecords: [],
    periodTotals: {
      totalJobs: 0,
      totalRevenue: 0,
      totalHoursWorked: 0,
      avgLER: 0,
      totalBonuses: 0,
      totalTips: 0,
      totalEmployeePay: 0,
      avgGrossProfitPercent: 0,
      netProfitAfterBonusPercent: 0
    }
  };
  
  setPayPeriodsData([...payPeriodsData, newPeriod]);
};
```

### 5. **Automatic Calculations**

When you add or edit records, the system should automatically calculate:

✅ **LER** = Gross Profit Before Bonus ÷ Employee Base Pay
✅ **Bonus Qualification** = LER >= 0.7 threshold
✅ **Bonus Amount** = Based on LER and hours worked
✅ **Total Employee Pay** = Base Pay + Bonus + Tips
✅ **Net Profit** = Revenue - (Employee Pay + COGS + Overhead)
✅ **Period Totals** = Sum of all daily records

### 6. **Example: Adding a New Day**

When user clicks "Add Day":

1. **Show Form** with fields:
   - Date picker
   - Day of week dropdown
   - Number of jobs
   - Job type breakdown (Grill, Oven, Range, Vent Hood)
   - Revenue amount
   - Hours worked
   - Tips received
   - Notes (optional)

2. **Calculate Automatically**:
   - Employee base pay (hours × base rate)
   - COGS (based on job types)
   - Overhead (32% of revenue)
   - Gross profit
   - LER score
   - Bonus qualification and amount
   - Net profit

3. **Add to Period**:
   - Insert into dailyRecords array
   - Recalculate period totals
   - Update charts and KPIs
   - Save to database (future)

### 7. **Data Persistence**

Currently, data is stored in component state (resets on page refresh).

**To persist data:**

1. **Option A: Local Storage**
   ```typescript
   // Save to localStorage
   useEffect(() => {
     localStorage.setItem('employeeLERData', JSON.stringify(payPeriodsData));
   }, [payPeriodsData]);
   
   // Load from localStorage
   useEffect(() => {
     const saved = localStorage.getItem('employeeLERData');
     if (saved) {
       setPayPeriodsData(JSON.parse(saved));
     }
   }, []);
   ```

2. **Option B: Database (Recommended)**
   - Create `employee_ler_records` table in Supabase
   - Use the `useEmployeeLER` hook (already created)
   - Save/update records via API calls

### 8. **CSV Import Feature**

To import your full CSV file:

1. **Create Upload Button**
   ```tsx
   <input
     type="file"
     accept=".csv"
     onChange={handleCSVUpload}
     className="hidden"
     id="csv-upload"
   />
   <Button onClick={() => document.getElementById('csv-upload')?.click()}>
     <Upload className="w-4 h-4 mr-2" />
     Import CSV
   </Button>
   ```

2. **Parse CSV**
   ```typescript
   const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     const text = await file.text();
     const rows = text.split('\n');
     
     // Parse CSV rows into DailyRecord objects
     const records = parseCSVRows(rows);
     
     // Add to current period or create new period
     addRecordsToPeriod(records);
   };
   ```

## 🎨 Visual Changes Summary

### Before (Old Styling)
- Dark grey cards: `bg-[rgb(31,41,55)]`
- Grey borders: `border-gray-700`
- Blue/green/yellow accent colors
- Standard icon sizes

### After (New Gold Accent Styling)
- Subtle grey cards: `bg-muted/30`
- Gold borders: `border-accent/50`
- **Consistent gold accent** throughout
- Icon containers with gold background
- Modern, cohesive design

## 📊 Current Data Status

**Pay Periods**: 1 (12/26 thru 1/10)
**Daily Records**: 3 sample days
**Status**: ✅ Dummy data from CSV
**Editable**: 🔄 State management ready, UI forms needed

## 🚀 Quick Start to Add Data

1. **Click "Add Day"** button (already added)
2. **Create form component** (next step)
3. **Fill in daily details**
4. **System calculates** LER, bonuses, profits automatically
5. **Data updates** charts and KPIs in real-time

---

**The styling is complete!** The page now has the beautiful gold accent theme. The next step is to build the form components to actually add/edit the data. 🎯
