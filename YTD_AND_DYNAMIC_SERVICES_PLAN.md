# YTD Performance & Dynamic Services - Implementation Plan

## **Three Key Improvements:**

### **1. YTD/Calendar Year Performance Cards** ✅
### **2. View Filter (Pay Period vs YTD vs Year)** ✅  
### **3. Dynamic Service Selector** ✅

---

## **Problem 1: Performance Cards Show Only Current Pay Period**

### **Current Behavior:**
```
Average LER Card shows: 1.62 (for current pay period only)
```

### **Desired Behavior:**
```
View Toggle: [Pay Period] [YTD] [Calendar Year]

When YTD selected:
  Average LER: 1.58 (across all pay periods this year)
  Total Revenue: $45,230
  Total Hours: 287.5
  Total Bonus: $1,245
```

### **Solution:**
Add view filter with three modes:
1. **Pay Period** - Current selected period (existing)
2. **YTD** - Jan 1 to today
3. **Calendar Year** - Full year (Jan 1 - Dec 31)

---

## **Problem 2: No Way to View YTD Performance**

### **Current:**
- Can only see one pay period at a time
- No aggregate view across periods
- Can't track annual performance

### **Solution:**
Add filter buttons above KPI cards:
```tsx
<div className="flex gap-2 mb-4">
  <Button 
    variant={viewMode === 'period' ? 'default' : 'outline'}
    onClick={() => setViewMode('period')}
  >
    Current Period
  </Button>
  <Button 
    variant={viewMode === 'ytd' ? 'default' : 'outline'}
    onClick={() => setViewMode('ytd')}
  >
    Year to Date
  </Button>
  <Button 
    variant={viewMode === 'year' ? 'default' : 'outline'}
    onClick={() => setViewMode('year')}
  >
    Calendar Year
  </Button>
</div>
```

---

## **Problem 3: Service Types Are Hard-Coded**

### **Current Issue:**
```tsx
// Hard-coded in AddDailyRecordDialog
<Input label="Grill Jobs" />
<Input label="Oven Jobs" />
<Input label="Range Jobs" />
<Input label="Vent Hood Jobs" />
```

**Problems:**
- ❌ Can't add new service types
- ❌ Not universal for other businesses
- ❌ Requires code changes to add services

### **Desired Behavior:**
```tsx
// Dynamic service selector
<Label>Services Performed</Label>
{Object.keys(cogsSettings).map(serviceType => (
  <div key={serviceType}>
    <Label>{formatServiceName(serviceType)}</Label>
    <Input 
      type="number" 
      placeholder="Number performed"
      onChange={(e) => updateService(serviceType, e.target.value)}
    />
    <span className="text-xs">COGS: ${cogsSettings[serviceType]}</span>
  </div>
))}

<Button onClick={() => setShowAddService(true)}>
  + Add New Service Type
</Button>
```

---

## **Implementation Plan:**

### **Phase 1: Add View Mode Filter**

**1. Add State:**
```typescript
const [viewMode, setViewMode] = useState<'period' | 'ytd' | 'year'>('period');
```

**2. Calculate YTD/Year Data:**
```typescript
const ytdData = useMemo(() => {
  if (viewMode === 'period') return null;
  
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1); // Jan 1
  const endDate = viewMode === 'ytd' ? new Date() : new Date(currentYear, 11, 31);
  
  // Aggregate all daily records across all pay periods within date range
  const allRecords = payPeriodsData.flatMap(period => 
    period.dailyRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    })
  );
  
  return {
    totalRevenue: sum(allRecords.map(r => r.totalJobRevenue)),
    totalHours: sum(allRecords.map(r => r.totalHoursWorked)),
    totalBasePay: sum(allRecords.map(r => r.employeeBasePay)),
    totalBonus: sum(allRecords.map(r => r.appointmentBasedBonus)),
    avgLER: average(allRecords.map(r => r.ler)),
    totalGrossProfit: sum(allRecords.map(r => r.grossProfitBeforeBonus)),
    recordCount: allRecords.length
  };
}, [viewMode, payPeriodsData]);
```

**3. Update KPI Cards:**
```typescript
const displayData = viewMode === 'period' ? kpis : ytdData;
```

---

### **Phase 2: Dynamic Service Types**

**Current Database Schema:**
```sql
job_types JSONB {
  "grill": 1,
  "oven": 2,
  "range": 0,
  "ventHood": 2
}
```

**This is already flexible!** ✅ JSONB can store any service types.

**Changes Needed:**

**1. Update COGS Settings to Support Dynamic Services:**

```typescript
// Instead of fixed interface:
interface COGSSettings {
  grill: number;
  oven: number;
  range: number;
  ventHood: number;
}

// Use dynamic:
interface COGSSettings {
  [serviceType: string]: number;
}

// Or better - store in database:
CREATE TABLE service_types (
  id UUID PRIMARY KEY,
  user_id TEXT REFERENCES employee_info(user_id),
  service_name TEXT NOT NULL,
  service_key TEXT NOT NULL, -- e.g., "grill", "oven"
  cogs_cost DECIMAL(10,2) NOT NULL,
  display_order INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. Update AddDailyRecordDialog:**

```tsx
// Load services from COGS settings
const services = Object.keys(cogsSettings);

// Dynamic inputs
{services.map(serviceKey => (
  <div key={serviceKey}>
    <Label>{formatServiceName(serviceKey)}</Label>
    <Input
      type="number"
      min="0"
      value={jobTypes[serviceKey] || 0}
      onChange={(e) => setJobTypes({
        ...jobTypes,
        [serviceKey]: parseInt(e.target.value) || 0
      })}
    />
    <span className="text-xs text-muted-foreground">
      COGS: ${cogsSettings[serviceKey].toFixed(2)} per service
    </span>
  </div>
))}
```

**3. Add "Manage Services" Dialog:**

```tsx
<ManageServicesDialog>
  - Add new service type
  - Edit service name
  - Edit COGS cost
  - Delete service type
  - Reorder services
</ManageServicesDialog>
```

---

### **Phase 3: Database Migration**

**Option A: Keep JSONB (Simpler)**
- ✅ Already flexible
- ✅ No schema changes needed
- ✅ Works with any service types
- ⚠️ Need to handle missing keys gracefully

**Option B: Add service_types Table (Better Long-Term)**
- ✅ Proper relational structure
- ✅ Can add metadata (display names, icons, etc.)
- ✅ Better validation
- ⚠️ Requires migration

**Recommendation: Start with Option A, migrate to Option B later**

---

## **Implementation Steps:**

### **Step 1: Add View Mode Filter (Quick Win)**
1. Add view mode state
2. Add filter buttons
3. Calculate YTD/Year aggregates
4. Update KPI cards to use filtered data
5. Test with multiple pay periods

### **Step 2: Make Services Dynamic (Bigger Change)**
1. Update COGSSettings interface to be flexible
2. Update AddDailyRecordDialog to read from settings
3. Update COGSSettingsDialog to allow adding/removing services
4. Test with custom service types

### **Step 3: Add Service Management UI**
1. Create ManageServicesDialog
2. Add "Add Service" button
3. Add "Remove Service" button
4. Save to database

---

## **User Workflow After Changes:**

### **Viewing Performance:**
```
1. Open Employee LER page
2. See three buttons: [Current Period] [YTD] [Calendar Year]
3. Click "YTD"
4. See aggregate performance across all periods this year
5. Average LER, Total Revenue, Total Hours, etc.
```

### **Adding Custom Service:**
```
1. Click "Settings" → "COGS Settings"
2. See existing services (Grill, Oven, Range, Vent Hood)
3. Click "+ Add Service Type"
4. Enter: Name = "Fryer Cleaning", COGS = $18.50
5. Click "Save"
6. Now "Add Day" modal shows "Fryer Cleaning" input
7. Enter number of fryers cleaned
8. COGS automatically calculated
```

---

## **Benefits:**

### **YTD View:**
- ✅ Track annual performance
- ✅ See trends over time
- ✅ Compare periods
- ✅ Better business insights

### **Dynamic Services:**
- ✅ Universal for any business
- ✅ No code changes to add services
- ✅ Flexible COGS tracking
- ✅ Easy to customize

---

## **Next Steps:**

**Quick Win (30 min):**
- Add view mode filter
- Calculate YTD aggregates
- Update KPI cards

**Full Solution (2-3 hours):**
- Make services dynamic
- Add service management UI
- Database migration (if needed)
- Full testing

**Which would you like me to implement first?**
