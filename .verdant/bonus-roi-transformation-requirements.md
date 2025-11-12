# Bonus ROI Page Transformation - Requirements

## User Needs (All Apply - Priority Order)

### 1. "Am I paying my techs too much in bonuses overall?"
- Show total bonuses vs. total profit kept
- Show ratio: For every $1 in bonuses, how much do I keep?
- Benchmark against what's sustainable (not industry standard)

### 2. "Is this bonus structure fair to both me and my techs?"
- Show how often techs earn bonuses (qualify rate)
- Show average bonus per qualifying day
- Show if techs are getting competitive pay

### 3. "Which services should I raise prices on to stay profitable with bonuses?"
- **Most Important**: Show which services don't qualify for bonuses (below 25% threshold)
- Show which services barely qualify
- Show specific price increases needed

### 4. Decision Outcomes (All Valid)
After viewing this page, user might decide to:
- Raise prices on specific services
- Adjust bonus threshold (e.g., $8/hr → $9/hr LER)
- Stop offering unprofitable services
- Keep everything as-is (program is working)

## Service-Specific Issues

### Scenario A: Service Below 25% Threshold (NO bonus earned)
**Example**: Commercial Install - 18% margin
**Tech Behavior**: Purposely drags feet to earn more base rate to compensate
**Owner Impact**: Doesn't realize pricing is wrong, service is unprofitable

**What to Show**:
```
COMMERCIAL INSTALL - BELOW BONUS THRESHOLD

Current State:
- Margin: 18% (need 25% to qualify for bonuses)
- Techs earn NO bonuses on these jobs
- Techs may slow down to earn more base hourly pay

The Problem:
- Frustrated techs (working but no bonus)
- Perverse incentive (slower = more base pay)
- Your pricing is too low

What To Do:
Raise prices $75/job → Gets you to 26% margin
- Techs would qualify for bonuses
- Eliminates the slow-down incentive
- You'd keep more profit too
```

### Scenario B: Service Above Threshold BUT High Bonus Cost
**Example**: Residential Repair - 32% margin, but bonuses eat 15% of revenue
**Tech Behavior**: Earning good bonuses, working efficiently
**Owner Impact**: Bonuses are consuming too much profit

**What to Show**:
```
RESIDENTIAL REPAIR - HIGH BONUS COST

Current State:
- Margin: 32% (qualifies for bonuses ✓)
- Bonuses: 15% of revenue (high)
- Techs earn bonuses consistently

The Trade-Off:
- Techs are happy and productive
- But bonuses are eating into your profit
- You're keeping less than you could

What To Do:
Option 1: Raise prices $40/job → Keep more profit, bonuses stay same
Option 2: Adjust bonus threshold $8→$9 LER → Lower bonus costs slightly
```

## Industry Standards: NOT APPLICABLE

**User Guidance**: 
- Don't compare to "industry standard" 
- Focus on what's sustainable for THIS business
- Focus on what can be controlled (pricing, bonus structure)

**Benchmarks to Use**:
- Internal: Compare services to each other
- Internal: Compare months to previous months
- Internal: Ratio of bonuses to profit kept
- General business health: 20-25% net profit is sustainable
- General fairness: Keeping $2-3 for every $1 paid in bonuses

## Styling Requirements

### Colors (Use Existing App Styles ONLY)
- ✅ DO: Use existing Tailwind classes from the codebase
  - `text-foreground`, `text-muted`, `text-accent`
  - `bg-muted`, `bg-card`, `bg-accent`
  - Status colors: `text-green-600`, `text-yellow-600`, `text-red-600` (already in use)
  
- ❌ DON'T: Introduce new color schemes
- ❌ DON'T: Use emojis (🔴, 🟢, ✅, etc.)
- ❌ DON'T: Create custom CSS colors

### Visual Indicators
Instead of emojis, use:
- Lucide icons (already imported: `CheckCircle`, `AlertCircle`, `TrendingUp`, `TrendingDown`)
- Color-coded badges/text (using existing color classes)
- Clear labels: "GOOD", "WARNING", "URGENT"

### Layout
- Maintain card-based layout
- Keep existing responsive grid system
- Use existing typography hierarchy
- Match existing spacing and padding

## Bonus Structure Context (For My Understanding)

### Two-Part Bonus System:
1. **LER-Based Bonus** (Performance/Efficiency)
   - Formula: `LER = Gross Profit (before labor) / Total Hours Worked`
   - Measures efficiency with TIME (punch-in to punch-out, not just job hours)
   - Higher LER = higher bonus

2. **Appointment-Based Bonus** (Volume)
   - Bonus for hitting job count targets
   - Encourages completing more jobs per day

### The 25% Safety Valve:
- Business MUST hit 25% gross profit margin for tech to earn ANY bonus
- Ensures business stays profitable
- Prevents giving all profit to techs
- If margin < 25% → NO bonus, regardless of LER or job count

### Behavior Implications:
- **Below 25% threshold**: Tech knows no bonus → may slow down → earns more base hourly
- **Above 25% threshold**: Tech earns bonus → works efficiently → better for everyone

## Page Structure Priority

### 1. EXECUTIVE SUMMARY (Top of Page)
Answer all 4 main questions in simple terms:
- Overall verdict: Is bonus program working?
- Key metric: Bonuses vs. profit kept
- Fairness check: Are techs earning enough?
- Action needed: What to do first

### 2. SERVICE BREAKDOWN (Most Important Section)
For each service, show:
- Does it qualify for bonuses? (above/below 25%)
- What's the impact? (tech behavior, owner profit)
- What should I do? (specific price increase)

### 3. DETAILED METRICS (For Those Who Want Depth)
- Keep existing metrics but collapsed by default
- Label clearly: "Detailed Numbers (Optional)"
- Use accordions or expandable sections

### 4. WHAT-IF SIMULATOR (Keep & Improve)
- Already exists, works well
- Make labels simpler
- Add more context about what happens if you raise prices

## Transformation Checklist

Before implementing, verify:
- [ ] Answers all 4 main questions
- [ ] Shows both Scenario A and B for services
- [ ] Explains tech behavior implications
- [ ] Gives specific dollar amounts for price increases
- [ ] Uses existing app styles (no new colors)
- [ ] No emojis used
- [ ] 7th grade reading level
- [ ] Clear "What To Do" action items
- [ ] Maintains existing responsive layout
- [ ] Uses existing Lucide icons

## Key Insights to Surface

### For "Am I paying too much?"
- Total bonuses vs. total profit kept (ratio)
- Bonuses as % of revenue (but don't compare to industry)
- Net profit margin after bonuses (need 20-25% to be sustainable)

### For "Is it fair?"
- How often techs qualify (earn rate %)
- Average bonus per qualifying day (is it motivating?)
- Average hourly with bonuses (competitive for retention?)
- Are techs frustrated on low-margin services?

### For "Which services need price increases?"
- Services below 25% threshold (urgent)
- Services barely above threshold (risky)
- Services with high bonus costs eating profit (consider)

### For "What should I do?"
- Specific price increase recommendations per service
- Impact of price increase on:
  - Tech bonus qualification
  - Owner profit
  - Customer pricing
- Alternative: Adjust bonus threshold instead
- Alternative: Stop offering unprofitable services

## Next Steps

Transform `BonusROIAnalysisPage.tsx` following this structure:
1. Add Executive Summary section at top
2. Reorganize Service Breakdown with clearer context
3. Move existing metrics to expandable "Details" section
4. Simplify What-If Simulator labels
5. Add "What To Do This Week" action section
