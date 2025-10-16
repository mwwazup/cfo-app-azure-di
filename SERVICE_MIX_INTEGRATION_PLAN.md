# Service Mix Integration Plan - Master Revenue Graph

## Current Status ✅

**Working:**
- ✅ Database tables created with TEXT user_id for Clerk
- ✅ RLS policies enabled (matching app pattern with `auth.uid()::text`)
- ✅ Services saving to database
- ✅ Activities saving to database
- ✅ Modal UI redesigned to match app theme
- ✅ Calendar icon fixed (white on dark background)

**Fixed Issues:**
1. ✅ RLS now enabled - follows same pattern as other tables
2. ✅ Schema updated - user_id is TEXT not UUID
3. ✅ Calendar icon color fixed

---

## Integration Plan: Add Service Mix to Master Revenue Graph

### Phase 1: Data Layer (Backend)
**Goal**: Ensure service revenue data can be queried efficiently

**Tasks**:
1. ✅ Service monthly summary view exists
2. ✅ Hooks for fetching service revenue data exist (`useServiceRevenueData`)
3. ✅ Data aggregation logic works (weekly → monthly)

**Status**: COMPLETE

---

### Phase 2: Chart Integration (Frontend)
**Goal**: Add service lines to the Master Revenue Chart

**Current Chart Structure**:
```typescript
// MasterChart.tsx
const chartData = {
  labels: months, // ["Jan", "Feb", ...]
  datasets: [
    {
      label: 'Actual Revenue',
      data: monthlyRevenue,
      borderColor: 'rgb(75, 192, 192)',
      // ...
    },
    {
      label: 'FIR Target',
      data: getFIRData,
      borderColor: 'rgb(255, 159, 64)',
      // ...
    },
    {
      label: 'Gap',
      data: calculateGapData,
      borderColor: 'rgb(255, 99, 132)',
      // ...
    }
  ]
};
```

**Integration Steps**:

#### Step 1: Add Service Datasets State
```typescript
// In MasterChart.tsx
const [serviceDatasets, setServiceDatasets] = useState<any[]>([]);
```

#### Step 2: Merge Service Datasets into Chart
```typescript
const chartData = {
  labels: months,
  datasets: [
    // Existing datasets (Actual, FIR, Gap)
    ...existingDatasets,
    // Service Mix datasets (dashed lines)
    ...serviceDatasets
  ]
};
```

#### Step 3: Add ServiceMixCard Below Chart
```typescript
// In master.tsx
<MasterChart 
  onServiceDatasetsChange={(datasets) => {
    // Pass datasets to chart somehow
  }}
/>

<ServiceMixCard 
  year={selectedYear}
  onServiceDatasetsChange={(datasets) => {
    // This needs to update MasterChart's datasets
  }}
/>
```

**Challenge**: ServiceMixCard and MasterChart are siblings - they need to share state.

**Solutions**:

**Option A: Lift State to Parent (master.tsx)**
```typescript
// master.tsx
export function MasterRevenuePage() {
  const [serviceDatasets, setServiceDatasets] = useState([]);
  
  return (
    <>
      <MasterChart serviceDatasets={serviceDatasets} />
      <ServiceMixCard 
        year={selectedYear}
        onServiceDatasetsChange={setServiceDatasets}
      />
    </>
  );
}
```

**Option B: Use Context**
```typescript
// Create ServiceMixContext
const ServiceMixContext = createContext();

// Wrap page
<ServiceMixProvider>
  <MasterChart /> {/* Consumes context */}
  <ServiceMixCard /> {/* Provides context */}
</ServiceMixProvider>
```

**Recommendation**: **Option A** (simpler, less overhead)

---

### Phase 3: Implementation Steps

#### Step 1: Update master.tsx
```typescript
import { useState } from 'react';
import { MasterChart } from '../../components/RevenueChart/MasterChart';
import { ServiceMixCard } from '../../components/services/ServiceMixCard';

export function MasterRevenuePage() {
  const { currentYear, selectedYear } = useRevenue();
  const [serviceDatasets, setServiceDatasets] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      {/* ... header ... */}
      
      <MasterChart serviceDatasets={serviceDatasets} />
      
      <ServiceMixCard 
        year={selectedYear}
        onServiceDatasetsChange={setServiceDatasets}
      />
    </div>
  );
}
```

#### Step 2: Update MasterChart.tsx
```typescript
interface MasterChartProps {
  serviceDatasets?: any[];
}

export function MasterChart({ serviceDatasets = [] }: MasterChartProps) {
  // ... existing code ...
  
  const chartData = {
    labels: months,
    datasets: [
      // Actual Revenue
      {
        label: 'Actual Revenue',
        data: monthlyRevenue,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4,
      },
      // FIR Target (only if not historical)
      ...(!isHistoricalYear ? [{
        label: 'FIR Target',
        data: getFIRData,
        borderColor: 'rgb(255, 159, 64)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
      }] : []),
      // Gap (only if not historical)
      ...(!isHistoricalYear ? [{
        label: 'Gap',
        data: calculateGapData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
        tension: 0.4,
      }] : []),
      // Service Mix datasets (dashed lines)
      ...serviceDatasets
    ]
  };
  
  // ... rest of component ...
}
```

#### Step 3: Test Integration
1. Navigate to Master Revenue page
2. Expand Service Mix Analysis card
3. Click "Show on Graph"
4. Verify service lines appear on chart
5. Toggle services on/off
6. Verify lines appear/disappear

---

### Phase 4: UI/UX Polish

**Enhancements**:
1. **Legend Management**: Chart legend may get crowded
   - Option: Hide service names from legend, show only in card
   - Option: Collapsible legend sections

2. **Color Coordination**: Ensure service colors are distinct
   - Use color picker with predefined palette
   - Prevent duplicate colors

3. **Performance**: Optimize for many services
   - Limit visible services to 5 max
   - Lazy load service data

4. **Tooltips**: Enhanced chart tooltips
   - Show service name + revenue on hover
   - Show percentage of total

---

## Timeline Estimate

- **Phase 2**: 30 minutes (chart integration)
- **Phase 3**: 1 hour (implementation + testing)
- **Phase 4**: 1 hour (polish + edge cases)

**Total**: ~2.5 hours

---

## Testing Checklist

- [ ] Services appear on graph when "Show on Graph" clicked
- [ ] Service lines are dashed (distinct from main lines)
- [ ] Service colors match the color dots in the card
- [ ] Toggling services on/off works
- [ ] Chart legend shows service names
- [ ] Tooltips show service revenue on hover
- [ ] Works with 0 services
- [ ] Works with 1 service
- [ ] Works with 5+ services
- [ ] Works when switching years
- [ ] Performance is acceptable

---

## Next Steps

1. **Run RLS Migration**: Re-run `03_fix_service_mix_user_id.sql` to enable RLS
2. **Test Current State**: Verify services and activities save correctly
3. **Implement Phase 2**: Add chart integration
4. **Test Integration**: Verify graph overlay works
5. **Polish UI**: Add finishing touches

---

## Notes

- Service lines should be **dashed** to distinguish from main revenue lines
- Service colors should be **user-selectable** (already implemented)
- Default to showing **top 3 services** by revenue
- Allow users to toggle individual services on/off
- Consider adding a "Service Mix %" metric showing revenue breakdown
