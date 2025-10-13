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
      
      // Generate all KPIs
      await this.generateMonthlyRevenueKPI(userId, revenueData, year, month);
      await this.generateYTDKPI(userId, revenueData, year, month);
      await this.generateGrowthRateKPI(userId, revenueData, year, month);
      await this.generateProfitMarginKPI(userId, revenueData, year, month);
      await this.generateRevenueGapKPI(userId, revenueData, year, month);
      await this.generateRevenueVelocityKPI(userId, revenueData, year, month);
      await this.generateNetProfitAfterDrawsKPI(userId, revenueData, year, month);
      
      console.log(`Successfully generated KPIs for period: ${period}`);
    } catch (error) {
      console.error(`Error generating KPIs for period ${period}:`, error);
    }
  }

  /**
   * Generate all historical KPIs for a user using backend APIs
   * Optimized to only process current and previous year unless 'all' period is selected
   */
  static async generateAllKPIs(userId: string, includeAllYears: boolean = false): Promise<void> {
    try {
      console.log('Starting optimized KPI generation...');
      
      // Get available years from backend - optimized to reduce resource usage
      const currentYear = new Date().getFullYear();
      const years = includeAllYears 
        ? [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
        : [currentYear - 1, currentYear]; // Only current and previous year by default
      
      console.log(`Processing ${years.length} years: ${years.join(', ')}`);
      
      for (const year of years) {
        console.log(`Processing year ${year}...`);
        const result = await getRevenueEntries(userId, year);
        const revenueData = result.rows || [];
        
        if (revenueData.length > 0) {
          console.log(`Found ${revenueData.length} revenue entries for ${year}`);
          // Generate KPIs for each month with data
          for (let month = 1; month <= 12; month++) {
            const monthData = revenueData.find(entry => entry.month === month);
            if (monthData && monthData.actual_revenue > 0) {
              console.log(`Generating KPIs for ${year}-${month.toString().padStart(2, '0')}`);
              await this.generateMonthlyRevenueKPI(userId, revenueData, year, month);
              await this.generateYTDKPI(userId, revenueData, year, month);
              await this.generateGrowthRateKPI(userId, revenueData, year, month);
              await this.generateProfitMarginKPI(userId, revenueData, year, month);
              await this.generateRevenueGapKPI(userId, revenueData, year, month);
              await this.generateRevenueVelocityKPI(userId, revenueData, year, month);
              await this.generateNetProfitAfterDrawsKPI(userId, revenueData, year, month);
            }
          }
        } else {
          console.log(`No revenue data found for ${year}`);
        }
      }
      
      console.log('Successfully generated optimized historical KPIs');
    } catch (error) {
      console.error('Error generating all KPIs:', error);
    }
  }

  /**
   * Generate historical KPIs for all months with revenue data
   * @param userId - User ID
   * @param includeAllYears - If true, processes all years. If false, only current and previous year
   */
  static async generateHistoricalKPIs(userId: string, includeAllYears: boolean = false): Promise<void> {
    return this.generateAllKPIs(userId, includeAllYears);
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
   * Generate Monthly Revenue KPI with Previous Year + Growth calculation
   */
  private static async generateMonthlyRevenueKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    const actualRevenue = monthData.actual_revenue || 0;
    
    // Calculate smart target: Previous Year Same Month + Desired Growth
    const targetRevenue = await this.calculateSmartMonthlyTarget(userId, year, month, monthData);
    
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
      display_format: 'currency',
      plain_explanation: `Monthly revenue of $${actualRevenue.toLocaleString()} ${targetRevenue > 0 ? `vs smart target of $${targetRevenue.toLocaleString()}` : ''}`,
      action_suggestion: status === 'alert' ? 'Revenue is significantly below target. Focus on immediate revenue generation activities.' : status === 'warning' ? 'Revenue is below target. Review sales pipeline and marketing efforts.' : 'Great job hitting your revenue target! Look for opportunities to exceed it.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Calculate smart monthly target: Previous Year Same Month + Growth
   * Formula: Previous Year's Month Revenue + (Previous Year's Month Revenue * Profit Margin Goal)
   */
  private static async calculateSmartMonthlyTarget(userId: string, year: number, month: number, currentMonthData: any): Promise<number> {
    try {
      // Get previous year's data for the same month
      const previousYear = year - 1;
      const previousYearResult = await getRevenueEntries(userId, previousYear);
      const previousYearData = previousYearResult.rows || [];
      const previousMonthData = previousYearData.find(entry => entry.month === month);
      
      // If no previous year data, fall back to simple target
      if (!previousMonthData || !previousMonthData.actual_revenue) {
        console.log(`No previous year data for ${previousYear}-${month}, using fallback target`);
        return currentMonthData.desired_revenue || currentMonthData.target_revenue || 0;
      }
      
      const previousMonthRevenue = previousMonthData.actual_revenue;
      const desiredGrowthRate = 0.15; // 15% default growth rate
      
      // Smart target = Previous Year Same Month + Growth
      const smartTarget = previousMonthRevenue * (1 + desiredGrowthRate);
      
      console.log(`📊 Smart target calculation for ${year}-${month}:`, {
        previousYearRevenue: previousMonthRevenue,
        growthRate: `${(desiredGrowthRate * 100)}%`,
        smartTarget: Math.round(smartTarget),
        oldTarget: currentMonthData.desired_revenue || currentMonthData.target_revenue || 0
      });
      
      return Math.round(smartTarget);
    } catch (error) {
      console.error('Error calculating smart target:', error);
      // Fall back to existing target if calculation fails
      return currentMonthData.desired_revenue || currentMonthData.target_revenue || 0;
    }
  }

  /**
   * Generate Year-to-Date KPI with smart targets
   */
  private static async generateYTDKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    // Debug: Log YTD calculation details to identify discrepancy
    console.log(`🔍 YTD KPI Calculation Debug for ${year}-${month}:`, {
      totalEntries: revenueData.length,
      entriesUsed: revenueData.filter(entry => entry.month <= month).length,
      monthsIncluded: revenueData.filter(entry => entry.month <= month).map(e => `${e.month}: $${e.actual_revenue}`),
      currentMonth: month
    });
    
    const ytdRevenue = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
    
    console.log(`📊 YTD Revenue calculated: $${ytdRevenue.toLocaleString()}`);

    // Calculate YTD target using smart targets for each month
    let ytdTarget = 0;
    for (let m = 1; m <= month; m++) {
      const monthData = revenueData.find(entry => entry.month === m);
      if (monthData) {
        const smartTarget = await this.calculateSmartMonthlyTarget(userId, year, m, monthData);
        ytdTarget += smartTarget;
      }
    }

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
      display_format: 'currency',
      plain_explanation: `Year-to-date revenue of $${ytdRevenue.toLocaleString()} ${ytdTarget > 0 ? `vs smart target of $${ytdTarget.toLocaleString()}` : ''}`,
      action_suggestion: status === 'alert' ? 'YTD revenue is significantly behind target. Implement aggressive revenue recovery strategies.' : status === 'warning' ? 'YTD revenue is below target. Focus on accelerating sales to catch up.' : 'Excellent YTD performance! You\'re on track to exceed your annual goals.'
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
      display_format: 'percentage',
      plain_explanation: `${growthRate >= 0 ? 'Growth' : 'Decline'} of ${Math.abs(growthRate).toFixed(1)}% vs previous month`,
      action_suggestion: growthRate < 0 ? 'Focus on strategies to reverse the decline and return to growth.' : growthRate < 15 ? 'Good progress! Look for opportunities to accelerate growth further.' : 'Excellent growth rate! Maintain this momentum.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Profit Margin KPI
   */
  private static async generateProfitMarginKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    const actualRevenue = monthData.actual_revenue || 0;
    const profitMargin = monthData.profit_margin || 0;
    
    // Calculate actual profit from revenue and margin
    const actualProfit = actualRevenue * (profitMargin / 100);
    
    // Use 35% as goal profit margin (industry standard), not current margin
    const goalProfitMargin = 35;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (profitMargin < goalProfitMargin * 0.8) status = 'alert';
    else if (profitMargin < goalProfitMargin * 0.95) status = 'warning';

    const kpiData = {
      kpi_name: 'Profit Margin',
      kpi_value: profitMargin,
      period: period,
      kpi_category: 'Profitability',
      goal_value: goalProfitMargin,
      status: status,
      display_format: 'percentage',
      plain_explanation: `Current profit margin of ${profitMargin.toFixed(1)}% ${goalProfitMargin > 0 ? `vs goal of ${goalProfitMargin.toFixed(1)}%` : ''}. Actual profit: $${actualProfit.toLocaleString()}`,
      action_suggestion: profitMargin < goalProfitMargin ? 'Focus on increasing prices or reducing costs to improve profit margins.' : 'Excellent profit margin! Consider reinvesting profits for growth.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Revenue Gap to Target KPI
   */
  private static async generateRevenueGapKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    // Calculate YTD actual revenue
    const ytdRevenue = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);

    // Calculate YTD target using smart targets
    let ytdTarget = 0;
    for (let m = 1; m <= month; m++) {
      const monthData = revenueData.find(entry => entry.month === m);
      if (monthData) {
        const smartTarget = await this.calculateSmartMonthlyTarget(userId, year, m, monthData);
        ytdTarget += smartTarget;
      }
    }

    // Calculate remaining months target
    let remainingTarget = 0;
    for (let m = month + 1; m <= 12; m++) {
      const monthData = revenueData.find(entry => entry.month === m);
      if (monthData) {
        const smartTarget = await this.calculateSmartMonthlyTarget(userId, year, m, monthData);
        remainingTarget += smartTarget;
      }
    }

    const annualTarget = ytdTarget + remainingTarget;
    const revenueGap = annualTarget - ytdRevenue;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (ytdTarget > 0) {
      const performance = ytdRevenue / ytdTarget;
      if (performance < 0.8) status = 'alert';
      else if (performance < 0.95) status = 'warning';
    }

    const kpiData = {
      kpi_name: 'Revenue Gap to Target',
      kpi_value: revenueGap,
      period: period,
      kpi_category: 'Revenue',
      goal_value: 0, // Goal is to have no gap (zero)
      status: status,
      display_format: 'currency',
      plain_explanation: `Need $${revenueGap.toLocaleString()} more revenue to hit annual target of $${annualTarget.toLocaleString()}. YTD: $${ytdRevenue.toLocaleString()}`,
      action_suggestion: revenueGap > 0 ? `Focus on generating $${Math.round(revenueGap / (12 - month)).toLocaleString()} additional monthly revenue to close the gap.` : 'Congratulations! You\'re ahead of your annual revenue target.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Revenue Velocity KPI (Year-over-Year Growth)
   */
  private static async generateRevenueVelocityKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    // Get current month revenue
    const currentMonth = revenueData.find(entry => entry.month === month);
    if (!currentMonth) return;

    const currentRevenue = currentMonth.actual_revenue || 0;

    // Get previous year's same month revenue
    try {
      const previousYear = year - 1;
      const previousYearResult = await getRevenueEntries(userId, previousYear);
      const previousYearData = previousYearResult.rows || [];
      const previousMonthData = previousYearData.find(entry => entry.month === month);

      if (!previousMonthData || !previousMonthData.actual_revenue) {
        console.log(`No previous year data for velocity calculation: ${previousYear}-${month}`);
        return;
      }

      const previousRevenue = previousMonthData.actual_revenue;
      const velocityGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

      let status: 'good' | 'warning' | 'alert' = 'good';
      if (velocityGrowth < -10) status = 'alert';
      else if (velocityGrowth < 0) status = 'warning';

      const kpiData = {
        kpi_name: 'Revenue Velocity',
        kpi_value: velocityGrowth,
        period: period,
        kpi_category: 'Growth',
        goal_value: 15, // 15% year-over-year growth target
        status: status,
        display_format: 'percentage',
        plain_explanation: `${velocityGrowth >= 0 ? 'Growing' : 'Declining'} at ${Math.abs(velocityGrowth).toFixed(1)}% vs same month last year ($${currentRevenue.toLocaleString()} vs $${previousRevenue.toLocaleString()})`,
        action_suggestion: velocityGrowth < 15 ? 'Focus on strategies to accelerate year-over-year growth.' : 'Excellent velocity! You\'re building strong momentum.'
      };

      await KPIRecordsService.upsertKPIRecord(userId, kpiData);
    } catch (error) {
      console.error('Error calculating revenue velocity:', error);
    }
  }

  /**
   * Generate Net Profit After Owner Draws KPI
   */
  private static async generateNetProfitAfterDrawsKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    const actualRevenue = monthData.actual_revenue || 0;
    const profitMargin = monthData.profit_margin || 0;
    const ownerDraws = monthData.owner_draws || 0;
    
    // Calculate net profit and profit after draws
    const netProfit = actualRevenue * (profitMargin / 100);
    const netProfitAfterDraws = netProfit - ownerDraws;
    
    // Goal: Leave 20% of profit in business (80% draws max)
    const goalNetProfitAfterDraws = netProfit * 0.2;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (netProfitAfterDraws < 0) status = 'alert';
    else if (netProfitAfterDraws < goalNetProfitAfterDraws * 0.5) status = 'warning';

    const kpiData = {
      kpi_name: 'Net Profit After Owner Draws',
      kpi_value: netProfitAfterDraws,
      period: period,
      kpi_category: 'Profitability',
      goal_value: goalNetProfitAfterDraws,
      status: status,
      display_format: 'currency',
      plain_explanation: `From $${netProfit.toLocaleString()} profit, drew $${ownerDraws.toLocaleString()}, leaving $${netProfitAfterDraws.toLocaleString()} for business growth`,
      action_suggestion: netProfitAfterDraws < 0 ? 'Reduce owner draws or increase profit margin to avoid depleting business funds.' : netProfitAfterDraws < goalNetProfitAfterDraws ? 'Consider reducing draws to 80% of profit to leave more for growth.' : 'Excellent financial discipline! You\'re leaving adequate funds for business growth.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }
}
