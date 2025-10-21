# Supabase Integration Guide - Employee LER System

## ✅ Completed
1. **Service Layer Created**: `project/src/services/employeeLERService.ts`
2. **Database Tables Created**: `cogs_settings`, `company_settings`
3. **All CRUD Functions Ready**: Get, Create, Update, Delete operations

---

## 🔄 Changes Needed in EmployeeLERPage.tsx

### **1. Add Service Import**
```typescript
import * as employeeLERService from '../services/employeeLERService';
```

### **2. Replace Mock Data with Loading State**
**Remove:**
```typescript
useEffect(() => {
  if (payPeriodsData.length === 0) {
    setPayPeriodsData([/* mock data */]);
  }
}, []);
```

**Replace with:**
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadEmployeeData();
}, []);

async function loadEmployeeData() {
  setLoading(true);
  
  // Load employee info
  const empInfo = await employeeLERService.getEmployeeInfo();
  if (empInfo) {
    setEmployeeInfo({
      name: empInfo.name,
      position: empInfo.position,
      currentBaseRate: empInfo.current_base_rate
    });
    
    // Load pay periods
    const periods = await employeeLERService.getPayPeriods(empInfo.id!);
    
    // Load daily records for each period
    const periodsWithRecords = await Promise.all(
      periods.map(async (period) => {
        const records = await employeeLERService.getDailyRecords(period.id!);
        
        // Calculate totals
        const workingRecords = records.filter(r => !r.called_out && r.number_of_jobs > 0);
        
        return {
          periodName: period.period_name,
          startDate: period.start_date,
          endDate: period.end_date,
          dailyRecords: records,
          periodTotals: {
            totalJobs: workingRecords.reduce((sum, r) => sum + r.number_of_jobs, 0),
            totalRevenue: workingRecords.reduce((sum, r) => sum + r.total_job_revenue, 0),
            totalHoursWorked: workingRecords.reduce((sum, r) => sum + r.total_hours_worked, 0),
            avgLER: workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length,
            totalBonuses: workingRecords.reduce((sum, r) => sum + r.appointment_based_bonus, 0),
            totalTips: workingRecords.reduce((sum, r) => sum + r.tip_amount, 0),
            totalEmployeePay: workingRecords.reduce((sum, r) => sum + r.total_employee_pay, 0),
            avgGrossProfitPercent: workingRecords.reduce((sum, r) => sum + r.gross_profit_before_bonus_percent, 0) / workingRecords.length,
            netProfitAfterBonusPercent: workingRecords.reduce((sum, r) => sum + r.daily_net_profit_after_bonus_percent, 0) / workingRecords.length
          }
        };
      })
    );
    
    setPayPeriodsData(periodsWithRecords);
  }
  
  // Load settings
  const cogsSettings = await employeeLERService.getCOGSSettings();
  setCogsSettings(cogsSettings);
  Object.assign(COGS_CALCULATOR, cogsSettings);
  
  const companySettings = await employeeLERService.getCompanySettings();
  setCompanySettings(companySettings);
  Object.assign(COMPANY_SETTINGS, companySettings);
  
  setLoading(false);
}
```

### **3. Update COGS Settings Save**
```typescript
onSave={async (settings) => {
  setCogsSettings(settings);
  Object.assign(COGS_CALCULATOR, settings);
  
  const success = await employeeLERService.saveCOGSSettings(settings);
  if (success) {
    alert('COGS settings saved successfully!');
  } else {
    alert('Error saving COGS settings. Please try again.');
  }
}}
```

### **4. Update Company Settings Save**
```typescript
onSave={async (settings) => {
  setCompanySettings(settings);
  Object.assign(COMPANY_SETTINGS, settings);
  
  const success = await employeeLERService.saveCompanySettings(settings);
  if (success) {
    alert('Company settings saved successfully!');
  } else {
    alert('Error saving company settings. Please try again.');
  }
}}
```

### **5. Update Add Daily Record**
```typescript
onAdd={async (record) => {
  // Get current pay period ID from database
  const empInfo = await employeeLERService.getEmployeeInfo();
  if (!empInfo) return;
  
  const periods = await employeeLERService.getPayPeriods(empInfo.id!);
  const currentPeriod = periods[selectedPeriodIndex];
  
  const savedRecord = await employeeLERService.createDailyRecord(currentPeriod.id!, record);
  
  if (savedRecord) {
    // Reload data
    await loadEmployeeData();
  } else {
    alert('Error saving record. Please try again.');
  }
}}
```

### **6. Update Edit Daily Record**
```typescript
onUpdate={async (record) => {
  if (editingRecord) {
    // Get record ID from database
    const empInfo = await employeeLERService.getEmployeeInfo();
    if (!empInfo) return;
    
    const periods = await employeeLERService.getPayPeriods(empInfo.id!);
    const currentPeriod = periods[selectedPeriodIndex];
    const records = await employeeLERService.getDailyRecords(currentPeriod.id!);
    const recordToUpdate = records[editingRecord.index];
    
    const success = await employeeLERService.updateDailyRecord(recordToUpdate.id!, record);
    
    if (success) {
      setEditingRecord(null);
      await loadEmployeeData();
    } else {
      alert('Error updating record. Please try again.');
    }
  }
}}
```

### **7. Update Delete Daily Record**
```typescript
onClick={async () => {
  if (confirm('Are you sure you want to delete this record?')) {
    const empInfo = await employeeLERService.getEmployeeInfo();
    if (!empInfo) return;
    
    const periods = await employeeLERService.getPayPeriods(empInfo.id!);
    const currentPeriod = periods[selectedPeriodIndex];
    const records = await employeeLERService.getDailyRecords(currentPeriod.id!);
    const recordToDelete = records[index];
    
    const success = await employeeLERService.deleteDailyRecord(recordToDelete.id!);
    
    if (success) {
      await loadEmployeeData();
    } else {
      alert('Error deleting record. Please try again.');
    }
  }
}}
```

### **8. Update Edit Employee**
```typescript
onSave={async (info) => {
  setEmployeeInfo(info);
  const success = await employeeLERService.updateEmployeeInfo({
    name: info.name,
    position: info.position,
    current_base_rate: info.currentBaseRate
  });
  
  if (success) {
    setShowEditEmployee(false);
  } else {
    alert('Error updating employee info. Please try again.');
  }
}}
```

### **9. Add Loading State UI**
```typescript
if (loading) {
  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading employee data...</p>
      </div>
    </div>
  );
}
```

---

## 🎯 Implementation Steps

1. **Test Current Setup**
   - Verify tables exist in Supabase
   - Check RLS policies are active
   - Confirm user is authenticated

2. **Implement Changes**
   - Add service import
   - Replace mock data with `loadEmployeeData()`
   - Update all save handlers to use async functions
   - Add loading states

3. **Test Each Feature**
   - Load settings from database
   - Save COGS settings
   - Save company settings
   - Add daily record
   - Edit daily record
   - Delete daily record
   - Edit employee info

4. **Handle Edge Cases**
   - No employee info exists (show setup wizard)
   - No pay periods exist (prompt to create first period)
   - Network errors (show error messages)

---

## 📝 Next Steps

**Would you like me to:**
1. **Implement all changes at once** (replace entire EmployeeLERPage.tsx)
2. **Implement step-by-step** (one feature at a time)
3. **Create a new file** (EmployeeLERPageV2.tsx) so you can compare

**Choose your preferred approach!** 🚀
