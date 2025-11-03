# WaveRider Page Data Flow Map

Quick visual reference for understanding how data flows between pages.

## Data Flow Diagram

```
                    ┌─────────────────────┐
                    │   Supabase DB       │
                    │  (Single Source)    │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
        ┌───────▼──────┐  ┌───▼────┐  ┌─────▼──────┐
        │ revenue_     │  │ kpi_   │  │ financial_ │
        │ entries      │  │ records│  │ documents  │
        └───────┬──────┘  └───┬────┘  └─────┬──────┘
                │             │              │
        ┌───────▼─────────────▼──────────────▼───────┐
        │         React Context Layer                 │
        │  - revenue-context.tsx                      │
        │  - auth-context.tsx                         │
        └───────┬─────────────┬──────────────┬───────┘
                │             │              │
    ┌───────────▼─┐    ┌─────▼──────┐  ┌───▼────────────┐
    │  Master     │    │    KPI     │  │   Budget vs    │
    │  Revenue    │◄───┤  Dashboard │  │    Actual      │
    │  Chart      │    │            │  │                │
    └─────────────┘    └────────────┘  └────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌──────▼──────────┐
            │  Financial     │  │  Where Did The  │
            │  Statements    │  │  Money Go       │
            └────────────────┘  └─────────────────┘
```

## Page Dependencies Matrix

| Page | Reads From | Writes To | Affected By | Affects |
|------|-----------|-----------|-------------|---------|
| **Master Revenue** | revenue_entries | revenue_entries | - | KPI Dashboard, Budget vs Actual |
| **KPI Dashboard** | kpi_records, revenue_entries | - | Master Revenue, Financial Docs | - |
| **Budget vs Actual** | revenue_entries | - | Master Revenue | - |
| **Financial Statements** | financial_documents | financial_documents, document_kpis | - | KPI Dashboard |
| **Where Did Money Go** | financial_documents, document_metrics | - | Financial Statements | - |
| **Service Mix** | services, service_activities | services, service_activities | - | Revenue attribution |
| **Employee LER** | employee_info, employee_daily_records | employee_daily_records | - | Labor costs |

## Critical Data Paths

### Path 1: Revenue Entry Flow
```
User enters revenue on Master Revenue
    ↓
revenue_entries table updated
    ↓
revenue-context broadcasts update
    ↓
┌───────────────┬────────────────┐
│               │                │
Budget vs Actual  KPI Dashboard  (auto-regenerate)
updates display   triggers KPI    
                  generation
                      ↓
                  kpi_records
                  table updated
```

### Path 2: FIR Target Flow
```
User sets annual FIR on Master Revenue
    ↓
calculateMonthlyFIRTargets() runs
    ↓
revenue_entries.desired_revenue updated (12 months)
    ↓
revenue-context broadcasts update
    ↓
┌───────────────┬────────────────┬──────────────┐
│               │                │              │
Master Revenue  Budget vs Actual  KPI Dashboard
shows FIR line  shows targets     uses for goals
```

### Path 3: Document Upload Flow
```
User uploads P&L on Financial Statements
    ↓
Azure DI processes document
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
financial_documents  document_metrics
table updated        table updated
    ↓                    ↓
Financial Statements  Where Did Money Go
displays metadata     shows cashflow
    ↓
document_kpis generated
    ↓
KPI Dashboard
shows document-based KPIs
```

## Shared State (React Context)

### revenue-context.tsx
**Provides:**
- `allYearsData` - All revenue entries
- `currentYearData` - Current year revenue
- `monthlyFIRTargets` - Calculated FIR targets
- `selectedYear` - Currently selected year

**Consumers:**
- Master Revenue Chart
- Budget vs Actual
- KPI Dashboard (for targets)

**Critical:** Changes here affect all 3 pages simultaneously

### auth-context.tsx
**Provides:**
- `user` - Clerk user object
- `userId` - Clerk user ID (TEXT format)
- `isAuthenticated` - Auth status

**Consumers:**
- ALL pages (for data filtering)

**Critical:** User ID must be consistent across all queries

## Service Layer Dependencies

### revenueKPIGenerator.ts
**Used by:**
- KPI Dashboard (manual refresh)
- Master Revenue (auto-regenerate on data change)
- Background jobs (scheduled regeneration)

**Reads:**
- revenue_entries (actual_revenue, desired_revenue)
- Previous year data (for comparisons)

**Writes:**
- kpi_records table

**Impact:** Changes affect all KPI displays

### RevenueDataService.ts
**Used by:**
- Master Revenue Chart
- Budget vs Actual
- Any component reading revenue data

**Operations:**
- getRevenueDataForYear()
- updateYearTargets()
- updateMonthRevenue()

**Impact:** Changes affect revenue display everywhere

### KPIDataService.ts
**Used by:**
- KPI Dashboard
- Master Revenue (KPI cards)

**Operations:**
- getKpis()
- getKpisByPeriod()

**Impact:** Changes affect KPI fetching

## Common Scenarios

### Scenario 1: User Edits Revenue
**Primary Page:** Master Revenue
**Affected Pages:** KPI Dashboard, Budget vs Actual
**Auto-Sync:** Yes (via revenue-context)
**Testing:** Check all 3 pages show updated value

### Scenario 2: User Changes FIR Target
**Primary Page:** Master Revenue
**Affected Pages:** KPI Dashboard (goals), Budget vs Actual (targets)
**Auto-Sync:** Yes (calculateMonthlyFIRTargets + context update)
**Testing:** Verify FIR line, target column, and KPI goals all match

### Scenario 3: User Uploads Financial Document
**Primary Page:** Financial Statements
**Affected Pages:** Where Did Money Go, KPI Dashboard
**Auto-Sync:** Partial (document processing, KPI generation may be manual)
**Testing:** Check document appears, metrics calculated, KPIs generated

### Scenario 4: Database Schema Change
**Primary Page:** N/A (backend)
**Affected Pages:** ALL pages using that table
**Auto-Sync:** N/A
**Testing:** Check EVERY page that queries the table

## Quick Reference: "Will This Break Other Pages?"

### YES - High Risk Changes
- Modifying revenue_entries schema
- Changing user_id format or queries
- Altering FIR calculation logic
- Modifying KPI generation logic
- Changing revenue-context structure
- Updating shared service methods

### MAYBE - Medium Risk Changes
- Adding new KPI calculations
- Changing display logic on one page
- Adding new fields to forms
- Modifying chart rendering
- Updating styling (usually safe)

### NO - Low Risk Changes
- Fixing typos
- Adjusting spacing/layout
- Adding console logs
- Updating documentation
- Changing button labels

## Testing Checklist

When making changes, test in this order:

1. **Primary page** (where change was made)
   - Verify change works as expected
   - Check console for errors

2. **Direct consumers** (pages that read same data)
   - Navigate to each page
   - Verify data displays correctly
   - Check for stale data

3. **Indirect consumers** (pages that use calculated values)
   - Navigate to each page
   - Verify calculations updated
   - Check for inconsistencies

4. **Browser refresh** (persistence check)
   - Refresh each affected page
   - Verify data persists
   - Check for loading errors

5. **Cross-page navigation** (context check)
   - Navigate between affected pages
   - Verify data stays consistent
   - Check for re-render issues

## Red Flags

Stop and ask user if you see:

- Change touches revenue-context.tsx
- Change modifies calculateMonthlyFIRTargets()
- Change alters revenueKPIGenerator.ts
- Change affects database schema
- Change modifies user_id handling
- Unsure which pages consume this data

## Summary

**Before every change:**
1. Check this map
2. Identify affected pages
3. List data flow path
4. Plan testing steps
5. Warn about cross-page impact

**After every change:**
1. Test primary page
2. Test all affected pages
3. Verify data consistency
4. Check auto-sync works
5. Confirm persistence

---

**Remember:** WaveRider pages are interconnected. Always think about the ripple effect.
