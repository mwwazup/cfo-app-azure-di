# How to Guide Cascade AI Assistant

## Quick Reference for User

This guide shows you how to get better results from Cascade (me!) and prevent those "off the rails" moments.

## 1. The Rules File (.windsurfrules)

**What it is:** A configuration file that I read automatically to understand your preferences.

**How to create it:**
1. Rename `CASCADE_RULES.md` to `.windsurfrules`
2. Remove the `.md` extension
3. Keep it in your project root

**In Windows:**
```
1. Right-click CASCADE_RULES.md
2. Rename
3. Change to: .windsurfrules (no .md)
4. Confirm the warning about changing file extensions
```

**What it does:**
- Tells me not to change styling without permission
- Reminds me to backup before migrations
- Keeps me focused on your specific requests
- Prevents "improvements" you didn't ask for

## 2. Memory System (Already Active!)

I just created a memory that will follow me across all our conversations:

**What it contains:**
- Don't change styling without permission
- Use existing Tailwind classes only
- Stay focused on specific requests
- Backup before migrations
- Respect existing patterns

**How it works:**
- Automatically retrieved when we talk
- Persists across sessions
- You can update it anytime by asking me

**To update a memory:**
Just say: "Remember that I prefer [X]" or "Update the rule about [Y]"

## 3. Documentation Files (Just Created!)

I created three reference files:

### CASCADE_RULES.md → Rename to .windsurfrules
- **Purpose:** Main rules file I read automatically
- **Contains:** All project rules and guidelines
- **Action needed:** Rename to `.windsurfrules`

### CONTRIBUTING.md
- **Purpose:** Project context for AI assistants
- **Contains:** Tech stack, file structure, code style
- **Action needed:** None, reference file

### DESIGN_SYSTEM.md
- **Purpose:** Visual design guidelines
- **Contains:** Colors, typography, component patterns
- **Action needed:** None, reference file

## 4. Code Comments (You Can Add These)

**In key files, add comments like:**

```typescript
// IMPORTANT: Don't change this calculation logic without discussion
// This uses intelligent FIR distribution based on historical patterns
export function calculateMonthlyFIRTargets(annualFIR: number) {
  // ...
}
```

```tsx
// DESIGN NOTE: This styling matches the dashboard aesthetic
// Don't change colors or layout without explicit permission
<Card className="shadow-sm">
  {/* ... */}
</Card>
```

**Where to add them:**
- Top of important files
- Before critical functions
- Around styling that shouldn't change
- Near business logic

## 5. How to Talk to Me

### ✅ Good Requests (Clear & Focused)

**Specific:**
- "Fix the KPI dashboard loading error"
- "Add a new column to the revenue table"
- "Make the chart show last year's data"

**With context:**
- "The KPI cards aren't loading. Check the API call in kpiRecordsService.ts"
- "I want to track owner draws. Add a field to revenue_entries"

**With boundaries:**
- "Fix the button functionality, but don't change the styling"
- "Add this feature, but keep the existing design"

### ❌ Vague Requests (Can Lead to Over-Engineering)

**Too broad:**
- "Make it better"
- "Improve the dashboard"
- "Fix everything"

**Without context:**
- "It's broken"
- "The chart doesn't work"
- "Something's wrong"

**Better versions:**
- "Make the KPI cards look better" (now I know styling is OK to change)
- "Improve the dashboard loading speed" (specific goal)
- "Fix the chart - it's not showing October data" (specific issue)

## 6. When I Go Off Track

**If I suggest changes you didn't ask for:**

Say:
- "No, just fix [X], don't change [Y]"
- "Keep the existing styling"
- "That's too much, just do [specific thing]"
- "Why are you changing that? I only asked for [X]"

**I'll learn from this feedback!**

## 7. Before Major Changes

**Always ask me to:**
1. "Backup the database first"
2. "Show me what you're going to change before doing it"
3. "Explain why you're making this change"

**Example:**
- "I want to add a new KPI. Show me the plan first."
- "Before you run that migration, backup the database."

## 8. Project-Specific Phrases

**Use these to keep me on track:**

**For bugs:**
- "Fix the functionality, not the styling"
- "Debug this, don't refactor"

**For features:**
- "Add exactly this, nothing more"
- "Keep it simple, match existing patterns"

**For styling:**
- "Now you can change the design"
- "Make this look better" (gives me permission)

**For database:**
- "Backup first, then run the migration"
- "Use ALTER TABLE, not DROP TABLE"

## 9. Regular Reminders

**Every few weeks, remind me:**
- "Remember: don't change styling without permission"
- "Remember: backup before migrations"
- "Remember: stay focused on what I ask for"

**This reinforces the rules and keeps me calibrated.**

## 10. What I Need From You

**To give you better results, tell me:**

### Your Skill Level
- "I'm new to coding" → I'll explain more
- "I understand TypeScript" → I'll be more technical

### Your Preferences
- "I prefer simple solutions" → I'll avoid over-engineering
- "I like detailed explanations" → I'll provide more context
- "Just show me the code" → I'll be more concise

### Your Constraints
- "I'm on a deadline" → I'll focus on quick fixes
- "This needs to be perfect" → I'll be more thorough
- "I'm learning" → I'll explain as I go

### Your Vision
- "This is a professional dashboard" → I'll keep it clean
- "I want it to feel modern" → I'll suggest contemporary patterns
- "Keep it simple for non-technical users" → I'll prioritize UX

## 11. Examples of Good Interactions

### Example 1: Bug Fix
**You:** "The KPI dashboard shows 'No data found' but I have revenue entries."

**Me:** 
- Checks kpiRecordsService.ts
- Finds the API call issue
- Fixes ONLY the data loading
- Doesn't change styling or refactor

### Example 2: New Feature
**You:** "Add a profit margin field to the revenue form."

**Me:**
- Asks: "Should this be a percentage or dollar amount?"
- Adds field to form
- Updates database schema (with backup reminder)
- Matches existing form styling
- Doesn't redesign the entire form

### Example 3: Styling Change
**You:** "Make the KPI cards look more modern."

**Me:** (Now I have permission to change styling!)
- Suggests specific improvements
- Shows before/after
- Keeps it consistent with dashboard aesthetic
- Doesn't change functionality

## 12. Red Flags to Watch For

**If I start doing these, stop me:**

- Suggesting new frameworks or libraries
- Refactoring large sections of code
- Changing styling when you asked for a bug fix
- Adding features you didn't request
- Reorganizing file structure
- "Improving" working code
- Suggesting "while we're at it, let's also..."

**Just say:** "No, just fix [X]" or "That's too much"

## 13. How to Update These Rules

**To add new rules:**
1. Edit `.windsurfrules` file
2. Add your new rule
3. Tell me: "I updated the rules file, please read it"

**To update a memory:**
Just tell me: "Remember: [new rule]"

**To give feedback:**
- "That was perfect, do more like that"
- "That was too much, stay more focused"
- "I didn't ask for styling changes"

## 14. Quick Command Reference

**Database:**
```bash
# Backup before any migration
python backend/backup_database.py

# Restore if something goes wrong
python backend/restore_database.py <timestamp>
```

**Git:**
```bash
# Save your work
git add .
git commit -m "Description"
git push
```

**Development:**
```bash
# Frontend
cd project
npm run dev

# Backend
cd backend
python -m uvicorn main:app --reload
```

## Summary: The Golden Rules

1. **Rules file:** Rename `CASCADE_RULES.md` to `.windsurfrules`
2. **Memory system:** Already active, reinforces rules
3. **Documentation:** Reference files for context
4. **Clear requests:** Be specific about what you want
5. **Set boundaries:** Tell me what NOT to change
6. **Give feedback:** Let me know when I go off track
7. **Backup first:** Always before migrations
8. **Stay focused:** Fix X means fix ONLY X

---

**You're in control!** These tools help me understand your preferences and give you better results. The more you use them, the better I'll get at helping you.

**Questions?** Just ask: "How do I [X]?" or "Why did you [Y]?"
