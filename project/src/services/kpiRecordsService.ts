import { supabase } from '../config/supabaseClient';

export interface KPIRecord {
  id: string;
  user_id: string;
  kpi_name: string;
  kpi_value: number;
  goal_value: number;
  trend_vs_last_month?: number; // Optional since some KPIs may not have trend data
  status: 'good' | 'warning' | 'alert';
  period: string;
  plain_explanation: string;
  action_suggestion: string;
  kpi_category: string;
  display_format: string;
  created_at: string;
  updated_at: string;
}

export interface KPIRecordWithCoaching extends KPIRecord {
  display_name?: string;
  default_goal?: number;
  is_higher_better?: boolean;
  why_it_matters?: string;
  low_value_advice?: string;
  high_value_advice?: string;
  ai_commentary?: string;
}

export interface KPIFilters {
  period?: string; // Filter by specific period
  currentMonth?: boolean; // Filter to current month only
  kpi_category?: string; // Filter by KPI category
  status?: 'good' | 'warning' | 'alert' | 'all'; // Filter by status
}

export interface KPICreateInput {
  kpi_name: string;
  kpi_value: number;
  goal_value?: number;
  trend_vs_last_month?: number;
  status: 'good' | 'warning' | 'alert';
  period: string;
  plain_explanation?: string;
  action_suggestion?: string;
  kpi_category?: string;
  display_format?: string;
}

export class KPIRecordsService {
  /**
   * Fetch KPI records for a specific user with optional filtering
   */
  static async getKPIRecords(userId: string, filters: KPIFilters = {}): Promise<KPIRecord[]> {
    try {
      let query = supabase
        .from('kpi_records')
        .select('*')
        .eq('user_id', userId)
        .order('period', { ascending: false });

      // Apply period filters
      if (filters.period) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        switch (filters.period) {
          case 'current':
          case 'current_month':
            // Current month only
            const currentPeriod = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
            query = query.eq('period', currentPeriod);
            break;
            
          case 'last_month':
            // Last month
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthPeriod = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
            query = query.eq('period', lastMonthPeriod);
            break;
            
          case 'same_month_last_year':
            // Same month last year
            const lastYearPeriod = `${currentYear - 1}-${currentMonth.toString().padStart(2, '0')}-01`;
            query = query.eq('period', lastYearPeriod);
            break;
            
          case 'last3months':
            // Last 3 months including current
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
            const startPeriod = `${threeMonthsAgo.getFullYear()}-${(threeMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}-01`;
            query = query.gte('period', startPeriod);
            break;
            
          case 'ytd':
            // Year to date
            const ytdStart = `${currentYear}-01-01`;
            query = query.gte('period', ytdStart);
            break;
            
          case 'all':
            // No period filter
            break;
            
          default:
            // Handle specific month formats like "2025-07"
            if (filters.period.match(/^\d{4}-\d{2}$/)) {
              const specificPeriod = `${filters.period}-01`;
              query = query.eq('period', specificPeriod);
            } else if (filters.period.includes('-')) {
              // If it's already a full date string, use it directly
              query = query.eq('period', filters.period);
            }
            break;
        }
      }

      if (filters.currentMonth) {
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01 format
        query = query.eq('period', currentMonth);
      }

      if (filters.kpi_category && filters.kpi_category !== 'all') {
        query = query.eq('kpi_category', filters.kpi_category);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching KPI records:', error.message);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Unexpected error fetching KPI records:', e);
      return [];
    }
  }

  /**
   * Get KPI records for dashboard table view
   */
  static async getDashboardKPIs(userId: string): Promise<KPIRecord[]> {
    return this.getKPIRecords(userId, { currentMonth: true });
  }

  /**
   * Get KPI records grouped by category
   */
  static async getKPIsByCategory(userId: string, category: string): Promise<KPIRecord[]> {
    return this.getKPIRecords(userId, { kpi_category: category });
  }

  /**
   * Get KPI trend data for charting (last 6 months)
   */
  static async getKPITrends(userId: string, kpiName: string): Promise<KPIRecord[]> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDate = sixMonthsAgo.toISOString().slice(0, 7) + '-01';

      const { data, error } = await supabase
        .from('kpi_records')
        .select('*')
        .eq('user_id', userId)
        .eq('kpi_name', kpiName)
        .gte('period', startDate)
        .order('period', { ascending: true });

      if (error) {
        console.error('Error fetching KPI trends:', error.message);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Unexpected error fetching KPI trends:', e);
      return [];
    }
  }

  /**
   * Get KPI records with coaching data for modern dashboard
   */
  static async getKPIRecordsWithCoaching(userId: string, filters: KPIFilters = {}): Promise<KPIRecordWithCoaching[]> {
    try {
      let query = supabase
        .from('kpi_records_with_definitions_and_ai')
        .select('*')
        .eq('user_id', userId)
        .order('kpi_name', { ascending: true });

      // Apply period filter
      if (filters.period) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        switch (filters.period) {
          case 'current':
          case 'current_month':
            const currentPeriod = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
            query = query.eq('period', currentPeriod);
            break;
            
          case 'last3months':
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const startPeriod = threeMonthsAgo.toISOString().slice(0, 7) + '-01';
            query = query.gte('period', startPeriod);
            break;
            
          case 'ytd':
            const ytdStart = `${currentYear}-01-01`;
            query = query.gte('period', ytdStart);
            break;
            
          case 'all':
            // No period filter
            break;
            
          default:
            if (filters.period.includes('-')) {
              query = query.eq('period', filters.period);
            }
            break;
        }
      } else {
        // Default to current month
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentPeriod = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
        query = query.eq('period', currentPeriod);
      }

      if (filters.kpi_category && filters.kpi_category !== 'all') {
        query = query.eq('kpi_category', filters.kpi_category);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching KPI records with coaching:', error.message);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Unexpected error fetching KPI records with coaching:', e);
      return [];
    }
  }

  /**
   * Update KPI goal value
   */
  static async updateKPIGoal(kpiId: string, newGoal: number): Promise<boolean> {
    try {
      console.log(`Attempting to update KPI goal - ID: ${kpiId}, New Goal: ${newGoal}`);
      
      // First, check if the record exists
      const { data: existingRecord, error: fetchError } = await supabase
        .from('kpi_records')
        .select('id, kpi_name, goal_value')
        .eq('id', kpiId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching existing record:', fetchError);
        return false;
      }
      
      if (!existingRecord) {
        console.error(`No KPI record found with ID: ${kpiId}`);
        return false;
      }
      
      console.log('Found existing record:', existingRecord);
      
      // Now update the record
      const { data, error } = await supabase
        .from('kpi_records')
        .update({ goal_value: newGoal })
        .eq('id', kpiId)
        .select();

      if (error) {
        console.error('Error updating KPI goal:', error.message);
        return false;
      }

      console.log(`Successfully updated KPI goal for ID ${kpiId} to ${newGoal}`);
      console.log('Updated record:', data);
      return true;
    } catch (e) {
      console.error('Unexpected error updating KPI goal:', e);
      return false;
    }
  }

  /**
   * Create or update a KPI record
   */
  static async upsertKPIRecord(userId: string, kpiData: KPICreateInput): Promise<KPIRecord | null> {
    try {
      console.log(`Upserting KPI: ${kpiData.kpi_name} for period ${kpiData.period}`);
      
      const { data, error } = await supabase
        .from('kpi_records')
        .upsert({
          user_id: userId,
          ...kpiData,
          display_format: kpiData.display_format || 'number'
        }, {
          onConflict: 'user_id,kpi_name,period'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting KPI record:', error);
        console.error('KPI data that failed:', { userId, ...kpiData });
        return null;
      }

      console.log(`✅ Successfully upserted KPI: ${kpiData.kpi_name} for ${kpiData.period}`);
      return data;
    } catch (e) {
      console.error('Unexpected error upserting KPI record:', e);
      console.error('KPI data that caused error:', { userId, ...kpiData });
      return null;
    }
  }

  /**
   * Delete a KPI record
   */
  static async deleteKPIRecord(userId: string, kpiId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('kpi_records')
        .delete()
        .eq('id', kpiId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting KPI record:', error.message);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Unexpected error deleting KPI record:', e);
      return false;
    }
  }

  /**
   * Calculate KPI status based on value vs goal
   */
  static calculateKPIStatus(value: number, goal: number | null, isHigherBetter: boolean = true): 'good' | 'warning' | 'alert' {
    if (!goal) return 'warning';

    const ratio = value / goal;
    
    if (isHigherBetter) {
      if (ratio >= 0.95) return 'good';
      if (ratio >= 0.8) return 'warning';
      return 'alert';
    } else {
      // For metrics where lower is better (like CAC)
      if (ratio <= 1.05) return 'good';
      if (ratio <= 1.2) return 'warning';
      return 'alert';
    }
  }

  /**
   * Generate KPI records from revenue data with Future Inspired Revenue (FIR) goals
   */
  static async generateRevenueKPIs(userId: string, period: string): Promise<void> {
    try {
      // First try to get data with owner_draws, fallback if column doesn't exist
      let revenueData: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('revenue_entries')
          .select('actual_revenue, desired_revenue, profit_margin, owner_draws')
          .eq('user_id', userId)
          .eq('year', new Date(period).getFullYear())
          .eq('month', new Date(period).getMonth() + 1);

        if (error) throw error;
        revenueData = data;
      } catch (error) {
        // If owner_draws column doesn't exist, fallback to basic query
        console.log('Falling back to basic revenue query (owner_draws column may not exist yet)');
        const { data, error: fallbackError } = await supabase
          .from('revenue_entries')
          .select('actual_revenue, desired_revenue, profit_margin')
          .eq('user_id', userId)
          .eq('year', new Date(period).getFullYear())
          .eq('month', new Date(period).getMonth() + 1);

        if (fallbackError) throw fallbackError;
        revenueData = data;
      }

      if (revenueData && revenueData.length > 0) {
        const actualRevenue = revenueData[0].actual_revenue || 0;
        const desiredRevenue = revenueData[0].desired_revenue || null;
        const profitMargin = revenueData[0].profit_margin || 0;
        const ownerDraws = (revenueData[0] as any).owner_draws || 0; // Type assertion for backwards compatibility

        // Use FIR target from desired_revenue (this is your Future Inspired Revenue target)
        const firGoal = desiredRevenue;
        
        // Calculate net profit and FIR-based profit goal
        const netProfit = actualRevenue * (profitMargin / 100);
        const firNetProfitGoal = firGoal ? (firGoal * (profitMargin / 100)) : null;
        
        // Calculate net profit after owner draws
        const netProfitAfterDraws = netProfit - ownerDraws;

        // Generate Monthly Revenue KPI with FIR goal
        await this.upsertKPIRecord(userId, {
          kpi_name: 'Monthly Revenue',
          kpi_value: actualRevenue,
          goal_value: firGoal,
          status: this.calculateKPIStatus(actualRevenue, firGoal),
          period,
          plain_explanation: `Monthly revenue of $${actualRevenue.toLocaleString()} ${firGoal ? `vs Future Inspired Revenue target of $${firGoal.toLocaleString()}` : ''}`,
          action_suggestion: actualRevenue < (firGoal || 0) ? 'Focus on increasing sales activities to reach your Future Inspired Revenue target' : 'Excellent! You\'re meeting your Future Inspired Revenue goals!',
          kpi_category: 'revenue',
          display_format: 'currency'
        });

        // Only generate Net Profit After Owner Draws KPI if we have owner_draws data
        if ('owner_draws' in revenueData[0] && revenueData[0].owner_draws !== undefined) {
          // Calculate sustainable owner draw goal (80% of FIR net profit to leave 20% for growth)
          const sustainableDrawGoal = firNetProfitGoal ? firNetProfitGoal * 0.8 : 0;
          const netProfitAfterSustainableDraws = firNetProfitGoal ? firNetProfitGoal - sustainableDrawGoal : null;
          
          await this.upsertKPIRecord(userId, {
            kpi_name: 'net_profit_after_draws',
            kpi_value: netProfitAfterDraws,
            goal_value: netProfitAfterSustainableDraws || undefined, // Goal based on FIR targets
            status: this.calculateKPIStatus(netProfitAfterDraws, netProfitAfterSustainableDraws),
            period,
            plain_explanation: this.generateNetProfitAfterDrawsExplanation(netProfit, ownerDraws, netProfitAfterDraws),
            action_suggestion: this.generateNetProfitAfterDrawsAdvice(netProfit, netProfitAfterDraws),
            kpi_category: 'profitability',
            display_format: 'currency'
          });
        } else {
          console.log('Skipping Net Profit After Owner Draws KPI - owner_draws column not available yet. Please apply database migrations.');
        }
      }
    } catch (e) {
      console.error('Error generating revenue KPIs:', e);
    }
  }

  /**
   * Generate explanation for Net Profit After Owner Draws KPI with FIR context
   */
  private static generateNetProfitAfterDrawsExplanation(
    netProfit: number, 
    ownerDraws: number, 
    netProfitAfterDraws: number
  ): string {
    const drawPercentage = netProfit > 0 ? Math.round((ownerDraws / netProfit) * 100) : 0;
    
    if (netProfitAfterDraws < 0) {
      return `You drew $${ownerDraws.toLocaleString()} from $${netProfit.toLocaleString()} net profit, leaving a deficit of $${Math.abs(netProfitAfterDraws).toLocaleString()}. This means you're drawing more than your business earned, which undermines your Future Inspired Revenue goals.`;
    } else if (netProfitAfterDraws === 0) {
      return `You drew exactly your net profit of $${netProfit.toLocaleString()}, leaving $0 for business growth and reserves. Consider reducing draws to 80% of profit to fuel your Future Inspired Revenue targets.`;
    } else {
      return `From $${netProfit.toLocaleString()} net profit, you drew $${ownerDraws.toLocaleString()} (${drawPercentage}%), leaving $${netProfitAfterDraws.toLocaleString()} for business growth and reserves. This supports your Future Inspired Revenue strategy.`;
    }
  }

  /**
   * Generate advice for Net Profit After Owner Draws KPI with Future Inspired Revenue context
   */
  static generateNetProfitAfterDrawsAdvice(netProfit: number, netProfitAfterDraws: number): string {
    if (netProfitAfterDraws < 0) {
      return 'Reduce personal draws or increase profit margin so the business can support your income without undermining your Future Inspired Revenue goals.';
    } else if (netProfitAfterDraws < netProfit * 0.2) {
      return 'Consider reducing owner draws to 80% of net profit to leave more for business growth and achieving your Future Inspired Revenue targets.';
    } else {
      return 'Excellent financial discipline! You\'re leaving adequate funds for business growth while taking reasonable draws. This supports your Future Inspired Revenue strategy.';
    }
  }

  /**
   * Format KPI value for display based on format type
   */
  static formatKPIValue(value: number, format: string): string {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'percentage':
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }).format(value);
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  }
}
