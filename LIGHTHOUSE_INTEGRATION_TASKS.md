# Lighthouse Goal Integration - Task Tracker

## Completed Tasks

### Task 5: Supabase (Database Foundation)
**Status: COMPLETE**
**Migration: `48_lighthouse_integration.sql`**

Added columns to link revenue data to Lighthouse goals:

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| revenue_entries | lighthouse_synced | BOOLEAN | Is FIR synced with Lighthouse step? |
| revenue_entries | lighthouse_step_year | INTEGER | Which step year (1, 2, 3...) |
| revenue_entries | lighthouse_goal_id | UUID | Reference to big_fig_goals |
| kpi_records | lighthouse_step_year | INTEGER | Which step year for this KPI |

Created view: `lighthouse_progress` - Aggregated progress toward Lighthouse goal

**To run migration:**
```sql
-- Run in Supabase SQL Editor
-- File: backend/migrations/48_lighthouse_integration.sql
```

---

### Task 1.1: Revenue Context Integration
**Status: COMPLETE**
**File: `project/src/contexts/revenue-context.tsx`**

Added Lighthouse data to the app-wide revenue context:

**New Exports:**
- `LighthouseContext` interface - Type for Lighthouse data
- `lighthouse` property on `useRevenue()` hook
- `refreshLighthouse()` function to reload Lighthouse data

**LighthouseContext Structure:**
```typescript
interface LighthouseContext {
  goal: LighthouseGoal | null;        // The user's Lighthouse goal
  plan: LighthousePlan | null;        // Calculated plan with targets
  stepOverrides: StepOverride[];      // Per-year customizations
  planStatus: 'draft' | 'committed';  // Has user committed the plan?
  currentStepYear: number;            // Which step year we're in (1-based)
  currentStepTarget: number | null;   // Target revenue for current step
  isLoading: boolean;                 // Loading state
}
```

**Usage Example:**
```typescript
import { useRevenue } from '../contexts/revenue-context';

function MyComponent() {
  const { lighthouse, refreshLighthouse } = useRevenue();
  
  if (lighthouse.isLoading) return <Loading />;
  
  if (!lighthouse.goal) {
    return <div>Set up your Lighthouse goal first</div>;
  }
  
  return (
    <div>
      <p>Year {lighthouse.currentStepYear} of {lighthouse.plan?.yearsToGoal}</p>
      <p>Target: ${lighthouse.currentStepTarget?.toLocaleString()}</p>
    </div>
  );
}
```

---

## Remaining Tasks

### Task 1.2-1.5: Master Revenue Curve
- [x] Auto-populate FIR target from Lighthouse step (via Sync button)
- [x] Show Lighthouse indicator on chart ("Year X of Y toward Lighthouse")
- [x] Add "Sync with Lighthouse" button
- [x] Warn on FIR/Lighthouse mismatch (amber border + warning text)

**Implementation Details:**
- Added `hasLighthouse`, `lighthouseStepTarget`, `lighthouseStepYear`, `lighthouseYearsToGoal` variables
- Added `isFIRSyncedWithLighthouse` check (1% tolerance)
- Added `handleSyncWithLighthouse()` function that uses existing `updateTargets()` to preserve seasonality math
- FIR Target Card now shows:
  - Lighthouse step indicator ("Year X of Y toward Lighthouse")
  - Green checkmark when synced
  - Amber warning + suggested target when mismatched
  - "Sync with Lighthouse" button when mismatched
- Card border turns amber when FIR differs from Lighthouse target

### Task 2: Budget vs Goal
- [x] Add Lighthouse target column (shows This Year's Lighthouse Target)
- [x] Add "Lighthouse Progress" metric (full-width card with journey visualization)
- [x] Show multi-year trajectory (year progress dots with NOW indicator)

**Implementation Details:**
- Added `useRevenue` context to access Lighthouse data
- Added Lighthouse Progress card below the 4 summary cards:
  - Title with "Year X of Y" indicator
  - Journey visualization with progress dots (same as MasterChart)
  - This Year's Lighthouse Target with FIR comparison (amber warning if different)
  - Final Lighthouse Goal with target year
- Card only shows when user has a committed Lighthouse plan

### Task 3: Employee LER
- [ ] Show "Crews Needed" from Lighthouse
- [ ] Calculate current crew capacity
- [ ] Show capacity gap
- [ ] Link hiring milestones

### Task 4: Dashboard
- [x] Add "Lighthouse Progress" card
- [x] Show current year's theme
- [x] Show next milestone
- [x] Add "Years to Lighthouse" countdown

**Implementation Details:**
- Added `lighthouse` to `useRevenue()` destructuring
- Added theme arrays (EARLY_THEMES, GROWTH_THEMES, FREEDOM_THEMES) with title and description
- Added `getPhaseInfo()` function to determine which phase/theme applies to current step
- Lighthouse Progress card includes:
  - Header with Lightbulb icon and "Year X of Y" indicator
  - "Years to Lighthouse" countdown badge (shows months when <1 year remaining)
  - Current Year Theme section with Flag icon, title, and description
  - Journey visualization with year progress dots (completed/current/future states)
  - Next Milestone section (only shows if user has incomplete milestones)
  - Lighthouse Goal footer showing target revenue and target year
- Card only displays when user has committed Lighthouse plan and viewing current year

### Task 6: ZEP (AI Memory) ✅ COMPLETED
- [x] Store Lighthouse goal in ZEP memory
- [x] Store current step and milestones
- [x] Store Lighthouse story
- [x] Update AI prompts with Lighthouse context
- [x] Add Lighthouse-aware coaching

**Implementation Details:**
- `backend/api/zep.py`: Added Lighthouse data fetching (goal, story, step overrides, milestones) to `get_financial_context()`
- `project/src/services/claudeService.ts`: Expanded system prompt to include Lighthouse story, current step year, milestones, and plan status
- `project/src/pages/coach/your-big-fig.tsx`: Added Zep conversation save when Lighthouse story is saved
- `WAVERIDER_AI_COACHING_VOICE.md`: Added "LIGHTHOUSE GOAL INTEGRATION" section with guidelines for:
  - Connecting daily actions to bigger picture
  - Referencing their story when motivating
  - Celebrating milestone progress
  - Keeping focus on current year (not distant future)
  - Supporting them when discouraged

---

## Architecture Decision

**Lighthouse Drives FIR (Recommended Approach)**

When a user has a committed Lighthouse plan:
1. The current year's Lighthouse step target becomes the suggested FIR target
2. User can override, but system shows a subtle indicator if they differ
3. All pages reference the same Lighthouse data via `useRevenue().lighthouse`

This ensures the promise: "Every plan, forecast, and action in WaveRider is about helping you paddle toward that light."

---

## Files Modified

1. **backend/migrations/48_lighthouse_integration.sql** (NEW)
   - Database schema for Lighthouse integration

2. **project/src/contexts/revenue-context.tsx** (MODIFIED)
   - Added Lighthouse imports
   - Added LighthouseContext interface
   - Added Lighthouse state variables
   - Added refreshLighthouse() function
   - Added calculateLighthouseStepInfo() helper
   - Exposed lighthouse and refreshLighthouse in context

---

## Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Test** by checking console for "Lighthouse data loaded" message
3. **Proceed with Task 1.2** - Connect FIR to Lighthouse on Master Revenue page
