import { supabase } from '../config/supabaseClient';
import { KPIRecordsService } from './kpiRecordsService';

// Interface for revenue data
interface RevenueEntry {
  month: number;
  actual_revenue: number;
  desired_revenue: number;
  profit_margin?: number;
  owner_draws?: number;
}

interface YearData {
  data: { revenue: number }[];
}

export class RevenueKPIGenerator {
  /**
   * Generate KPIs for a specific period
   */
  static async generateKPIsForPeriod(userId: string, period: string): Promise<void> {
    try {
      console.log(`Generating KPIs for period: ${period}`);
      
      // Get revenue data for the specified period
      const revenueData = await supabase
        .from('revenue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('year', period === 'current' ? new Date().getFullYear() : parseInt(period.split('-')[0]))
        .order('month');

      if (revenueData.error) {
        console.error('Error fetching revenue data:', revenueData.error);
        return;
      }

      if (!revenueData.data || revenueData.data.length === 0) {
        console.log('No revenue data found for period:', period);
        return;
      }

      const currentMonth = period === 'current' ? new Date().getMonth() + 1 : parseInt(period.split('-')[1]);
      const currentYear = period === 'current' ? new Date().getFullYear() : parseInt(period.split('-')[0]);
      const periodString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;

      // Generate KPIs for the specified period
      await this.generateMonthlyRevenueKPI(userId, revenueData.data, periodString, currentMonth);
      await this.generateYTDPerformanceKPI(userId, revenueData.data, periodString, currentMonth);
      await this.generateTargetGapKPI(userId, revenueData.data, periodString);
      await this.generateRevenueGrowthKPI(userId, revenueData.data, periodString);
      await this.generateProfitMarginKPI(userId, revenueData.data, periodString);
      
      // Revenue Velocity KPI is only generated for historical comparisons, not current month
      
      console.log(`Successfully generated KPIs for period: ${period}`);
    } catch (error) {
      console.error(`Error generating KPIs for period ${period}:`, error);
    }
  }

  /**
   * Generate historical KPIs for all months with revenue data
   */
  static async generateHistoricalKPIs(userId: string): Promise<void> {
    try {
      console.log('Starting comprehensive historical KPI generation...');
      
      // Get ALL periods with actual revenue data (2022-2025)
      const { data: periods, error } = await supabase
        .from('revenue_entries')
        .select('year, month, actual_revenue')
        .eq('user_id', userId)
        .gte('year', 2022) // Include all years from 2022 onwards
        .gt('actual_revenue', 1000) // Exclude months with very low revenue
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) {
        console.error('Error fetching historical revenue periods:', error);
        return;
      }

      if (!periods || periods.length === 0) {
        console.log('No valid historical revenue data found for KPI generation');
        return;
      }

      // Group periods by year for better logging
      const periodsByYear = periods.reduce((acc, p) => {
        if (!acc[p.year]) acc[p.year] = [];
        acc[p.year].push(p);
        return acc;
      }, {} as Record<number, typeof periods>);

      console.log(`Found ${periods.length} valid periods across ${Object.keys(periodsByYear).length} years:`);
      Object.entries(periodsByYear).forEach(([year, yearPeriods]) => {
        console.log(`   ${year}: ${yearPeriods.length} months (Total: $${yearPeriods.reduce((sum, p) => sum + parseFloat(p.actual_revenue), 0).toLocaleString()})`);
      });

      let successCount = 0;
      let errorCount = 0;

      // Generate KPIs for each valid period
      for (const period of periods) {
        const periodString = `${period.year}-${period.month.toString().padStart(2, '0')}-01`;
        console.log(`\nProcessing period: ${periodString} (Revenue: $${period.actual_revenue})`);
        
        try {
          // Fetch all revenue data for the specific year for calculations
          const { data: revenueData, error: revenueError } = await supabase
            .from('revenue_entries')
            .select('*')
            .eq('user_id', userId)
            .eq('year', period.year)
            .order('month', { ascending: true });

          if (revenueError) {
            console.error(`Error fetching 2025 revenue data for ${periodString}:`, revenueError);
            errorCount++;
            continue;
          }

          if (!revenueData || revenueData.length === 0) {
            console.error(`No revenue data found for ${periodString}`);
            errorCount++;
            continue;
          }

          // Generate all KPIs for this period with error handling for each
          const kpiGenerators = [
            { name: 'Monthly Revenue', fn: () => this.generateMonthlyRevenueKPI(userId, revenueData, periodString, period.month) },
            { name: 'YTD Performance', fn: () => this.generateYTDPerformanceKPI(userId, revenueData, periodString, period.month) },
            { name: 'Revenue Growth', fn: () => this.generateRevenueGrowthKPI(userId, revenueData, periodString) },
            { name: 'Target Gap', fn: () => this.generateTargetGapKPI(userId, revenueData, periodString) },
            { name: 'Profit Margin', fn: () => this.generateProfitMarginKPI(userId, revenueData, periodString) },
            { name: 'Revenue Velocity', fn: () => this.generateRevenueVelocityKPI(userId, revenueData, periodString) }
          ];

          let periodKpiCount = 0;
          for (const generator of kpiGenerators) {
            try {
              await generator.fn();
              periodKpiCount++;
              console.log(`   ${generator.name} KPI generated`);
            } catch (kpiError) {
              console.error(`   Failed to generate ${generator.name} KPI:`, kpiError);
            }
          }

          if (periodKpiCount > 0) {
            console.log(`Successfully generated ${periodKpiCount}/6 KPIs for ${periodString}`);
            successCount++;
          } else {
            console.error(`Failed to generate any KPIs for ${periodString}`);
            errorCount++;
          }

        } catch (periodError) {
          console.error(`Error processing period ${periodString}:`, periodError);
          errorCount++;
        }
      }
      
      console.log(`\n Historical KPI generation completed:`);
      console.log(`   Successful periods: ${successCount}`);
      console.log(`   Failed periods: ${errorCount}`);
      console.log(`   Total periods processed: ${periods.length}`);
      
      // Verify KPIs were actually saved
      const { data: savedKpis, error: countError } = await supabase
        .from('kpi_records')
        .select('period, kpi_name')
        .eq('user_id', userId)
        .order('period');
        
      if (!countError && savedKpis) {
        const uniquePeriods = new Set(savedKpis.map(k => k.period));
        console.log(`Verified: ${savedKpis.length} KPI records saved across ${uniquePeriods.size} periods`);
      }
      
    } catch (error) {
      console.error('Fatal error in historical KPI generation:', error);
    }
  }
  /**
   * Calculate monthly FIR targets using the same logic as the graph
   * This ensures KPI goals match the graph's FIR targets exactly
   */
  private static calculateMonthlyFIRTargets(
    targetRevenue: number, 
    previousYearData?: YearData, 
    currentYearData?: YearData
  ): number[] {
    if (previousYearData && previousYearData.data) {
      // Use previous year's pattern as the base
      const previousYearRevenue = previousYearData.data.map(item => item.revenue);
      const totalPreviousRevenue = previousYearRevenue.reduce((sum, revenue) => sum + revenue, 0);

      if (totalPreviousRevenue > 0) {
        // Calculate each month's percentage of total previous year revenue
        const monthlyPercentages = previousYearRevenue.map(revenue => revenue / totalPreviousRevenue);
        
        // Apply these percentages to the target revenue
        return monthlyPercentages.map(percentage => targetRevenue * percentage);
      }
    }

    // No previous year data OR previous year has no revenue
    // Create an intelligent FIR curve based on current year data + growth trajectory
    if (currentYearData && currentYearData.data) {
      const currentRevenue = currentYearData.data.map(item => item.revenue);
      const totalCurrentRevenue = currentRevenue.reduce((sum, revenue) => sum + revenue, 0);
      
      if (totalCurrentRevenue > 0) {
        // Calculate the gap we need to fill
        const revenueGap = targetRevenue - totalCurrentRevenue;
        
        // Create a growth curve that builds on current year's pattern
        const currentPercentages = currentRevenue.map(revenue => 
          totalCurrentRevenue > 0 ? revenue / totalCurrentRevenue : 1/12
        );
        
        // Apply current pattern + proportional growth to reach target
        return currentPercentages.map((percentage, index) => {
          const baseAmount = currentRevenue[index];
          const growthAmount = revenueGap * percentage;
          return Math.max(baseAmount + growthAmount, targetRevenue / 12 * 0.5); // Minimum floor
        });
      }
    }

    // Fallback: Create a realistic business growth curve (not flat)
    // Most businesses have seasonal patterns - higher in middle/end of year
    const seasonalMultipliers = [
      0.75, 0.80, 0.85, 0.90, 0.95, 1.00,  // Jan-Jun: Building up
      1.05, 1.10, 1.15, 1.20, 1.15, 1.10   // Jul-Dec: Peak and taper
    ];
    
    const baseMonthly = targetRevenue / 12;
    return seasonalMultipliers.map(multiplier => baseMonthly * multiplier);
  }

  /**
   * Get the FIR target for a specific month using the same calculation as the graph
   */
  private static async getFIRTargetForMonth(
    userId: string, 
    year: number, 
    month: number
  ): Promise<number> {
    const monthlyTargets = await this.getMonthlyFIRTargets(userId, year);
    return monthlyTargets[month - 1] || 0;
  }

  /**
   * Get all monthly FIR targets for a year using the same calculation as the graph
   */
  private static async getMonthlyFIRTargets(
    userId: string, 
    year: number, 
    annualTarget?: number
  ): Promise<number[]> {
    // Get annual target if not provided
    if (!annualTarget) {
      const { data: yearData } = await supabase
        .from('revenue_entries')
        .select('desired_revenue')
        .eq('user_id', userId)
        .eq('year', year);
      
      annualTarget = yearData?.reduce((sum, entry) => sum + (entry.desired_revenue || 0), 0) || 0;
    }
    
    // Get previous year data for pattern analysis
    const { data: prevYearEntries } = await supabase
      .from('revenue_entries')
      .select('actual_revenue')
      .eq('user_id', userId)
      .eq('year', year - 1)
      .order('month');
    
    const previousYearData: YearData | undefined = prevYearEntries && prevYearEntries.length > 0 
      ? { data: prevYearEntries.map(entry => ({ revenue: entry.actual_revenue || 0 })) }
      : undefined;
    
    // Get current year data for growth trajectory analysis
    const { data: currentYearEntries } = await supabase
      .from('revenue_entries')
      .select('actual_revenue')
      .eq('user_id', userId)
      .eq('year', year)
      .order('month');
    
    const currentYearData: YearData | undefined = currentYearEntries && currentYearEntries.length > 0
      ? { data: currentYearEntries.map(entry => ({ revenue: entry.actual_revenue || 0 })) }
      : undefined;
    
    // Calculate monthly FIR targets using the same logic as the graph
    return this.calculateMonthlyFIRTargets(annualTarget, previousYearData, currentYearData);
  }
  /**
   * Generate comprehensive KPI records from actual revenue data
   */
  static async generateAllKPIs(userId: string): Promise<void> {
    try {
      console.log('Generating KPIs from actual revenue data for user:', userId);
      
      // Get current date info
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentPeriod = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      
      // Fetch actual revenue data for current year
      const { data: revenueData, error } = await supabase
        .from('revenue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .order('month', { ascending: true });

      if (error) {
        console.error('Error fetching revenue data:', error);
        return;
      }

      if (!revenueData || revenueData.length === 0) {
        console.log('No revenue data found for user');
        return;
      }

      // Calculate KPIs from actual data
      await this.generateMonthlyRevenueKPI(userId, revenueData, currentPeriod, currentMonth);
      await this.generateYTDPerformanceKPI(userId, revenueData, currentPeriod, currentMonth);
      await this.generateRevenueGrowthKPI(userId, revenueData, currentPeriod);
      await this.generateTargetGapKPI(userId, revenueData, currentPeriod);
      await this.generateProfitMarginKPI(userId, revenueData, currentPeriod);
      
      console.log('KPI generation completed successfully');
    } catch (error) {
      console.error('Error generating KPIs:', error);
    }
  }

  /**
   * Generate Monthly Revenue KPI from actual data
   */
  private static async generateMonthlyRevenueKPI(
    userId: string, 
    revenueData: RevenueEntry[], 
    period: string, 
    currentMonth: number
  ) {
    const currentMonthData = revenueData.find(entry => entry.month === currentMonth);
    const actualRevenue = currentMonthData?.actual_revenue || 0;
  
    // Calculate trend vs last month
    const lastMonthData = revenueData.find(entry => entry.month === currentMonth - 1);
    const lastMonthRevenue = lastMonthData?.actual_revenue || 0;
    const trend = lastMonthRevenue > 0 ? (actualRevenue - lastMonthRevenue) / lastMonthRevenue : 0;

    // Check if there's an existing KPI record with a manually set goal
    const existingKPI = await KPIRecordsService.getKPIRecords(userId, {
      period: period,
      kpi_category: 'revenue'
    });
  
    const existingMonthlyRevenue = existingKPI.find(kpi => kpi.kpi_name === 'Monthly Revenue');
    const preservedGoal = existingMonthlyRevenue?.goal_value;
  
    // Get the FIR target for this month using the same calculation as the graph
    const currentYear = new Date(period).getFullYear();
    const firTarget = await this.getFIRTargetForMonth(userId, currentYear, currentMonth);
  
    // Use existing goal if it exists, otherwise use FIR target, otherwise set a reasonable default
    const goalValue = preservedGoal !== null ? preservedGoal : 
                     (firTarget > 0 ? firTarget : actualRevenue * 1.1); // 10% growth as default

    await KPIRecordsService.upsertKPIRecord(userId, {
      kpi_name: 'Monthly Revenue',
      kpi_value: actualRevenue,
      goal_value: goalValue,
      trend_vs_last_month: trend !== 0 ? trend : undefined,
      status: KPIRecordsService.calculateKPIStatus(actualRevenue, goalValue || null),
      period,
      plain_explanation: `Current month revenue of $${actualRevenue.toLocaleString()}${goalValue ? ` vs goal of $${goalValue.toLocaleString()}` : ''}`,
      action_suggestion: actualRevenue < (goalValue || 0) 
        ? 'Focus on closing pending deals and increasing sales activities' 
        : 'Great job meeting revenue targets! Consider strategies for sustained growth.',
      kpi_category: 'revenue',
      display_format: 'currency'
    });
  }

  /**
   * Generate YTD Revenue KPI using FIR calculation
   */
  private static async generateYTDPerformanceKPI(
    userId: string, 
    revenueData: RevenueEntry[], 
    period: string, 
    currentMonth: number
  ) {
    // Calculate YTD actual revenue
    const ytdActual = revenueData
      .filter(entry => entry.month <= currentMonth)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
  
    // Get annual FIR target and calculate YTD FIR target using same logic as graph
    const currentYear = new Date(period).getFullYear();
    const { data: yearData } = await supabase
      .from('revenue_entries')
      .select('desired_revenue')
      .eq('user_id', userId)
      .eq('year', currentYear);
    
    const annualFIRTarget = yearData?.reduce((sum, entry) => sum + (entry.desired_revenue || 0), 0) || 0;
    
    // Calculate YTD FIR target using the same FIR calculation as the graph
    const monthlyFIRTargets = await this.getMonthlyFIRTargets(userId, currentYear, annualFIRTarget);
    const ytdFIRTarget = monthlyFIRTargets
      .slice(0, currentMonth) // Get targets for months 1 through currentMonth
      .reduce((sum, target) => sum + target, 0);

    // Check if there's an existing KPI record with a manually set goal
    const existingKPI = await KPIRecordsService.getKPIRecords(userId, {
      period: period,
      kpi_category: 'revenue'
    });
  
    const existingYTDRevenue = existingKPI.find(kpi => kpi.kpi_name === 'YTD Revenue');
    const preservedGoal = existingYTDRevenue?.goal_value;
  
    // Use preserved goal if exists, otherwise use calculated YTD FIR target
    const goalValue = preservedGoal !== null && preservedGoal !== undefined ? preservedGoal : ytdFIRTarget;
    
    const explanation = `Year-to-date revenue of $${ytdActual.toLocaleString()} vs FIR target of $${goalValue.toLocaleString()}`;
    const actionSuggestion = ytdActual < goalValue 
      ? 'YTD revenue below FIR target. Focus on accelerating sales activities and closing pending deals.' 
      : 'Excellent! YTD revenue exceeds FIR target. Consider setting stretch targets.';

    await KPIRecordsService.upsertKPIRecord(userId, {
      kpi_name: 'YTD Revenue',
      kpi_value: ytdActual,
      goal_value: goalValue,
      trend_vs_last_month: undefined,
      status: KPIRecordsService.calculateKPIStatus(ytdActual, goalValue),
      period,
      plain_explanation: explanation,
      action_suggestion: actionSuggestion,
      kpi_category: 'revenue',
      display_format: 'currency'
    });
  }

  /**
   * Generate Revenue Growth Rate KPI
   */
  private static async generateRevenueGrowthKPI(
    userId: string, 
    revenueData: any[], 
    period: string
  ) {
    // Get previous year data for comparison
    const currentYear = new Date(period).getFullYear();
    const { data: prevYearData } = await supabase
      .from('revenue_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('year', currentYear - 1)
      .order('month', { ascending: true });

    if (prevYearData && prevYearData.length > 0) {
      const currentYearTotal = revenueData.reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
      const prevYearTotal = prevYearData.reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
      
      const growthRate = prevYearTotal > 0 ? (currentYearTotal - prevYearTotal) / prevYearTotal : 0;

      await KPIRecordsService.upsertKPIRecord(userId, {
        kpi_name: 'Revenue Growth Rate',
        kpi_value: growthRate,
        goal_value: 0.15, // 15% growth target
        trend_vs_last_month: undefined,
        status: KPIRecordsService.calculateKPIStatus(growthRate, 0.15),
        period,
        plain_explanation: `Year-over-year revenue growth of ${(growthRate * 100).toFixed(1)}% ($${currentYearTotal.toLocaleString()} vs $${prevYearTotal.toLocaleString()} last year)`,
        action_suggestion: growthRate < 0.1 
          ? 'Growth below 10%. Consider new customer acquisition strategies and market expansion.' 
          : 'Solid growth trajectory! Focus on sustainable scaling strategies.',
        kpi_category: 'growth',
        display_format: 'percentage'
      });
    }
  }

  /**
   * Generate Revenue Gap to Target KPI using YTD comparison (not annual)
   */
  private static async generateTargetGapKPI(
    userId: string, 
    revenueData: RevenueEntry[], 
    period: string
  ) {
    // Calculate YTD actual revenue
    const currentMonth = new Date(period).getMonth() + 1;
    const ytdActual = revenueData
      .filter(entry => entry.month <= currentMonth)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);

    // Get annual FIR target and calculate YTD target (proportional)
    const currentYear = new Date(period).getFullYear();
    const { data: yearData } = await supabase
      .from('revenue_entries')
      .select('desired_revenue')
      .eq('user_id', userId)
      .eq('year', currentYear);
    
    const annualFIRTarget = yearData?.reduce((sum, entry) => sum + (entry.desired_revenue || 0), 0) || 0;
    
    // CORRECT MATH: YTD Target = Annual Target * (months elapsed / 12)
    const ytdTarget = annualFIRTarget * (currentMonth / 12);
    
    // Gap = YTD Actual - YTD Target (positive means ahead, negative means behind)
    const gap = ytdActual - ytdTarget;

    await KPIRecordsService.upsertKPIRecord(userId, {
      kpi_name: 'Revenue Gap to Target',
      kpi_value: gap,
      goal_value: 0, // Goal is zero gap (meaning we're exactly on track)
      trend_vs_last_month: undefined,
      status: gap >= 0 ? 'good' : gap >= -ytdTarget * 0.1 ? 'warning' : 'alert',
      period,
      plain_explanation: gap >= 0 
        ? `You're ahead of target by $${gap.toLocaleString()}! YTD actual: $${ytdActual.toLocaleString()} vs YTD target: $${ytdTarget.toLocaleString()}` 
        : `You're behind YTD target by $${Math.abs(gap).toLocaleString()}. YTD actual: $${ytdActual.toLocaleString()} vs YTD target: $${ytdTarget.toLocaleString()}`,
      action_suggestion: gap >= 0 
        ? `Excellent! You're ahead of your YTD target. Keep up the momentum and consider stretch goals.` 
        : `You need $${Math.abs(gap).toLocaleString()} more revenue to get back on track for your annual FIR goal.`,
      kpi_category: 'performance',
      display_format: 'currency'
    });
  }

  /**
   * Generate Profit Margin KPI
   */
  private static async generateProfitMarginKPI(
    userId: string, 
    revenueData: any[], 
    period: string
  ) {
    // Get average profit margin from revenue data
    const entriesWithMargin = revenueData.filter(entry => entry.profit_margin && entry.profit_margin > 0);
    const avgProfitMargin = entriesWithMargin.length > 0 
      ? entriesWithMargin.reduce((sum, entry) => sum + entry.profit_margin, 0) / entriesWithMargin.length / 100
      : 0;

    await KPIRecordsService.upsertKPIRecord(userId, {
      kpi_name: 'Profit Margin',
      kpi_value: avgProfitMargin,
      goal_value: 0.35, // 35% target margin
      trend_vs_last_month: undefined,
      status: KPIRecordsService.calculateKPIStatus(avgProfitMargin, 0.35),
      period,
      plain_explanation: `Average profit margin of ${(avgProfitMargin * 100).toFixed(1)}% across revenue entries`,
      action_suggestion: avgProfitMargin < 0.3 
        ? 'Profit margin below 30%. Review pricing strategy and cost optimization opportunities.' 
        : 'Healthy profit margins! Focus on maintaining efficiency while scaling.',
      kpi_category: 'profitability',
      display_format: 'percentage'
    });
  }

  /**
   * Generate Revenue Velocity KPI (only for historical comparison views)
   */
  private static async generateRevenueVelocityKPI(
    userId: string, 
    revenueData: RevenueEntry[], 
    period: string
  ) {
    console.log(`DEBUG: Starting Revenue Velocity KPI generation for period: ${period}`);
    console.log(`DEBUG: Revenue data length: ${revenueData.length}`);
    const currentMonth = new Date(period).getMonth() + 1;
    const currentYear = new Date(period).getFullYear();
    console.log(`DEBUG: Current month: ${currentMonth}, Current year: ${currentYear}`);
    
    // Calculate YTD actual revenue
    const ytdActual = revenueData
      .filter(entry => entry.month <= currentMonth)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
    console.log(`DEBUG: This year YTD actual: $${ytdActual}`);
    
    // Get last year's data for the same time period
    const { data: lastYearData } = await supabase
      .from('revenue_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('year', currentYear - 1)
      .order('month');

    if (!lastYearData || lastYearData.length === 0) {
      console.log(`Revenue Velocity KPI: No historical data found for ${currentYear - 1}. Generating with current year data only.`);
      
      // Generate Revenue Velocity KPI with current year data only (no comparison)
      await KPIRecordsService.upsertKPIRecord(userId, {
        kpi_name: 'Revenue Velocity',
        kpi_value: 0, // No comparison possible without historical data
        goal_value: 0,
        trend_vs_last_month: undefined,
        status: 'warning',
        period,
        plain_explanation: `Revenue Velocity: You've generated $${ytdActual.toLocaleString()} so far this year. No historical data available for year-over-year comparison.`,
        action_suggestion: 'Continue building your revenue history. Once you have data from previous years, you\'ll be able to see velocity comparisons.',
        kpi_category: 'performance',
        display_format: 'percentage'
      });
      return;
    }

    // Calculate last year's YTD actual revenue
    const lastYearYtdActual = lastYearData
      .filter(entry => entry.month <= currentMonth)
      .reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
    console.log(`DEBUG: Last year YTD actual: $${lastYearYtdActual}`);
    
    // For historical years, we only have actual revenue data (no FIR targets)
    // So we'll compare actual revenue amounts and calculate a velocity based on revenue growth
    // Note: ytdActual was already calculated above, so we'll use that
    
    // Calculate revenue velocity as year-over-year growth rate
    const revenueGrowthRate = lastYearYtdActual > 0 ? ((ytdActual - lastYearYtdActual) / lastYearYtdActual) * 100 : 0;
    console.log(`DEBUG: Revenue growth rate: ${revenueGrowthRate.toFixed(1)}%`);
    
    // Calculate time to revenue milestones (e.g., $250K)
    const milestone = 250000; // $250K milestone
    const thisYearTimeToMilestone = this.calculateTimeToMilestone(revenueData, milestone, currentMonth);
    const lastYearTimeToMilestone = this.calculateTimeToMilestone(lastYearData, milestone, currentMonth);
    
    // Use revenue growth rate as the velocity difference
    const velocityDifference = revenueGrowthRate;
    
    // Generate dynamic insights based on performance
    let actionSuggestion = '';
    let status: 'good' | 'warning' | 'alert' = 'warning';
    
    if (velocityDifference > 5) {
      // Faster than last year
      status = 'good';
      actionSuggestion = `Outstanding velocity! You're outpacing last year. Consider scaling the strategies that are driving this acceleration.`;
    } else if (velocityDifference >= -5) {
      // On pace with last year
      status = 'warning';
      actionSuggestion = `You're maintaining pace with last year. Look for opportunities to accelerate growth and break through to the next level.`;
    } else {
      // Slower than last year
      status = 'alert';
      actionSuggestion = `Let's do a deep dive into your revenue to accelerate revenue generation. Consider analyzing what changed from last year's approach.`;
    }

    console.log(`DEBUG: About to save Revenue Velocity KPI with data:`, {
      kpi_name: 'Revenue Velocity',
      kpi_value: revenueGrowthRate,
      goal_value: 0, // Baseline for growth comparison
      status,
      period
    });
    
    try {
      await KPIRecordsService.upsertKPIRecord(userId, {
        kpi_name: 'Revenue Velocity',
        kpi_value: revenueGrowthRate,
        goal_value: 0, // Baseline for growth comparison
        trend_vs_last_month: undefined,
        status,
        period,
        plain_explanation: `Revenue Velocity: You've generated $${ytdActual.toLocaleString()} so far this year vs $${lastYearYtdActual.toLocaleString()} last year (${revenueGrowthRate > 0 ? '+' : ''}${revenueGrowthRate.toFixed(1)}% growth).${thisYearTimeToMilestone && lastYearTimeToMilestone ? ` Time to $${(milestone/1000).toFixed(0)}K: ${thisYearTimeToMilestone.toFixed(1)} months this year vs ${lastYearTimeToMilestone.toFixed(1)} months last year.` : ''}`,
        action_suggestion: actionSuggestion,
        kpi_category: 'performance',
        display_format: 'percentage'
      });
      
      console.log(`DEBUG: Revenue Velocity KPI saved successfully: $${ytdActual.toLocaleString()} vs $${lastYearYtdActual.toLocaleString()} (${revenueGrowthRate > 0 ? '+' : ''}${revenueGrowthRate.toFixed(1)}% growth)`);      
    } catch (saveError) {
      console.error(`DEBUG: Failed to save Revenue Velocity KPI:`, saveError);
      throw saveError;
    }
  }

  /**
   * Calculate time to reach a revenue milestone
   */
  private static calculateTimeToMilestone(
    revenueData: RevenueEntry[], 
    milestone: number, 
    currentMonth: number
  ): number {
    let cumulativeRevenue = 0;
    
    for (let month = 1; month <= Math.min(currentMonth, 12); month++) {
      const monthData = revenueData.find(entry => entry.month === month);
      cumulativeRevenue += monthData?.actual_revenue || 0;
      
      if (cumulativeRevenue >= milestone) {
        // Interpolate within the month for more precision
        const monthRevenue = monthData?.actual_revenue || 0;
        const previousCumulative = cumulativeRevenue - monthRevenue;
        const remainingNeeded = milestone - previousCumulative;
        const monthProgress = monthRevenue > 0 ? remainingNeeded / monthRevenue : 0;
        
        return month - 1 + monthProgress;
      }
    }
    
    // If milestone not reached, estimate based on current pace
    const avgMonthlyRevenue = cumulativeRevenue / currentMonth;
    return avgMonthlyRevenue > 0 ? milestone / avgMonthlyRevenue : currentMonth;
  }
}
