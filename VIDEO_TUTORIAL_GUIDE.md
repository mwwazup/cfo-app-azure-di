# Video Tutorial System - Complete Guide

## Overview
This system allows you to create and manage tutorial videos for each page in WaveRider, stored in Supabase with user progress tracking.

---

## Setup Complete ✅

### 1. Database Migration
- Run `05_create_video_tutorials.sql` in Supabase SQL Editor
- Creates `video_tutorials` and `user_video_progress` tables
- Sets up RLS policies for security

### 2. Storage Bucket Setup
Run this in Supabase SQL Editor:

```sql
-- Create storage bucket for tutorial videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public video access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutorial-videos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tutorial-videos');
```

---

## How to Use

### Add Tutorial Button to Any Page

```typescript
import { VideoTutorialButton } from '@/components/VideoTutorialButton';

// In your page component
<div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold">Dashboard</h1>
  <VideoTutorialButton 
    pageRoute="/dashboard" 
    autoPlay={true} // Auto-play for first-time users
  />
</div>
```

### Props:
- `pageRoute` (required): Route path (e.g., '/dashboard', '/employee-ler')
- `sectionKey` (optional): Specific section within page
- `autoPlay` (optional): Auto-play for first-time users (default: false)
- `buttonVariant` (optional): 'default' | 'outline' | 'ghost' (default: 'outline')
- `buttonSize` (optional): 'sm' | 'default' | 'lg' (default: 'sm')
- `buttonText` (optional): Custom button text (default: 'Watch Tutorial')

---

## Video Content Guide

### **1. Dashboard** (`/dashboard`)
**Duration**: 2-3 minutes

**Script Outline:**
1. **Intro** (10s): "Welcome to your WaveRider Dashboard - your financial command center"
2. **KPI Cards** (45s):
   - What each KPI means (Monthly Revenue, YTD Revenue, Growth Rate, etc.)
   - Status colors: Green = on track, Yellow = warning, Red = needs attention
   - Click "Edit Goal" to customize targets
3. **Revenue Curve Preview** (30s):
   - Shows your revenue trend at a glance
   - Click to go to full Master Revenue page
4. **Quick Navigation** (20s):
   - Sidebar navigation to all features
   - PERL Coach for AI assistance
5. **Outro** (10s): "Explore each section to dive deeper into your financials"

**Key Points to Show:**
- Hover over KPI cards to see details
- Click "Generate Historical KPIs" button
- Navigate to different pages

---

### **2. Master Revenue** (`/revenue/master`)
**Duration**: 3-4 minutes

**Script Outline:**
1. **Intro** (10s): "Master Revenue - where you track and plan your business growth"
2. **Entering Revenue Data** (60s):
   - Click month cells to enter actual revenue
   - System auto-calculates YTD totals
   - Lock months to prevent accidental changes
3. **FIR Targets** (45s):
   - What is FIR (Future Inspired Revenue)
   - How to set your annual FIR goal
   - System distributes intelligently by month using historical patterns
4. **Profit Margins** (30s):
   - Set target profit margin percentage
   - Affects KPI calculations
5. **Service Mix** (45s):
   - Track revenue by service type
   - Click "Track Services" button
   - Add services and weekly activities
   - Toggle overlay on/off
6. **Outro** (10s): "Your revenue data powers all KPIs and insights"

**Key Points to Show:**
- Click cells to edit
- FIR calculation logic
- Service Mix overlay toggle

---

### **3. Budget vs Actual** (`/budget-vs-actual`)
**Duration**: 2-3 minutes

**Script Outline:**
1. **Intro** (10s): "Budget vs Actual - weekly tracking to stay on target"
2. **Weekly Breakdown** (45s):
   - System breaks monthly FIR into weekly targets
   - Accounts for seasonal patterns
   - Each week shows target vs actual
3. **Entering Actuals** (45s):
   - Click week to enter actual revenue
   - Enter jobs completed
   - System calculates variance automatically
4. **Understanding Status** (30s):
   - Green = on track or ahead
   - Yellow = slightly behind
   - Red = significantly behind
   - Cumulative tracking shows month progress
5. **Outro** (10s): "Weekly tracking helps you catch issues early"

**Key Points to Show:**
- Click week cells
- Variance calculations
- Monthly aggregation

---

### **4. Employee LER** (`/employee-ler`)
**Duration**: 4-5 minutes

**Script Outline:**
1. **Intro** (15s): "Employee LER - track performance and calculate bonuses"
2. **What is LER** (45s):
   - Labor Efficiency Ratio = Gross Profit ÷ Base Pay
   - Measures how profitable each employee is
   - LER > 1.0 = profitable, > 1.5 = excellent
3. **Setup** (60s):
   - Add employee (name, position, hourly rate)
   - Create pay period (start/end dates)
   - System ready to track daily performance
4. **Adding Daily Records** (90s):
   - Click "Add Day" button
   - Enter date, hours worked, revenue
   - Enter service quantities (dynamic based on your services)
   - System auto-calculates:
     - COGS (based on service costs)
     - Overhead (32% default)
     - Gross Profit
     - LER
     - Bonus (if LER ≥ 0.7)
5. **Performance Insights** (45s):
   - AI-generated insights panel
   - Toggle between Pay Period and YTD view
   - Identifies strengths and improvement areas
6. **Charts** (30s):
   - LER Trend over time
   - Service distribution
   - Performance consistency
7. **Outro** (15s): "Data-driven performance management made simple"

**Key Points to Show:**
- Full workflow from setup to insights
- Live calculation preview
- Multi-employee selector (if multiple employees)
- Edit/delete records

---

### **5. PERL Coach** (`/coach/sms-coach`)
**Duration**: 2-3 minutes

**Script Outline:**
1. **Intro** (10s): "PERL Coach - your AI financial advisor"
2. **PERL Framework** (45s):
   - **P**roblem: What's holding me back?
   - **E**valuate: Where am I really at?
   - **R**oadmap: What are my next moves?
   - **L**earn & Level Up: How do I keep growing?
3. **Asking Questions** (60s):
   - Type or speak your question
   - AI has access to all your financial data
   - Get personalized insights and recommendations
   - Examples:
     - "What was my best month last year?"
     - "How can I improve my profit margin?"
     - "Am I on track to hit my FIR goal?"
4. **Voice Features** (30s):
   - Click microphone to speak
   - AI responds with voice (toggle on/off)
   - Hands-free coaching
5. **Outro** (10s): "Your 24/7 financial advisor, powered by your data"

**Key Points to Show:**
- Type a question and get response
- Use voice input
- Toggle voice output
- Show conversation history

---

### **6. Financial Statements** (`/financial-statements`)
**Duration**: 2-3 minutes

**Script Outline:**
1. **Intro** (10s): "Upload P&L statements for automatic analysis"
2. **Uploading Documents** (45s):
   - Click "Upload Document" button
   - Select PDF or image of P&L
   - Azure Document Intelligence extracts data automatically
   - No manual data entry needed
3. **Viewing Results** (60s):
   - Select document from dropdown
   - See extracted revenue, expenses, COGS
   - Auto-calculated KPIs:
     - Gross Profit & Margin
     - Net Profit & Margin
     - Operating Expenses
4. **Understanding Metrics** (30s):
   - Visual breakdown of where money goes
   - Compare periods side-by-side
   - Export data if needed
5. **Outro** (10s): "Automated financial analysis from your existing documents"

**Key Points to Show:**
- Upload process
- Document selection
- Extracted data accuracy
- KPI calculations

---

## Video Production Tips

### Recording Setup:
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30fps
- **Format**: MP4 (H.264 codec)
- **Audio**: Clear voiceover, minimal background noise
- **Length**: Keep under 5 minutes

### Recommended Tools:
- **Windows**: OBS Studio (free), Camtasia
- **Mac**: QuickTime, ScreenFlow
- **Online**: Loom (easiest for quick tutorials)

### Recording Checklist:
- [ ] Close unnecessary tabs/apps
- [ ] Use demo account with sample data
- [ ] Speak clearly and at moderate pace
- [ ] Show cursor movements clearly
- [ ] Pause between sections for editing
- [ ] Record in quiet environment

---

## Uploading Videos to Supabase

### Step 1: Upload Video File
1. Go to Supabase Dashboard → Storage
2. Select `tutorial-videos` bucket
3. Click "Upload File"
4. Upload your MP4 file
5. Copy the public URL

### Step 2: Insert Database Record
Run in Supabase SQL Editor:

```sql
-- Dashboard video
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/dashboard',
  'Dashboard Overview',
  'Learn how to navigate your WaveRider dashboard and understand your KPIs',
  'https://[your-project].supabase.co/storage/v1/object/public/tutorial-videos/dashboard-overview.mp4',
  180
);

-- Master Revenue video
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/revenue/master',
  'Master Revenue Tracking',
  'How to enter revenue data and set your FIR targets',
  'https://[your-project].supabase.co/storage/v1/object/public/tutorial-videos/master-revenue.mp4',
  240
);

-- Employee LER video
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/employee-ler',
  'Employee Performance Tracking',
  'Complete guide to tracking employee LER and bonuses',
  'https://[your-project].supabase.co/storage/v1/object/public/tutorial-videos/employee-ler.mp4',
  300
);

-- Budget vs Actual video
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/budget-vs-actual',
  'Weekly Budget Tracking',
  'Stay on track with weekly budget vs actual monitoring',
  'https://[your-project].supabase.co/storage/v1/object/public/tutorial-videos/budget-vs-actual.mp4',
  180
);

-- PERL Coach video
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/coach/sms-coach',
  'PERL Coach - AI Financial Advisor',
  'Get personalized financial coaching powered by AI',
  'https://[your-project].supabase.co/storage/v1/object/public/tutorial-videos/perl-coach.mp4',
  180
);

-- Financial Statements video
INSERT INTO video_tutorials (page_route, title, description, video_url, duration_seconds)
VALUES (
  '/financial-statements',
  'Upload & Analyze Financial Statements',
  'Automatic P&L analysis with Azure Document Intelligence',
  'https://[your-project].supabase.co/storage/v1/object/public/tutorial-videos/financial-statements.mp4',
  180
);
```

---

## Integration Examples

### Dashboard Page
```typescript
<VideoTutorialButton 
  pageRoute="/dashboard" 
  autoPlay={true}
  buttonText="How to Use Dashboard"
/>
```

### Employee LER Page (Section-Specific)
```typescript
// For the insights panel section
<VideoTutorialButton 
  pageRoute="/employee-ler" 
  sectionKey="insights-panel"
  buttonText="Understanding Insights"
  buttonSize="sm"
/>
```

### Master Revenue Page
```typescript
<VideoTutorialButton 
  pageRoute="/revenue/master"
  buttonVariant="default"
/>
```

---

## Features

✅ **Supabase-hosted videos** with progress tracking  
✅ **Page-specific tutorials** linked by route  
✅ **Section-specific help** for complex features  
✅ **Auto-play for new users** (optional)  
✅ **Watch progress tracking** per user  
✅ **Easy integration** with existing pages  
✅ **Scalable architecture** for future videos  

---

## Next Steps

1. ✅ Run database migration
2. ✅ Create storage bucket
3. 🎥 Record tutorial videos
4. 📤 Upload videos to Supabase
5. 📝 Insert video records in database
6. 🔗 Add VideoTutorialButton to pages
7. 🧪 Test with users

---

## Support

For issues or questions:
- Check Supabase logs for RLS policy errors
- Verify video URLs are publicly accessible
- Ensure Clerk user IDs are being passed correctly
- Test with different browsers for video compatibility
