# SaaS Development Quick Reference

## The Golden Rule
**Build for today, architect for tomorrow.**

Every feature should work now for single user AND scale to multi-user SaaS later.

## Daily Checklist

### Before Writing Any Code:
- [ ] Does this query filter by `user_id`?
- [ ] Will this work with 100+ users?
- [ ] Could this leak data between users?
- [ ] Are there hardcoded limits?
- [ ] Is this integration-ready?

### Code Patterns to Always Use:

**Database Queries:**
```typescript
// ✅ ALWAYS include user_id
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('user_id', userId)  // Non-negotiable
    .eq('year', year);

// ❌ NEVER query without user_id
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('year', year);  // Will break in multi-tenant
```

**API Endpoints:**
```python
# ✅ ALWAYS validate user ownership
@router.get("/api/kpi-records")
async def get_kpi_records(userId: str = Query(...)):
    result = supabase.table('kpi_records')
        .select('*')
        .eq('user_id', userId)  # Required
        .execute()
```

**Limits and Constraints:**
```typescript
// ❌ Hardcoded - won't scale
const MAX_DOCUMENTS = 10;

// ✅ Tier-based - SaaS ready
const MAX_DOCUMENTS = {
    free: 10,
    pro: 100,
    enterprise: 1000
}[subscriptionTier || 'free'];
```

## Red Flags - Stop and Think

If you see any of these, pause and consider SaaS implications:

- Query without `user_id` filter
- Hardcoded limits or constraints
- Global state (not user-scoped)
- Missing data isolation
- No pagination on lists
- SELECT * without limits
- Shared resources between users

## Quick Wins for SaaS Readiness

### 1. Add Indexes (Do This Soon)
```sql
CREATE INDEX idx_revenue_entries_user_id ON revenue_entries(user_id);
CREATE INDEX idx_kpi_records_user_id ON kpi_records(user_id);
CREATE INDEX idx_financial_documents_user_id ON financial_documents(user_id);
```

### 2. Enable RLS (Do This in 3-6 Months)
```sql
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data"
ON revenue_entries FOR SELECT
USING (user_id = auth.uid());
```

### 3. Add Pagination (Do This When Needed)
```typescript
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('user_id', userId)
    .range(0, 99)  // First 100 records
    .order('created_at', { ascending: false });
```

## Development Phases

### Phase 1: Now (Single User)
**Focus:** Core features, perfect UX
**SaaS Prep:** Keep user_id in queries, avoid hardcoded limits

### Phase 2: 3-6 Months (Multi-Tenant Foundation)
**Focus:** Enable multiple users
**Add:** RLS policies, organization concept, 5-10 beta users

### Phase 3: 6-12 Months (SaaS Features)
**Focus:** Subscriptions, integrations
**Add:** Stripe billing, QuickBooks/Xero, MCP servers, 50+ users

### Phase 4: 12+ Months (Scale)
**Focus:** Marketplace, partnerships
**Add:** Integration marketplace, API, enterprise features

## When Cascade Proposes Changes

I will now always consider:
1. Does this maintain user_id filtering?
2. Will this scale to multiple users?
3. Is data isolation preserved?
4. Are there hardcoded limits to avoid?
5. Is this integration-ready?

## Quick Decision Tree

```
Is this a database query?
├─ Yes → Does it filter by user_id?
│  ├─ Yes → Good, proceed
│  └─ No → Add .eq('user_id', userId)
└─ No → Does it have hardcoded limits?
   ├─ Yes → Make tier-based
   └─ No → Good, proceed
```

## Key Principles

1. **Always filter by user_id** - Every query, no exceptions
2. **Think multi-tenant** - Will this work with 1000 users?
3. **Avoid hardcoded limits** - Use subscription tiers
4. **Data isolation first** - Security is non-negotiable
5. **Integration ready** - Structure for future connections
6. **Balance pragmatism** - Don't over-engineer, but don't paint into corner

## Resources

- **Full Guidelines:** SAAS_DEVELOPMENT_GUIDELINES.md
- **Memory System:** Automatically reminds me of SaaS considerations
- **Cross-Page Impact:** CROSS_PAGE_IMPACT_CHECKLIST.md (also considers multi-user)

---

**Remember:** You're building a SaaS product. Every line of code should work now AND scale later.
