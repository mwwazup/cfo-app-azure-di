# COGS Settings - Services Integration Plan

## **Current Problem:**

COGS settings are hardcoded to specific services:
- ❌ Grill Cleaning
- ❌ Oven Cleaning  
- ❌ Range Cleaning
- ❌ Vent Hood Cleaning

This doesn't work for:
- Lawn care companies
- Window cleaning companies
- Any business with different services

## **Solution: Link COGS to Services Table**

You already have a `services` table where users define their own services. COGS should reference that table.

---

## **Database Changes:**

### **Current Structure (Wrong):**
```sql
cogs_settings:
- user_id TEXT
- service_name TEXT  -- ❌ Hardcoded values
- cost_per_service DECIMAL
```

### **New Structure (Correct):**
```sql
cogs_settings:
- user_id TEXT
- service_id UUID  -- ✅ References services table
- cost_per_service DECIMAL
- FOREIGN KEY (service_id) REFERENCES services(id)
```

---

## **Implementation Steps:**

### **1. Run SQL Migration**
**File:** `fix_cogs_to_use_services.sql`

This will:
- Drop old `cogs_settings` table
- Create new table with `service_id` foreign key
- Link to `services` table

### **2. Update Service Layer**
**File:** `project/src/services/employeeLERService.ts`

**Current:**
```typescript
interface COGSSettings {
  grill: number;
  oven: number;
  range: number;
  ventHood: number;
}
```

**New:**
```typescript
interface COGSSetting {
  id?: string;
  user_id: string;
  service_id: string;
  service_name: string; // Joined from services table
  cost_per_service: number;
}

// Get COGS for user's services
async function getCOGSSettings(userId: string): Promise<COGSSetting[]> {
  const { data } = await supabase
    .from('cogs_settings')
    .select(`
      *,
      services (
        service_name
      )
    `)
    .eq('user_id', userId);
  
  return data || [];
}
```

### **3. Update COGS Dialog**
**File:** `project/src/components/employee/COGSSettingsDialog.tsx`

**Current:** Hardcoded 4 inputs (grill, oven, range, ventHood)

**New:** Dynamic list based on user's services
```typescript
// Load user's services
const services = await getServices(userId);

// Show input for each service
services.map(service => (
  <div key={service.id}>
    <Label>{service.service_name}</Label>
    <Input 
      type="number"
      value={cogsMap[service.id] || 0}
      onChange={(e) => updateCOGS(service.id, e.target.value)}
    />
  </div>
))
```

### **4. Update Daily Record Dialog**
**File:** `project/src/components/employee/AddDailyRecordDialog.tsx`

**Current:** Hardcoded job types (grill, oven, range, ventHood)

**New:** Use user's services from services table
```typescript
// Load user's services
const services = await getServices(userId);

// Show input for each service
services.map(service => (
  <div key={service.id}>
    <Label>{service.service_name}</Label>
    <Input 
      type="number"
      value={jobCounts[service.id] || 0}
      onChange={(e) => updateJobCount(service.id, e.target.value)}
    />
  </div>
))
```

---

## **User Flow:**

1. **User defines services** (Service Mix page)
   - "Grill Cleaning" - $150
   - "Oven Cleaning" - $120
   - "Range Cleaning" - $100

2. **User sets COGS** (COGS Settings dialog)
   - Grill Cleaning COGS: $19.20
   - Oven Cleaning COGS: $16.20
   - Range Cleaning COGS: $15.00

3. **User tracks daily work** (Add Daily Record)
   - Grill Cleaning: 3 jobs
   - Oven Cleaning: 2 jobs
   - Revenue calculated automatically

---

## **Benefits:**

✅ **Dynamic** - Works for any business type
✅ **Flexible** - Users define their own services
✅ **Consistent** - Services defined once, used everywhere
✅ **Scalable** - Easy to add/remove services

---

## **Migration Path:**

### **Option A: Fresh Start (Recommended if no data)**
1. Run `fix_cogs_to_use_services.sql`
2. Update service layer code
3. Update UI components
4. Users enter COGS for their services

### **Option B: Migrate Existing Data**
1. Create new table structure
2. Map old hardcoded values to services
3. Migrate data
4. Update code
5. Drop old table

---

## **Next Steps:**

1. ✅ **Run SQL migration** - `fix_cogs_to_use_services.sql`
2. ⏳ **Update service layer** - Change COGSSettings interface
3. ⏳ **Update COGS dialog** - Make it dynamic
4. ⏳ **Update daily record dialog** - Use services table
5. ⏳ **Test with your services**

**This will make the Employee LER system work for ANY business type!** 🎉
