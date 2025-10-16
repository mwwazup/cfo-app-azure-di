# Service Mix Tracking Implementation

## Overview
Complete service mix tracking system with weekly granularity, multi-business support, and optional auto-pricing. Allows users to track which services drive revenue throughout the year and visualize seasonality patterns.

## Features Implemented

### ✅ Database Schema
- **`services` table**: User-defined services with categories, colors, and optional auto-pricing
- **`service_activities` table**: Weekly tracking of appointments and revenue per service
- **`service_monthly_summary` view**: Aggregated monthly view from weekly data
- **Multi-tenant support**: Proper RLS policies for Supabase user_id
- **Auto-calculations**: Triggers for avg_ticket_price calculation

### ✅ Service Management
- Add up to 4 services at a time
- Service categories (Recurring, One-Time, Seasonal, etc.)
- Color picker for graph visualization (8 default colors)
- Optional default pricing for auto-revenue calculation
- Soft delete (mark as inactive)

### ✅ Weekly Activity Tracking
- Select service from dropdown
- Date picker (week auto-calculated from date)
- Appointment count input
- Revenue input (auto-filled if pricing enabled)
- Batch entry: Add multiple weeks before saving
- Week-of-month calculation (1-5)
- Week start/end dates (Monday-Sunday)

### ✅ Service Mix Visualization
- Toggle service lines on/off on revenue graph
- Dashed lines for services (vs solid for total revenue)
- Color-coded by service
- Show/hide all services
- Top 3 services shown by default
- Service legend with revenue totals and percentages
- Service mix stats (top service, total services, month leader)

### ✅ Auto-Pricing Feature (Optional)
- Set default price per service
- Enable/disable auto-pricing per service
- Auto-calculate revenue: `appointments × default_price`
- Manual override always available
- Flag indicates if revenue was auto-calculated

## File Structure

```
backend/migrations/
  └── 03_create_service_mix_tables.sql    # Database schema

project/src/
  ├── db/
  │   └── schema.ts                        # TypeScript schema definitions
  ├── hooks/
  │   └── useServices.ts                   # Service data hooks
  ├── components/
  │   ├── services/
  │   │   ├── ServiceTrackerModal.tsx      # Main modal UI
  │   │   ├── ServiceMixOverlay.tsx        # Chart visualization logic
  │   │   └── ServiceMixIntegration.tsx    # Integration component
  │   └── ui/
  │       ├── dialog.tsx                   # Dialog component (Radix UI)
  │       └── tabs.tsx                     # Tabs component (Radix UI)
  └── pages/
      └── revenue/
          └── master.tsx                   # Updated with service mix
```

## Installation Steps

### 1. Install Required Dependencies

```bash
cd project
npm install @radix-ui/react-dialog @radix-ui/react-tabs
```

### 2. Run Database Migration

```sql
-- Execute in Supabase SQL Editor
-- File: backend/migrations/03_create_service_mix_tables.sql
```

This creates:
- `services` table
- `service_activities` table
- `service_monthly_summary` view
- Indexes for performance
- RLS policies
- Auto-update triggers

### 3. Verify Schema

Check that the following tables exist in Supabase:
- ✅ `services`
- ✅ `service_activities`

Check that the view exists:
- ✅ `service_monthly_summary`

## Usage Guide

### For Users

#### Step 1: Add Services
1. Navigate to Master Revenue page
2. Click "Track Services" button
3. Go to "Manage Services" tab
4. Fill in service details:
   - Service Name (required)
   - Category (optional)
   - Color (click to select)
   - Default Price (optional)
   - Enable auto-pricing checkbox (optional)
5. Click "Add Service" for each service

#### Step 2: Track Weekly Activities
1. Click "Track Services" button
2. Go to "Track Activities" tab
3. Select a service from dropdown
4. Pick a date (any day in the week)
5. Enter appointment count
6. Enter revenue (or leave blank if auto-pricing enabled)
7. Click "Add to List"
8. Repeat for multiple weeks
9. Click "Save All Activities"

#### Step 3: Visualize Service Mix
1. On Master Revenue page, click "Show Service Mix"
2. Toggle individual services on/off in the legend
3. View service stats and top performers
4. Hover over chart to see service revenue per month

### For Developers

#### Using the Hooks

```typescript
import { useServices, useServiceActivities } from '@/hooks/useServices';

// Get all active services
const { services, createService, deleteService } = useServices();

// Get activities for a specific period
const { activities, createActivity } = useServiceActivities(2025, 1);

// Create a new service
await createService({
  serviceName: 'Lawn Mowing',
  serviceCategory: 'Recurring',
  color: '#10B981',
  defaultPrice: 50,
  isAutoPricingEnabled: true,
});

// Track weekly activity
await createActivity({
  serviceId: 'service-uuid',
  year: 2025,
  month: 1,
  weekOfMonth: 2,
  weekStartDate: '2025-01-06',
  weekEndDate: '2025-01-12',
  appointmentCount: 15,
  totalRevenue: 750, // Optional if auto-pricing enabled
});
```

#### Fetching Monthly Summaries

```typescript
import { useMonthlyServiceSummary } from '@/hooks/useServices';

const { summaries, loading } = useMonthlyServiceSummary(2025, 1);

// summaries contains:
// - serviceId, serviceName, serviceCategory, color
// - totalAppointments, totalRevenue, avgTicketPrice
// - weeksWithActivity
```

#### Adding Service Lines to Chart

```typescript
import { useServiceRevenueData, generateServiceMixDatasets } from '@/components/services/ServiceMixOverlay';

const { data: serviceData } = useServiceRevenueData(year, services);
const visibleServices = new Set(['service-id-1', 'service-id-2']);

const serviceDatasets = generateServiceMixDatasets(
  serviceData,
  visibleServices,
  false // showAsStacked
);

// Add to Chart.js datasets array
```

## Database Schema Details

### `services` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| service_name | VARCHAR(255) | Service name (unique per user) |
| service_category | VARCHAR(100) | Category (Recurring, One-Time, etc.) |
| color | VARCHAR(7) | Hex color for visualization |
| default_price | NUMERIC(15,2) | Optional default price per appointment |
| is_auto_pricing_enabled | BOOLEAN | Enable auto-revenue calculation |
| display_order | INTEGER | Sort order |
| is_active | BOOLEAN | Soft delete flag |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `service_activities` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| service_id | UUID | Foreign key to services |
| year | INTEGER | Calendar year |
| month | INTEGER | Calendar month (1-12) |
| week_of_month | INTEGER | Week within month (1-5) |
| week_start_date | DATE | Monday of the week |
| week_end_date | DATE | Sunday of the week |
| appointment_count | INTEGER | Number of appointments |
| total_revenue | NUMERIC(15,2) | Revenue for the week |
| avg_ticket_price | NUMERIC(15,2) | Auto-calculated average |
| is_auto_calculated | BOOLEAN | Flag for auto-revenue |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### `service_monthly_summary` View

Aggregates weekly data into monthly totals:
- `total_appointments`: Sum of all appointments in month
- `total_revenue`: Sum of all revenue in month
- `avg_ticket_price`: Calculated average
- `weeks_with_activity`: Count of weeks with data

## Multi-Business Support

The system is designed for users with multiple businesses:

1. **User Isolation**: All queries filtered by `user_id` (Supabase auth.uid())
2. **RLS Policies**: Row-level security ensures users only see their data
3. **Separate Service Lists**: Each user has their own services
4. **Independent Tracking**: Activities are user-scoped

### Clerk Integration

The hooks use `useAuth()` from Clerk to get the current user ID, which is then used in all Supabase queries. The RLS policies ensure data isolation at the database level.

## Performance Considerations

### Indexes
- `idx_services_user_id`: Fast user service lookups
- `idx_services_active`: Filter active services
- `idx_service_activities_user_id`: User activity lookups
- `idx_service_activities_service_id`: Service-specific queries
- `idx_service_activities_period`: Period-based filtering
- `idx_service_activities_week`: Week-based queries

### Optimization Tips
1. Use the `service_monthly_summary` view for monthly aggregations
2. Filter by year/month in queries to reduce data transfer
3. Limit visible services on chart to 3-5 for performance
4. Use memoization in React components for expensive calculations

## Future Enhancements

### Potential Features
- [ ] Service performance KPIs (revenue per service, growth rate)
- [ ] Seasonality analysis (identify peak months per service)
- [ ] Service mix recommendations (AI-powered insights)
- [ ] Bulk import from CSV
- [ ] Service templates (pre-defined service packages)
- [ ] Revenue forecasting per service
- [ ] Customer count tracking per service
- [ ] Service profitability analysis (with cost tracking)

### Chart Enhancements
- [ ] Stacked area chart option
- [ ] Service comparison view (side-by-side months)
- [ ] Heat map visualization (service × month)
- [ ] Export service data to CSV/PDF

## Troubleshooting

### Services Not Showing
1. Check that services are marked as `is_active = true`
2. Verify user_id matches between Clerk and Supabase
3. Check RLS policies are enabled

### Activities Not Saving
1. Verify service_id exists and belongs to user
2. Check unique constraint on (service_id, year, month, week_of_month)
3. Ensure week dates are valid (Monday-Sunday)

### Chart Not Displaying Services
1. Confirm services have revenue data for the selected year
2. Check that services are toggled "visible" in the legend
3. Verify Chart.js datasets are being generated correctly

## Testing Checklist

- [ ] Create service with auto-pricing
- [ ] Create service without auto-pricing
- [ ] Add weekly activity with manual revenue
- [ ] Add weekly activity with auto-calculated revenue
- [ ] Toggle service visibility on chart
- [ ] View service mix stats
- [ ] Delete service (soft delete)
- [ ] Switch between years
- [ ] Test with multiple users (RLS isolation)

## Support

For issues or questions:
1. Check this documentation
2. Review database logs in Supabase
3. Check browser console for errors
4. Verify all dependencies are installed

---

**Implementation Date**: January 2025  
**Version**: 1.0  
**Status**: ✅ Complete - Ready for Testing
