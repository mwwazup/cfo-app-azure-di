# Video Tutorial Integration Examples

## Quick Start - Add to Any Page

### 1. Import the Component
```typescript
import { VideoTutorialButton } from '@/components/VideoTutorialButton';
```

### 2. Add to Your Page
```typescript
<VideoTutorialButton 
  pageRoute="/your-page-route" 
  autoPlay={true}
/>
```

---

## Real Examples for Each Page

### Dashboard (`/dashboard`)

```typescript
// In: project/src/pages/dashboard/index.tsx

import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// Add near the top of your dashboard, in the header section
<div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold">Dashboard</h1>
  <VideoTutorialButton 
    pageRoute="/dashboard" 
    autoPlay={true} // Auto-play for first-time users
    buttonText="Dashboard Tour"
  />
</div>
```

---

### Master Revenue (`/revenue/master`)

```typescript
// In: project/src/pages/revenue/master.tsx

import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// Add in the page header
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold">Master Revenue</h1>
  <VideoTutorialButton 
    pageRoute="/revenue/master"
    buttonVariant="outline"
    buttonText="How to Use"
  />
</div>
```

---

### Budget vs Actual (`/budget-vs-actual`)

```typescript
// In: project/src/pages/BudgetVsActualPage.tsx

import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// Add near the top
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold">Budget vs Actual</h1>
    <p className="text-muted-foreground">Weekly revenue tracking</p>
  </div>
  <VideoTutorialButton 
    pageRoute="/budget-vs-actual"
    buttonSize="default"
  />
</div>
```

---

### Employee LER (`/employee-ler`)

```typescript
// In: project/src/pages/EmployeeLERPage.tsx

import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// Main page tutorial
<div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold">Employee Performance</h1>
  <VideoTutorialButton 
    pageRoute="/employee-ler"
    autoPlay={true}
  />
</div>

// Section-specific tutorial for insights panel
<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold">Performance Insights</h2>
  <VideoTutorialButton 
    pageRoute="/employee-ler"
    sectionKey="insights-panel"
    buttonText="Understanding Insights"
    buttonSize="sm"
  />
</div>
```

---

### PERL Coach (`/coach/sms-coach`)

```typescript
// In: project/src/pages/coach/sms-coach.tsx

import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// Add in the header area
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold">💎 PERL Coach</h1>
    <p className="text-muted-foreground">Your AI Financial Advisor</p>
  </div>
  <VideoTutorialButton 
    pageRoute="/coach/sms-coach"
    buttonText="How PERL Works"
  />
</div>
```

---

### Financial Statements (`/financial-statements`)

```typescript
// In: project/src/pages/financial-statements/index.tsx

import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// Add near upload button
<div className="flex items-center gap-4 mb-6">
  <Button onClick={handleUpload}>
    <Upload className="h-4 w-4 mr-2" />
    Upload Document
  </Button>
  <VideoTutorialButton 
    pageRoute="/financial-statements"
    buttonVariant="ghost"
    buttonText="How to Upload"
  />
</div>
```

---

## Advanced: Multiple Videos Per Page

If you want multiple tutorial videos for different sections:

```typescript
// Main page tutorial
<VideoTutorialButton 
  pageRoute="/employee-ler"
  buttonText="Getting Started"
/>

// Section 1: Pay Period Setup
<VideoTutorialButton 
  pageRoute="/employee-ler"
  sectionKey="pay-period-setup"
  buttonText="Pay Period Help"
  buttonSize="sm"
/>

// Section 2: Daily Records
<VideoTutorialButton 
  pageRoute="/employee-ler"
  sectionKey="daily-records"
  buttonText="Adding Records"
  buttonSize="sm"
/>

// Section 3: Insights
<VideoTutorialButton 
  pageRoute="/employee-ler"
  sectionKey="insights"
  buttonText="Reading Insights"
  buttonSize="sm"
/>
```

Then create separate video records in database:

```sql
-- Main tutorial
INSERT INTO video_tutorials (page_route, section_key, title, video_url, duration_seconds)
VALUES ('/employee-ler', NULL, 'Employee LER Overview', 'url-here', 300);

-- Section tutorials
INSERT INTO video_tutorials (page_route, section_key, title, video_url, duration_seconds)
VALUES 
  ('/employee-ler', 'pay-period-setup', 'Setting Up Pay Periods', 'url-here', 120),
  ('/employee-ler', 'daily-records', 'Adding Daily Records', 'url-here', 180),
  ('/employee-ler', 'insights', 'Understanding Insights', 'url-here', 90);
```

---

## Styling Options

### Minimal (Ghost)
```typescript
<VideoTutorialButton 
  pageRoute="/dashboard"
  buttonVariant="ghost"
  buttonSize="sm"
/>
```

### Prominent (Default)
```typescript
<VideoTutorialButton 
  pageRoute="/dashboard"
  buttonVariant="default"
  buttonSize="default"
  buttonText="Watch Tutorial"
/>
```

### Subtle (Outline)
```typescript
<VideoTutorialButton 
  pageRoute="/dashboard"
  buttonVariant="outline"
  buttonSize="sm"
/>
```

---

## Auto-Play Strategy

### First-Time Users Only
```typescript
<VideoTutorialButton 
  pageRoute="/dashboard"
  autoPlay={true} // Only plays if user hasn't watched
/>
```

### Never Auto-Play
```typescript
<VideoTutorialButton 
  pageRoute="/dashboard"
  autoPlay={false} // User must click to watch
/>
```

### Conditional Auto-Play
```typescript
const isNewUser = /* your logic */;

<VideoTutorialButton 
  pageRoute="/dashboard"
  autoPlay={isNewUser}
/>
```

---

## Progress Tracking

The system automatically tracks:
- ✅ How many seconds watched
- ✅ Whether video was completed
- ✅ Last watched timestamp
- ✅ Shows checkmark (✓) on button if watched

Users can re-watch videos anytime by clicking the button again.

---

## Testing Checklist

Before going live:

- [ ] Video uploads successfully to Supabase Storage
- [ ] Video URL is publicly accessible
- [ ] Database record created with correct page_route
- [ ] Button appears on page
- [ ] Video plays when button clicked
- [ ] Progress tracking works (check user_video_progress table)
- [ ] Auto-play works for first-time users (if enabled)
- [ ] Checkmark appears after watching
- [ ] Works in different browsers (Chrome, Firefox, Safari)
- [ ] Mobile responsive (video player works on mobile)

---

## Troubleshooting

### Button doesn't appear
- Check if video record exists in database for that page_route
- Verify is_active = true in video_tutorials table
- Check browser console for errors

### Video won't play
- Verify video URL is publicly accessible
- Check video format (MP4 recommended)
- Test URL directly in browser
- Check Supabase Storage bucket permissions

### Progress not tracking
- Verify user is authenticated (Clerk userId exists)
- Check RLS policies on user_video_progress table
- Look for errors in browser console
- Verify get_clerk_user_id() function exists in Supabase

### Auto-play not working
- Check if user has already watched (completed = true)
- Verify autoPlay prop is set to true
- Some browsers block auto-play with audio - user may need to click

---

## Next Steps

1. Choose which pages to add tutorials to first
2. Record your first video (start with Dashboard)
3. Upload to Supabase Storage
4. Insert database record
5. Add VideoTutorialButton to page
6. Test with a real user account
7. Iterate based on feedback
