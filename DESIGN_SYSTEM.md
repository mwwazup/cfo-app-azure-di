# WaveRider Design System

## Overview
This document defines the visual design system for WaveRider. **DO NOT change these patterns without explicit permission.**

## Color Palette

### Primary Colors
```css
/* Blues & Grays - Professional Dashboard */
--primary-blue: #3B82F6      /* Primary actions, links */
--secondary-blue: #60A5FA    /* Hover states */
--dark-blue: #1E40AF         /* Headers, emphasis */
--gray-50: #F9FAFB          /* Backgrounds */
--gray-100: #F3F4F6         /* Card backgrounds */
--gray-200: #E5E7EB         /* Borders */
--gray-600: #4B5563         /* Secondary text */
--gray-900: #111827         /* Primary text */
```

### Accent Colors (Gold - Primary Emphasis)
```css
/* Gold/Yellow - FIR Targets & Highlights */
--gold: #F59E0B             /* FIR line on charts */
--gold-light: #FCD34D       /* Hover states */
--gold-dark: #D97706        /* Active states */

/* Tailwind Classes for Gold Accent */
text-accent                 /* Gold text */
bg-accent                   /* Gold background (full) */
bg-accent/10                /* Gold background (10% opacity - subtle) */
bg-accent/20                /* Gold background (20% opacity - icon containers) */
bg-accent/50                /* Gold background (50% opacity - borders) */
border-accent               /* Gold border */
border-accent/50            /* Gold border (50% opacity) */
```

### Muted Backgrounds
```css
/* Subtle Grey Backgrounds - Preferred over bright colors */
bg-muted/30                 /* 30% opacity - card backgrounds */
bg-muted/50                 /* 50% opacity - table headers */
bg-muted/20                 /* 20% opacity - hover states */
```

### Status Colors (Use Sparingly)
```css
/* IMPORTANT: User prefers NOT to use "stop sign colors" (red/green/yellow) */
/* Only use these where positive/negative truly makes sense */
--status-good: #10B981      /* Green - Use only for clear positive indicators */
--status-alert: #EF4444     /* Red - Use only for clear negative indicators */

/* Prefer gold accent (text-accent, bg-accent) for emphasis instead */
```

### Chart Colors
```css
/* Revenue Chart Lines */
--actual-revenue: #3B82F6   /* Blue - Actual revenue line */
--fir-target: #F59E0B       /* Gold - FIR target line */
--comparison: rgba(156, 163, 175, 0.5)  /* Gray dashed - Previous year */
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

### Font Sizes
```css
--text-xs: 0.75rem     /* 12px - Small labels */
--text-sm: 0.875rem    /* 14px - Secondary text */
--text-base: 1rem      /* 16px - Body text */
--text-lg: 1.125rem    /* 18px - Subheadings */
--text-xl: 1.25rem     /* 20px - Headings */
--text-2xl: 1.5rem     /* 24px - Page titles */
--text-3xl: 1.875rem   /* 30px - Dashboard headers */
```

### Font Weights
```css
--font-normal: 400     /* Body text */
--font-medium: 500     /* Emphasis */
--font-semibold: 600   /* Headings */
--font-bold: 700       /* Strong emphasis */
```

## Spacing

### Consistent Spacing Scale (Tailwind)
```
p-2  = 0.5rem  (8px)   - Tight padding
p-4  = 1rem    (16px)  - Standard padding
p-6  = 1.5rem  (24px)  - Card padding
p-8  = 2rem    (32px)  - Section padding
p-12 = 3rem    (48px)  - Large sections

gap-2 = 0.5rem  - Tight gaps
gap-4 = 1rem    - Standard gaps
gap-6 = 1.5rem  - Comfortable gaps
```

## Components

### Cards

**Standard Card Pattern:**
```tsx
<Card className="shadow-sm">
  <CardHeader>
    <CardTitle>Title Here</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**WaveRider Gold Accent Card Pattern (PREFERRED):**
```tsx
<Card className="bg-muted/30">
  <CardContent className="pt-6">
    <div className="flex items-center gap-3">
      <div className="p-3 rounded-lg bg-accent/20">
        <IconComponent className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Label Text</p>
        <p className="text-2xl font-bold text-foreground">Value</p>
      </div>
    </div>
  </CardContent>
</Card>
```

**Key Style Elements:**
- Card Background: `bg-muted/30` - Subtle grey background with 30% opacity
- Icon Container: `p-3 rounded-lg bg-accent/20` - Gold accent background at 20% opacity
- Icon: `h-5 w-5 text-accent` - Gold accent color
- Label: `text-sm text-muted-foreground` - Small, muted grey text
- Value: `text-2xl font-bold text-foreground` - Large, bold text

**Rules:**
- Always use `shadow-sm` for subtle elevation
- Prefer `bg-muted/30` for card backgrounds (not white)
- Use gold accent (`bg-accent/20`, `text-accent`) for emphasis
- Rounded corners (default from shadcn/ui)
- Consistent padding via CardHeader/CardContent

### Buttons

**Primary Button:**
```tsx
<Button variant="default" size="default">
  Primary Action
</Button>
```

**Secondary Button:**
```tsx
<Button variant="outline" size="default">
  Secondary Action
</Button>
```

**Destructive Button:**
```tsx
<Button variant="destructive" size="default">
  Delete
</Button>
```

**Rules:**
- Use shadcn/ui Button component
- Don't create custom button styles
- Consistent sizing across app

### Forms

**Input Fields:**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Label</label>
  <Input type="text" placeholder="Placeholder" />
</div>
```

**Select Dropdowns:**
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

**Rules:**
- Use shadcn/ui form components
- Consistent spacing with `space-y-2`
- Clear labels above inputs

### Tables (WaveRider Gold Accent Pattern)

**Standard Table with Gold Accent Column:**
```tsx
<div className="border border-border rounded-lg overflow-x-auto">
  <table className="w-full">
    <thead className="bg-muted/50">
      <tr>
        <th className="text-left p-3 text-sm font-medium">Header</th>
        {/* Accent column header */}
        <th className="text-center p-3 text-sm font-medium bg-accent/20">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-t border-border hover:bg-muted/20">
        <td className="p-3">Content</td>
        {/* Accent column cell */}
        <td className="text-center p-3 bg-accent/10">
          <span className="text-sm font-bold text-accent">Value</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Key Elements:**
- Table Headers: `bg-muted/50` for standard columns
- Accent Headers: `bg-accent/20` for total/emphasis columns
- Accent Cells: `bg-accent/10` with `text-accent font-bold` for values
- Hover States: `hover:bg-muted/20` for interactive rows
- Borders: `border-accent/50` for emphasized dividers

**Rules:**
- Use gold accent for totals, important columns, or emphasis
- Keep standard columns with muted backgrounds
- Consistent padding: `p-3` for all cells
- Responsive: Wrap in `overflow-x-auto` container

### Section Headers

**With Gold Accent Icon:**
```tsx
<h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
  <IconComponent className="h-5 w-5 text-accent" />
  Section Title
</h3>
```

**Rules:**
- Always use `text-accent` for icons
- Consistent icon size: `h-5 w-5`
- Use `gap-2` for spacing between icon and text

### KPI Cards

**Standard KPI Card Pattern:**
```tsx
<Card className="shadow-sm">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">KPI Name</CardTitle>
    <Icon className="h-4 w-4 text-gray-500" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$XX,XXX</div>
    <p className="text-xs text-gray-500 mt-1">
      vs target of $XX,XXX
    </p>
    <div className="flex items-center mt-2">
      <Badge variant={status}>Status</Badge>
    </div>
  </CardContent>
</Card>
```

**Status Badges:**
- `good` = Green background
- `warning` = Yellow background
- `alert` = Red background

### Charts

**Chart Container:**
```tsx
<Card className="shadow-sm">
  <CardHeader>
    <CardTitle>Chart Title</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={400}>
      {/* Chart component */}
    </ResponsiveContainer>
  </CardContent>
</Card>
```

**Chart Colors:**
- Actual Revenue: Blue (`#3B82F6`)
- FIR Target: Gold (`#F59E0B`)
- Previous Year: Gray dashed (`rgba(156, 163, 175, 0.5)`)

**Rules:**
- Consistent height: 400px for main charts
- Use Recharts library
- Tooltips show formatted currency
- Clean, minimal styling

## Layout Patterns

### Dashboard Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* KPI cards */}
</div>
```

### Page Container
```tsx
<div className="container mx-auto p-6 space-y-6">
  {/* Page content */}
</div>
```

### Section Spacing
```tsx
<div className="space-y-6">
  {/* Sections with consistent spacing */}
</div>
```

## Icons

**Library:** Lucide React

**Common Icons:**
- `DollarSign` - Money/revenue
- `TrendingUp` - Growth/positive
- `TrendingDown` - Decline/negative
- `Target` - Goals/targets
- `BarChart3` - Analytics
- `Calendar` - Dates/periods
- `RefreshCw` - Refresh/reload

**Usage:**
```tsx
import { DollarSign } from 'lucide-react';

<DollarSign className="h-4 w-4 text-gray-500" />
```

**Rules:**
- Consistent sizing: `h-4 w-4` for small, `h-6 w-6` for medium
- Gray color for decorative icons
- Primary color for interactive icons

## Responsive Design

### Breakpoints (Tailwind)
```
sm:  640px   - Small tablets
md:  768px   - Tablets
lg:  1024px  - Laptops
xl:  1280px  - Desktops
2xl: 1536px  - Large desktops
```

### Mobile-First Approach
```tsx
// ✅ Good - mobile first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// ❌ Bad - desktop first
<div className="grid grid-cols-3 lg:grid-cols-2 md:grid-cols-1">
```

## Animation & Transitions

**Keep It Minimal:**
```css
/* Subtle hover transitions only */
transition-colors duration-200
```

**Rules:**
- No fancy animations
- No loading spinners unless necessary
- Subtle hover states only
- Fast transitions (200ms)

## Accessibility

**Color Contrast:**
- Text on white: Use gray-900 or darker
- Text on colored backgrounds: Ensure WCAG AA compliance

**Interactive Elements:**
- Clear hover states
- Visible focus rings
- Adequate touch targets (min 44x44px)

## What NOT to Do

### ❌ Don't Create Custom CSS
```css
/* ❌ Bad - custom CSS */
.my-custom-button {
  background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}
```

Use Tailwind classes instead:
```tsx
{/* ✅ Good - Tailwind classes */}
<button className="bg-blue-500 hover:bg-blue-600 rounded shadow-sm">
```

### ❌ Don't Add Fancy Effects
```tsx
{/* ❌ Bad - unnecessary animation */}
<div className="animate-bounce transform hover:scale-110 transition-all duration-500">

{/* ✅ Good - subtle transition */}
<div className="hover:bg-gray-50 transition-colors duration-200">
```

### ❌ Don't Change Existing Patterns
```tsx
{/* ❌ Bad - new card style */}
<div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8">

{/* ✅ Good - existing card pattern */}
<Card className="shadow-sm">
```

## When to Change Design

**Only change styling when:**
1. User explicitly asks for visual changes
2. User says "make it look better"
3. User requests specific color/layout changes
4. Fixing actual visual bugs (misalignment, overflow, etc.)

**Don't change styling when:**
1. Fixing functionality bugs
2. Adding new features
3. Refactoring code
4. "Improving" existing designs
5. Making it "more modern"

## Design Checklist

Before suggesting style changes:
- [ ] Did user ask for visual changes?
- [ ] Does it match existing patterns?
- [ ] Are you using shadcn/ui components?
- [ ] Are you using Tailwind classes (not custom CSS)?
- [ ] Is it consistent with color palette?
- [ ] Does it maintain professional aesthetic?
- [ ] Have you checked other pages for consistency?
- [ ] Are you using gold accent pattern (not red/green/yellow)?
- [ ] Are you avoiding "stop sign colors" unless truly needed?

## Quick Style Reference

**Prompt Template for AI:**
"Use the WaveRider gold accent style pattern: `bg-muted/30` card backgrounds, `bg-accent/20` icon containers with `text-accent` icons, `text-muted-foreground` labels, and `text-foreground font-bold` values. Apply gold accent highlights (`bg-accent/10`, `text-accent`) for emphasis."

**Visual Hierarchy:**
- Emphasis/Totals: Use `bg-accent/10` or `bg-accent/20` with `text-accent font-bold`
- Hover States: `hover:bg-muted/20` for interactive rows
- Borders: `border-accent/50` for emphasized dividers
- Icons: Always use `text-accent` for consistency

**Usage Examples:**
- KPI Cards: Revenue totals, metrics, statistics
- Summary Sections: Dashboard widgets, analytics cards
- Table Highlights: Total columns, important rows
- Section Headers: Major content divisions with icons
- Interactive Elements: Buttons, cards with hover states

**Color Philosophy:**
- NOT a fan of red/green/yellow "stop sign colors"
- Use gold accent for emphasis and highlights
- Only use red/green where negative/positive truly makes sense
- Prefer subtle grey backgrounds with gold accents
- Maintain professional, clean aesthetic

---

**Remember:** Consistency is more important than perfection. Match what exists, don't "improve" it.
