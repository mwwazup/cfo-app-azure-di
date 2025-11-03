# .windsurfrules Addendum - Cross-Page Impact Analysis

**Add this section to your .windsurfrules file:**

---

## CRITICAL: Cross-Page Impact Analysis (Multi-Page App)

### Problem
WaveRider is a multi-page app where data flows between pages. Changes on one page (e.g., KPI Dashboard) can break other pages (e.g., Master Revenue, Budget vs Actual, Financial Documents) if we don't check the ripple effects.

### Mandatory Before EVERY Change

**Step 1: Identify What Data Is Affected**
- Which database tables?
- Which React Context (revenue-context, auth-context)?
- Which API endpoints?
- Which calculated values (KPIs, FIR targets)?

**Step 2: List ALL Affected Pages**

| Data Type | Pages to Check |
|-----------|----------------|
| Revenue data | Master Revenue, Budget vs Actual, KPI Dashboard, Financial Documents |
| KPI data | KPI Dashboard, Master Revenue, Budget vs Actual |
| Financial documents | Financial Statements, Where Did Money Go, KPI Dashboard |
| Service Mix | Service Mix page, COGS calculations, Revenue attribution |
| Employee LER | Employee LER page, Labor costs, COGS |

**Step 3: Check Integration Points**
- `revenue-context.tsx` - Used by multiple pages
- `revenueKPIGenerator.ts` - Affects all KPI displays
- `calculateMonthlyFIRTargets()` - Used by 3+ pages
- Supabase queries - Must use consistent user_id pattern

**Step 4: Include in Response**
```
## Pages Affected
- Master Revenue: [specific impact]
- KPI Dashboard: [specific impact]
- Budget vs Actual: [specific impact]

## Data Flow
[Explain: User action → Component → Service → Database → Other pages]

## Testing Steps
1. Make change on [Page A]
2. Navigate to [Page B] - verify [expected result]
3. Navigate to [Page C] - verify [expected result]
4. Refresh browser - verify data persists

## Potential Cross-Page Issues
- [Issue 1]: [description and mitigation]
- [Issue 2]: [description and mitigation]
```

### Red Flags - STOP and Ask User
- Change affects 3+ pages
- Modifies shared context (revenue-context, auth-context)
- Alters database schema
- Changes FIR calculation or KPI generation logic
- Unsure about cross-page impact

### Common Cross-Page Issues

**Issue 1: Stale Data**
- Symptom: Page A shows new data, Page B shows old data
- Check: Is Page B subscribed to context updates?

**Issue 2: Inconsistent Calculations**
- Symptom: Chart shows $X, KPI shows $Y for same metric
- Check: Are they using same data source?

**Issue 3: Broken Auto-Sync**
- Symptom: User must manually refresh
- Check: Is auto-sync triggered? Any infinite loop prevention?

**Issue 4: Query Mismatch**
- Symptom: Some pages load, others show "No data"
- Check: Are queries using same column names and user_id format?

### Key Pages (Always Check These)

**Critical (Check for EVERY change):**
1. Master Revenue Chart - Source of truth for revenue/FIR
2. KPI Dashboard - Displays calculated metrics
3. Budget vs Actual - Compares targets to actuals

**Secondary (Check if relevant):**
4. Financial Statements - Document processing
5. Where Did The Money Go - Cashflow analysis
6. Service Mix - Service revenue/COGS
7. Employee LER - Labor costs

### Integration Points to Watch

**revenue-context.tsx**
- Used by: Master Revenue, Budget vs Actual, KPI Dashboard
- Impact: Changes affect multiple pages simultaneously

**revenueKPIGenerator.ts**
- Used by: KPI Dashboard, Master Revenue (auto-regeneration)
- Impact: Changes affect all KPI displays

**calculateMonthlyFIRTargets()**
- Used by: Master Revenue, Budget vs Actual, KPI generation
- Impact: Single source of truth for targets

**Supabase Queries**
- Pattern: `.eq('user_id', userId)` (Clerk TEXT format)
- Used by: ALL pages
- Impact: Inconsistent user_id breaks data loading

### Testing Protocol

**After every change:**
1. Test on primary page (where change was made)
2. Test on all affected pages (from matrix above)
3. Verify data consistency across pages
4. Check browser console for errors on each page
5. Confirm auto-sync works (if applicable)
6. Test page refresh (data should persist)

### Example: Changing Revenue Entry

**Change:** User edits actual revenue on Master Revenue page

**Data Flow:**
```
User edits revenue → MasterChart component
  → RevenueDataService.updateRevenue()
  → revenue_entries table updated
  → revenue-context updates state
  → KPI Dashboard re-renders (subscribed to context)
  → revenueKPIGenerator.generateKPIsForPeriod() triggered
  → kpi_records table updated
  → Budget vs Actual refreshes (subscribed to context)
```

**Pages Affected:**
- Master Revenue: Shows updated value immediately
- KPI Dashboard: Auto-regenerates KPIs with new revenue
- Budget vs Actual: Shows updated actual vs target comparison

**Testing:**
1. Edit revenue on Master Revenue
2. Navigate to KPI Dashboard - verify KPIs recalculated
3. Navigate to Budget vs Actual - verify actual revenue updated
4. Refresh browser - verify changes persisted

**Potential Issues:**
- KPIs might not auto-regenerate (check auto-sync logic)
- Budget vs Actual might show stale data (check context subscription)

### Success Criteria

**Good response includes:**
- List of affected pages
- Data flow explanation
- Testing steps for each page
- Potential cross-page issues identified

**Bad response:**
- Only focuses on one page
- Doesn't mention other affected pages
- User discovers broken pages after implementation
- "We didn't check Financial Documents and it broke"

### Remember

**Think holistically, not in isolation.**

Every change in WaveRider ripples through the app. Always analyze cross-page impact BEFORE proposing changes.

**Reference:** See CROSS_PAGE_IMPACT_CHECKLIST.md for complete matrix and detailed procedures.

---

**Copy the above section into your .windsurfrules file after the "Remember - Core Principles" section.**
