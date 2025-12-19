/**
 * User Event Analytics Utility
 * 
 * Tracks user behavior for adaptive learning and personalization.
 * Events are stored in Supabase and can be analyzed to improve UX.
 * 
 * Usage:
 *   import { trackEvent, trackPageView, trackError } from '../utils/analytics';
 *   
 *   // Track a feature usage
 *   trackEvent('add_employee', { employee_name: 'John' });
 *   
 *   // Track page view
 *   trackPageView('/employee-ler');
 *   
 *   // Track an error
 *   trackError('csv_upload_failed', { error: 'Invalid format' });
 */

import { supabase } from '../config/supabaseClient';

// Event types for classification
export type EventType = 'page_view' | 'feature_use' | 'action' | 'error' | 'navigation';

// Common event names (for autocomplete and consistency)
export type CommonEventName = 
  // Employee LER
  | 'add_employee'
  | 'add_daily_record'
  | 'edit_daily_record'
  | 'delete_daily_record'
  | 'add_pay_period'
  | 'upload_csv'
  | 'switch_employee'
  // KPIs
  | 'refresh_kpis'
  | 'view_kpi_details'
  // Revenue
  | 'update_revenue'
  | 'update_fir_target'
  // Financial Documents
  | 'upload_document'
  | 'view_document'
  | 'delete_document'
  // Services
  | 'add_service'
  | 'edit_service'
  | 'delete_service'
  // Coach
  | 'ask_coach'
  | 'voice_input'
  // Navigation
  | 'sidebar_click'
  | 'tab_switch'
  // Errors
  | 'api_error'
  | 'validation_error'
  // Generic
  | string;

// Session ID persists for the browser session
let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    // Check sessionStorage first
    sessionId = sessionStorage.getItem('waverider_session_id');
    if (!sessionId) {
      // Generate new session ID
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('waverider_session_id', sessionId);
    }
  }
  return sessionId;
}

// Get current user ID from various sources
async function getCurrentUserId(): Promise<string | null> {
  // Try Clerk first (most common)
  const clerkUserId = (window as any).__clerk_user_id;
  if (clerkUserId) return clerkUserId;
  
  // Try Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  
  // Fallback: anonymous tracking with session ID
  return `anon_${getSessionId()}`;
}

// Queue for batching events (reduces API calls)
let eventQueue: Array<{
  user_id: string;
  event_type: EventType;
  event_name: string;
  page_route: string | null;
  metadata: Record<string, any>;
  session_id: string;
  created_at: string;
}> = [];

let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // Flush every 5 seconds
const MAX_QUEUE_SIZE = 10; // Or when queue reaches 10 events

async function flushEventQueue() {
  if (eventQueue.length === 0) return;
  
  const eventsToSend = [...eventQueue];
  eventQueue = [];
  
  try {
    const { error } = await supabase
      .from('user_events')
      .insert(eventsToSend);
    
    if (error) {
      console.warn('[Analytics] Failed to flush events:', error.message);
      // Re-queue failed events (but don't retry indefinitely)
      if (eventsToSend.length < 50) {
        eventQueue = [...eventsToSend, ...eventQueue];
      }
    }
  } catch (err) {
    console.warn('[Analytics] Error flushing events:', err);
  }
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushEventQueue();
  }, FLUSH_INTERVAL);
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery on page close
      const payload = JSON.stringify(eventQueue);
      navigator.sendBeacon?.('/api/analytics/batch', payload);
    }
  });
}

/**
 * Track a user event
 * 
 * @param eventName - Name of the event (e.g., 'add_employee', 'refresh_kpis')
 * @param metadata - Optional additional data about the event
 * @param eventType - Type of event (default: 'feature_use')
 */
export async function trackEvent(
  eventName: CommonEventName,
  metadata?: Record<string, any>,
  eventType: EventType = 'feature_use'
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return; // Don't track if no user
    
    const event = {
      user_id: userId,
      event_type: eventType,
      event_name: eventName,
      page_route: typeof window !== 'undefined' ? window.location.pathname : null,
      metadata: metadata || {},
      session_id: getSessionId(),
      created_at: new Date().toISOString(),
    };
    
    eventQueue.push(event);
    
    // Flush immediately if queue is full
    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      flushEventQueue();
    } else {
      scheduleFlush();
    }
  } catch (err) {
    // Silent fail - analytics should never break the app
    console.warn('[Analytics] trackEvent error:', err);
  }
}

/**
 * Track a page view
 * 
 * @param route - The page route (e.g., '/employee-ler', '/kpi-dashboard')
 * @param metadata - Optional additional data
 */
export async function trackPageView(
  route: string,
  metadata?: Record<string, any>
): Promise<void> {
  return trackEvent(
    'page_view',
    { route, ...metadata },
    'page_view'
  );
}

/**
 * Track an error
 * 
 * @param errorName - Name/type of the error
 * @param metadata - Error details
 */
export async function trackError(
  errorName: string,
  metadata?: Record<string, any>
): Promise<void> {
  return trackEvent(
    errorName,
    { ...metadata, timestamp: new Date().toISOString() },
    'error'
  );
}

/**
 * Track navigation between pages/tabs
 * 
 * @param from - Source location
 * @param to - Destination location
 */
export async function trackNavigation(
  from: string,
  to: string
): Promise<void> {
  return trackEvent(
    'navigation',
    { from, to },
    'navigation'
  );
}

/**
 * Force flush all queued events immediately
 * Useful before critical operations or page transitions
 */
export async function flushAnalytics(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  await flushEventQueue();
}

/**
 * Get user insights (for personalization)
 * Returns aggregated behavior data for the current user
 */
export async function getUserInsights(): Promise<{
  mostUsedFeatures: string[];
  featureUsageCounts: Record<string, number>;
  totalSessions: number;
  lastActive: string | null;
} | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId.startsWith('anon_')) return null;
    
    const { data, error } = await supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    
    return {
      mostUsedFeatures: data.most_used_features || [],
      featureUsageCounts: data.feature_usage_counts || {},
      totalSessions: data.total_sessions || 0,
      lastActive: data.last_active_at,
    };
  } catch (err) {
    console.warn('[Analytics] getUserInsights error:', err);
    return null;
  }
}

// ============================================
// COACHING EFFECTIVENESS TRACKING
// ============================================

export type QuestionCategory = 
  | 'crew_costs' 
  | 'cash_flow' 
  | 'ler' 
  | 'pricing' 
  | 'scheduling'
  | 'bonus_structure'
  | 'general';

export type ResponseType = 
  | 'tactical'      // Specific, actionable advice
  | 'strategic'     // Big-picture guidance
  | 'educational'   // Explaining concepts
  | 'motivational'; // Encouragement/mindset

export type AdviceCategory = 
  | 'bonus_structure'
  | 'pricing'
  | 'scheduling'
  | 'cost_reduction'
  | 'crew_optimization'
  | 'revenue_growth'
  | 'cash_management'
  | 'general';

export interface CoachingSessionData {
  questionText: string;
  questionCategory: QuestionCategory;
  responseType: ResponseType;
  adviceCategory: AdviceCategory;
  keyRecommendation: string;
  responseLength: number;
  contextMetrics?: Record<string, any>;
}

/**
 * Track a coaching session for effectiveness analysis
 * 
 * @param data - Coaching session details
 * @returns The session ID for linking to effectiveness tracking
 */
export async function trackCoachingSession(
  data: CoachingSessionData
): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId.startsWith('anon_')) return null;
    
    const { data: result, error } = await supabase
      .from('coaching_sessions')
      .insert({
        user_id: userId,
        question_text: data.questionText.substring(0, 500), // Truncate for privacy
        question_category: data.questionCategory,
        response_type: data.responseType,
        advice_category: data.adviceCategory,
        key_recommendation: data.keyRecommendation.substring(0, 200),
        response_length: data.responseLength,
        context_metrics: data.contextMetrics || {},
      })
      .select('id')
      .single();
    
    if (error) {
      console.warn('[Analytics] Failed to track coaching session:', error.message);
      return null;
    }
    
    // Also track as a regular event
    trackEvent('ask_coach', {
      question_category: data.questionCategory,
      response_type: data.responseType,
      advice_category: data.adviceCategory,
    });
    
    return result?.id || null;
  } catch (err) {
    console.warn('[Analytics] trackCoachingSession error:', err);
    return null;
  }
}

/**
 * Create effectiveness tracking for a coaching session
 * Links the advice to a specific metric to track improvement over time
 * 
 * @param coachingSessionId - ID from trackCoachingSession
 * @param adviceCategory - Category of advice given
 * @param metricName - Metric to track (e.g., 'ler', 'revenue', 'gross_profit_pct')
 * @param baselineValue - Current value of the metric
 */
export async function createEffectivenessTracking(
  coachingSessionId: string,
  adviceCategory: AdviceCategory,
  metricName: string,
  baselineValue: number
): Promise<string | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId.startsWith('anon_')) return null;
    
    const { data: result, error } = await supabase
      .from('coaching_effectiveness')
      .insert({
        coaching_session_id: coachingSessionId,
        user_id: userId,
        advice_category: adviceCategory,
        date_given: new Date().toISOString().split('T')[0],
        metric_name: metricName,
        baseline_value: baselineValue,
      })
      .select('id')
      .single();
    
    if (error) {
      console.warn('[Analytics] Failed to create effectiveness tracking:', error.message);
      return null;
    }
    
    return result?.id || null;
  } catch (err) {
    console.warn('[Analytics] createEffectivenessTracking error:', err);
    return null;
  }
}

/**
 * Mark that user implemented advice from a coaching session
 * 
 * @param effectivenessId - ID from createEffectivenessTracking
 */
export async function markAdviceImplemented(
  effectivenessId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('coaching_effectiveness')
      .update({
        implemented: true,
        implementation_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', effectivenessId);
    
    if (error) {
      console.warn('[Analytics] Failed to mark advice implemented:', error.message);
    }
  } catch (err) {
    console.warn('[Analytics] markAdviceImplemented error:', err);
  }
}

/**
 * Update time spent on a coaching response
 * Call this when user navigates away or closes the coach
 * 
 * @param sessionId - Coaching session ID
 * @param timeSpentSeconds - Time spent viewing the response
 */
export async function updateCoachingEngagement(
  sessionId: string,
  timeSpentSeconds: number,
  askedFollowup: boolean = false
): Promise<void> {
  try {
    const { error } = await supabase
      .from('coaching_sessions')
      .update({
        time_spent_seconds: timeSpentSeconds,
        user_asked_followup: askedFollowup,
      })
      .eq('id', sessionId);
    
    if (error) {
      console.warn('[Analytics] Failed to update coaching engagement:', error.message);
    }
  } catch (err) {
    console.warn('[Analytics] updateCoachingEngagement error:', err);
  }
}

/**
 * Rate a coaching response as helpful or not
 * 
 * @param sessionId - Coaching session ID
 * @param helpful - Whether the response was helpful
 */
export async function rateCoachingResponse(
  sessionId: string,
  helpful: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('coaching_sessions')
      .update({ user_rated_helpful: helpful })
      .eq('id', sessionId);
    
    if (error) {
      console.warn('[Analytics] Failed to rate coaching response:', error.message);
    }
    
    trackEvent('rate_coach_response', { session_id: sessionId, helpful });
  } catch (err) {
    console.warn('[Analytics] rateCoachingResponse error:', err);
  }
}

// ============================================
// BEHAVIORAL LOGGING
// ============================================

export interface BehavioralLogData {
  actionType: 'viewed_metric' | 'asked_ai' | 'changed_setting' | 'exported_data' | 'clicked_element';
  actionTarget?: string;
  screenName?: string;
  timeOnScreenSeconds?: number;
  previousAction?: string;
  aiResponseType?: string;
  aiResponseCategory?: string;
  userFollowedGuidance?: boolean;
  visibleMetrics?: Record<string, any>;
  metricValuesAtTime?: Record<string, any>;
}

/**
 * Log granular user behavior for journey analysis
 * 
 * @param data - Behavioral log details
 */
export async function logBehavior(data: BehavioralLogData): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    const { error } = await supabase
      .from('user_behavioral_logs')
      .insert({
        user_id: userId,
        session_id: getSessionId(),
        action_type: data.actionType,
        action_target: data.actionTarget,
        screen_name: data.screenName || (typeof window !== 'undefined' ? window.location.pathname : null),
        time_on_screen_seconds: data.timeOnScreenSeconds,
        previous_action: data.previousAction,
        ai_response_type: data.aiResponseType,
        ai_response_category: data.aiResponseCategory,
        user_followed_guidance: data.userFollowedGuidance,
        visible_metrics: data.visibleMetrics || {},
        metric_values_at_time: data.metricValuesAtTime || {},
      });
    
    if (error) {
      console.warn('[Analytics] Failed to log behavior:', error.message);
    }
  } catch (err) {
    console.warn('[Analytics] logBehavior error:', err);
  }
}

/**
 * Track which metrics user actually looks at
 * 
 * @param metricName - Name of the metric viewed
 * @param metricValue - Current value of the metric
 * @param screenName - Screen where metric was viewed
 */
export async function trackMetricView(
  metricName: string,
  metricValue: number | string,
  screenName?: string
): Promise<void> {
  return logBehavior({
    actionType: 'viewed_metric',
    actionTarget: metricName,
    screenName,
    metricValuesAtTime: { [metricName]: metricValue },
  });
}

/**
 * Get coaching effectiveness insights for the current user
 * Shows which advice has been most effective
 */
export async function getCoachingInsights(): Promise<{
  totalSessions: number;
  implementedCount: number;
  avgImprovementPct: number | null;
  bestAdviceCategory: string | null;
} | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId || userId.startsWith('anon_')) return null;
    
    const { data, error } = await supabase
      .from('coaching_effectiveness')
      .select('*')
      .eq('user_id', userId);
    
    if (error || !data) return null;
    
    const implemented = data.filter(d => d.implemented);
    const withImprovement = data.filter(d => d.improvement_pct !== null);
    const avgImprovement = withImprovement.length > 0
      ? withImprovement.reduce((sum, d) => sum + (d.improvement_pct || 0), 0) / withImprovement.length
      : null;
    
    // Find best performing advice category
    const categoryPerformance: Record<string, number[]> = {};
    withImprovement.forEach(d => {
      if (!categoryPerformance[d.advice_category]) {
        categoryPerformance[d.advice_category] = [];
      }
      categoryPerformance[d.advice_category].push(d.improvement_pct || 0);
    });
    
    let bestCategory: string | null = null;
    let bestAvg = -Infinity;
    Object.entries(categoryPerformance).forEach(([cat, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestCategory = cat;
      }
    });
    
    return {
      totalSessions: data.length,
      implementedCount: implemented.length,
      avgImprovementPct: avgImprovement,
      bestAdviceCategory: bestCategory,
    };
  } catch (err) {
    console.warn('[Analytics] getCoachingInsights error:', err);
    return null;
  }
}

// Export for testing/debugging
export const _internal = {
  getSessionId,
  getCurrentUserId,
  flushEventQueue,
  getQueueLength: () => eventQueue.length,
};
