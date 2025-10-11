// Financial Intelligence Service - Your Knowledge Base Alternative to Zep
import { supabase } from '../config/supabaseClient';

interface FinancialInsight {
  id: string;
  user_id: string;
  insight_type: 'trend' | 'milestone' | 'recommendation' | 'concern' | 'opportunity';
  title: string;
  description: string;
  financial_period: string; // "2024-Q3", "2023-Annual", etc.
  metrics_involved: string[]; // ["revenue", "profit_margin", "cash_flow"]
  created_at: Date;
  relevance_score: number; // 1-10, how important this insight is
  status: 'active' | 'resolved' | 'outdated';
}

interface FinancialContext {
  user_id: string;
  current_period: string;
  historical_summary: string;
  key_trends: string[];
  active_concerns: string[];
  recent_milestones: string[];
  coaching_focus_areas: string[];
  comparative_analysis: string;
}

export class FinancialIntelligenceService {
  
  // Build comprehensive financial context for AI coaching
  async buildFinancialContext(userId: string): Promise<FinancialContext> {
    try {
      const [
        revenueHistory,
        financialDocuments,
        pastInsights,
        coachingHistory
      ] = await Promise.all([
        this.getRevenueHistory(userId),
        this.getFinancialDocuments(userId),
        this.getFinancialInsights(userId),
        this.getCoachingHistory(userId)
      ]);

      // Analyze trends across multiple years
      const trends = this.analyzeTrends(revenueHistory);
      
      // Build contextual summary
      const context: FinancialContext = {
        user_id: userId,
        current_period: this.getCurrentPeriod(),
        historical_summary: this.buildHistoricalSummary(revenueHistory, financialDocuments),
        key_trends: trends.map(t => t.description),
        active_concerns: pastInsights.filter(i => i.insight_type === 'concern' && i.status === 'active').map(i => i.description),
        recent_milestones: pastInsights.filter(i => i.insight_type === 'milestone').slice(0, 3).map(i => i.description),
        coaching_focus_areas: this.identifyFocusAreas(trends, pastInsights),
        comparative_analysis: this.buildComparativeAnalysis(revenueHistory)
      };

      return context;
    } catch (error) {
      console.error('Error building financial context:', error);
      throw error;
    }
  }

  // Get multi-year revenue history with trends
  private async getRevenueHistory(userId: string) {
    const { data, error } = await supabase
      .from('revenue_entries')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get all financial documents for context
  private async getFinancialDocuments(userId: string) {
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform documents to extract data from analysis_result for KPI/AI consumption
    const transformedData = (data || []).map((doc: any) => {
      if (doc.analysis_result) {
        return {
          ...doc,
          // Extract financial metrics from analysis_result for KPI/AI consumption
          totalRevenue: doc.analysis_result.summary_metrics?.totalRevenue || doc.analysis_result.summary_metrics?.revenue,
          netProfit: doc.analysis_result.summary_metrics?.netProfit,
          grossProfit: doc.analysis_result.summary_metrics?.grossProfit,
          totalExpenses: doc.analysis_result.summary_metrics?.totalExpenses,
          start_date: doc.analysis_result.start_date || doc.start_date,
          end_date: doc.analysis_result.end_date || doc.end_date,
          // Keep original for reference
          _analysis_result: doc.analysis_result
        };
      }
      return doc;
    });
    
    console.log('🔍 Financial Intelligence - Transformed documents:', transformedData);
    return transformedData;
  }

  // Get stored financial insights (your knowledge base)
  private async getFinancialInsights(userId: string) {
    try {
      const { data, error } = await supabase
        .from('financial_insights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      // Table doesn't exist yet - return empty array
      return [];
    }
  }

  // Get coaching conversation history
  private async getCoachingHistory(userId: string) {
    const { data, error } = await supabase
      .from('coaching_moments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // Analyze financial trends across years
  private analyzeTrends(revenueHistory: any[]) {
    const trends = [];
    
    if (revenueHistory.length < 2) return trends;

    // Group by year for year-over-year analysis
    const yearlyData = this.groupByYear(revenueHistory);
    const years = Object.keys(yearlyData).sort();

    // Year-over-year growth
    for (let i = 1; i < years.length; i++) {
      const currentYear = years[i];
      const previousYear = years[i - 1];
      const currentTotal = yearlyData[currentYear].total;
      const previousTotal = yearlyData[previousYear].total;
      
      const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;
      
      trends.push({
        type: 'year_over_year_growth',
        description: `${currentYear} revenue ${growthRate > 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate).toFixed(1)}% compared to ${previousYear}`,
        value: growthRate,
        period: `${previousYear}-${currentYear}`
      });
    }

    // Recent momentum (last 6 months)
    const recentTrend = this.analyzeRecentMomentum(revenueHistory);
    if (recentTrend) trends.push(recentTrend);

    return trends;
  }

  // Build historical summary for AI context
  private buildHistoricalSummary(revenueHistory: any[], documents: any[]): string {
    if (revenueHistory.length === 0) {
      return "No historical revenue data available. New user requiring initial financial setup.";
    }

    const yearlyData = this.groupByYear(revenueHistory);
    const years = Object.keys(yearlyData).sort();
    const totalRevenue = revenueHistory.reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0);
    
    let summary = `Financial History Overview:\n`;
    summary += `- Total tracked revenue: $${totalRevenue.toLocaleString()}\n`;
    summary += `- Data spans: ${years[0]} to ${years[years.length - 1]}\n`;
    summary += `- ${documents.length} financial documents uploaded\n`;
    
    // Add yearly breakdown
    years.forEach(year => {
      const yearData = yearlyData[year];
      summary += `- ${year}: $${yearData.total.toLocaleString()} (${yearData.months} months of data)\n`;
    });

    return summary;
  }

  // Build comparative analysis
  private buildComparativeAnalysis(revenueHistory: any[]): string {
    const yearlyData = this.groupByYear(revenueHistory);
    const years = Object.keys(yearlyData).sort();
    
    if (years.length < 2) {
      return "Insufficient data for comparative analysis. Need at least 2 years of data.";
    }

    const currentYear = years[years.length - 1];
    const previousYear = years[years.length - 2];
    
    const currentYearData = yearlyData[currentYear];
    const previousYearData = yearlyData[previousYear];
    
    const growthRate = ((currentYearData.total - previousYearData.total) / previousYearData.total) * 100;
    
    let analysis = `Comparative Analysis:\n`;
    analysis += `- ${currentYear} vs ${previousYear}: ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}% change\n`;
    analysis += `- Best performing year: ${years.reduce((best, year) => yearlyData[year].total > yearlyData[best].total ? year : best)}\n`;
    analysis += `- Average annual revenue: $${(Object.values(yearlyData).reduce((sum: number, year: any) => sum + year.total, 0) / years.length).toLocaleString()}\n`;
    
    return analysis;
  }

  // Store new financial insights (build knowledge base over time)
  async storeFinancialInsight(insight: Omit<FinancialInsight, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('financial_insights')
        .insert([{
          ...insight,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error storing financial insight:', error);
      return null;
    }
  }

  // Helper methods
  private groupByYear(revenueHistory: any[]) {
    return revenueHistory.reduce((acc, entry) => {
      const year = entry.year.toString();
      if (!acc[year]) {
        acc[year] = { total: 0, months: 0, entries: [] };
      }
      acc[year].total += entry.actual_revenue || 0;
      acc[year].months += 1;
      acc[year].entries.push(entry);
      return acc;
    }, {});
  }

  private analyzeRecentMomentum(revenueHistory: any[]) {
    // Get last 6 months of data
    const recent = revenueHistory.slice(-6);
    if (recent.length < 3) return null;

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, entry) => sum + (entry.actual_revenue || 0), 0) / secondHalf.length;

    const momentum = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      type: 'recent_momentum',
      description: `Recent 6-month trend shows ${momentum > 0 ? 'positive' : 'negative'} momentum of ${Math.abs(momentum).toFixed(1)}%`,
      value: momentum,
      period: 'last_6_months'
    };
  }

  private identifyFocusAreas(trends: any[], insights: any[]) {
    const focusAreas = [];
    
    // Add logic to identify focus areas based on trends and insights
    if (trends.some(t => t.value < -10)) {
      focusAreas.push("Revenue decline recovery");
    }
    
    if (trends.some(t => t.value > 20)) {
      focusAreas.push("Scaling and growth management");
    }
    
    return focusAreas;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }
}

export const financialIntelligence = new FinancialIntelligenceService();
