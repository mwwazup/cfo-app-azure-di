import { getKpiRecords, deleteKpiByName } from '../config/supabaseClient';

// NOTE: This service is being migrated to use backend APIs instead of direct Supabase calls
// Some methods are temporarily disabled until full migration is complete

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
      // Build period parameter for API call
      let period: string | undefined;
      
      if (filters.period) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        switch (filters.period) {
          case 'current':
          case 'current_month':
            period = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
            break;
          case 'last_month':
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            period = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;
            break;
          case 'same_month_last_year':
            period = `${currentYear - 1}-${currentMonth.toString().padStart(2, '0')}-01`;
            break;
          default:
            if (filters.period.match(/^\d{4}-\d{2}$/)) {
              period = `${filters.period}-01`;
            } else if (filters.period.includes('-')) {
              period = filters.period;
            }
            break;
        }
      }
      
      if (filters.currentMonth) {
        period = new Date().toISOString().slice(0, 7) + '-01';
      }

      const result = await getKpiRecords(userId, period);
      let records = result.rows || [];

      // Apply client-side filtering for complex filters not supported by API
      if (filters.kpi_category && filters.kpi_category !== 'all') {
        records = records.filter(record => record.kpi_category === filters.kpi_category);
      }

      if (filters.status && filters.status !== 'all') {
        records = records.filter(record => record.status === filters.status);
      }

      // Handle period filters that require multiple records (like last3months, ytd)
      if (filters.period) {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        switch (filters.period) {
          case 'last3months':
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
            const startPeriod = `${threeMonthsAgo.getFullYear()}-${(threeMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}-01`;
            records = records.filter(record => record.period >= startPeriod);
            break;
          case 'ytd':
            const ytdStart = `${currentYear}-01-01`;
            records = records.filter(record => record.period >= ytdStart);
            break;
        }
      }

      return records;
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
   * TODO: Migrate to backend API
   */
  static async getKPITrends(_userId: string, _kpiName: string): Promise<KPIRecord[]> {
    console.warn('getKPITrends temporarily disabled - migration to backend API in progress');
    return [];
  }

  /**
   * Get KPI records with coaching data for modern dashboard
   * TODO: Migrate to backend API
   */
  static async getKPIRecordsWithCoaching(_userId: string, _filters: KPIFilters = {}): Promise<KPIRecordWithCoaching[]> {
    console.warn('getKPIRecordsWithCoaching temporarily disabled - migration to backend API in progress');
    return [];
  }

  /**
   * Update KPI goal value
   * TODO: Migrate to backend API
   */
  static async updateKPIGoal(_kpiId: string, _newGoal: number): Promise<boolean> {
    console.warn('updateKPIGoal temporarily disabled - migration to backend API in progress');
    return false;
  }

  /**
   * Create or update a KPI record using backend API
   */
  static async upsertKPIRecord(userId: string, kpiData: KPICreateInput): Promise<KPIRecord | null> {
    try {
      const { upsertKpiRecord } = await import('../config/supabaseClient');
      const result = await upsertKpiRecord(userId, kpiData);
      
      if (result.ok && result.record) {
        return result.record as KPIRecord;
      }
      
      return null;
    } catch (error) {
      console.error('Error upserting KPI record:', error);
      return null;
    }
  }

  /**
   * Delete a KPI record
   * TODO: Migrate to backend API
   */
  static async deleteKPIRecord(userId: string, kpiId: string): Promise<boolean> {
    try {
      await deleteKpiByName(userId, kpiId);
      return true;
    } catch (e) {
      console.error('Error deleting KPI record:', e);
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
   * TODO: Migrate to backend API
   */
  static async generateRevenueKPIs(_userId: string, _period: string): Promise<void> {
    console.warn('generateRevenueKPIs temporarily disabled - migration to backend API in progress');
    return;
  }

  /**
   * Generate explanation for Net Profit After Owner Draws KPI with FIR context
   * TODO: Migrate to backend API
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
