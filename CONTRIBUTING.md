# Contributing to WaveRider

## For AI Assistants (Cascade)

This document provides context for AI assistants working on this codebase.

### Project Overview
- **Purpose:** CFO dashboard for small business owners
- **User:** Non-technical business owner learning to code
- **Development Time:** 3+ months of active development
- **Status:** Production-ready, actively used

### Core Philosophy
1. **Respect existing patterns** - User has built this over months
2. **Focus on the request** - Don't add unrequested features
3. **Consistency matters** - Match existing code style and design
4. **Working > Perfect** - Don't break things to follow "best practices"
5. **Ask when unsure** - User prefers questions over assumptions

### Tech Stack (DO NOT CHANGE)
```
Frontend:
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Router
- React Query (for some features)

Backend:
- FastAPI (Python)
- Supabase (PostgreSQL)
- Clerk (Authentication)

Deployment:
- Frontend: TBD
- Backend: Local development
- Database: Supabase cloud
```

### File Structure
```
project/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (DON'T MODIFY)
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── financial/       # Financial features
│   │   └── layout/          # Layout components
│   ├── contexts/            # React Context (auth, revenue)
│   ├── services/            # API services and business logic
│   ├── pages/               # Route pages
│   └── config/              # Configuration files
backend/
├── api/                     # FastAPI routes
├── migrations/              # Database migrations
├── backups/                 # Database backups (IMPORTANT!)
└── backup_database.py       # Backup script
```

### Key Files - READ BEFORE CHANGING
- `src/contexts/revenue-context.tsx` - Revenue data state management
- `src/services/revenueKPIGenerator.ts` - KPI calculation logic
- `src/services/kpiRecordsService.ts` - KPI data service
- `backend/api/financial.py` - Main API routes
- `backend/migrations/` - Database schema changes

### Design System
**Colors:**
- Primary: Blue/Gray tones
- Accent: Gold/Yellow (for FIR targets)
- Status: Green (good), Yellow (warning), Red (alert)

**Components:**
- Use shadcn/ui from `/components/ui/`
- Consistent card layouts with shadows
- Clean, professional aesthetic
- No fancy animations or gradients

**Typography:**
- System font stack
- Clear hierarchy
- Readable sizes

### Code Style
**TypeScript:**
```typescript
// ✅ Good - matches existing style
export async function getKPIRecords(userId: string, options?: FilterOptions) {
  const records = await supabase.table('kpi_records').select('*').eq('user_id', userId);
  return records;
}

// ❌ Bad - over-engineered
export const getKPIRecords: GetKPIRecordsFunction = async (
  userId: UserId,
  options: Partial<FilterOptions> = {}
): Promise<KPIRecord[]> => {
  // ... complex abstraction
}
```

**Python:**
```python
# ✅ Good - simple and clear
@router.get("/api/kpi-records")
async def get_kpi_records(userId: str = Query(...)):
    supabase = get_supabase_db()
    result = supabase.table('kpi_records').select('*').eq('user_id', userId).execute()
    return {"rows": result.data}

# ❌ Bad - unnecessary complexity
@router.get("/api/kpi-records")
@validate_user_id
@cache_response(ttl=300)
async def get_kpi_records(request: KPIRecordsRequest):
    # ... over-abstracted
```

### Database Guidelines
**Schema Changes:**
1. ALWAYS backup first: `python backup_database.py`
2. Use ALTER TABLE, never DROP TABLE
3. Test migration on local database first
4. Document changes in migration file
5. Verify data preservation after migration

**Query Patterns:**
```typescript
// ✅ Good - use .maybeSingle() for optional records
const { data } = await supabase.table('profiles').select('*').eq('user_id', userId).maybeSingle();

// ❌ Bad - .single() throws 406 if no record
const { data } = await supabase.table('profiles').select('*').eq('user_id', userId).single();
```

### Common Pitfalls to Avoid
1. **Styling Changes** - Don't change CSS unless explicitly asked
2. **Refactoring** - Don't refactor working code without permission
3. **New Libraries** - Don't add packages without discussion
4. **Architecture Changes** - Don't change state management, routing, etc.
5. **Feature Creep** - Stick to what was requested
6. **Breaking Changes** - Test thoroughly before suggesting

### Testing Checklist
Before suggesting changes:
- [ ] TypeScript compiles without errors
- [ ] Database queries match actual schema
- [ ] Changes don't break existing features
- [ ] Styling matches existing design
- [ ] No new dependencies added
- [ ] User ID handling is correct (Clerk TEXT format)

### When to Ask User
- Adding new npm/pip packages
- Changing database schema
- Modifying authentication
- Refactoring large sections of code
- Changing UI/UX patterns
- Introducing new architectural patterns
- Unsure about requirements

### Success Criteria
**Good Response:**
- Fixes exactly what was requested
- Matches existing code style
- No unintended side effects
- User says "perfect!"

**Bad Response:**
- Changes styling without being asked
- Refactors unrelated code
- Introduces new patterns
- User says "why did you change that?"

### Emergency Contacts
- **Backup System:** `python backup_database.py`
- **Restore Data:** `python restore_database.py <timestamp>`
- **Safe Migrations:** Use `SAFE_*` migration files
- **Documentation:** See `BACKUP_SYSTEM_README.md`, `RECOVERY_PLAN.md`

### Version History
- **Nov 2, 2025:** Added backup system after data loss incident
- **Oct 2025:** Removed Edit Goal feature for consistency
- **Oct 2025:** Fixed FIR target synchronization
- **Sep 2025:** Implemented KPI dashboard

---

**Remember:** This is the user's project. Respect their work, follow their patterns, and ask when unsure.
