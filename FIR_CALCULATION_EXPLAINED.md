# FIR Calculation Explained

## Your Question
> October 2024 shows $29,395 actual revenue. If I did my math right, this is 12.5% of total revenue. 12.5% of $29,395 is $3,674 + $29,395 = $33,069. The tooltip shows $50,436. I cannot understand the math.

## The Confusion
You're thinking: **Last Year + 12.5% Growth = This Year's Target**

But the system is actually doing: **Last Year's Distribution Pattern × This Year's Total FIR**

## How FIR Targets Actually Work

### Step 1: Calculate 2024's Revenue Distribution
Let's say your 2024 total revenue was: **$235,000** (example)

October 2024: $29,395
October's percentage: $29,395 ÷ $235,000 = **12.5%**

### Step 2: Apply That Percentage to 2025 FIR
Your 2025 annual FIR: **$799,000**
October 2025 FIR: $799,000 × 12.5% = **$99,875**

But wait... that's not $50,436 either!

## The Real Issue

The tooltip showing **$50,436** suggests one of these scenarios:

### Scenario A: Lower 2024 Total Revenue
If 2024 total was **$403,000**:
- October 2024: $29,395
- October's percentage: $29,395 ÷ $403,000 = **7.3%**
- October 2025 FIR: $799,000 × 7.3% = **$58,327**

Still doesn't match $50,436...

### Scenario B: Different Annual FIR
If annual FIR was **$604,000** instead of $799,000:
- October's percentage: 12.5% (from 2024)
- October 2025 FIR: $604,000 × 12.5% = **$75,500**

Still doesn't match...

### Scenario C: The KPI Shows Different Number Than Graph
- **KPI Card**: $63,762 (from database)
- **Graph Tooltip**: $50,436 (calculated differently?)

This suggests a **data mismatch** between what's stored in the database and what's displayed on the graph.

## Let's Debug This

### Check Your Actual Numbers:

1. **What was your 2024 total revenue?**
   - Sum of all 12 months in 2024

2. **What is your current 2025 annual FIR setting?**
   - Check the FIR input on Master Revenue page

3. **What does the database say?**
   - Check `revenue_entries` table for October 2025's `desired_revenue`

### The Formula Should Be:
```
October 2025 FIR = (October 2024 Revenue ÷ 2024 Total Revenue) × 2025 Annual FIR

Example:
October 2025 FIR = ($29,395 ÷ $235,000) × $799,000
October 2025 FIR = 0.125 × $799,000
October 2025 FIR = $99,875
```

## Why You're Seeing $63,762 in KPI

The KPI is reading from the database: `revenue_entries.desired_revenue` for October 2025.

This value was calculated and saved when you last set your annual FIR.

## Why Graph Shows $50,436

This is the mystery! The graph tooltip should be reading the same `desired_revenue` value.

**Possible causes:**
1. Graph is using old cached data
2. Graph is calculating on the fly with different inputs
3. There's a mismatch between `desired_revenue` and `target_revenue` columns

## Action Items

### 1. Check Database Values
Run this query in Supabase:
```sql
SELECT 
  year,
  month,
  actual_revenue,
  desired_revenue,
  target_revenue
FROM revenue_entries
WHERE user_id = 'your-user-id'
  AND year = 2025
  AND month = 10;
```

### 2. Check What Graph Is Using
Look at the graph tooltip code - it should show which value it's pulling.

### 3. Verify 2024 Total
```sql
SELECT 
  SUM(actual_revenue) as total_2024_revenue
FROM revenue_entries
WHERE user_id = 'your-user-id'
  AND year = 2024;
```

### 4. Verify 2025 FIR Setting
Check the FIR input field on Master Revenue page - what does it show?

## Expected Behavior

Once we fix any data mismatches, you should see:

**Everywhere (Graph, KPI, Database):**
- October 2025 FIR: Same number
- Calculated as: (Oct 2024 ÷ 2024 Total) × 2025 Annual FIR

**Not a growth calculation:**
- ❌ Last Year + 12.5% = This Year
- ✅ Last Year's Pattern × This Year's Total = This Year's Monthly Targets

## The Key Insight

FIR targets are about **maintaining your business's natural rhythm** (seasonality) while **scaling up to your annual goal**.

If October is typically 12.5% of your annual revenue, then October's FIR should be 12.5% of your annual FIR target.

It's **not** about growing each month by 12.5%. It's about **distributing your annual FIR goal** according to your business's natural monthly patterns.

## Next Steps

Please provide:
1. Your 2024 total revenue
2. Your current 2025 annual FIR setting
3. Screenshot of the graph tooltip showing $50,436

Then I can tell you exactly where the discrepancy is coming from.
