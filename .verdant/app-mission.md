# WaveRider App - Core Mission & User Context

## Target User Profile

### Who They Are
- **Background:** Started as a technician/tradesperson (HVAC, plumbing, appliance repair, etc.)
- **Business Journey:** Went from "doing the work" to "running a business"
- **Financial Literacy:** Little to no formal business training
- **Pain Point:** Good at their craft, but nobody taught them how to run a business

### What They Don't Know
- Financial terminology (FP&A, EBITDA, cash runway, P&L, balance sheet)
- How to read financial statements
- What "good" numbers look like
- Why they have revenue but no money in the bank
- How to answer their spouse: "Can we pay bills this month?"

### What They Need
- **Simple language:** 7th grade reading level
- **Plain English:** No jargon, no acronyms without explanation
- **Actionable insights:** Not just numbers, but "what this means" and "what to do next"
- **Confidence:** To have intelligent conversations about their business finances

---

## App Philosophy: Beyond Data Entry

### ❌ What This App Is NOT
- Just another dashboard with charts and numbers
- A place to dump data without understanding it
- An accounting software replacement
- For people who already understand business finances

### ✅ What This App IS
- **A Teacher:** Explains financial concepts in simple terms
- **A Guide:** Shows what numbers mean and what to do about them
- **A Roadmap:** Answers "What's next?" and "What should I focus on?"
- **A Translator:** Converts complex financial data into actionable business decisions
- **A Confidence Builder:** Helps owners answer "Can we pay bills?" with real data

---

## The Core Question This App Answers

### The User's Real Question
> "I made all this revenue but have very little in my bank account. Where did it all go?"

### Sub-Questions They're Asking
1. "Are we going to be able to pay our bills this month?"
2. "Am I paying my employees too much?"
3. "Should I raise my prices?"
4. "Which services are actually making me money?"
5. "Is this bonus program helping or hurting my business?"
6. "Why do I work so hard but have so little to show for it?"
7. "Am I doing better or worse than last year?"

---

## Design Principles

### 1. Data = Outcome
**Show the numbers:**
- Total Revenue: $50,000
- Total Bonuses Paid: $6,500
- Net Profit After Bonuses: $8,200

### 2. Result = What This Means
**Translate to business impact:**
- ✅ "Your bonus program cost you 13% of revenue - this is healthy"
- ⚠️ "Your labor costs are 65% of revenue - industry standard is 40-50%"
- 🚨 "You're paying out more in bonuses than you're keeping as profit"

### 3. Action = What To Do Next
**Give clear next steps:**
- 📋 "Consider reducing bonus thresholds to lower labor costs"
- 💡 "Your Appliance Repair service has 35% profit margin - do more of this"
- 🎯 "Raise Commercial Installation prices by $50 to hit 25% profit target"

---

## Language Guidelines

### ❌ DON'T Use This Language
- "EBITDA is $X"
- "Your gross margin is below industry benchmarks"
- "Optimize your FP&A processes"
- "Your cash runway is 3 months"
- "Working capital ratio needs improvement"
- "Accounts receivable aging"

### ✅ DO Use This Language
- "You made $X after paying your costs"
- "You're keeping less profit than most businesses in your industry"
- "Track your money better to plan ahead"
- "You have 3 months of money in the bank"
- "You need more cash on hand to cover expenses"
- "Money customers owe you"

### Translation Examples

| Financial Term | Simple Translation |
|----------------|-------------------|
| Gross Profit | Money left after paying for parts and materials |
| Net Profit | Money you get to keep after all expenses |
| Labor Cost % | How much of your revenue goes to paying employees |
| Profit Margin | For every $100 you make, how much is profit |
| ROI | Did this investment make you more money than it cost? |
| Cash Flow | Money coming in vs. money going out |
| Break-even | The point where you stop losing money |

---

## Feature Design Pattern

### Current Pattern (Data Heavy)
```
Bonus ROI Analysis
├── Total Bonuses Paid: $6,500
├── Bonus as % of Revenue: 13%
├── Bonus as % of Gross Profit: 22%
├── Average Hourly Rate with Bonuses: $28.50
└── Net Profit After Bonuses: $8,200
```
**Problem:** User sees numbers but doesn't know if they're good or bad

### Improved Pattern (Guided Insights)
```
💰 Bonus Program Health Check

Your Numbers:
├── You paid $6,500 in bonuses last month
├── That's 13% of your total revenue
└── You kept $8,200 as profit

What This Means:
├── ✅ Your bonus rate is healthy (industry standard: 10-15%)
├── ⚠️ You're paying more in bonuses than keeping as profit
└── 💡 Your employees earned their bonuses 18 days out of 23 days

What To Do Next:
├── 1. Your bonus program is working - employees are hitting targets
├── 2. To keep more profit, consider raising prices by $30-50 per job
└── 3. Or adjust bonus threshold from $8/hour to $9/hour
```

---

## Example: "Where Did My Money Go?" Feature

### The Question
User made $50,000 in revenue but only has $3,000 in the bank.

### Bad Approach (Current)
Show a bunch of charts and tables with expense categories.

### Good Approach (Guided)
```
💸 Where Your Money Went: May 2025

You Made: $50,000

Your Money Went To:
├── 🔧 Paying Employees............$22,000 (44%)
├── 📦 Parts & Materials............$8,500 (17%)
├── 🎁 Employee Bonuses.............$6,500 (13%)
├── 🚗 Truck & Gas..................$2,800 (6%)
├── 📱 Insurance & Licenses.........$2,200 (4%)
├── 🏢 Rent & Utilities.............$1,800 (4%)
└── 💰 What You Kept................$6,200 (12%)

⚠️ You Kept Less Than You Should
Most profitable service businesses keep 20-30% as profit.
You're keeping 12%.

Here's Why:
- Your employee costs (44% + 13% bonuses = 57%) are high
- Industry standard is 40-50% total labor costs
- You're paying $28.50/hour average with bonuses
- That leaves less for you to keep

What You Can Do:
1. Raise your prices by $40 per job → Would give you $4,800 more profit
2. OR hire a helper at $18/hour instead of paying overtime
3. OR adjust bonus thresholds slightly to keep labor at 50%

If you did option 1, you'd keep $11,000 (22%) instead of $6,200.
That's $4,800 more in your pocket every month.
```

---

## Terminology Guardrails

### Always Explain On First Use
First time: "LER (Labor Efficiency Ratio) measures how much profit each employee generates per hour"
After that: "LER" is fine

### Avoid Unless Necessary
- COGS → "Cost of parts and materials"
- Overhead → "Business expenses" or "Operating costs"
- P&L → "Profit & Loss statement" or just show the data
- YoY → "Compared to last year"
- QoQ → "Compared to last quarter"

### Preferred Language
- "Money you made" instead of "Revenue"
- "Money you spent" instead of "Expenses"
- "Money you kept" instead of "Net Profit"
- "Cost to do the job" instead of "Cost of Goods Sold"
- "Money in the bank" instead of "Cash position"

---

## Design Language: Colors & Visual Cues

### Status Indicators (Universal Understanding)
- ✅ Green = Good, healthy, on track
- ⚠️ Yellow = Warning, needs attention, could be better
- 🚨 Red = Problem, urgent, losing money

### Avoid Abstract Charts
❌ Complex pie charts with 15 slices
❌ Multi-axis line graphs
❌ Scatter plots
❌ Heat maps

✅ Simple bar charts (comparing A vs B)
✅ Progress bars (goal vs actual)
✅ Before/After comparisons
✅ Trend arrows (↗️ up, ↘️ down, → flat)

---

## "What's Next?" Framework

Every insight should answer three questions:

### 1. What's The Number?
"You paid $6,500 in bonuses last month"

### 2. What Does It Mean?
"That's 13% of your revenue - right in the healthy range of 10-15%"

### 3. What Should I Do?
"Keep it up! Your bonus program is working. Employees earned bonuses 18 out of 23 days."

---

## Real-World Conversation Prep

### The Spouse Question
**Spouse:** "Are we going to be able to pay bills this month?"

**Bad Answer:** "I think so... I made like $40,000 in revenue..."

**Good Answer (App Enables):**
"Yes. We have $12,000 in the bank and $8,500 in bills due. 
We're expecting another $15,000 from jobs this week. 
We'll have $18,500 left over after bills, which is more than last month."

### The Friend Question
**Friend:** "How's business going?"

**Bad Answer:** "Good, I think? I'm working a lot..."

**Good Answer (App Enables):**
"Really well! Last month I kept $9,200 profit, up from $6,800 the month before. 
I raised my prices by $40 and customers didn't even blink. 
I'm on track to clear $100k this year."

---

## Success Metrics

### User Feels Confident When:
- ✅ They can explain to their spouse if they can pay bills
- ✅ They know which services make them the most money
- ✅ They can justify a price increase with data
- ✅ They understand if their bonus program is working
- ✅ They can explain where their money went
- ✅ They know what action to take next

### User Feels Overwhelmed When:
- ❌ Too many numbers without context
- ❌ Charts without explanations
- ❌ Jargon without definitions
- ❌ Data but no "what to do next"
- ❌ Complex multi-page comparisons needed to understand one thing

---

## Verdant's Role

When building features, I will:

1. **Translate Financial Concepts**
   - Never assume user knows what a metric means
   - Explain in 7th grade language
   - Provide context for every number

2. **Provide Business Context**
   - "Industry standard is X, you're at Y"
   - "Last month you were X, now you're Y"
   - "If you do X, you'll get Y result"

3. **Guide Action**
   - Every insight = specific next step
   - "Consider doing X" not "You could do X, Y, or Z"
   - Prioritize recommendations (do this first, then this)

4. **Simplify Presentation**
   - Fewer numbers, more meaning
   - One insight per section
   - Clear visual hierarchy (big problem = big warning)

---

## Remember

This isn't just a CFO app.
It's a business coach in software form.
It's the mentor they never had.
It's the answer to "Where did my money go?"
It's confidence in a conversation with their spouse.
It's knowing what to do next, not just what happened.

**Simplicity > Complexity**
**Meaning > Data**
**Action > Information**
