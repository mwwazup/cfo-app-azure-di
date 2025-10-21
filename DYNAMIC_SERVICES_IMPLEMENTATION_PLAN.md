# Dynamic Service Selector - Implementation Plan

## **Goal:**
Make the Employee LER system universal by allowing users to define their own service types instead of hardcoding "grill, oven, range, ventHood".

---

## **Current Hardcoded Structure:**

### **1. COGS Settings:**
```typescript
{
  grill: 19.20,
  oven: 16.20,
  range: 15.00,
  ventHood: 20.00
}
```

### **2. Job Types in Daily Records:**
```typescript
jobTypes: {
  grill: number,
  oven: number,
  range: number,
  ventHood: number
}
```

### **3. Add Day Dialog:**
```tsx
<Input value={grillJobs} onChange={setGrillJobs} />
<Input value={ovenJobs} onChange={setOvenJobs} />
<Input value={rangeJobs} onChange={setRangeJobs} />
<Input value={ventHoodJobs} onChange={setVentHoodJobs} />
```

---

## **New Dynamic Structure:**

### **1. Database Schema (Already JSONB - No Changes Needed!):**

The `job_types` column in `employee_daily_records` is already JSONB, so it can store ANY service types:

```sql
-- Current (works for any services):
job_types JSONB  -- { "grill": 4, "oven": 2, "range": 1, "ventHood": 0 }

-- Future (works for any business):
job_types JSONB  -- { "haircut": 5, "color": 3, "perm": 1 }
job_types JSONB  -- { "oil_change": 10, "tire_rotation": 5, "brake_service": 2 }
```

✅ **No database migration needed!**

---

### **2. COGS Settings Table (Already Dynamic!):**

```sql
CREATE TABLE cogs_settings (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  service_name TEXT NOT NULL,  -- ← Can be ANY service name
  cost_per_service NUMERIC NOT NULL,
  UNIQUE(user_id, service_name)
);
```

✅ **Already supports any service types!**

---

### **3. TypeScript Changes:**

**Before (Hardcoded):**
```typescript
interface COGSSettings {
  grill: number;
  oven: number;
  range: number;
  ventHood: number;
}
```

**After (Dynamic):**
```typescript
interface COGSSettings {
  [serviceName: string]: number;
}
// Example: { "grill": 19.20, "oven": 16.20 }
// Or: { "haircut": 25.00, "color": 50.00 }
```

---

### **4. Add Day Dialog (Dynamic Inputs):**

**Before (Hardcoded 4 inputs):**
```tsx
<Label>Grill Jobs</Label>
<Input value={grillJobs} />

<Label>Oven Jobs</Label>
<Input value={ovenJobs} />

<Label>Range Jobs</Label>
<Input value={rangeJobs} />

<Label>Vent Hood Jobs</Label>
<Input value={ventHoodJobs} />
```

**After (Dynamic based on COGS):**
```tsx
{Object.keys(cogsSettings).map(serviceName => (
  <div key={serviceName}>
    <Label>{formatServiceName(serviceName)}</Label>
    <Input 
      value={serviceQuantities[serviceName] || '0'}
      onChange={(e) => updateServiceQuantity(serviceName, e.target.value)}
    />
  </div>
))}
```

---

## **Implementation Steps:**

### **Phase 1: Update TypeScript Interfaces** ✅

1. Change `COGSSettings` to use index signature
2. Change `JobTypes` to use index signature
3. Update service functions to handle dynamic keys

### **Phase 2: Update Add Day Dialog** ✅

1. Replace hardcoded state variables with dynamic object
2. Generate input fields from COGS settings
3. Update form submission to use dynamic data

### **Phase 3: Update COGS Settings Dialog** ✅

1. Add "Add Service" button
2. Add "Remove Service" button
3. Allow users to define custom service names and costs

### **Phase 4: Update Display/Charts** ✅

1. Update job type breakdown chart to use dynamic services
2. Update any hardcoded service references

---

## **Benefits:**

### **For Your Business (Hood Cleaning):**
- Keep current: grill, oven, range, ventHood
- Add new: fryer, exhaust_fan, duct_cleaning
- Remove unused services

### **For Other Businesses:**

**Hair Salon:**
```typescript
{
  "haircut": 15.00,
  "color": 35.00,
  "highlights": 45.00,
  "perm": 50.00,
  "blowout": 10.00
}
```

**Auto Shop:**
```typescript
{
  "oil_change": 25.00,
  "tire_rotation": 15.00,
  "brake_service": 75.00,
  "alignment": 50.00,
  "inspection": 20.00
}
```

**HVAC:**
```typescript
{
  "maintenance": 50.00,
  "repair": 100.00,
  "installation": 200.00,
  "emergency": 150.00
}
```

---

## **User Experience:**

### **First Time Setup:**

1. User creates employee profile
2. System shows default services (grill, oven, range, ventHood)
3. User can edit COGS settings:
   - Click "Add Service" to add custom services
   - Click "Remove" to delete unused services
   - Edit costs for each service

### **Adding Daily Records:**

1. Click "Add Day"
2. Dialog shows input fields for EACH service defined in COGS
3. User enters quantity for each service type
4. System calculates COGS automatically

---

## **Technical Considerations:**

### **1. Default Services:**

When user first sets up, provide sensible defaults:
```typescript
const DEFAULT_SERVICES = {
  "service_1": 20.00,
  "service_2": 20.00,
  "service_3": 20.00
};
```

Or for hood cleaning specifically:
```typescript
const HOOD_CLEANING_DEFAULTS = {
  "grill": 19.20,
  "oven": 16.20,
  "range": 15.00,
  "ventHood": 20.00
};
```

### **2. Service Name Formatting:**

```typescript
function formatServiceName(key: string): string {
  // "grill" → "Grill"
  // "vent_hood" → "Vent Hood"
  // "oil_change" → "Oil Change"
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

### **3. Validation:**

- Service names must be unique
- Service names can't be empty
- Costs must be positive numbers
- At least 1 service must be defined

---

## **Migration Strategy:**

### **Existing Users:**

No migration needed! Existing data will continue to work:
- Old records with `{ grill: 4, oven: 2 }` still work
- System reads whatever keys exist in JSONB
- Users can add new services going forward

### **New Users:**

- Show service setup during onboarding
- Provide industry-specific templates
- Allow full customization

---

## **Code Changes Summary:**

### **Files to Modify:**

1. **`employeeLERService.ts`**
   - Change `COGSSettings` interface to index signature
   - Update `getCOGSSettings()` to return dynamic object
   - Update `saveCOGSSettings()` to handle dynamic keys

2. **`AddDailyRecordDialog.tsx`**
   - Replace hardcoded state with dynamic object
   - Generate input fields from COGS settings
   - Update calculations to use dynamic services

3. **`COGSSettingsDialog.tsx`**
   - Add "Add Service" functionality
   - Add "Remove Service" functionality
   - Update UI to show dynamic list

4. **`EmployeeLERPage.tsx`**
   - Update job type chart to use dynamic services
   - Update any hardcoded service references

---

## **Estimated Effort:**

- **Phase 1:** 30 minutes (TypeScript interfaces)
- **Phase 2:** 1 hour (Add Day Dialog)
- **Phase 3:** 1 hour (COGS Settings Dialog)
- **Phase 4:** 30 minutes (Display updates)

**Total:** ~3 hours

---

## **Testing Plan:**

1. ✅ Create employee with default services
2. ✅ Add custom service (e.g., "fryer")
3. ✅ Remove unused service (e.g., "range")
4. ✅ Add daily record with custom services
5. ✅ Verify calculations work correctly
6. ✅ Verify charts display custom services
7. ✅ Edit existing record with custom services

---

## **Next Steps:**

1. Confirm this approach
2. Start with Phase 1 (TypeScript changes)
3. Test incrementally
4. Deploy when all phases complete

**Ready to implement?** 🚀
