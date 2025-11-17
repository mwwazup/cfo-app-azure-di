import { getRevenueEntries } from '../config/supabaseClient';
import { KPIRecordsService } from './kpiRecordsService';

export class RevenueKPIGenerator {
  private static isGenerating = false;
  
  /**
   * Emergency stop - force release the generation lock
   * Call this from console if generation gets stuck: RevenueKPIGenerator.emergencyStop()
   */
  static emergencyStop(): void {
    console.log('🛑 EMERGENCY STOP - Forcing lock release');
    this.isGenerating = false;
  }
  
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
      await this.generateMonthlyRevenueContributionKPI(userId, revenueData, year, month);
      await this.generateProfitMarginKPI(userId, revenueData, year, month);
      await this.generateRevenueGapKPI(userId, revenueData, year, month);
      await this.generateRevenueVelocityKPI(userId, revenueData, year, month);
      await this.generateNetProfitAfterDrawsKPI(userId, revenueData, year, month);
      await this.generateBreakEvenRevenueKPI(userId, revenueData, year, month);
      
      console.log(`Successfully generated KPIs for period: ${period}`);
    } catch (error) {
      console.error(`Error generating KPIs for period ${period}:`, error);
    }
  }

  /**
   * Generate all historical KPIs for a user using backend APIs
   * Optimized to only process current and previous year unless 'all' period is selected
   * @param userId - User ID
   * @param includeAllYears - If true, processes all years. If false, only current year
   * @param currentMonthOnly - If true, only processes current month (fastest)
   */
  static async generateAllKPIs(userId: string, includeAllYears: boolean = false, currentMonthOnly: boolean = true): Promise<void> {
    // Prevent concurrent executions
    if (this.isGenerating) {
      console.warn('⚠️ KPI generation already in progress. Skipping duplicate request.');
      return;
    }
    
    this.isGenerating = true;
    
    try {
      console.log('🚀 Starting KPI generation...');
      
      // Get available years from backend - optimized to reduce resource usage
      const currentYear = new Date().getFullYear();
      const years = includeAllYears 
        ? [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
        : [currentYear]; // Only current year by default to avoid processing dummy data
      
      console.log(`📅 Processing ${years.length} years: ${years.join(', ')}`);
      
      let totalKPIsGenerated = 0;
      let yearsWithData = 0;
      
      for (const year of years) {
        // Check if generation was stopped
        if (!this.isGenerating) {
          console.log('🛑 Generation stopped by user');
          break;
        }
        
        // Skip years before 2024 - they contain dummy data not in Supabase
        if (year < 2024) {
          console.log(`⏭️ Skipping year ${year} (dummy data, not in Supabase)`);
          continue;
        }
        
        console.log(`📊 Checking year ${year}...`);
        const result = await getRevenueEntries(userId, year);
        const revenueData = result.rows || [];
        
        // Filter out dummy/zero revenue entries
        const realRevenueData = revenueData.filter(entry => 
          entry.actual_revenue && 
          entry.actual_revenue > 0 && 
          entry.actual_revenue !== 0
        );
        
        if (realRevenueData.length > 0) {
          yearsWithData++;
          console.log(`✅ Found ${realRevenueData.length} real revenue entries for ${year}`);
          
          // Only process months that have actual data for the full KPI set
          let monthsWithData = realRevenueData.map(entry => entry.month);
          
          // If currentMonthOnly is true, only process the current month
          if (currentMonthOnly) {
            const currentMonth = new Date().getMonth() + 1;
            monthsWithData = monthsWithData.filter(m => m === currentMonth);
            console.log(`   ⚡ Fast mode: Only processing current month ${currentMonth}`);
          }
          
          console.log(`   Processing months with actual revenue: ${monthsWithData.join(', ')}`);
          
          for (const month of monthsWithData) {
            // Check if generation was stopped
            if (!this.isGenerating) {
              console.log('🛑 Generation stopped by user');
              break;
            }
            
            console.log(`   ⚙️ Generating KPIs for ${year}-${month.toString().padStart(2, '0')}`);
            await this.generateMonthlyRevenueKPI(userId, revenueData, year, month);
            await this.generateYTDKPI(userId, revenueData, year, month);
            await this.generateMonthlyRevenueContributionKPI(userId, revenueData, year, month);
            await this.generateProfitMarginKPI(userId, revenueData, year, month);
            await this.generateRevenueGapKPI(userId, revenueData, year, month);
            await this.generateRevenueVelocityKPI(userId, revenueData, year, month);
            await this.generateNetProfitAfterDrawsKPI(userId, revenueData, year, month);
            await this.generateBreakEvenRevenueKPI(userId, revenueData, year, month);
            totalKPIsGenerated++;
          }

          // Additionally, generate projected Break-Even Revenue for months that have a revenue entry
          // but zero actual revenue, using the historical pattern from prior months.
          let allMonthsWithEntries = revenueData.map(entry => entry.month) as number[];
          // Remove duplicates
          allMonthsWithEntries = Array.from(new Set(allMonthsWithEntries));

          // Months that have entries but were not in the realRevenueData set (i.e., zero actual revenue)
          let zeroRevenueMonths = allMonthsWithEntries.filter(m => !monthsWithData.includes(m));

          if (currentMonthOnly) {
            const currentMonth = new Date().getMonth() + 1;
            zeroRevenueMonths = zeroRevenueMonths.filter(m => m === currentMonth);
          }

          if (zeroRevenueMonths.length > 0) {
            console.log(`   Processing months with zero revenue for projected Break-Even: ${zeroRevenueMonths.join(', ')}`);
          }

          for (const month of zeroRevenueMonths) {
            if (!this.isGenerating) {
              console.log('🛑 Generation stopped by user');
              break;
            }

            console.log(`   ⚙️ Generating projected Break-Even KPI for ${year}-${month.toString().padStart(2, '0')}`);
            await this.generateBreakEvenRevenueKPI(userId, revenueData, year, month);
            totalKPIsGenerated++;
          }
        } else {
          console.log(`⏭️ Skipping ${year} - no real revenue data`);
        }
      }
      
      console.log(`✨ KPI generation complete! Generated ${totalKPIsGenerated} KPI sets across ${yearsWithData} years`);
    } catch (error) {
      console.error('❌ Error generating all KPIs:', error);
    } finally {
      this.isGenerating = false;
      console.log('🔓 KPI generation lock released');
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
        kpi_category: 'revenue planning',
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
   * Get existing custom goal if user has set one
   */
  private static async getExistingCustomGoal(userId: string, kpiName: string, period: string): Promise<number | null> {
    try {
      const { getKpiRecords } = await import('../config/supabaseClient');
      const result = await getKpiRecords(userId, period);
      const existingRecord = result.rows?.find((r: any) => r.kpi_name === kpiName && r.period === period);
      
      // If user has manually edited the goal (different from auto-calculated), use it
      if (existingRecord && existingRecord.goal_value) {
        return existingRecord.goal_value;
      }
      return null;
    } catch (error) {
      console.error('Error fetching existing goal:', error);
      return null;
    }
  }

  /**
   * Generate Monthly Revenue KPI using FIR targets
   */
  private static async generateMonthlyRevenueKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    const actualRevenue = monthData.actual_revenue || 0;
    
    // Always use FIR target (desired_revenue) - custom goals removed
    const targetRevenue = monthData.desired_revenue || monthData.target_revenue || 0;
    console.log('🎯 Monthly Revenue KPI Generation:', { 
      year, 
      month, 
      actualRevenue, 
      targetRevenue, 
      desired_revenue: monthData.desired_revenue,
      target_revenue: monthData.target_revenue,
      fullMonthData: monthData 
    });
    
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
      kpi_category: 'revenue',
      goal_value: targetRevenue,
      status: status,
      display_format: 'currency',
      plain_explanation: `Monthly revenue of $${Math.round(actualRevenue).toLocaleString()} ${targetRevenue > 0 ? `vs FIR target of $${Math.round(targetRevenue).toLocaleString()}` : ''}`,
      action_suggestion: status === 'alert' ? 'Revenue is significantly below FIR target. Focus on immediate revenue generation activities.' : status === 'warning' ? 'Revenue is below FIR target. Review sales pipeline and marketing efforts.' : 'Great job hitting your FIR target! Look for opportunities to exceed it.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * DEPRECATED: This method is no longer used. All KPIs now use FIR targets directly.
   * Kept for reference only - can be removed in future cleanup.
   */
  // private static async calculateSmartMonthlyTarget(userId: string, year: number, month: number, currentMonthData: any): Promise<number> {
  //   return currentMonthData.desired_revenue || currentMonthData.target_revenue || 0;
  // }

  /**
   * Generate Year-to-Date KPI using FIR targets
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

    // Calculate YTD target by summing FIR targets (desired_revenue) for each month
    const ytdTarget = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.desired_revenue || entry.target_revenue || 0), 0);
    
    console.log(`🎯 YTD FIR Target calculated: $${ytdTarget.toLocaleString()}`);

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    // Always use FIR target - custom goals removed
    const finalTarget = ytdTarget;
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (finalTarget > 0) {
      const performance = ytdRevenue / finalTarget;
      if (performance < 0.8) status = 'alert';
      else if (performance < 0.95) status = 'warning';
    }

    const kpiData = {
      kpi_name: 'YTD Revenue',
      kpi_value: ytdRevenue,
      period: period,
      kpi_category: 'revenue',
      goal_value: finalTarget,
      status: status,
      display_format: 'currency',
      plain_explanation: `Year-to-date revenue of $${Math.round(ytdRevenue).toLocaleString()} ${finalTarget > 0 ? `vs FIR target of $${Math.round(finalTarget).toLocaleString()}` : ''}`,
      action_suggestion: status === 'alert' ? 'YTD revenue is significantly behind FIR target. Implement aggressive revenue recovery strategies.' : status === 'warning' ? 'YTD revenue is below FIR target. Focus on accelerating sales to catch up.' : 'Excellent YTD performance! You\'re on track to exceed your annual FIR goals.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Monthly Revenue Contribution KPI
   * Shows what % of annual revenue this month represents vs last year
   */
  private static async generateMonthlyRevenueContributionKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const currentMonth = revenueData.find(entry => entry.month === month);
    if (!currentMonth) return;

    const currentRevenue = currentMonth.actual_revenue || 0;

    // Calculate YTD revenue for current year
    const ytdRevenue = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
    
    if (ytdRevenue === 0) return;

    // Calculate this month's contribution to YTD
    const contributionPercent = (currentRevenue / ytdRevenue) * 100;
    
    // Get last year's data for comparison
    try {
      const previousYear = year - 1;
      const previousYearResult = await getRevenueEntries(userId, previousYear);
      const previousYearData = previousYearResult.rows || [];
      const previousMonthData = previousYearData.find((entry: any) => entry.month === month);

      if (!previousMonthData || !previousMonthData.actual_revenue) {
        console.log(`No previous year data for velocity calculation: ${previousYear}-${month}`);
        return;
      }

      const previousRevenue = previousMonthData.actual_revenue;
      const previousYTD = previousYearData
        .filter((entry: any) => entry.month <= month)
        .reduce((sum: number, entry: any) => sum + (entry.actual_revenue || 0), 0);
      
      const previousContribution = previousYTD > 0 && previousMonthData 
        ? ((previousMonthData.actual_revenue || 0) / previousYTD) * 100 
        : 0;

      const period = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      // Status based on whether contribution is growing or shrinking
      const contributionChange = contributionPercent - previousContribution;
      let status: 'good' | 'warning' | 'alert' = 'good';
      if (Math.abs(contributionChange) < 0.5) status = 'good'; // Stable is good
      else if (contributionChange > 1) status = 'good'; // Growing contribution
      else if (contributionChange < -1) status = 'warning'; // Shrinking contribution
      
      const monthName = new Date(year, month - 1, 15).toLocaleDateString('en-US', { month: 'long' });
      const explanation = previousContribution > 0
        ? `${monthName} contributed ${contributionPercent.toFixed(1)}% of your year-to-date revenue, compared to ${previousContribution.toFixed(1)}% last year. This shows how important this month is to your annual revenue pattern.`
        : `${monthName} contributed ${contributionPercent.toFixed(1)}% of your year-to-date revenue. This shows this month's importance to your annual revenue pattern.`;
      
      const actionSuggestion = contributionChange > 1
        ? `${monthName} is becoming more important to your revenue mix. Consider what's driving this shift - is it seasonal demand, marketing efforts, or business changes?`
        : contributionChange < -1
        ? `${monthName}'s contribution is declining. Review if this is expected seasonality or if there are opportunities to strengthen this period.`
        : `${monthName}'s contribution is stable year-over-year, showing consistent seasonal patterns.`;
      
      const kpiData = {
        kpi_name: 'Monthly Revenue Contribution',
        kpi_value: contributionPercent,
        period: period,
        kpi_category: 'revenue',
        goal_value: previousContribution || contributionPercent, // Use last year as baseline
        status: status,
        display_format: 'percent', // Use 'percent' not 'percentage' to match formatValue function
        plain_explanation: explanation,
        action_suggestion: actionSuggestion
      };

      await KPIRecordsService.upsertKPIRecord(userId, kpiData);
    } catch (error) {
      console.error('Error calculating revenue contribution:', error);
    }
  }

  /**
   * Generate Profit Margin KPI
   */
  private static async generateProfitMarginKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    const profitMargin = monthData.profit_margin || 0;
    
    // Use the user's target profit margin from their revenue entry, or fall back to their FIR target
    // This respects the user's own goals instead of imposing arbitrary "industry standards"
    const goalProfitMargin = monthData.target_profit_margin || profitMargin || 20; // Default to current or 20% if no target set
    
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (profitMargin < goalProfitMargin * 0.8) status = 'alert';
    else if (profitMargin < goalProfitMargin * 0.95) status = 'warning';

    const centsPerDollar = (profitMargin / 100).toFixed(2);
    
    console.log('🔧 UPDATED Profit Margin KPI:', { profitMargin, rounded: Math.round(profitMargin), centsPerDollar });
    
    const kpiData = {
      kpi_name: 'Profit Margin',
      kpi_value: profitMargin,
      period: period,
      kpi_category: 'profitability',
      goal_value: goalProfitMargin,
      status: status,
      display_format: 'percentage',
      plain_explanation: `Current net profit margin of ${Math.round(profitMargin)}%. This means you are keeping $${centsPerDollar} cents per every $1 you make before owner distributions.`,
      action_suggestion: profitMargin < goalProfitMargin ? 'Focus on increasing prices or reducing costs to improve profit margins.' : 'Excellent profit margin! Consider reinvesting profits for growth.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  private static async generateBreakEvenRevenueKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const monthData = revenueData.find(entry => entry.month === month);
    if (!monthData) return;

    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    let actualRevenue = monthData.actual_revenue || 0;
    const currentProfitMargin = monthData.profit_margin;

    let breakEvenRevenue: number | null = null;
    let isProjected = false;
    let monthsUsedForProjection = 0;

    // Case A: This month has real revenue and a valid profit margin
    if (actualRevenue > 0 && currentProfitMargin !== null && currentProfitMargin !== undefined && !isNaN(currentProfitMargin)) {
      breakEvenRevenue = actualRevenue * (1 - (currentProfitMargin / 100));
    } else {
      // Case B: No actual revenue yet - project break-even from the average of the last up to 2 months with real data
      const priorWithData = revenueData
        .filter(entry =>
          entry.month < month &&
          entry.actual_revenue &&
          entry.actual_revenue > 0 &&
          entry.profit_margin !== null &&
          entry.profit_margin !== undefined &&
          !isNaN(entry.profit_margin)
        )
        .sort((a, b) => a.month - b.month);

      if (priorWithData.length === 0) {
        // No historical data to project from
        return;
      }

      const recent = priorWithData.slice(-2);
      monthsUsedForProjection = recent.length;

      const avgRevenue = recent.reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0) / monthsUsedForProjection;
      const avgMargin = recent.reduce((sum, entry) => sum + entry.profit_margin, 0) / monthsUsedForProjection;

      if (!avgRevenue || avgRevenue <= 0 || avgMargin === null || avgMargin === undefined || isNaN(avgMargin)) {
        return;
      }

      breakEvenRevenue = avgRevenue * (1 - (avgMargin / 100));
      isProjected = true;
      // In projected case, actual revenue for this month is effectively 0 so far
      actualRevenue = monthData.actual_revenue || 0;
    }

    if (breakEvenRevenue === null || !isFinite(breakEvenRevenue) || breakEvenRevenue <= 0) {
      return;
    }

    let status: 'good' | 'warning' | 'alert' = 'good';
    let plain_explanation: string;
    let action_suggestion: string;

    if (isProjected) {
      // For projected months, always treat as a warning, not an alert
      status = 'warning';
      const monthLabel = new Date(year, month - 1, 15).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      plain_explanation = `Projected break-even revenue for ${monthLabel} is $${Math.round(breakEvenRevenue).toLocaleString()}. Based on the average of your last ${monthsUsedForProjection} month${monthsUsedForProjection > 1 ? 's' : ''} of actual revenue and net profit margin, this is the revenue you need to cover all business expenses before owner draws.`;
      action_suggestion = 'You have not recorded revenue for this month yet. Use this projected break-even as your minimum target so you at least avoid running at a loss, then aim to exceed it.';
    } else {
      const ratio = breakEvenRevenue > 0 ? actualRevenue / breakEvenRevenue : 0;
      if (ratio < 1) {
        status = 'alert';
      } else if (ratio < 1.2) {
        status = 'warning';
      }
      plain_explanation = `Break-even revenue for this month is $${Math.round(breakEvenRevenue).toLocaleString()}. Based on your current net profit margin of ${Math.round(currentProfitMargin || 0)}%, this is the revenue you needed to cover all business expenses before owner draws.`;
      action_suggestion = status === 'alert'
        ? 'You are currently below break-even. Focus on increasing revenue or reducing costs immediately to avoid operating at a loss.'
        : status === 'warning'
        ? 'You are just at or slightly above break-even. Strengthen margins or revenue to create more safety and buffer.'
        : 'You are comfortably above break-even this month. Look at what is working and how to make this level of performance repeatable.';
    }

    const kpiData = {
      kpi_name: 'Break-Even Revenue',
      kpi_value: breakEvenRevenue,
      period: period,
      kpi_category: 'profitability',
      goal_value: breakEvenRevenue,
      status: status,
      display_format: 'currency',
      plain_explanation,
      action_suggestion
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }

  /**
   * Generate Revenue Gap to FIR Target KPI
   */
  private static async generateRevenueGapKPI(userId: string, revenueData: any[], year: number, month: number): Promise<void> {
    const period = `${year}-${month.toString().padStart(2, '0')}-01`;
    
    // Calculate YTD actual revenue
    const ytdRevenue = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);

    // Calculate YTD FIR target by summing desired_revenue for months 1-current
    const ytdTarget = revenueData
      .filter(entry => entry.month <= month)
      .reduce((sum, entry) => sum + (entry.desired_revenue || entry.target_revenue || 0), 0);

    // Calculate remaining months FIR target
    const remainingTarget = revenueData
      .filter(entry => entry.month > month)
      .reduce((sum, entry) => sum + (entry.desired_revenue || entry.target_revenue || 0), 0);

    const annualTarget = ytdTarget + remainingTarget;
    const revenueGap = annualTarget - ytdRevenue;
    const isAheadOfTarget = revenueGap < 0;
    const absGap = Math.abs(revenueGap);
    
    // Status based on YTD performance
    let status: 'good' | 'warning' | 'alert' = 'good';
    if (ytdTarget > 0) {
      const performance = ytdRevenue / ytdTarget;
      if (performance < 0.8) status = 'alert';
      else if (performance < 0.95) status = 'warning';
      else if (performance >= 1.0) status = 'good'; // Ahead of target
    }

    // Create clear explanation based on whether ahead or behind
    const explanation = isAheadOfTarget
      ? `Great news! You're ahead of your annual FIR target by $${Math.round(absGap).toLocaleString()}. You've earned $${Math.round(ytdRevenue).toLocaleString()} YTD against a FIR target of $${Math.round(annualTarget).toLocaleString()} for the full year. Keep up the momentum!`
      : `You need $${Math.round(absGap).toLocaleString()} more revenue to hit your annual target of $${Math.round(annualTarget).toLocaleString()}. You've earned $${Math.round(ytdRevenue).toLocaleString()} YTD. With ${12 - month} months remaining, that's about $${Math.round(revenueGap / Math.max(12 - month, 1)).toLocaleString()} per month needed.`;
    
    const actionSuggestion = isAheadOfTarget
      ? `Outstanding! You're exceeding your annual target. Consider: (1) Setting a stretch goal for the remainder of the year, (2) Investing surplus in growth initiatives, or (3) Increasing owner distributions while maintaining business health.`
      : revenueGap > 0 && (12 - month) > 0
      ? `To close the $${Math.round(absGap).toLocaleString()} gap, focus on generating approximately $${Math.round(revenueGap / (12 - month)).toLocaleString()} additional monthly revenue. Consider: (1) Accelerating sales efforts, (2) Launching promotions, (3) Upselling existing customers, or (4) Introducing new revenue streams.`
      : `You're in the final stretch! Focus on maximizing revenue in the remaining time to hit or exceed your annual target.`;

    const kpiData = {
      kpi_name: 'Revenue Gap to Target',
      kpi_value: absGap, // Always store as positive number for display
      period: period,
      kpi_category: 'revenue',
      goal_value: 0, // Goal is to have no gap (zero)
      status: status,
      display_format: 'currency',
      plain_explanation: explanation,
      action_suggestion: actionSuggestion
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
      
      console.log('🔧 UPDATED Revenue Velocity KPI:', { velocityGrowth, rounded: Math.round(Math.abs(velocityGrowth)) });

      let status: 'good' | 'warning' | 'alert' = 'good';
      if (velocityGrowth < -10) status = 'alert';
      else if (velocityGrowth < 0) status = 'warning';

      // Create detailed explanation with context
      const dollarIncrease = currentRevenue - previousRevenue;
      const isGrowing = velocityGrowth >= 0;
      const roundedVelocity = Math.round(Math.abs(velocityGrowth));
      
      const explanation = isGrowing
        ? `Your revenue is accelerating! This month you earned $${currentRevenue.toLocaleString()}, which is ${roundedVelocity}% more than the $${previousRevenue.toLocaleString()} you made in the same month last year. That's an increase of $${Math.abs(dollarIncrease).toLocaleString()}. This "velocity" shows your business is growing year-over-year, which is critical for long-term success.`
        : `Your revenue is slowing down. This month you earned $${currentRevenue.toLocaleString()}, which is ${roundedVelocity}% less than the $${previousRevenue.toLocaleString()} you made in the same month last year. That's a decrease of $${Math.abs(dollarIncrease).toLocaleString()}. This negative "velocity" means your business is shrinking year-over-year, which requires immediate attention.`;
      
      const actionSuggestion = velocityGrowth >= 15
        ? `Outstanding ${roundedVelocity}% growth! You're exceeding the 15% target. Keep this momentum by doubling down on what's working - whether that's marketing, new products, or customer retention.`
        : velocityGrowth >= 0
        ? `You're growing at ${roundedVelocity}%, but below the 15% target. To accelerate: (1) Analyze what drove growth this year, (2) Increase marketing spend, (3) Launch new offerings, or (4) raise prices strategically.`
        : `Declining ${roundedVelocity}% year-over-year is a red flag. Immediate actions: (1) Identify why customers left, (2) Review pricing strategy, (3) Audit marketing effectiveness, (4) Consider new revenue streams. This trend must reverse.`;

      const kpiData = {
        kpi_name: 'Revenue Velocity',
        kpi_value: velocityGrowth,
        period: period,
        kpi_category: 'growth',
        goal_value: 15, // 15% year-over-year growth target
        status: status,
        display_format: 'percentage',
        plain_explanation: explanation,
        action_suggestion: actionSuggestion
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
      kpi_category: 'profitability',
      goal_value: goalNetProfitAfterDraws,
      status: status,
      display_format: 'currency',
      plain_explanation: `From $${Math.round(netProfit).toLocaleString()} profit, drew $${Math.round(ownerDraws).toLocaleString()}, leaving $${Math.round(netProfitAfterDraws).toLocaleString()} for business growth`,
      action_suggestion: netProfitAfterDraws < 0 ? 'Reduce owner draws or increase profit margin to avoid depleting business funds.' : netProfitAfterDraws < goalNetProfitAfterDraws ? 'Consider reducing draws to 80% of profit to leave more for growth.' : 'Excellent financial discipline! You\'re leaving adequate funds for business growth.'
    };

    await KPIRecordsService.upsertKPIRecord(userId, kpiData);
  }
}
