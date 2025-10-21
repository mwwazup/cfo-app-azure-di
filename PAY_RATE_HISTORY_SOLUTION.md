# Pay Rate History - Preserving Historical Data

## **Your Question:**
"How will we handle when an employee receives a pay change? If we change the base pay, doesn't that affect all data entered for that employee?"

## **The Problem:**

If we only store `current_base_rate` in `employee_info`:

```
Employee: Jared
Current Base Rate: $35/hr  (was $30/hr last month)

Pay Period 1 (Jan): Used $30/hr ❌ But now shows $35/hr (WRONG!)
Pay Period 2 (Feb): Uses $35/hr ✅
```

**All historical calculations would be wrong!**

---

## **The Solution: Store Base Rate Per Pay Period**

### **Database Structure:**

```sql
employee_info:
- id
- user_id
- name
- position
- current_base_rate  -- Current rate (for creating NEW pay periods)

pay_periods:
- id
- employee_id
- period_name
- start_date
- end_date
- base_rate  -- ✅ Rate that was active during THIS period
```

---

## **How It Works:**

### **1. Creating a Pay Period:**
When you create a new pay period, it captures the **current** base rate:

```typescript
createPayPeriod(employeeId, period, empInfo.current_base_rate)
// Saves: base_rate = $30/hr (current rate at time of creation)
```

### **2. Employee Gets a Raise:**
You update the employee's base rate:

```
employee_info.current_base_rate: $30 → $35
```

### **3. Historical Data Preserved:**
Old pay periods still show the correct rate:

```
Pay Period 1 (Jan): base_rate = $30/hr ✅ (preserved)
Pay Period 2 (Feb): base_rate = $35/hr ✅ (new rate)
```

### **4. Daily Records Use Pay Period Rate:**
When calculating LER, use the pay period's base_rate, not the employee's current_base_rate:

```typescript
const baseRate = payPeriod.base_rate; // Use historical rate
const basePay = hours * baseRate;
```

---

## **Implementation:**

### **Step 1: Add Column to Database**
**File:** `add_base_rate_to_pay_periods.sql`

```sql
ALTER TABLE pay_periods 
ADD COLUMN base_rate DECIMAL(10,2) NOT NULL;
```

### **Step 2: Update Service Layer**
**File:** `employeeLERService.ts`

```typescript
export async function createPayPeriod(
  employeeId: string, 
  period: PayPeriod, 
  baseRate: number  // ← New parameter
): Promise<PayPeriod | null> {
  const { data } = await supabase
    .from('pay_periods')
    .insert([{
      employee_id: employeeId,
      period_name: period.period_name,
      start_date: period.start_date,
      end_date: period.end_date,
      base_rate: baseRate  // ← Store it
    }])
    .select()
    .single();
  
  return data;
}
```

### **Step 3: Update UI**
**File:** `EmployeeLERPage.tsx`

```typescript
const created = await employeeLERService.createPayPeriod(
  empInfo.id, 
  period,
  empInfo.current_base_rate  // ← Pass current rate
);
```

---

## **User Flow:**

### **Scenario: Employee Gets a Raise**

**January (Base Rate: $30/hr):**
1. Create Pay Period "Jan 1-15"
2. System saves `base_rate = $30`
3. Add daily records
4. Calculations use $30/hr ✅

**February (Give Raise to $35/hr):**
1. Edit Employee → Change base rate to $35
2. Create Pay Period "Feb 1-15"
3. System saves `base_rate = $35`
4. Add daily records
5. Calculations use $35/hr ✅

**View Historical Data:**
- Jan pay period still shows $30/hr ✅
- Feb pay period shows $35/hr ✅
- All calculations remain accurate ✅

---

## **Settings Per Employee:**

### **What's Shared (Per User):**
- ✅ COGS Settings (same for all employees)
- ✅ Company Settings (overhead %, bonus thresholds)

### **What's Per Employee:**
- ✅ Name
- ✅ Position
- ✅ Current Base Rate
- ✅ Pay Periods (each with historical base_rate)
- ✅ Daily Records

---

## **Summary:**

✅ **Each pay period stores the base rate** that was active when it was created  
✅ **Employee raises don't affect historical data**  
✅ **All calculations remain accurate**  
✅ **COGS and company settings are shared** across all employees (per user)  
✅ **Each employee has their own** name, position, and pay rate  

**This is the industry-standard approach for payroll systems!** 💼
