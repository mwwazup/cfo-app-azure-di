# WaveRider Dependency Map

This document maps cross-page dependencies to help identify what might break when making changes.

---

## 🔴 CRITICAL SHARED RESOURCES

These are used across MANY pages. Changes here affect the entire app.

### Contexts (Global State)

| Context | File | Used By | Impact of Changes |
|---------|------|---------|-------------------|
| **auth-context** | `contexts/auth-context.tsx` | ALL pages | Auth breaks = app breaks |
| **revenue-context** | `contexts/revenue-context.tsx` | Dashboard, Master Revenue, Your Big Fig, Employee Hub, KPI Dashboard | FIR targets, KPIs, Lighthouse data |
| **cashflow-sync-context** | `contexts/cashflow-sync-context.tsx` | Dashboard | P&L sync to revenue |

### Core Services

| Service | File | Used By | Impact of Changes |
|---------|------|---------|-------------------|
| **employeeLERService** | `services/employeeLERService.ts` | EmployeeLERPage, EmployeeDashboardPage, EmployeeHubPage, BonusROIAnalysisPage | All employee/LER data |
| **crewService** | `services/crewService.ts` | EmployeeLERPage, EmployeeHubPage | Crew management, crew LER |
| **revenueDataService** | `services/revenueDataService.ts` | revenue-context, MasterChart | Revenue entries CRUD |
| **kpiRecordsService** | `services/kpiRecordsService.ts` | KPIDashboard, revenue-context | KPI storage/retrieval |
| **revenueKPIGenerator** | `services/revenueKPIGenerator.ts` | KPIDashboard, revenue-context | KPI calculations |
| **bigFigGoalService** | `services/bigFigGoalService.ts` | your-big-fig, revenue-context, Dashboard | Lighthouse goals |

---

## 📊 PAGE DEPENDENCY CLUSTERS

### Cluster 1: Employee/LER System
**Tightly coupled - changes affect all**

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMPLOYEE/LER CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EmployeeHubPage ◄──────────────────► EmployeeLERPage           │
│       │                                     │                   │
│       │ (employees, pay periods,            │ (daily records,   │
│       │  crews, settings)                   │  LER calcs,       │
│       │                                     │  crew tracking)   │
│       │                                     │                   │
│       └──────────────┬──────────────────────┘                   │
│                      │                                          │
│                      ▼                                          │
│              EmployeeDashboardPage                              │
│              (report cards, performance)                        │
│                      │                                          │
│                      ▼                                          │
│              BonusROIAnalysisPage                               │
│              (bonus cost analysis)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SHARED DATA:
- employee_info table
- pay_periods table
- employee_daily_records table
- crews, crew_members, crew_roles tables
- company_settings table
- cogs_settings table
```

**⚠️ DANGER ZONES:**
- Changing `COMPANY_SETTINGS` in AddDailyRecordWithServices affects LER/bonus calcs everywhere
- Changing overtime logic in one place but not others causes discrepancies
- Crew LER vs Solo LER use different calculation paths

---

### Cluster 2: Revenue/KPI System
**Core financial tracking**

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVENUE/KPI CLUSTER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MasterRevenuePage ◄─────────────────► Dashboard                │
│       │                                    │                    │
│       │ (MasterChart component)            │ (KPIDashboard)     │
│       │                                    │                    │
│       └──────────────┬─────────────────────┘                    │
│                      │                                          │
│                      ▼                                          │
│              revenue-context.tsx                                │
│              (central state manager)                            │
│                      │                                          │
│           ┌──────────┼──────────┐                               │
│           ▼          ▼          ▼                               │
│    revenueData   kpiRecords   bigFigGoal                        │
│    Service       Service      Service                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SHARED DATA:
- revenue_entries table (actual_revenue, desired_revenue)
- kpi_records table
- big_fig_goals table
- lighthouse_step_overrides table
```

**⚠️ DANGER ZONES:**
- FIR target changes in MasterChart must sync to KPIs
- Lighthouse step changes affect FIR distribution
- KPI refresh timing issues (debouncing critical)

---

### Cluster 3: Lighthouse/Goal System
**Long-term planning**

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIGHTHOUSE CLUSTER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  your-big-fig.tsx ◄──────────────────► Dashboard                │
│       │                                    │                    │
│       │ (goal setting,                     │ (Lighthouse        │
│       │  step planning)                    │  Journey card)     │
│       │                                    │                    │
│       └──────────────┬─────────────────────┘                    │
│                      │                                          │
│                      ▼                                          │
│              revenue-context.tsx                                │
│              (lighthouse state)                                 │
│                      │                                          │
│                      ▼                                          │
│              MasterChart.tsx                                    │
│              (FIR sync button)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SHARED DATA:
- big_fig_goals table
- lighthouse_step_overrides table
- revenue_entries.desired_revenue (FIR targets)
```

**⚠️ DANGER ZONES:**
- Theme arrays duplicated in Dashboard and your-big-fig (EARLY_THEMES, GROWTH_THEMES, FREEDOM_THEMES)
- Step year calculations must match across pages

---

### Cluster 4: Service Mix System
**Service tracking**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE MIX CLUSTER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ServiceMixPage ◄────────────────────► EmployeeLERPage          │
│       │                                    │                    │
│       │ (service definitions,              │ (service-based     │
│       │  activity tracking)                │  daily records)    │
│       │                                    │                    │
│       └──────────────┬─────────────────────┘                    │
│                      │                                          │
│                      ▼                                          │
│              services table                                     │
│              (COGS costs per service)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SHARED DATA:
- services table (name, price, cogs_cost)
- service_activities table
- employee_daily_records.job_types (JSONB)
```

**⚠️ DANGER ZONES:**
- Service names in job_types must match services table
- COGS changes affect LER calculations
- Deleting a service breaks historical records

---

### Cluster 5: AI Coach System
**AI features**

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI COACH CLUSTER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  sms-coach.tsx ◄─────────────────────► KPIDashboard             │
│       │                                    │                    │
│       │ (chat interface)                   │ (AI insights)      │
│       │                                    │                    │
│       └──────────────┬─────────────────────┘                    │
│                      │                                          │
│           ┌──────────┼──────────┐                               │
│           ▼          ▼          ▼                               │
│    claudeService  zepService  coachingService                   │
│    (AI calls)     (memory)    (history)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SHARED DATA:
- coaching_conversations table
- Zep memory (external)
- All financial data (for context)
```

---

## 🔗 SHARED COMPONENTS

| Component | Location | Used By Pages |
|-----------|----------|---------------|
| **KPIDashboard** | `components/dashboard/KPIDashboard.tsx` | Dashboard |
| **MasterChart** | `components/RevenueChart/MasterChart.tsx` | MasterRevenuePage |
| **AddDailyRecordWithServices** | `components/employee/AddDailyRecordWithServices.tsx` | EmployeeLERPage |
| **CompanySettingsDialog** | `components/employee/CompanySettingsDialog.tsx` | EmployeeLERPage, EmployeeHubPage |
| **PayrollSummary** | `components/employee/PayrollSummary.tsx` | EmployeeHubPage |
| **EmployeeSetupDialog** | `components/employee/EmployeeSetupDialog.tsx` | EmployeeHubPage |
| **CSVUploadDialog** | `components/employee/CSVUploadDialog.tsx` | EmployeeLERPage |
| **ServiceTrackerModal** | `components/services/ServiceTrackerModalRedesigned.tsx` | ServiceMixPage |
| **MoneyBreakdown** | `components/dashboard/MoneyBreakdown.tsx` | KPIDashboard |

---

## 🔧 SHARED HOOKS

| Hook | File | Used By |
|------|------|---------|
| **useServices** | `hooks/useServices.ts` | ServiceMixPage, EmployeeLERPage |
| **useKPIRefresh** | `hooks/useKPIRefresh.ts` | MasterChart |
| **useCoachingHistory** | `hooks/useCoachingHistory.ts` | sms-coach |
| **useProfile** | `hooks/useProfile.ts` | Dashboard |
| **useCelebration** | `hooks/useCelebration.ts` | Dashboard |

---

## 📋 CHANGE IMPACT CHECKLIST

### When changing Employee/LER logic:
- [ ] EmployeeLERPage.tsx
- [ ] EmployeeDashboardPage.tsx
- [ ] EmployeeHubPage.tsx
- [ ] BonusROIAnalysisPage.tsx
- [ ] AddDailyRecordWithServices.tsx
- [ ] employeeLERService.ts
- [ ] crewService.ts

### When changing Revenue/FIR logic:
- [ ] revenue-context.tsx
- [ ] MasterChart.tsx
- [ ] KPIDashboard.tsx
- [ ] revenueDataService.ts
- [ ] revenueKPIGenerator.ts

### When changing Lighthouse/Goals:
- [ ] your-big-fig.tsx
- [ ] Dashboard (index.tsx) - theme arrays
- [ ] MasterChart.tsx - FIR sync
- [ ] revenue-context.tsx - lighthouse state
- [ ] bigFigGoalService.ts

### When changing Services:
- [ ] ServiceMixPage.tsx
- [ ] EmployeeLERPage.tsx (job_types)
- [ ] AddDailyRecordWithServices.tsx
- [ ] useServices.ts
- [ ] serviceLaborService.ts

### When changing KPIs:
- [ ] KPIDashboard.tsx
- [ ] revenueKPIGenerator.ts
- [ ] kpiRecordsService.ts
- [ ] revenue-context.tsx

---

## 🗄️ DATABASE TABLE RELATIONSHIPS

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ revenue_entries │     │   kpi_records   │     │  big_fig_goals  │
│                 │     │                 │     │                 │
│ - user_id       │     │ - user_id       │     │ - user_id       │
│ - year          │────►│ - year          │     │ - target_revenue│
│ - month         │     │ - month         │     │ - years_to_goal │
│ - actual_revenue│     │ - kpi_name      │     └─────────────────┘
│ - desired_revenue     │ - kpi_value     │              │
└─────────────────┘     └─────────────────┘              │
                                                         ▼
                                          ┌─────────────────────────┐
                                          │ lighthouse_step_overrides│
                                          │                         │
                                          │ - user_id               │
                                          │ - year_index            │
                                          │ - target_revenue        │
                                          │ - milestones (JSONB)    │
                                          └─────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  employee_info  │     │   pay_periods   │     │employee_daily_  │
│                 │     │                 │     │    records      │
│ - id            │◄────│ - user_id       │────►│                 │
│ - user_id       │     │ - year          │     │ - pay_period_id │
│ - name          │     │ - start_date    │     │ - employee_id   │
│ - base_rate     │     │ - end_date      │     │ - date          │
└─────────────────┘     └─────────────────┘     │ - revenue       │
        │                                       │ - hours         │
        │                                       │ - ler           │
        ▼                                       │ - job_types     │
┌─────────────────┐                             │ - crew_id       │
│     crews       │                             │ - is_crew_job   │
│                 │                             └─────────────────┘
│ - id            │                                     │
│ - user_id       │                                     │
│ - crew_name     │◄────────────────────────────────────┘
└─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│  crew_members   │────►│   crew_roles    │
│                 │     │                 │
│ - crew_id       │     │ - role_name     │
│ - employee_id   │     │ - bonus_%       │
│ - role_id       │     └─────────────────┘
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    services     │────►│service_activities│
│                 │     │                 │
│ - id            │     │ - service_id    │
│ - name          │     │ - week          │
│ - price         │     │ - appointments  │
│ - cogs_cost     │     │ - revenue       │
└─────────────────┘     └─────────────────┘
```

---

## 🚨 KNOWN DUPLICATION ISSUES

1. **Theme Arrays** - Duplicated in `dashboard/index.tsx` and `your-big-fig.tsx`
   - Should be centralized in a constants file

2. **COMPANY_SETTINGS** - Duplicated in `AddDailyRecordWithServices.tsx` and `EmployeeDashboardPage.tsx`
   - Should be fetched from database or centralized

3. **parseLocalDate()** - Duplicated in multiple files
   - Should be in a shared utils file

4. **Overtime Calculation Logic** - In both EmployeeLERPage and EmployeeDashboardPage
   - Must stay in sync or discrepancies occur

---

## 📝 NOTES FOR CASCADE AI

When making changes:
1. **Always check this map** before editing
2. **List affected files** in your plan
3. **Test cross-page impacts** after changes
4. **Update this map** if you add new dependencies

---

*Last Updated: December 23, 2025*
