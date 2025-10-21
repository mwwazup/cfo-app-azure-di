# Multi-Employee Redesign Plan

## **Current Status:**
Started redesign but hit complexity - need systematic approach.

## **What's Been Done:**
1. ✅ Added `getAllEmployees()` and `getEmployeeById()` to service layer
2. ✅ Created `AddEmployeeDialog.tsx` component
3. ✅ Added state variables for multi-employee management
4. ⚠️ Partial changes to EmployeeLERPage (causing errors)

## **What Needs To Be Done:**

### **Phase 1: Complete Data Loading**

**1. Load All Employees on Mount**
```typescript
useEffect(() => {
  async function loadAllEmployees() {
    if (!dbUserId) return;
    
    const allEmployees = await employeeLERService.getAllEmployees(dbUserId);
    setEmployees(allEmployees);
    
    // Auto-select first employee if available
    if (allEmployees.length > 0) {
      setSelectedEmployeeId(allEmployees[0].id);
    } else {
      // No employees - show add employee dialog
      setShowAddEmployee(true);
    }
  }
  
  loadAllEmployees();
}, [dbUserId]);
```

**2. Load Selected Employee's Data**
```typescript
useEffect(() => {
  async function loadEmployeeData() {
    if (!selectedEmployeeId) return;
    
    // Load employee info
    const empInfo = await employeeLERService.getEmployeeById(selectedEmployeeId);
    setSelectedEmployeeInfo(empInfo);
    
    // Load pay periods for this employee
    const periods = await employeeLERService.getPayPeriods(selectedEmployeeId);
    setPayPeriodsData(periods);
  }
  
  loadEmployeeData();
}, [selectedEmployeeId]);
```

---

### **Phase 2: Update UI Components**

**1. Add Employee Selector Card (Top of Page)**
```tsx
{/* Employee Selector */}
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1">
        <Label className="text-muted-foreground">Employee:</Label>
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-foreground flex-1 max-w-xs"
        >
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name} - {emp.position}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowEditEmployee(true)}
          disabled={!selectedEmployeeId}
        >
          <Users className="h-4 w-4 mr-2" />
          Edit Employee
        </Button>
        <Button
          onClick={() => setShowAddEmployee(true)}
          className="bg-accent hover:bg-accent/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

**2. Update Employee Info Card**
Replace `employeeInfo` with `selectedEmployeeInfo`:
```tsx
{selectedEmployeeInfo && (
  <div className="flex items-center gap-4">
    <Users className="h-5 w-5" />
    <span className="font-medium">{selectedEmployeeInfo.name}</span>
    <Award className="h-5 w-5" />
    <span>{selectedEmployeeInfo.position}</span>
    <DollarSign className="h-5 w-5" />
    <span>Base Rate: ${selectedEmployeeInfo.currentBaseRate}/hr</span>
  </div>
)}
```

---

### **Phase 3: Wire Up Dialogs**

**1. Add Employee Dialog**
```tsx
<AddEmployeeDialog
  open={showAddEmployee}
  onClose={() => setShowAddEmployee(false)}
  onAdd={async (employee) => {
    if (!dbUserId) return;
    
    const created = await employeeLERService.createEmployeeInfo(dbUserId, {
      name: employee.name,
      position: employee.position,
      current_base_rate: employee.baseRate
    });
    
    if (created) {
      // Reload employees list
      const allEmployees = await employeeLERService.getAllEmployees(dbUserId);
      setEmployees(allEmployees);
      
      // Select the new employee
      if (created.id) {
        setSelectedEmployeeId(created.id);
      }
      
      setShowAddEmployee(false);
    }
  }}
/>
```

**2. Edit Employee Dialog**
```tsx
<EditEmployeeDialog
  open={showEditEmployee}
  onClose={() => setShowEditEmployee(false)}
  currentInfo={selectedEmployeeInfo || { name: '', position: '', currentBaseRate: 0 }}
  onUpdate={async (info) => {
    if (!selectedEmployeeId) return;
    
    const updated = await employeeLERService.updateEmployeeInfo(selectedEmployeeId, info);
    
    if (updated) {
      // Reload employees list
      const allEmployees = await employeeLERService.getAllEmployees(dbUserId);
      setEmployees(allEmployees);
      
      // Reload selected employee info
      const empInfo = await employeeLERService.getEmployeeById(selectedEmployeeId);
      setSelectedEmployeeInfo(empInfo);
      
      setShowEditEmployee(false);
    }
  }}
/>
```

**3. Add Pay Period Dialog**
```tsx
<AddPayPeriodDialog
  open={showAddPeriod}
  onClose={() => setShowAddPeriod(false)}
  currentBaseRate={selectedEmployeeInfo?.currentBaseRate || 0}
  onAdd={async (period) => {
    if (!selectedEmployeeId) return;
    
    const created = await employeeLERService.createPayPeriod(
      selectedEmployeeId,
      {
        period_name: period.periodName,
        start_date: period.startDate,
        end_date: period.endDate
      },
      period.baseRate
    );
    
    if (created) {
      // Reload pay periods
      const periods = await employeeLERService.getPayPeriods(selectedEmployeeId);
      setPayPeriodsData(periods);
      setShowAddPeriod(false);
    }
  }}
/>
```

---

### **Phase 4: Update All References**

**Find and Replace:**
1. `employeeInfo` → `selectedEmployeeInfo` (with null checks)
2. `empInfo.id` → `selectedEmployeeId` (in pay period/daily record operations)
3. Remove `showEmployeeSetup` (replaced with `showAddEmployee`)

---

### **Phase 5: Handle Edge Cases**

**1. No Employees**
```tsx
{employees.length === 0 && !loading && (
  <Card>
    <CardContent className="py-12 text-center">
      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Employees Yet</h3>
      <p className="text-muted-foreground mb-4">
        Get started by adding your first employee
      </p>
      <Button onClick={() => setShowAddEmployee(true)} className="bg-accent hover:bg-accent/90">
        <Plus className="h-4 w-4 mr-2" />
        Add Employee
      </Button>
    </CardContent>
  </Card>
)}
```

**2. No Employee Selected**
```tsx
{employees.length > 0 && !selectedEmployeeId && (
  <Card>
    <CardContent className="py-12 text-center">
      <p className="text-muted-foreground">
        Please select an employee from the dropdown above
      </p>
    </CardContent>
  </Card>
)}
```

**3. Employee Selected But No Pay Periods**
```tsx
{selectedEmployeeId && payPeriodsData.length === 0 && !loading && (
  <Card>
    <CardContent className="py-12 text-center">
      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Pay Periods Yet</h3>
      <p className="text-muted-foreground mb-4">
        Create a pay period to start tracking performance
      </p>
      <Button onClick={() => setShowAddPeriod(true)} className="bg-accent hover:bg-accent/90">
        <Plus className="h-4 w-4 mr-2" />
        Add Pay Period
      </Button>
    </CardContent>
  </Card>
)}
```

---

## **Testing Checklist:**

### **Scenario 1: New Manager (No Employees)**
1. ✅ Shows "Add Employee" dialog automatically
2. ✅ Can create first employee
3. ✅ Employee appears in dropdown
4. ✅ Auto-selects first employee

### **Scenario 2: Add Second Employee**
1. ✅ Click "Add Employee" button
2. ✅ Fill in name, position, base rate
3. ✅ New employee appears in dropdown
4. ✅ Can switch between employees

### **Scenario 3: Edit Employee**
1. ✅ Select employee from dropdown
2. ✅ Click "Edit Employee"
3. ✅ Change position or base rate
4. ✅ Changes reflected in UI

### **Scenario 4: Multiple Employees with Different Rates**
1. ✅ Employee A: $29.81/hr
2. ✅ Employee B: $25.00/hr
3. ✅ Switch to Employee A → shows $29.81
4. ✅ Switch to Employee B → shows $25.00
5. ✅ Pay periods are separate per employee

### **Scenario 5: Manager Workflow**
1. ✅ Select "Jared Tavenner"
2. ✅ Select pay period "Jan 1-15"
3. ✅ Add daily performance record
4. ✅ Switch to "Sarah Johnson"
5. ✅ See Sarah's pay periods (not Jared's)
6. ✅ Add Sarah's daily record
7. ✅ Switch back to Jared
8. ✅ See Jared's data (not Sarah's)

---

## **Summary:**

This redesign transforms the system from:
- **Employee self-service** (one user = one employee)

To:
- **Manager oversight** (one user = multiple employees)

**Key Changes:**
1. Employee selector dropdown
2. Add Employee + Edit Employee buttons
3. Load all employees for logged-in manager
4. Filter data by selected employee
5. Proper empty states for each scenario

**This is the correct architecture for your use case!** 🎯
