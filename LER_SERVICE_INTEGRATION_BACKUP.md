# Employee LER + Service Mix Integration - Backup Timestamp

## Backup Information
**Timestamp:** November 6, 2025 - 10:23 AM (UTC-07:00)
**Backup Name:** `pre_ler_service_integration`

## What This Backup Captures
- Current database state before adding service labor tracking
- All existing tables: services, service_activities, employee_info, pay_periods, employee_daily_records
- Current Business Intelligence page functionality

## Revert Instructions
If you need to revert to this state:

```sql
-- Contact your database administrator or use Supabase dashboard
-- to restore from backup timestamp: 2025-11-06 10:23:00 UTC-07:00
```

## Changes Being Implemented
1. New table: `service_labor_records` - Links employee work to specific services
2. Modified table: `employee_daily_records` - Add service breakdown column
3. Updated Employee LER page - Add service selection for daily records
4. New hook: `useServiceLaborData` - Fetch combined service + labor data
5. Updated Business Intelligence page - Show true net profitability with labor costs

## Key Specifications
- **Manager app** - No employee punch-in/out, manager enters all data
- **Historical data** - Allow backdating entries for CRM import
- **Multi-employee jobs** - Coming soon (Phase 2)
- **Maintain app style** - Gold accent, bg-muted/30, text-foreground

## Implementation Phases
- Phase 1: Database changes (service_labor_records table)
- Phase 2: Employee LER page updates (service selection)
- Phase 3: Data fetching hooks (useServiceLaborData)
- Phase 4: Business Intelligence updates (net profitability)
- Phase 5: Testing and refinement

## Files Modified
- `backend/migrations/[new]_create_service_labor_tables.sql`
- `project/src/pages/EmployeeLERPage.tsx`
- `project/src/hooks/useServiceLaborData.ts`
- `project/src/pages/BusinessIntelligencePage.tsx`

---

**Status:** Ready to begin implementation
**Next Step:** Phase 1 - Database Changes
