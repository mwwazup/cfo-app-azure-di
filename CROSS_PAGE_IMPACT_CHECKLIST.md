# Cross-Page Impact Analysis Checklist

## Problem Statement
WaveRider is a multi-page app where data flows between pages. Changes on one page (e.g., KPI Dashboard) can have unintended effects on other pages (e.g., Financial Documents, Master Revenue, Budget vs Actual). This checklist ensures we review all affected pages before implementing changes.

## Before Making ANY Change - Ask These Questions

### 1. What Data Does This Change Affect?
- [ ] Database tables (which ones?)
- [ ] Shared state (React Context?)
- [ ] API endpoints
- [ ] Calculated values (KPIs, FIR targets, etc.)
- [ ] User inputs/forms

### 2. Which Pages Use This Data?
Check all pages that might be affected:

**Revenue Data:**
- [ ] Master Revenue Chart
- [ ] Budget vs Actual
- [ ] KPI Dashboard
- [ ] Financial Documents (P&L comparison)

**KPI Data:**
- [ ] KPI Dashboard
- [ ] Master Revenue (KPI cards)
- [ ] Budget vs Actual (performance metrics)

**Financial Documents:**
- [ ] Financial Statements page
- [ ] Where Did The Money Go (cashflow)
- [ ] KPI Dashboard (document-based KPIs)

**Service Mix:**
- [ ] Service Mix page
- [ ] COGS calculations
- [ ] Revenue attribution

**Employee LER:**
- [ ] Employee LER page
- [ ] Labor cost calculations
- [ ] COGS calculations

### 3. What Services/Contexts Are Involved?
- [ ] `revenue-context.tsx` - Revenue state management
- [ ] `auth-context.tsx` - User authentication
- [ ] `revenueKPIGenerator.ts` - KPI calculations
- [ ] `kpiRecordsService.ts` - KPI data fetching
- [ ] `RevenueDataService.ts` - Revenue data operations
- [ ] `KPIDataService.ts` - KPI data operations

## Cross-Page Impact Matrix

| Change Type | Affected Pages | Services to Check | Potential Issues |
|-------------|----------------|-------------------|------------------|
| **Revenue Entry** | Master Revenue, Budget vs Actual, KPI Dashboard | revenue-context, revenueKPIGenerator | KPIs out of sync, FIR targets incorrect |
| **FIR Target** | Master Revenue, Budget vs Actual, KPI Dashboard | revenue-context, revenueKPIGenerator | Chart/KPI mismatch, wrong targets |
| **KPI Calculation** | KPI Dashboard, Master Revenue | revenueKPIGenerator, kpiRecordsService | Stale data, inconsistent metrics |
| **Financial Document** | Financial Statements, Where Did Money Go, KPIs | Document processing, KPI generator | Missing data, wrong calculations |
| **Database Schema** | ALL PAGES | All services | Queries break, data loss |
| **Auth/User ID** | ALL PAGES | auth-context, all services | Data not loading, wrong user data |

## Mandatory Review Process

### Step 1: Identify Data Flow
```
User Action → Component → Service → Database → Other Services → Other Components
```

**Example:**
```
User edits revenue → MasterChart → RevenueDataService → revenue_entries table
  → revenue-context updates → KPI Dashboard re-renders
  → revenueKPIGenerator recalculates → kpi_records table updates
  → Budget vs Actual refreshes
```

### Step 2: Check All Consumers
For each data change, check:
1. **Direct consumers** - Components that read this data directly
2. **Indirect consumers** - Components that use calculated values from this data
3. **Side effects** - Auto-sync, auto-regeneration, cascading updates

### Step 3: Test Cross-Page Scenarios
- [ ] Make change on Page A
- [ ] Navigate to Page B - does it show updated data?
- [ ] Navigate to Page C - does it show updated data?
- [ ] Refresh browser - does data persist correctly?
- [ ] Check console for errors on all pages

## Common Cross-Page Issues

### Issue 1: Stale Data
**Symptom:** Page A shows updated data, Page B shows old data
**Cause:** Page B not subscribed to data updates
**Fix:** Use shared context or refetch data on page load

### Issue 2: Inconsistent Calculations
**Symptom:** Chart shows $X, KPI shows $Y for same metric
**Cause:** Different calculation methods or data sources
**Fix:** Use single source of truth (e.g., revenue_entries.desired_revenue)

### Issue 3: Broken Auto-Sync
**Symptom:** User must manually refresh to see updates
**Cause:** Auto-sync not triggered or infinite loop prevention
**Fix:** Check auto-sync logic, ensure proper triggers

### Issue 4: Database Query Mismatch
**Symptom:** Some pages load data, others show "No data"
**Cause:** Inconsistent query patterns or column names
**Fix:** Standardize queries, use same column names

## Pages to Always Check

### Critical Pages (Check for EVERY change):
1. **Master Revenue Chart** - Source of truth for revenue/FIR
2. **KPI Dashboard** - Displays calculated metrics
3. **Budget vs Actual** - Compares targets to actuals

### Secondary Pages (Check if relevant):
4. **Financial Statements** - Document processing
5. **Where Did The Money Go** - Cashflow analysis
6. **Service Mix** - Service revenue/COGS
7. **Employee LER** - Labor costs

## AI Assistant Checklist

When making changes, I (Cascade) will:

### Before Proposing Changes:
- [ ] Identify which data is being modified
- [ ] List all pages that consume this data
- [ ] Check which services/contexts are involved
- [ ] Review cross-page impact matrix
- [ ] Identify potential side effects

### In My Response:
- [ ] Explain which pages will be affected
- [ ] Warn about potential cross-page issues
- [ ] Suggest testing steps for other pages
- [ ] Mention if auto-sync will trigger
- [ ] Note if database schema affects multiple pages

### Example Response Format:
```
## Proposed Change
[Description of change]

## Pages Affected
- Master Revenue: [how it's affected]
- KPI Dashboard: [how it's affected]
- Budget vs Actual: [how it's affected]

## Data Flow
[Explain the data flow]

## Testing Steps
1. Make change on [Page A]
2. Check [Page B] for [expected result]
3. Check [Page C] for [expected result]
4. Verify [specific data point] is consistent across pages

## Potential Issues
- [Issue 1 and mitigation]
- [Issue 2 and mitigation]
```

## Quick Reference: Page Dependencies

### Master Revenue Chart
**Reads:** revenue_entries (all fields)
**Writes:** revenue_entries (actual_revenue, desired_revenue, profit_margin)
**Affects:** KPI Dashboard, Budget vs Actual
**Context:** revenue-context.tsx

### KPI Dashboard
**Reads:** kpi_records, revenue_entries (for targets)
**Writes:** None (read-only)
**Affected by:** Master Revenue, Financial Documents, Service Mix
**Services:** kpiRecordsService, revenueKPIGenerator

### Budget vs Actual
**Reads:** revenue_entries (actual_revenue, desired_revenue)
**Writes:** None (read-only)
**Affected by:** Master Revenue
**Context:** revenue-context.tsx

### Financial Statements
**Reads:** financial_documents
**Writes:** financial_documents, document_metrics, document_kpis
**Affects:** KPI Dashboard (document-based KPIs)
**Services:** Document processing, Azure DI

### Service Mix
**Reads:** services, service_activities, cogs_settings
**Writes:** services, service_activities
**Affects:** Revenue attribution, COGS calculations
**Services:** Service data services

### Employee LER
**Reads:** employee_info, pay_periods, employee_daily_records
**Writes:** employee_info, employee_daily_records
**Affects:** Labor cost calculations, COGS
**Services:** Employee data services

## Integration Points to Watch

### 1. Revenue Context
**File:** `src/contexts/revenue-context.tsx`
**Used by:** Master Revenue, Budget vs Actual, KPI Dashboard
**Critical:** Changes here affect multiple pages simultaneously

### 2. KPI Generator
**File:** `src/services/revenueKPIGenerator.ts`
**Used by:** KPI Dashboard, Master Revenue (auto-regeneration)
**Critical:** Changes affect all KPI displays

### 3. Supabase Queries
**Pattern:** `.eq('user_id', userId)`
**Used by:** All pages
**Critical:** User ID must be consistent (Clerk TEXT format)

### 4. FIR Target Calculation
**Function:** `calculateMonthlyFIRTargets()`
**Used by:** Master Revenue, Budget vs Actual, KPI generation
**Critical:** Single source of truth for targets

## When to Raise Red Flag

Stop and ask user if:
- [ ] Change affects more than 3 pages
- [ ] Change modifies shared context
- [ ] Change alters database schema
- [ ] Change affects FIR calculation logic
- [ ] Change modifies KPI generation
- [ ] Unsure about cross-page impact

## Summary

**Before every change:**
1. Identify affected data
2. List affected pages
3. Check cross-page impact matrix
4. Plan testing across pages
5. Warn user about potential issues

**After every change:**
1. Test on primary page
2. Test on all affected pages
3. Verify data consistency
4. Check for console errors
5. Confirm auto-sync works

---

**Remember:** WaveRider is a connected system. A change on one page ripples through the entire app. Always think holistically, not in isolation.
