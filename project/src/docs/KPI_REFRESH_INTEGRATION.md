# KPI Refresh Integration Guide

## Overview
The hybrid KPI refresh system prompts users when their changes affect KPIs, giving them control over when to refresh while ensuring they never forget to update their metrics.

## Components Created

### 1. `KPIRefreshDialog` 
- **Location**: `src/components/ui/kpi-refresh-dialog.tsx`
- **Purpose**: Modal dialog that prompts user to refresh KPIs
- **Features**: Shows affected KPIs, loading state, clear messaging

### 2. `useKPIRefresh` Hook
- **Location**: `src/hooks/useKPIRefresh.ts` 
- **Purpose**: Manages KPI refresh state and actions
- **Key Functions**:
  - `promptForKPIRefresh()` - Shows confirmation dialog
  - `refreshKPIs()` - Triggers KPI regeneration
  - `getAffectedKPIs()` - Determines which KPIs are impacted

### 3. `KPIRefreshProvider`
- **Location**: `src/components/kpi/KPIRefreshProvider.tsx`
- **Purpose**: Wrapper component that provides KPI refresh functionality

## Integration Steps

### Step 1: Add Provider to App Root
```tsx
import { KPIRefreshProvider } from './components/kpi/KPIRefreshProvider';

function App() {
  return (
    <KPIRefreshProvider>
      {/* Your app content */}
    </KPIRefreshProvider>
  );
}
```

### Step 2: Use Hook in Components
```tsx
import { useKPIRefresh, getAffectedKPIs } from '../hooks/useKPIRefresh';

function RevenueUpdateComponent() {
  const { promptForKPIRefresh } = useKPIRefresh();

  const handleRevenueUpdate = async (newRevenue) => {
    // 1. Save the data
    await saveRevenueData(newRevenue);
    
    // 2. Prompt for KPI refresh
    promptForKPIRefresh({
      changeDescription: `Updating revenue to $${newRevenue}`,
      affectedKPIs: getAffectedKPIs('revenue')
    });
  };
}
```

### Step 3: Integration Points

#### Revenue Updates
- **Files**: `contexts/revenue-context.tsx`, revenue input components
- **Trigger**: After `updateMonthlyRevenue()` success
- **Affected KPIs**: Monthly Revenue, YTD Revenue, Projected Annual, Gap to Target, YoY Growth

#### Target Updates  
- **Files**: Target/goal setting components
- **Trigger**: After target revenue or FIR updates
- **Affected KPIs**: Gap to Target, Projected Annual, YTD Performance

#### Profit Margin Updates
- **Files**: Profit margin setting components  
- **Trigger**: After profit margin goal changes
- **Affected KPIs**: Profit Margin

## Example Usage

See `src/components/examples/RevenueUpdateExample.tsx` for a complete working example.

## User Experience Flow

1. **User makes change** (e.g., updates monthly revenue)
2. **Data saves successfully** 
3. **Dialog appears**: "This change will affect your KPIs. Update now?"
4. **User chooses**:
   - **"Yes, Update KPIs"** → KPIs refresh automatically
   - **"Not Now"** → User can refresh later from dashboard

## Benefits

- ✅ **No forgotten updates** - System always prompts
- ✅ **User control** - Choice of when to refresh  
- ✅ **Performance** - No unnecessary calculations
- ✅ **Transparency** - Clear cause and effect
- ✅ **Flexibility** - Supports different workflows

## Future Enhancements

- User preference: "Always auto-refresh KPIs"
- Batch mode: "I'm making multiple changes"
- Smart detection: Only prompt for significant changes
- Background refresh with notifications
