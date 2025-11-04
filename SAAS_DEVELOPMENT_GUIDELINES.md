# SaaS Development Guidelines for WaveRider

## Project Vision

**Current State:** Single-user CFO dashboard for personal use
**Future State:** Multi-user SaaS product for small business owners

**Critical Principle:** While developing, refining, and debugging for current single-user needs, always build with SaaS multi-tenancy in mind.

## SaaS-First Development Mindset

### Every Decision Should Consider:

1. **Will this work for multiple users?**
   - Data isolation
   - User-specific queries
   - Shared vs. user-specific resources

2. **Is this scalable?**
   - Performance with 100+ users
   - Database query efficiency
   - API rate limits

3. **Is this maintainable?**
   - Code that works for 1 user and 1000 users
   - Clear separation of concerns
   - Easy to add features per-user

4. **Is this secure?**
   - User data isolation (RLS)
   - Authentication boundaries
   - No data leakage between users

## Database Design - Multi-Tenant Ready

### Current Pattern (Already Good):
```sql
-- All tables have user_id
CREATE TABLE revenue_entries (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,  -- Clerk user ID
    year INTEGER,
    month INTEGER,
    actual_revenue DECIMAL,
    ...
);
```

### What to Add (Gradually):

**Row Level Security (RLS):**
```sql
-- Enable RLS on all tables
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users see own data"
ON revenue_entries
FOR SELECT
USING (user_id = auth.uid());

-- Users can only insert their own data
CREATE POLICY "Users insert own data"
ON revenue_entries
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own data
CREATE POLICY "Users update own data"
ON revenue_entries
FOR UPDATE
USING (user_id = auth.uid());
```

**Apply to all tables:**
- revenue_entries
- kpi_records
- financial_documents
- services
- service_activities
- employee_info
- employee_daily_records
- cogs_settings
- company_settings
- profiles

### Tables to Add (Future):

**Organizations/Companies:**
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    subscription_tier TEXT,  -- free, pro, enterprise
    subscription_status TEXT,  -- active, cancelled, past_due
    created_at TIMESTAMP DEFAULT NOW()
);
```

**User-Organization Relationship:**
```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    user_id TEXT NOT NULL,  -- Clerk user ID
    role TEXT,  -- owner, admin, member, viewer
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Subscriptions:**
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    stripe_subscription_id TEXT,
    plan TEXT,  -- starter, professional, enterprise
    status TEXT,  -- active, cancelled, past_due
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Code Patterns - SaaS Ready

### Always Use user_id in Queries

**Current (Good):**
```typescript
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year);
```

**Never do this:**
```typescript
// ❌ BAD - No user filtering
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('year', year);
```

### Prepare for Organization Context

**Current:**
```typescript
// Single user
const userId = user?.id;
```

**Future-ready:**
```typescript
// User + Organization
const userId = user?.id;
const organizationId = user?.organizationId;  // Future

// Query with organization context
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('organization_id', organizationId)  // Future
    .eq('year', year);
```

### Avoid Hardcoded Limits

**Current (Needs improvement):**
```typescript
// ❌ Hardcoded - won't scale
const MAX_DOCUMENTS = 10;
```

**SaaS-ready:**
```typescript
// ✅ Based on subscription tier
const MAX_DOCUMENTS = {
    free: 10,
    pro: 100,
    enterprise: 1000
}[subscriptionTier];
```

## Feature Flags - Build for Tiers

### Subscription Tiers (Future):

**Free Tier:**
- 1 user
- 12 months of data
- Basic KPIs
- Manual data entry
- PDF export

**Professional Tier:**
- 5 users
- Unlimited data history
- Advanced KPIs
- QuickBooks/Xero integration
- Automated reports
- Priority support

**Enterprise Tier:**
- Unlimited users
- Custom integrations
- API access
- White-label options
- Dedicated support

### Code Pattern:
```typescript
// Check subscription tier before feature access
const canUseIntegrations = subscriptionTier !== 'free';
const maxUsers = TIER_LIMITS[subscriptionTier].maxUsers;
const maxDocuments = TIER_LIMITS[subscriptionTier].maxDocuments;
```

## API Design - Multi-Tenant

### Current Pattern (Good):
```python
@router.get("/api/kpi-records")
async def get_kpi_records(userId: str = Query(...)):
    supabase = get_supabase_db()
    result = supabase.table('kpi_records').select('*').eq('user_id', userId).execute()
    return {"rows": result.data}
```

### Future Enhancement:
```python
@router.get("/api/kpi-records")
async def get_kpi_records(
    userId: str = Query(...),
    organizationId: str = Query(None)  # Future
):
    supabase = get_supabase_db()
    query = supabase.table('kpi_records').select('*')
    
    # User-level filtering (current)
    query = query.eq('user_id', userId)
    
    # Organization-level filtering (future)
    if organizationId:
        query = query.eq('organization_id', organizationId)
    
    result = query.execute()
    return {"rows": result.data}
```

## Performance Considerations

### Index for Multi-Tenant Queries

**Add indexes on user_id:**
```sql
CREATE INDEX idx_revenue_entries_user_id ON revenue_entries(user_id);
CREATE INDEX idx_kpi_records_user_id ON kpi_records(user_id);
CREATE INDEX idx_financial_documents_user_id ON financial_documents(user_id);
```

**Composite indexes for common queries:**
```sql
CREATE INDEX idx_revenue_entries_user_year 
ON revenue_entries(user_id, year);

CREATE INDEX idx_kpi_records_user_period 
ON kpi_records(user_id, period);
```

### Query Optimization

**Use pagination:**
```typescript
// ✅ Good for SaaS
const { data } = await supabase
    .table('revenue_entries')
    .select('*')
    .eq('user_id', userId)
    .range(0, 99)  // First 100 records
    .order('created_at', { ascending: false });
```

**Limit data fetching:**
```typescript
// ✅ Only fetch what's needed
const { data } = await supabase
    .table('revenue_entries')
    .select('year, month, actual_revenue')  // Not SELECT *
    .eq('user_id', userId);
```

## Security - Multi-Tenant

### Data Isolation Checklist

- [ ] All tables have user_id or organization_id
- [ ] All queries filter by user_id
- [ ] RLS policies enabled on all tables
- [ ] No cross-user data leakage
- [ ] API endpoints validate user ownership
- [ ] File uploads scoped to user
- [ ] Exports only include user's data

### Authentication Boundaries

**Current (Clerk):**
```typescript
const { userId } = useAuth();  // Clerk provides this
```

**Always validate:**
```python
# Backend validation
def verify_user_owns_resource(user_id: str, resource_id: str):
    result = supabase.table('revenue_entries')
        .select('user_id')
        .eq('id', resource_id)
        .single()
        .execute()
    
    if result.data['user_id'] != user_id:
        raise HTTPException(403, "Access denied")
```

## Integration Architecture - Future Ready

### Current: Manual Data Entry
- User enters revenue manually
- User uploads financial documents
- User tracks services manually

### Phase 1: Basic Integrations (6 months)
- QuickBooks OAuth connection
- Stripe payment sync
- CSV import/export

### Phase 2: Advanced Integrations (12 months)
- Xero, FreshBooks support
- Bank account connections (Plaid)
- Automated data sync
- **This is where MCP servers make sense**

### Phase 3: Marketplace (18 months)
- Integration marketplace
- Custom integrations per customer
- Partner integrations
- API for third-party developers

## Development Phases

### Phase 1: Current (Single User) - Now to 3 Months
**Focus:** Core functionality, perfect single-user experience
**SaaS Prep:**
- Keep user_id in all queries
- Design database with RLS in mind
- Avoid hardcoded limits
- Think about data isolation

**Don't add yet:**
- Organization tables
- Subscription logic
- Multi-user features
- Complex integrations

### Phase 2: Multi-Tenant Foundation - 3 to 6 Months
**Focus:** Enable multiple users, basic isolation
**Add:**
- RLS policies on all tables
- Organization/company concept
- User roles (owner, member)
- Basic subscription tracking

**Test with:**
- 5-10 beta users
- Different companies
- Data isolation verification

### Phase 3: SaaS Features - 6 to 12 Months
**Focus:** Subscription tiers, integrations, scale
**Add:**
- Stripe subscription management
- Tier-based feature flags
- First integrations (QuickBooks, Stripe)
- Usage analytics
- Admin dashboard

**Scale to:**
- 50+ users
- Multiple subscription tiers
- Automated billing

### Phase 4: Growth - 12+ Months
**Focus:** Advanced features, marketplace, partnerships
**Add:**
- MCP server integrations
- Integration marketplace
- API for developers
- White-label options
- Enterprise features

## Decision Framework

### When Building Any Feature, Ask:

**1. Data Isolation**
- Does this query filter by user_id?
- Could this leak data to other users?
- Is RLS policy in place?

**2. Scalability**
- Will this work with 1000 users?
- Are queries indexed properly?
- Is pagination needed?

**3. Subscription Tiers**
- Should this be gated by tier?
- What's the free vs. paid split?
- How do we upsell?

**4. Multi-User**
- Does this need organization context?
- Can multiple users collaborate?
- What are the permission levels?

**5. Integrations**
- Will users want to connect external services?
- Is this integration-ready?
- Should we use MCP (future)?

## Code Review Checklist

Before committing any code:

- [ ] All database queries include user_id filter
- [ ] No hardcoded limits (use tier-based)
- [ ] Feature considers multi-tenant context
- [ ] Performance acceptable at scale
- [ ] Security: No data leakage possible
- [ ] Documentation updated
- [ ] Tests include multi-user scenarios

## What This Means for Daily Development

### When Fixing Bugs:
- Fix for current single-user case
- But ensure fix doesn't break multi-tenant future
- Check: Does this query need user_id?

### When Adding Features:
- Build for single user first
- But structure code for multi-tenant
- Ask: How will this work with 100 users?

### When Refactoring:
- Improve code quality
- Add user_id filtering if missing
- Prepare for organization context

### When Debugging:
- Test with single user (current)
- Think about multi-user scenarios
- Verify data isolation

## Summary

**Current Priority:** Build great single-user experience
**Always Keep in Mind:** This will be a multi-user SaaS product
**Balance:** Don't over-engineer now, but don't paint yourself into a corner

**Key Principles:**
1. Always use user_id in queries
2. Design database with RLS in mind
3. Avoid hardcoded limits
4. Think about subscription tiers
5. Structure code for scale
6. Security and data isolation first

**Timeline:**
- Now: Single user, SaaS-aware patterns
- 3-6 months: Multi-tenant foundation
- 6-12 months: SaaS features and integrations
- 12+ months: Scale and marketplace

---

**Remember:** Build for today, architect for tomorrow. Every line of code should work now and scale later.
