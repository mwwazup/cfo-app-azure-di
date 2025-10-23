# Video Tutorial System - Quick Start

## 🚀 5-Minute Setup

### 1. Run Migrations (2 min)
```sql
-- In Supabase SQL Editor, run these in order:
-- File 1: backend/migrations/05_create_video_tutorials.sql
-- File 2: backend/migrations/06_create_video_storage_bucket.sql
```

### 2. Record Video (varies)
- Use Loom, OBS, or QuickTime
- 2-3 minutes recommended
- Follow scripts in VIDEO_TUTORIAL_GUIDE.md

### 3. Upload to Supabase (1 min)
1. Supabase Dashboard → Storage → tutorial-videos
2. Upload your MP4
3. Copy public URL

### 4. Insert Database Record (1 min)
```sql
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/dashboard',
  'Dashboard Overview',
  'Learn how to use your dashboard',
  'YOUR_VIDEO_URL_HERE',
  180
);
```

### 5. Add Button to Page (1 min)
```typescript
import { VideoTutorialButton } from '@/components/VideoTutorialButton';

<VideoTutorialButton 
  pageRoute="/dashboard" 
  autoPlay={true}
/>
```

---

## 📋 Copy-Paste Examples

### Dashboard
```typescript
<VideoTutorialButton pageRoute="/dashboard" autoPlay={true} />
```

### Master Revenue
```typescript
<VideoTutorialButton pageRoute="/revenue/master" />
```

### Employee LER
```typescript
<VideoTutorialButton pageRoute="/employee-ler" />
```

### Budget vs Actual
```typescript
<VideoTutorialButton pageRoute="/budget-vs-actual" />
```

### PERL Coach
```typescript
<VideoTutorialButton pageRoute="/coach/sms-coach" />
```

### Financial Statements
```typescript
<VideoTutorialButton pageRoute="/financial-statements" />
```

---

## 🎬 Video Content Cheat Sheet

### Dashboard (2-3 min)
- KPI cards explanation
- Status colors (green/yellow/red)
- Navigation overview

### Master Revenue (3-4 min)
- Enter monthly revenue
- Set FIR targets
- Profit margins
- Service Mix overlay

### Employee LER (4-5 min)
- What is LER
- Setup employee
- Add daily records
- Performance insights

### Budget vs Actual (2-3 min)
- Weekly tracking
- Enter actuals
- Variance indicators

### PERL Coach (2-3 min)
- PERL framework
- Ask questions
- Voice features

### Financial Statements (2-3 min)
- Upload P&L
- View extracted data
- Auto-calculated KPIs

---

## 🎯 Recommended Order

1. **Dashboard** - Everyone starts here
2. **Master Revenue** - Core feature
3. **Employee LER** - Most complex
4. **Budget vs Actual** - Weekly tracking
5. **PERL Coach** - AI features
6. **Financial Statements** - Document upload

---

## ✅ Testing Checklist

- [ ] Video plays when button clicked
- [ ] Progress tracked in database
- [ ] Checkmark appears after watching
- [ ] Auto-play works (if enabled)
- [ ] Works on mobile
- [ ] Works in different browsers

---

## 📚 Full Documentation

- **VIDEO_TUTORIAL_GUIDE.md** - Complete scripts and instructions
- **INTEGRATION_EXAMPLES.md** - Code examples for each page
- **VIDEO_SYSTEM_SUMMARY.md** - Technical details and architecture

---

## 🆘 Quick Troubleshooting

**Button doesn't show?**
- Check video record exists in database
- Verify `is_active = true`
- Check `page_route` matches exactly

**Video won't play?**
- Test URL directly in browser
- Check Storage bucket is public
- Verify MP4 format

**Progress not tracking?**
- Check user is authenticated
- Verify RLS policies ran
- Check browser console

---

## 🎉 You're Ready!

Run the migrations and start recording your first video. The system handles everything else automatically.
