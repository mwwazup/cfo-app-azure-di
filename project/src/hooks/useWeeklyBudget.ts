import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuthContext } from '../contexts/auth-context';
import { useRevenue } from '../contexts/revenue-context';

export interface WeeklyBudgetData {
  id?: string;
  userId: string;
  year: number;
  month: number;
  weekOfMonth: number;
  weekStartDate: string;
  weekEndDate: string;
  weeklyBudgetTarget: number;
  monthlyFirTotal?: number;
  monthlyRevenuePercentage?: number;
  actualRevenue: number;
  jobsCompleted: number;
  varianceAmount?: number;
  variancePercentage?: number;
  isOnTrack?: boolean;
  isAutoPopulated?: boolean;
  lastServiceSyncAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyBudgetSummary {
  userId: string;
  year: number;
  month: number;
  totalMonthlyBudget: number;
  totalActualRevenue: number;
  totalJobsCompleted: number;
  totalVarianceAmount: number;
  totalVariancePercentage: number;
  weeksTracked: number;
  weeksOnTrack: number;
  monthlyFirTotal?: number;
}

/**
 * Utility function to calculate week dates for a given month
 * Weeks start on Sunday and only include dates within the current month
 */
export function getWeeksInMonth(year: number, month: number): {
  weekOfMonth: number;
  weekStartDate: Date;
  weekEndDate: Date;
}[] {
  const weeks: { weekOfMonth: number; weekStartDate: Date; weekEndDate: Date }[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let currentWeek = 1;
  let currentDate = new Date(firstDay);
  
  // Start from the first day of the month
  // Weeks start on Sunday, but first week begins on the 1st regardless of day
  
  while (currentDate <= lastDay) {
    const weekStart = new Date(currentDate);
    
    // Calculate week end (Saturday, or last day of month if earlier)
    const weekEnd = new Date(currentDate);
    const daysUntilSaturday = 6 - currentDate.getDay(); // Days until Saturday
    weekEnd.setDate(weekEnd.getDate() + daysUntilSaturday);
    
    // Clamp week end to last day of month
    if (weekEnd > lastDay) {
      weekEnd.setTime(lastDay.getTime());
    }
    
    weeks.push({
      weekOfMonth: currentWeek,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
    });
    
    // Move to next Sunday
    currentDate.setDate(currentDate.getDate() + daysUntilSaturday + 1);
    currentWeek++;
    
    // Stop if we've moved past the month or exceeded 5 weeks
    if (currentDate > lastDay || currentWeek > 5) {
      break;
    }
  }
  
  return weeks;
}

/**
 * Calculate weekly budget targets from monthly FIR and historical patterns
 */
function calculateWeeklyTargets(
  monthlyFirTotal: number,
  year: number,
  month: number,
  previousYearData?: WeeklyBudgetData[]
): number[] {
  const weeksInMonth = getWeeksInMonth(year, month);
  
  // If we have previous year data, use that pattern
  if (previousYearData && previousYearData.length > 0) {
    const totalPreviousRevenue = previousYearData.reduce((sum, week) => sum + week.actualRevenue, 0);
    
    if (totalPreviousRevenue > 0) {
      // Calculate each week's percentage of total previous year revenue
      return weeksInMonth.map((_, index) => {
        const previousWeek = previousYearData[index];
        if (previousWeek) {
          const percentage = previousWeek.actualRevenue / totalPreviousRevenue;
          return monthlyFirTotal * percentage;
        }
        return monthlyFirTotal / weeksInMonth.length;
      });
    }
  }
  
  // Fallback: Even distribution
  return weeksInMonth.map(() => monthlyFirTotal / weeksInMonth.length);
}

/**
 * Hook for managing weekly budget tracking
 */
export function useWeeklyBudget(year?: number, month?: number) {
  const { dbUserId } = useAuthContext();
  const { currentYear } = useRevenue();
  const [weeklyData, setWeeklyData] = useState<WeeklyBudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyBudget = async () => {
    if (!dbUserId || !year || !month) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('weekly_budget_tracking')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('year', year)
        .eq('month', month)
        .order('week_of_month', { ascending: true });

      if (fetchError) throw fetchError;
      
      // Map snake_case database columns to camelCase
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        year: item.year,
        month: item.month,
        weekOfMonth: item.week_of_month,
        weekStartDate: item.week_start_date,
        weekEndDate: item.week_end_date,
        weeklyBudgetTarget: Number(item.weekly_budget_target || 0),
        monthlyFirTotal: item.monthly_fir_total ? Number(item.monthly_fir_total) : undefined,
        monthlyRevenuePercentage: item.monthly_revenue_percentage ? Number(item.monthly_revenue_percentage) : undefined,
        actualRevenue: Number(item.actual_revenue || 0),
        jobsCompleted: item.jobs_completed || 0,
        varianceAmount: item.variance_amount ? Number(item.variance_amount) : undefined,
        variancePercentage: item.variance_percentage ? Number(item.variance_percentage) : undefined,
        isOnTrack: item.is_on_track,
        isAutoPopulated: item.is_auto_populated,
        lastServiceSyncAt: item.last_service_sync_at,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      
      setWeeklyData(mappedData);
    } catch (err) {
      console.error('Error fetching weekly budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weekly budget');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyBudget();
  }, [dbUserId, year, month]);

  /**
   * Initialize weekly budget for a month using FIR from revenue context
   */
  const initializeMonthlyBudget = async (targetYear: number, targetMonth: number) => {
    if (!dbUserId) throw new Error('User not authenticated');

    // Get monthly FIR from revenue context
    const monthlyFirTargets = currentYear.monthlyFIRTargets || [];
    const monthlyFirTotal = monthlyFirTargets[targetMonth - 1] || currentYear.targetRevenue / 12;

    // Get previous year data for pattern matching
    const { data: previousYearData } = await supabase
      .from('weekly_budget_tracking')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('year', targetYear - 1)
      .eq('month', targetMonth)
      .order('week_of_month', { ascending: true });

    const previousData = previousYearData?.map((item: any) => ({
      actualRevenue: Number(item.actual_revenue || 0),
      weekOfMonth: item.week_of_month,
      userId: item.user_id,
      year: item.year,
      month: item.month,
      weekStartDate: item.week_start_date,
      weekEndDate: item.week_end_date,
      weeklyBudgetTarget: Number(item.weekly_budget_target || 0),
      jobsCompleted: item.jobs_completed || 0,
    })) as WeeklyBudgetData[] | undefined;

    // Calculate weekly targets
    const weeklyTargets = calculateWeeklyTargets(monthlyFirTotal, targetYear, targetMonth, previousData);
    const weeks = getWeeksInMonth(targetYear, targetMonth);

    // Create weekly budget entries
    const entries = weeks.map((week, index) => ({
      user_id: dbUserId,
      year: targetYear,
      month: targetMonth,
      week_of_month: week.weekOfMonth,
      week_start_date: week.weekStartDate.toISOString().split('T')[0],
      week_end_date: week.weekEndDate.toISOString().split('T')[0],
      weekly_budget_target: weeklyTargets[index],
      monthly_fir_total: monthlyFirTotal,
      monthly_revenue_percentage: weeklyTargets[index] / monthlyFirTotal,
      actual_revenue: 0,
      jobs_completed: 0,
    }));

    const { data, error } = await supabase
      .from('weekly_budget_tracking')
      .upsert(entries, {
        onConflict: 'user_id,year,month,week_of_month',
      })
      .select();

    if (error) throw error;
    
    await fetchWeeklyBudget();
    return data;
  };

  /**
   * Update weekly actual revenue and jobs completed
   */
  const updateWeeklyActual = async (
    weekId: string,
    actualRevenue: number,
    jobsCompleted: number
  ) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weekly_budget_tracking')
      .update({
        actual_revenue: actualRevenue,
        jobs_completed: jobsCompleted,
        is_auto_populated: false, // Manual update
      })
      .eq('id', weekId)
      .eq('user_id', dbUserId)
      .select()
      .single();

    if (error) throw error;
    
    await fetchWeeklyBudget();
    return data;
  };

  /**
   * Update weekly budget target
   */
  const updateWeeklyBudgetTarget = async (
    weekId: string,
    newTarget: number
  ) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weekly_budget_tracking')
      .update({
        weekly_budget_target: newTarget,
      })
      .eq('id', weekId)
      .eq('user_id', dbUserId)
      .select()
      .single();

    if (error) throw error;
    
    await fetchWeeklyBudget();
    return data;
  };

  /**
   * Sync weekly actuals from service activities
   */
  const syncFromServiceMix = async (targetYear: number, targetMonth: number) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .rpc('sync_weekly_budget_from_services', {
        p_user_id: dbUserId,
        p_year: targetYear,
        p_month: targetMonth,
      });

    if (error) throw error;
    
    await fetchWeeklyBudget();
    return data;
  };

  /**
   * Delete a weekly budget entry
   */
  const deleteWeeklyEntry = async (weekId: string) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('weekly_budget_tracking')
      .delete()
      .eq('id', weekId)
      .eq('user_id', dbUserId);

    if (error) throw error;
    
    await fetchWeeklyBudget();
  };

  return {
    weeklyData,
    loading,
    error,
    initializeMonthlyBudget,
    updateWeeklyActual,
    updateWeeklyBudgetTarget,
    syncFromServiceMix,
    deleteWeeklyEntry,
    refreshWeeklyBudget: fetchWeeklyBudget,
  };
}

/**
 * Hook for getting monthly budget summary
 */
export function useMonthlyBudgetSummary(year: number, month: number) {
  const { dbUserId } = useAuthContext();
  const [summary, setSummary] = useState<MonthlyBudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!dbUserId) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('monthly_budget_summary')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('year', year)
          .eq('month', month)
          .single();

        if (fetchError) throw fetchError;
        
        setSummary(data ? {
          userId: data.user_id,
          year: data.year,
          month: data.month,
          totalMonthlyBudget: Number(data.total_monthly_budget || 0),
          totalActualRevenue: Number(data.total_actual_revenue || 0),
          totalJobsCompleted: data.total_jobs_completed || 0,
          totalVarianceAmount: Number(data.total_variance_amount || 0),
          totalVariancePercentage: Number(data.total_variance_percentage || 0),
          weeksTracked: data.weeks_tracked || 0,
          weeksOnTrack: data.weeks_on_track || 0,
          monthlyFirTotal: data.monthly_fir_total ? Number(data.monthly_fir_total) : undefined,
        } : null);
      } catch (err) {
        console.error('Error fetching monthly budget summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [dbUserId, year, month]);

  return { summary, loading, error };
}
