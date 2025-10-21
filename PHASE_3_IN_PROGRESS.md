# Phase 3: Employee LER Dynamic Services - In Progress

## **Current Status:**

### **✅ Completed:**
1. Phase 1: Database & Backend
2. Phase 2: Service Mix UI

### **🔄 In Progress:**
Phase 3: Make Employee LER use dynamic services

---

## **Challenge:**

The `AddDailyRecordDialog.tsx` file has **many hardcoded references** to the 4 service types:
- `grillJobs`, `ovenJobs`, `rangeJobs`, `ventHoodJobs` state variables
- Hardcoded input fields (lines 288-329)
- Hardcoded COGS calculations (lines 129-133)
- Hardcoded jobTypes object (lines 221-226)
- Many other references throughout the file

**Total changes needed:** ~50+ lines across the entire file

---

## **Approach:**

Instead of making 50+ small edits, I recommend creating a **new dynamic version** of the dialog.

### **Option A: Complete Rewrite** (Recommended)
- Create new `AddDailyRecordDialogDynamic.tsx`
- Build from scratch with dynamic services
- Test thoroughly
- Replace old dialog when ready
- Keep old file as backup

### **Option B: Incremental Updates**
- Make ~50 edits to existing file
- Higher risk of breaking something
- Harder to test incrementally

---

## **What the Dynamic Version Needs:**

### **1. Dynamic State Management**
```typescript
// Instead of:
const [grillJobs, setGrillJobs] = useState('0');
const [ovenJobs, setOvenJobs] = useState('0');
// ...

// Use:
const [serviceQuantities, setServiceQuantities] = useState<{[key: string]: string}>({});
// Example: { "Grill Cleaning": "4", "Oven Cleaning": "2" }
```

### **2. Dynamic Input Generation**
```tsx
// Instead of hardcoded inputs:
<Input value={grillJobs} onChange={setGrillJobs} />
<Input value={ovenJobs} onChange={setOvenJobs} />

// Generate dynamically:
{Object.keys(servicesWithCOGS).map(serviceName => (
  <div key={serviceName}>
    <Label>{formatServiceName(serviceName)}</Label>
    <Input 
      value={serviceQuantities[serviceName] || '0'}
      onChange={(e) => updateServiceQuantity(serviceName, e.target.value)}
    />
  </div>
))}
```

### **3. Dynamic COGS Calculation**
```typescript
// Instead of:
const cogs = 
  (parseInt(grillJobs) * COGS_CALCULATOR.grill) +
  (parseInt(ovenJobs) * COGS_CALCULATOR.oven) +
  // ...

// Use:
const cogs = Object.entries(serviceQuantities).reduce((total, [serviceName, qty]) => {
  const cost = servicesWithCOGS[serviceName] || 0;
  return total + (parseInt(qty) * cost);
}, 0);
```

### **4. Dynamic Job Types Object**
```typescript
// Instead of:
jobTypes: {
  grill: parseInt(grillJobs),
  oven: parseInt(ovenJobs),
  // ...
}

// Use:
jobTypes: Object.entries(serviceQuantities).reduce((obj, [name, qty]) => {
  obj[name] = parseInt(qty) || 0;
  return obj;
}, {} as { [key: string]: number })
```

---

## **Recommendation:**

**Let me create a new dynamic version** that:

1. ✅ Accepts `servicesWithCOGS` prop
2. ✅ Generates inputs dynamically
3. ✅ Calculates COGS dynamically
4. ✅ Works with ANY services
5. ✅ Maintains all existing functionality
6. ✅ Keeps same UI/UX

**Benefits:**
- Clean, maintainable code
- Easier to test
- Less risk of breaking existing functionality
- Can compare old vs new side-by-side

**Time estimate:** 30-45 minutes to create new version

---

## **Alternative: Quick Fix**

If you want to keep using hardcoded services for now, we can:

1. Keep current dialog as-is
2. Just pass hardcoded COGS from services table
3. Update later when ready

This would work but defeats the purpose of dynamic services.

---

## **Your Decision:**

**Option A:** Let me create new dynamic dialog (recommended)  
**Option B:** Make incremental edits to existing file (risky)  
**Option C:** Quick fix - keep hardcoded for now (temporary)  

**Which would you prefer?** 🤔
