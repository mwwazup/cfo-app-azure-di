# User Analytics & Adaptive Learning System

## Overview

WaveRider includes a user behavior tracking system that enables:
- **Usage Analytics**: Understand how users interact with the app
- **Adaptive UX**: Personalize the experience based on behavior patterns
- **Product Intelligence**: Data-driven feature development decisions

This creates a **defensible moat** - competitors can copy code, but not your accumulated user intelligence.

---

## Quick Start

### 1. Run the Database Migration

In Supabase SQL Editor, run:
```sql
-- File: backend/migrations/52_create_user_events_tracking.sql
```

### 2. Track Events in Your Code

```typescript
import { trackEvent, trackPageView, trackError } from '../utils/analytics';

// Track feature usage
trackEvent('add_employee', { employee_name: 'John Doe' });

// Track page views
trackPageView('/employee-ler');

// Track errors
trackError('csv_upload_failed', { error: 'Invalid format', fileName: 'data.csv' });
```

---

## Event Types

| Type | Use Case | Example |
|------|----------|---------|
| `page_view` | User visits a page | `/kpi-dashboard`, `/employee-ler` |
| `feature_use` | User uses a feature | `add_employee`, `refresh_kpis` |
| `action` | User completes an action | `save_record`, `delete_document` |
| `error` | Something went wrong | `api_error`, `validation_error` |
| `navigation` | User navigates | Sidebar click, tab switch |

---

## Recommended Events to Track

### High Priority (Track First)

| Event Name | When to Track | Metadata |
|------------|---------------|----------|
| `add_employee` | Employee created | `{ employee_id }` |
| `add_daily_record` | Daily record saved | `{ employee_id, pay_period_id }` |
| `refresh_kpis` | KPIs regenerated | `{ year, month }` |
| `upload_csv` | CSV imported | `{ row_count, success }` |
| `upload_document` | Financial doc uploaded | `{ doc_type }` |
| `update_fir_target` | FIR target changed | `{ old_value, new_value }` |

### Medium Priority

| Event Name | When to Track | Metadata |
|------------|---------------|----------|
| `switch_employee` | Employee selector changed | `{ from_id, to_id }` |
| `edit_daily_record` | Record edited | `{ record_id }` |
| `delete_daily_record` | Record deleted | `{ record_id }` |
| `ask_coach` | PERL Coach question | `{ question_length }` |
| `voice_input` | Voice input used | `{ duration_seconds }` |

### Error Tracking

| Event Name | When to Track | Metadata |
|------------|---------------|----------|
| `api_error` | API call fails | `{ endpoint, status, message }` |
| `validation_error` | Form validation fails | `{ field, error }` |
| `csv_parse_error` | CSV parsing fails | `{ line, error }` |

---

## Implementation Examples

### Track in a Page Component

```typescript
// EmployeeLERPage.tsx
import { trackPageView, trackEvent } from '../utils/analytics';

useEffect(() => {
  trackPageView('/employee-ler');
}, []);

const handleAddRecord = async (data) => {
  await saveRecord(data);
  trackEvent('add_daily_record', { 
    employee_id: selectedEmployeeId,
    pay_period_id: currentPayPeriod.id 
  });
};
```

### Track in a Service Function

```typescript
// employeeLERService.ts
import { trackEvent, trackError } from '../utils/analytics';

export async function createDailyRecord(data) {
  try {
    const result = await supabase.from('employee_daily_records').insert(data);
    trackEvent('add_daily_record', { success: true });
    return result;
  } catch (error) {
    trackError('add_daily_record_failed', { error: error.message });
    throw error;
  }
}
```

### Track Navigation

```typescript
// DashboardLayout.tsx
import { trackNavigation } from '../utils/analytics';

const handleSidebarClick = (route: string) => {
  trackNavigation(location.pathname, route);
  navigate(route);
};
```

---

## Database Schema

### `user_events` Table
Stores individual events:
- `id` - UUID primary key
- `user_id` - Clerk user ID
- `event_type` - Classification (page_view, feature_use, etc.)
- `event_name` - Specific event name
- `page_route` - Current page when event occurred
- `metadata` - JSONB with additional context
- `session_id` - Groups events within a session
- `created_at` - Timestamp

### `user_insights` Table
Aggregated behavior data (computed periodically):
- `user_id` - Primary key
- `most_used_features` - Top 5 features
- `feature_usage_counts` - Usage counts per feature
- `total_sessions` - Session count
- `last_active_at` - Last activity timestamp

---

## Performance Considerations

### Event Batching
Events are queued and sent in batches:
- Flush every 5 seconds
- Or when queue reaches 10 events
- Or on page unload (uses `sendBeacon`)

### Silent Failures
Analytics never breaks the app:
- All errors are caught and logged
- Failed events are re-queued (up to 50)
- No user-facing errors

---

## Future Enhancements

### Phase 2: Admin Dashboard
- Visualize aggregate usage patterns
- Identify most/least used features
- Find friction points (high error rates)

### Phase 3: Personalization
- Smart defaults based on user patterns
- Contextual help for undiscovered features
- Personalized dashboard layout

### Phase 4: A/B Testing
- Feature flag infrastructure
- Experiment tracking
- Automatic winner promotion

---

## Privacy Notes

- No PII stored in events (just user_id + event data)
- All data is user-scoped via RLS
- Users can only see their own events
- Add note to privacy policy about usage analytics

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/migrations/52_create_user_events_tracking.sql` | User events & insights tables |
| `backend/migrations/53_create_coaching_effectiveness.sql` | Coaching effectiveness tracking |
| `project/src/utils/analytics.ts` | Frontend tracking utility |
| `USER_ANALYTICS_GUIDE.md` | This documentation |

---

## Coaching Effectiveness Tracking

This is the **feedback loop** that makes WaveRider learn what advice actually works.

### The Flow

```
User asks PERL Coach → AI gives advice → Track session
                                              ↓
                                    Create effectiveness tracking
                                    (baseline metric value)
                                              ↓
                              7/14/30/60 days later: Check metric
                                              ↓
                              Calculate improvement % → Training signal
```

### Usage Example

```typescript
import { 
  trackCoachingSession, 
  createEffectivenessTracking,
  updateCoachingEngagement,
  rateCoachingResponse 
} from '../utils/analytics';

// When AI responds to a question
const sessionId = await trackCoachingSession({
  questionText: "My crew cost me $500 yesterday, is that too high?",
  questionCategory: 'crew_costs',
  responseType: 'tactical',
  adviceCategory: 'crew_optimization',
  keyRecommendation: "Review bonus thresholds and crew size",
  responseLength: 450,
  contextMetrics: { current_ler: 1.2, crew_size: 3 }
});

// Link to a metric we want to track improvement on
if (sessionId) {
  await createEffectivenessTracking(
    sessionId,
    'crew_optimization',
    'ler',           // Metric to track
    1.2              // Current baseline value
  );
}

// When user leaves the coach page
await updateCoachingEngagement(sessionId, 45, false); // 45 seconds, no followup

// If user rates the response
await rateCoachingResponse(sessionId, true); // Helpful
```

### Aggregate Insights

Query the `coaching_aggregate_insights` view to see what works:

```sql
SELECT * FROM coaching_aggregate_insights;
```

Returns:
| advice_category | metric_name | adoption_rate_pct | avg_improvement_pct |
|-----------------|-------------|-------------------|---------------------|
| bonus_structure | ler | 67% | +12.3% |
| crew_optimization | gross_profit_pct | 45% | +8.1% |
| pricing | revenue | 23% | +5.2% |

### Screen Engagement

Query `screen_engagement_stats` to see which screens users actually use:

```sql
SELECT * FROM screen_engagement_stats;
```

Returns:
| screen_name | unique_users | avg_time_seconds | bounce_rate_pct |
|-------------|--------------|------------------|-----------------|
| /employee-ler | 45 | 120 | 5% |
| /kpi-dashboard | 42 | 45 | 15% |
| /financial-statements | 12 | 30 | 40% |

### Behavioral Logging

Track granular user decisions:

```typescript
import { logBehavior, trackMetricView } from '../utils/analytics';

// Track which metrics users actually look at
trackMetricView('ler', 1.45, '/employee-ler');

// Track detailed behavior
logBehavior({
  actionType: 'viewed_metric',
  actionTarget: 'gross_profit_pct',
  screenName: '/employee-ler',
  timeOnScreenSeconds: 30,
  metricValuesAtTime: { ler: 1.45, gross_profit_pct: 35 }
});
```

---

## The Moat

**What competitors CAN copy:**
- Landing page copy
- Feature set
- UI design

**What competitors CANNOT copy:**
- Your accumulated user behavior data
- Personalization models trained on your users
- Speed of iteration based on real usage patterns
- Network effects (future collaboration features)

Start tracking from day 1. Data compounds over time.
