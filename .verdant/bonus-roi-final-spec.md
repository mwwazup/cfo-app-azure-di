# Bonus ROI Page - Final Transformation Spec

## Page Structure (Approved)

### 1. FILTERS (Top)
- Year dropdown (2019-2025, etc.)
- Month dropdown with "YTD" option
- YTD works for all years (not just current year)

### 2. BONUS PROGRAM HEALTH CHECK
Simple verdict + immediate action needed

### 3. THE BIG PICTURE (3 Cards)
**Card 1**: Total Bonuses Paid
**Card 2**: Total Profit You Kept
**Card 3**: REVENUE BREAKDOWN (replaces confusing ratio)

**Card 3 Wording**:
```
For every $100 of revenue:
- Techs earn $13 in bonuses
- Company keeps $18 in profit
```

### 4. IS IT FAIR TO YOU AND YOUR TECHS?
3 cards showing:
- How often techs earn bonuses (qualify rate %)
- Average bonus per qualifying day
- Average hourly pay with bonuses

### 5. LER TREND CHART
**KEEP AS IS** - shows seasonal efficiency trends

### 6. SERVICE BREAKDOWN TABLE
**Keep existing table layout, enhance with:**

**New Column: "Bonus Status"**
- "Qualifies ✓" (green text) if margin ≥ 25%
- "Below Threshold" (red text) if margin < 25%

**Enhanced Column: "Action Needed?"**
- Specific price recommendations
- Expandable "What's Happening" details

**Expandable Row Content** (click to expand):
```
WHAT'S HAPPENING:

Techs are not earning bonuses with this service.
This might be due to:
- The average ticket price being lower than other services
- Or it's a service techs don't enjoy doing

Evaluate if it's a pricing issue or a motivation issue.

WHAT TO DO:
Raise prices $75/job → Gets you to 26% margin
- Techs would qualify for bonuses
- You'd make $80 more per job
- Total monthly impact: +$1,200 profit (15 jobs)
```

### 7. WHAT TO DO THIS WEEK
Priority list based on:
1. Highest revenue impact
2. Biggest dollar amount improvement

Show top 3 actions with specific recommendations

### 8. [EXPANDABLE] DETAILED METRICS
Collapse existing metric cards by default
User can expand to see all the nerdy numbers

### 9. WHAT-IF CALCULATOR
Keep existing functionality
Simplify labels to plain language

---

## Specific Metric Changes

### REMOVED:
- "The Ratio" (confusing 1:2.5 format)

### ADDED - Card 3: Revenue Breakdown
```
REVENUE BREAKDOWN

For every $100 of revenue:
├─ Techs earn: $13 in bonuses
├─ Parts & materials: $17
├─ Base labor: $44
└─ You keep: $18 in profit

What This Means:
Out of every dollar that comes in, you're 
keeping 18 cents as profit after paying 
bonuses and expenses.

Healthy businesses keep 20-25 cents per dollar.
```

**Calculation Logic**:
```typescript
const revenueBase = 100;
const bonusesPerDollar = (totalBonuses / totalRevenue) * revenueBase;
const profitPerDollar = (netProfit / totalRevenue) * revenueBase;
const laborPerDollar = (totalBasePay / totalRevenue) * revenueBase;
const cogsPerDollar = (totalCOGS / totalRevenue) * revenueBase;
```

---

## Tone Guidelines

### For Services Below 25% Threshold:
❌ DON'T: "Techs are dragging their feet"
❌ DON'T: "Techs are lazy on these jobs"
❌ DON'T: Blame the techs

✅ DO: "Techs are not earning bonuses with this service"
✅ DO: Explain possible reasons (low ticket, less enjoyable)
✅ DO: Frame as pricing or motivation evaluation

**Example**:
```
Techs are not earning bonuses with Commercial Install.

This might be due to:
- The average ticket price being lower ($407/job vs $520 average)
- Or it's a service techs don't enjoy doing

Evaluate if it's a pricing issue or a motivation issue.

If pricing: Raise prices $75/job → techs qualify for bonuses
If motivation: Consider if this service is worth offering
```

---

## Filter Behavior

### Year Filter:
- Dropdown with years (current year - 5 to current year)
- Example: 2020, 2021, 2022, 2023, 2024, 2025

### Month Filter:
- "YTD" option (year-to-date for selected year)
- Individual months: January through December
- "All Time" option removed (use YTD instead)

### Filter Logic:
```
If Year=2024, Month=YTD → Show Jan 1, 2024 to Dec 31, 2024
If Year=2024, Month=May → Show May 1-31, 2024
If Year=2023, Month=YTD → Show Jan 1, 2023 to Dec 31, 2023
```

---

## Priority Logic for "What To Do This Week"

### Scoring Algorithm:
Each service gets a priority score based on:

1. **Revenue Impact** (40% weight)
   - Service revenue * potential improvement
   - Higher revenue = higher priority

2. **Dollar Improvement** (40% weight)
   - How much more profit per job after price increase
   - Total monthly dollar gain

3. **Urgency** (20% weight)
   - Below 25% threshold = urgent (bonus 20 points)
   - Below 15% margin = critical (bonus 40 points)

### Example Output:
```
WHAT TO DO THIS WEEK

Based on your numbers, here are your top priorities:

1. URGENT: Raise Commercial Install prices by $75/job
   - Currently: No bonuses earned (18% margin)
   - After increase: Techs qualify for bonuses (26% margin)
   - Monthly impact: +$1,125 more profit (15 jobs)

2. Raise Residential HVAC prices by $40/job
   - Currently: Barely profitable (8% margin after bonuses)
   - After increase: Healthier 15% margin
   - Monthly impact: +$960 more profit (24 jobs)

3. Consider adjusting Appliance Repair pricing
   - Currently profitable but bonuses are 15% of revenue
   - Small $20 increase would improve margins significantly
   - Monthly impact: +$420 more profit (21 jobs)
```

---

## Service Table Enhancement

### Current Columns (Keep):
- Service Name
- Jobs
- Revenue
- Gross Margin
- Total Bonuses
- Bonus % of Revenue
- Net Margin After Bonus
- Avg Profit/Job

### New Column (Add):
**"Bonus Status"** (between Gross Margin and Total Bonuses)
- Shows if service qualifies for bonuses
- Visual indicator using existing color classes

### Enhanced Column:
**"Action Needed?"** (last column)
- Make it expandable/collapsible
- Click to see full details

### Expandable Row Pattern:
```tsx
<tr>
  <td colSpan={9} className="bg-muted/10 p-4">
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-foreground mb-2">
          What's Happening
        </h4>
        <p className="text-sm text-muted">
          {/* Context about bonus qualification */}
        </p>
      </div>
      
      <div>
        <h4 className="font-semibold text-foreground mb-2">
          What To Do
        </h4>
        <ul className="text-sm text-foreground space-y-1">
          <li>• Raise prices $X/job → Y% margin</li>
          <li>• Techs would qualify for bonuses</li>
          <li>• You'd make $Z more per job</li>
          <li>• Total monthly impact: +$X profit</li>
        </ul>
      </div>
    </div>
  </td>
</tr>
```

---

## Implementation Checklist

- [ ] Keep all existing Tailwind color classes
- [ ] No emojis anywhere
- [ ] Use Lucide icons for visual indicators
- [ ] Maintain responsive grid layout
- [ ] Filter matches LER page pattern
- [ ] YTD works for all years
- [ ] Card 3 shows revenue breakdown per $100
- [ ] Service table has expandable rows
- [ ] Priority logic weights revenue + dollar impact
- [ ] Tone is educational, not blaming
- [ ] LER trend chart stays visible
- [ ] Detailed metrics collapse by default
- [ ] What-If calculator keeps existing functionality
- [ ] All calculations maintain existing accuracy

---

## Example: Full Service Row with Expansion

### Collapsed State:
```
Commercial Install | 15 | $6,100 | 22% | Below Threshold | $0 | ... | [Expand ▼]
```

### Expanded State:
```
Commercial Install | 15 | $6,100 | 22% | Below Threshold | $0 | ... | [Collapse ▲]

  WHAT'S HAPPENING:
  Techs are not earning bonuses with Commercial Install (margin: 22%, need: 25%).
  
  This might be due to:
  - Average ticket is $407, which is lower than your other services
  - Or it's a service techs don't enjoy as much
  
  Evaluate if it's a pricing issue or a motivation issue.
  
  WHAT TO DO:
  Raise prices $75/job → Gets you to 27% margin
  - Techs would qualify for bonuses (happier team)
  - You'd make $80 more per job
  - Total monthly impact: +$1,200 profit (based on 15 jobs)
```

---

## Next Steps

Transform `BonusROIAnalysisPage.tsx` following this exact specification.
