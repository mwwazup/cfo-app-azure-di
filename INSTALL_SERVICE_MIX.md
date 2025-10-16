# Quick Installation Guide - Service Mix Tracking

## Prerequisites
- Node.js and npm installed
- Supabase project configured
- Clerk authentication set up

## Installation Steps

### 1. Install NPM Dependencies

```bash
cd project
npm install @radix-ui/react-dialog @radix-ui/react-tabs
```

### 2. Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of: `backend/migrations/03_create_service_mix_tables.sql`
4. Click "Run"

### 3. Verify Installation

Check that these tables exist in Supabase:
- ✅ `services`
- ✅ `service_activities`

Check that this view exists:
- ✅ `service_monthly_summary`

### 4. Test the Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Master Revenue page

3. Click the "Track Services" button

4. Add a test service:
   - Name: "Test Service"
   - Category: "Recurring"
   - Color: Blue
   - Default Price: 100
   - Enable auto-pricing: ✓

5. Add a test activity:
   - Service: Test Service
   - Date: Today
   - Appointments: 5
   - Revenue: (auto-filled to $500)

6. Click "Show Service Mix" to see the service on the graph

## Troubleshooting

### Missing Dependencies Error
```
Cannot find module '@radix-ui/react-dialog'
```
**Solution**: Run `npm install @radix-ui/react-dialog @radix-ui/react-tabs`

### Database Error
```
relation "services" does not exist
```
**Solution**: Run the migration SQL file in Supabase SQL Editor

### RLS Policy Error
```
new row violates row-level security policy
```
**Solution**: Ensure you're logged in with Clerk and the user_id matches Supabase auth.uid()

## What's Included

### Components Created
- `ServiceTrackerModal.tsx` - Main modal for managing services and activities
- `ServiceMixOverlay.tsx` - Chart visualization logic
- `ServiceMixIntegration.tsx` - Integration with Master Revenue page
- `dialog.tsx` - Dialog UI component
- `tabs.tsx` - Tabs UI component

### Hooks Created
- `useServices()` - Manage services (CRUD operations)
- `useServiceActivities()` - Track weekly activities
- `useMonthlyServiceSummary()` - Get monthly aggregations
- `useServiceRevenueData()` - Fetch revenue data for charts

### Database Objects
- `services` table
- `service_activities` table
- `service_monthly_summary` view
- RLS policies for multi-tenant security
- Indexes for performance
- Auto-update triggers

## Next Steps

1. **Test with Real Data**: Add your actual services and track activities
2. **Customize Colors**: Adjust the DEFAULT_COLORS array in ServiceTrackerModal.tsx
3. **Add More Categories**: Extend SERVICE_CATEGORIES array as needed
4. **Create Service KPIs**: Use the data to generate service-specific KPIs

## Documentation

See `SERVICE_MIX_IMPLEMENTATION.md` for complete documentation including:
- Detailed feature descriptions
- API usage examples
- Database schema details
- Performance optimization tips
- Future enhancement ideas

---

**Ready to Use!** 🎉

The service mix tracking system is now fully integrated into your WaveRider application.
