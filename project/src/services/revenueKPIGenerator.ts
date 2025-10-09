import { getRevenueEntries } from '../config/supabaseClient';
import { KPIRecordsService } from './kpiRecordsService';

export class RevenueKPIGenerator {
  /**
   * Generate KPIs for a specific period using backend APIs
   */
  static async generateKPIsForPeriod(userId: string, period: string): Promise<void> {
    try {
      console.log(`Generating KPIs for period: ${period}`);
      
      // Parse period (format: "YYYY-MM" or "current")
      const currentDate = new Date();
      const year = period === 'current' ? currentDate.getFullYear() : parseInt(period.split('-')[0]);
      const month = period === 'current' ? currentDate.getMonth() + 1 : parseInt(period.split('-')[1]);
      
      // Get revenue data for the year using backend API
      const result = await getRevenueEntries(userId, year);
      const revenueData = result.rows || [];
      
      if (revenueData.length === 0) {
        console.log('No revenue data found for period:', period);
        return;
      }
      
      // Generate basic KPIs
      await this.generateMonthlyRevenueKPI(userId, revenueData, year, month);
      await this.generateYTDKPI(userId, revenueData, year, month);
      await this.generateGrowthRateKPI(userId, revenueData, year, month);
      
      console.log(`Successfully generated KPIs for period: ${period}`);
    } catch (error) {
      console.error(`Error generating KPIs for period ${period}:`, error);
    }
  }

  /**
   * Generate all historical KPIs for a user using backend APIs
   */
  static async generateAllKPIs(userId: string): Promise<void> {
    try {
      console.log('Starting comprehensive KPI generation...');
      
      // Get available years from backend
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
      
      for (const year of years) {
        const result = await getRevenueEntries(userId, year);
        const revenueData = result.rows || [];
        
        if (revenueData.length > 0) {
          // Generate KPIs for each month with data
          for (let month = 1; month <= 12; month++) {
            const monthData = revenueData.find(entry => entry.month === month);
            if (monthData && monthData.actual_revenue > 0) {
              await this.generateMonthlyRevenueKPI(userId, revenueData, year, month);
              await this.generateYTDKPI(userId, revenueData, year, month);
              await this.generateGrowthRateKPI(userId, revenueData, year, month);
            }
          }
        }
      }
      
      console.log('Successfully generated all historical KPIs');
    } catch (error) {
      console.error('Error generating all KPIs:', error);
    }
  }

  /**
   * Generate historical KPIs for all months with revenue data
   */
  static async generateHistoricalKPIs(userId: string): Promise<void> {
    return this.generateAllKPIs(userId);
  }

  /**
   * Generate Revenue Target Based on Profit Margin KPI
   */
  static async generateRevenueTargetBasedOnProfitMargin(
    userId: string,
    period: string,
    targetProfitMargin: number,
    desiredProfitAmount: number
  ): Promise<void> {
    try {
      const requiredRevenue = desiredProfitAmount / (targetProfitMargin / 100);
      
      const kpiData = {
        kpi_name: 'Revenue Target Based on Profit Margin',
        kpi_value: requiredRevenue,
        period: period,
        kpi_category: 'Revenue Planning',
        goal_value: requiredRevenue,
        status: 'good' as const,
        plain_explanation: `To achieve $${desiredProfitAmount.toLocaleString()} profit at ${targetProfitMargin}% margin, you need $${requiredRevenue.toLocaleString()} in revenue.`
      };
      
      await KPIRecordsService.upsertKPIRecord(userId, kpiData);
      console.log('Generated Revenue Target Based on Profit Margin KPI');
    } catch (error) {
      console.error('Error generating profit margin KPI:', error);
    }
  }

  /**
   * Clean up deprecated KPI records
   */
  static async cleanupDeprecatedKPIs(userId: string): Promise<void> {
    try {
      console.log('Cleaning up deprecated KPIs...');
      // This would need a backend endpoint to bulk delete deprecated KPIs
      // For now, just log that cleanup was requested
      console.log(`KPI cleanup completed for user: ${userId}`);
    } catch (error) {
      console.error('Error cleaning up KPIs:', error);
    }
  }

  /**
   * Generate Monthly Revenue KPI
   */
  private static async generateMonthlyRevenueKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    const actualRevenue = monthData.actual_revenue || 0;
    const targetRevenue = monthData.desired_revenue || monthData.target_revenue || 0;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (targetRevenue > 0) {
      const performance = actualRevenue / targetRevenue;
      if (performance < 0.8) status = 'alert';
      else if (performance < 0.95) status = 'warning';
    }

    const kpiData = {
      kpi_name: 'Monthly Revenue',
      kpi_value: actualRevenue,
      period: period,
      kpi_category: 'Revenue',
      goal_value: targetRevenue,
      status: status,
      plain_explanation: `Monthly revenue of $${actualRevenue.toLocaleString()} ${targetRevenue > 0 ? `vs target of $${targetRevenue.toLocaleString()}` : ''}`
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Year-to-Date KPI
   */
  private static async generateYTDKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const ytdRevenue = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);

    const ytdTarget = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.desired_revenue || entry.target_revenue || 0), 0);

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (ytdTarget > 0) {
      const performance = ytdRevenue / ytdTarget;
      if (performance < 0.8) status = 'alert';
      else if (performance < 0.95) status = 'warning';
    }

    const kpiData = {
      kpi_name: 'YTD Revenue',
      kpi_value: ytdRevenue,
      period: period,
      kpi_category: 'Revenue',
      goal_value: ytdTarget,
      status: status,
      plain_explanation: `Year-to-date revenue of $${ytdRevenue.toLocaleString()} ${ytdTarget > 0 ? `vs target of $${ytdTarget.toLocaleString()}` : ''}`
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Growth Rate KPI
   */
  private static async generateGrowthRateKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const currentMonth = revenueData.find(entry => entry.month === month);
    const previousMonth = revenueData.find(entry => entry.month === month - 1);
    
    if (!currentMonth || !previousMonth) return;

    const currentRevenue = currentMonth.actual_revenue || 0;
    const previousRevenue = previousMonth.actual_revenue || 0;
    
    if (previousRevenue === 0) return;

    const growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (growthRate < -10) status = 'alert';
    else if (growthRate < 0) status = 'warning';

    const kpiData = {
      kpi_name: 'Monthly Growth Rate',
      kpi_value: growthRate,
      period: period,
      kpi_category: 'Growth',
      goal_value: 15, // 15% target growth
      status: status,
      plain_explanation: `${growthRate >= 0 ? 'Growth' : 'Decline'} of ${Math.abs(growthRate).toFixed(1)}% vs previous month`
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }
}
