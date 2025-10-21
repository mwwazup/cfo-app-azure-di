# Employee LER Page - Complete Implementation Plan

## 🎯 Issues Identified & Solutions

### **Issue 1: Styling doesn't match Budget vs Actual page**

**Problem:** Using old dark theme styling instead of the new design system

**Solution:**
- Change container from `bg-[rgb(17,24,39)]` to `container mx-auto`
- Use `bg-muted/30` for KPI cards (matches Budget vs Actual)
- Use `text-foreground` and `text-muted-foreground` for text
- Match exact card structure with `bg-accent/20` icon containers
- Use standard `Card` components without custom backgrounds

**Reference:** Budget vs Actual page uses:
```tsx
<Card className="bg-muted/30">
  <CardContent className="pt-6">
    <div className="flex items-start gap-3">
      <div className="p-3 rounded-lg bg-accent/20">
        <DollarSign className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">Label</p>
        <div className="text-2xl font-bold text-foreground mt-1">Value</div>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### **Issue 2: Need Supabase database tables**

**YES - You need 3 new tables:**

#### **Table 1: `employee_info`**
```sql
CREATE TABLE employee_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  current_base_rate DECIMAL(10,2) NOT NULL,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE employee_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own employees"
  ON employee_info FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own employees"
  ON employee_info FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own employees"
  ON employee_info FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own employees"
  ON employee_info FOR DELETE
  USING (auth.uid() = user_id);
```

#### **Table 2: `pay_periods`**
```sql
CREATE TABLE pay_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employee_info(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_jobs INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_hours_worked DECIMAL(10,2) DEFAULT 0,
  avg_ler DECIMAL(10,4) DEFAULT 0,
  total_bonuses DECIMAL(10,2) DEFAULT 0,
  total_tips DECIMAL(10,2) DEFAULT 0,
  total_employee_pay DECIMAL(10,2) DEFAULT 0,
  avg_gross_profit_percent DECIMAL(10,2) DEFAULT 0,
  net_profit_after_bonus_percent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pay periods"
  ON pay_periods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pay periods"
  ON pay_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pay periods"
  ON pay_periods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pay periods"
  ON pay_periods FOR DELETE
  USING (auth.uid() = user_id);
```

#### **Table 3: `employee_daily_records`**
```sql
CREATE TABLE employee_daily_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employee_info(id) ON DELETE CASCADE,
  pay_period_id UUID REFERENCES pay_periods(id) ON DELETE CASCADE,
  work_day TEXT NOT NULL,
  date DATE NOT NULL,
  called_out BOOLEAN DEFAULT false,
  number_of_jobs INTEGER DEFAULT 0,
  jobs_grill INTEGER DEFAULT 0,
  jobs_oven INTEGER DEFAULT 0,
  jobs_range INTEGER DEFAULT 0,
  jobs_vent_hood INTEGER DEFAULT 0,
  total_job_revenue DECIMAL(10,2) DEFAULT 0,
  total_hours_worked DECIMAL(10,2) DEFAULT 0,
  total_job_time DECIMAL(10,2) DEFAULT 0,
  employee_base_pay DECIMAL(10,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  cogs_no_labor DECIMAL(10,2) DEFAULT 0,
  cogs_no_labor_percent DECIMAL(10,2) DEFAULT 0,
  overhead_costs_percent DECIMAL(10,2) DEFAULT 32.00,
  gross_profit_before_bonus DECIMAL(10,2) DEFAULT 0,
  gross_profit_before_bonus_percent DECIMAL(10,2) DEFAULT 0,
  ler DECIMAL(10,4) DEFAULT 0,
  qualify_for_bonus BOOLEAN DEFAULT false,
  bonus_qualified_for_percent DECIMAL(10,2) DEFAULT 0,
  appointment_based_bonus DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  total_employee_pay DECIMAL(10,2) DEFAULT 0,
  daily_hourly_with_tips_and_bonus DECIMAL(10,2) DEFAULT 0,
  daily_net_profit_after_bonus DECIMAL(10,2) DEFAULT 0,
  daily_net_profit_after_bonus_percent DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE employee_daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily records"
  ON employee_daily_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily records"
  ON employee_daily_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily records"
  ON employee_daily_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily records"
  ON employee_daily_records FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_daily_records_employee ON employee_daily_records(employee_id);
CREATE INDEX idx_daily_records_period ON employee_daily_records(pay_period_id);
CREATE INDEX idx_daily_records_date ON employee_daily_records(date);
```

---

### **Issue 3: No way to edit or add pay periods**

**Solution:** Create dialog components

#### **Component: AddPayPeriodDialog.tsx**
```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface AddPayPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (period: { periodName: string; startDate: string; endDate: string }) => void;
}

export function AddPayPeriodDialog({ open, onClose, onAdd }: AddPayPeriodDialogProps) {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!periodName || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }
    onAdd({ periodName, startDate, endDate });
    setPeriodName('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Pay Period</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Period Name</Label>
            <Input
              placeholder="e.g., 12/26 thru 1/10"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
            />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Period</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### **Issue 4: No way to add or edit tech's pay rate**

**Solution:** Create employee edit dialog

#### **Component: EditEmployeeDialog.tsx**
```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface EmployeeInfo {
  name: string;
  position: string;
  currentBaseRate: number;
}

interface EditEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeInfo;
  onSave: (employee: EmployeeInfo) => void;
}

export function EditEmployeeDialog({ open, onClose, employee, onSave }: EditEmployeeDialogProps) {
  const [name, setName] = useState(employee.name);
  const [position, setPosition] = useState(employee.position);
  const [baseRate, setBaseRate] = useState(employee.currentBaseRate.toString());

  useEffect(() => {
    setName(employee.name);
    setPosition(employee.position);
    setBaseRate(employee.currentBaseRate.toString());
  }, [employee]);

  const handleSubmit = () => {
    if (!name || !position || !baseRate) {
      alert('Please fill in all fields');
      return;
    }
    onSave({
      name,
      position,
      currentBaseRate: parseFloat(baseRate)
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Position</Label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div>
            <Label>Base Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### **Issue 5: "Add Day" button does nothing**

**Solution:** Create add daily record dialog

#### **Component: AddDailyRecordDialog.tsx**
```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface AddDailyRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (record: any) => void;
  baseRate: number;
}

export function AddDailyRecordDialog({ open, onClose, onAdd, baseRate }: AddDailyRecordDialogProps) {
  const [date, setDate] = useState('');
  const [grillJobs, setGrillJobs] = useState('0');
  const [ovenJobs, setOvenJobs] = useState('0');
  const [rangeJobs, setRangeJobs] = useState('0');
  const [ventHoodJobs, setVentHoodJobs] = useState('0');
  const [revenue, setRevenue] = useState('0');
  const [hours, setHours] = useState('0');
  const [tips, setTips] = useState('0');
  const [notes, setNotes] = useState('');

  const calculateLER = () => {
    const totalRevenue = parseFloat(revenue);
    const totalHours = parseFloat(hours);
    const basePay = totalHours * baseRate;
    const cogs = totalRevenue * 0.05; // 5% COGS estimate
    const overhead = totalRevenue * 0.32; // 32% overhead
    const grossProfit = totalRevenue - cogs - overhead - basePay;
    const ler = basePay > 0 ? grossProfit / basePay : 0;
    return ler;
  };

  const handleSubmit = () => {
    if (!date || parseFloat(hours) === 0) {
      alert('Please fill in date and hours worked');
      return;
    }

    const totalJobs = parseInt(grillJobs) + parseInt(ovenJobs) + parseInt(rangeJobs) + parseInt(ventHoodJobs);
    const totalRevenue = parseFloat(revenue);
    const totalHours = parseFloat(hours);
    const basePay = totalHours * baseRate;
    const cogs = totalRevenue * 0.05;
    const overhead = totalRevenue * 0.32;
    const grossProfit = totalRevenue - cogs - overhead - basePay;
    const ler = basePay > 0 ? grossProfit / basePay : 0;
    const qualifyForBonus = ler >= 0.7;
    const bonus = qualifyForBonus ? totalRevenue * 0.0556 : 0; // 5.56% bonus
    const totalPay = basePay + bonus + parseFloat(tips);
    const netProfit = grossProfit - bonus;

    const record = {
      workDay: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      date: new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      calledOut: false,
      numberOfJobs: totalJobs,
      jobTypes: {
        grill: parseInt(grillJobs),
        oven: parseInt(ovenJobs),
        range: parseInt(rangeJobs),
        ventHood: parseInt(ventHoodJobs)
      },
      totalJobRevenue: totalRevenue,
      totalHoursWorked: totalHours,
      totalJobTime: totalHours,
      employeeBasePay: basePay,
      overtimeHours: 0,
      overtimePay: 0,
      cogsNoLabor: cogs,
      cogsNoLaborPercent: (cogs / totalRevenue) * 100,
      overheadCostsPercent: 32,
      grossProfitBeforeBonus: grossProfit,
      grossProfitBeforeBonusPercent: (grossProfit / totalRevenue) * 100,
      ler: ler,
      qualifyForBonus: qualifyForBonus,
      bonusQualifiedForPercent: qualifyForBonus ? 5.56 : 0,
      appointmentBasedBonus: bonus,
      tipAmount: parseFloat(tips),
      totalEmployeePay: totalPay,
      dailyHourlyWithTipsAndBonus: totalPay / totalHours,
      dailyNetProfitAfterBonus: netProfit,
      dailyNetProfitAfterBonusPercent: (netProfit / totalRevenue) * 100,
      notes: notes
    };

    onAdd(record);
    // Reset form
    setDate('');
    setGrillJobs('0');
    setOvenJobs('0');
    setRangeJobs('0');
    setVentHoodJobs('0');
    setRevenue('0');
    setHours('0');
    setTips('0');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Daily Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label>Grill Jobs</Label>
              <Input type="number" value={grillJobs} onChange={(e) => setGrillJobs(e.target.value)} />
            </div>
            <div>
              <Label>Oven Jobs</Label>
              <Input type="number" value={ovenJobs} onChange={(e) => setOvenJobs(e.target.value)} />
            </div>
            <div>
              <Label>Range Jobs</Label>
              <Input type="number" value={rangeJobs} onChange={(e) => setRangeJobs(e.target.value)} />
            </div>
            <div>
              <Label>Vent Hood Jobs</Label>
              <Input type="number" value={ventHoodJobs} onChange={(e) => setVentHoodJobs(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Revenue ($)</Label>
              <Input type="number" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            </div>
            <div>
              <Label>Hours Worked</Label>
              <Input type="number" step="0.01" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Tips ($)</Label>
            <Input type="number" step="0.01" value={tips} onChange={(e) => setTips(e.target.value)} />
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Calculated LER Preview:</div>
            <div className="text-2xl font-bold text-foreground">
              {calculateLER().toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {calculateLER() >= 1.0 ? '✅ Excellent' : calculateLER() >= 0.7 ? '⚠️ Good' : '❌ Needs Improvement'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Record</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Database Setup** ✅
- [ ] Run SQL scripts to create 3 tables in Supabase
- [ ] Verify RLS policies are working
- [ ] Test insert/select with your user account

### **Phase 2: Create Dialog Components** ✅
- [ ] Create `AddPayPeriodDialog.tsx`
- [ ] Create `EditEmployeeDialog.tsx`
- [ ] Create `AddDailyRecordDialog.tsx`
- [ ] Create `Dialog` component if not exists (from shadcn/ui)

### **Phase 3: Update EmployeeLERPage** ✅
- [ ] Fix styling to match Budget vs Actual
- [ ] Add state for dialogs (open/close)
- [ ] Wire up "Edit Employee" button
- [ ] Wire up "Add Pay Period" button
- [ ] Wire up "Add Day" button
- [ ] Add functions to save data to Supabase

### **Phase 4: Create API Hooks** ✅
- [ ] Create `useEmployeeLER.ts` hook (already exists)
- [ ] Add mutations for CRUD operations
- [ ] Integrate with React Query for caching

### **Phase 5: Testing** ✅
- [ ] Test adding employee
- [ ] Test editing pay rate
- [ ] Test adding pay period
- [ ] Test adding daily records
- [ ] Test LER calculations
- [ ] Test data persistence

---

## 🚀 Quick Start Commands

### **1. Create Database Tables**
```sql
-- Run in Supabase SQL Editor
-- Copy/paste the 3 CREATE TABLE statements above
```

### **2. Install Dialog Component** (if needed)
```bash
npx shadcn-ui@latest add dialog
```

### **3. Test the Page**
- Navigate to `/employee-ler`
- Click "Edit Employee" - should show dialog
- Click "Add Pay Period" - should show dialog
- Click "Add Day" - should show dialog with calculations

---

**Status:** Ready for implementation! All components and database schema defined. 🎯
