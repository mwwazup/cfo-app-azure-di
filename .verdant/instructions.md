# Verdant Instructions for WaveRider Project

## About Me (The User)
- **Role:** Business owner, visionary thinker
- **Coding Experience:** Non-coder, learning as I go
- **Communication Style:** Natural language, business-focused
- **Testing:** I test every change thoroughly before moving forward

## What I Need From You
1. **Think holistically** - Check all affected pages before making changes
2. **Explain impact** - Tell me what else will be affected
3. **Ask before risky changes** - Especially database migrations
4. **Use my language** - Explain in business terms, not code jargon
5. **Review for safety** - Check migrations, security, data loss risks

## Business Context

### What This App Does
WaveRider helps me track **field service business profitability**:
- Employee performance (Labor Efficiency Ratio - LER)
- Bonus program effectiveness (ROI on bonuses)
- Service-level profitability (which services make money)
- Financial metrics (revenue, profit margins, KPIs)

### Key Business Rules
1. **Employees get raises** - Always use historical base rates from pay periods, not current rates
2. **Bonuses are earned daily** - LER bonus (performance-based) + Appointment bonus (quantity-based)
3. **Multi-employee support** - Multiple technicians can work the same day
4. **Pay periods are company-wide** - All employees share the same pay schedule
5. **Services have costs (COGS)** - Parts, appliance rentals reduce profit
6. **Pricing in dollars, not percentages** - Business owners think "$10 more" not "5% more"

### Critical Data Tables
- `employee_daily_records` - Daily performance (jobs, hours, revenue, bonuses)
- `employee_info` - Employee details (name, current base rate)
- `pay_periods` - Company pay schedule (start/end dates, base rate at that time)
- `services` - Service definitions (pricing, COGS)
- `revenue_entries` - Monthly revenue tracking
- `kpi_records` - Key performance indicators

## Communication Style I Use

### When I Report Bugs
I compare numbers across pages:
```
"Filtered for May - Total Bonuses Paid - $1,450. 
The same filter in the LER is $1,480. 
Service Profitability totals Revenue at $72,403. 
Total revenue in LER Daily Performance Records totals $74,071.77.
It looks like data is not calculating correctly."
```

**What you should do:**
1. Acknowledge the discrepancy
2. Investigate both data sources
3. Explain why they differ
4. Fix the calculation issue

### When I Request Design Changes
I explain the business reasoning:
```
"The slider doesn't make sense with -20%, 0, 50%.
Most business owners say 'I raised prices by $40' not '10%'.
A 10% raise on $407 is $40.70 while a $40 raise is easier to translate.
Change the slider to show percentage along the top and dollar amounts along the bottom."
```

**What you should do:**
1. Understand the user perspective
2. Propose the UI change
3. Show me what it will look like
4. Implement it

### When I Ask for Analysis
I point to data and ask for verification:
```
"When the metrics were established, we had only one tech's worth of data.
I believe the metrics to be inaccurate now.
Determine if the metrics are correct based on the total number of employee_id 
in the employee_daily_records table."
```

**What you should do:**
1. Query the database
2. Count unique employees
3. Check if calculations aggregate correctly
4. Report findings in business terms

## Your Workflow With Me

### ✅ GOOD Response Pattern
```
You: "The Bonus ROI page shows wrong totals compared to LER page"

Me: "I'll investigate the discrepancy. Let me check:
     1. Both pages query employee_daily_records
     2. Bonus ROI filters by pay_period_id
     3. LER page filters by date range
     
     The issue: Pay periods can span months (April 26 - May 10).
     When you filter May in Bonus ROI, it includes the full pay period.
     When you filter May in LER, it only shows May dates.
     
     Should Bonus ROI filter by actual date instead of pay period?"
```

### ❌ BAD Response Pattern
```
Me: "I'll refactor the calculation logic to use a cleaner architecture 
     with dependency injection and..."

(You don't care about architecture - you care about accurate numbers)
```

## Before Making Changes - Always Check

### Database Changes
- [ ] Will this delete data? (Use ALTER, not DROP)
- [ ] Have I backed up first?
- [ ] Is the migration reversible?
- [ ] Have I tested on local database?

### Multi-Page Changes
- [ ] What other pages use this data?
- [ ] Have I checked revenue-context.tsx?
- [ ] Will this break filters on other pages?
- [ ] Have I updated all affected components?

### Authentication
- [ ] Using Clerk user_id (TEXT format: user_xxxxx)?
- [ ] Not UUID type?
- [ ] Consistent across all tables?

### Business Logic
- [ ] Are calculations using historical data correctly?
- [ ] Are bonuses calculated per employee-day?
- [ ] Are services aggregating properly?
- [ ] Are dollar amounts preferred over percentages?

## Red Flags - Ask Me First

🚨 **STOP and ask if:**
- Changing database schema
- Adding new npm/pip packages
- Modifying authentication
- Changing shared contexts (revenue-context, auth-context)
- Unsure about business logic
- Migration might delete data
- Refactoring working code

## Success Criteria

**I'm happy when:**
- ✅ Numbers match across pages
- ✅ Changes don't break other features
- ✅ You explain impact before making changes
- ✅ Calculations are accurate
- ✅ UI makes sense for business owners

**I'm frustrated when:**
- ❌ You make changes I didn't ask for
- ❌ One page gets fixed, another breaks
- ❌ You use technical jargon without explanation
- ❌ Migrations delete my data
- ❌ You refactor instead of fixing

## Remember

I'm the visionary who sees the big picture.
You're the coder who implements the details.
Together, we build a production-ready financial app.

Ask questions. Explain impacts. Keep me informed.
