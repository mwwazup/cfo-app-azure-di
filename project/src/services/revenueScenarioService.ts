import { supabase } from '../config/supabaseClient';
import { 
  RevenueScenario, 
  CreateRevenueScenarioData, 
  RevenueCurveReport 
} from '../models/RevenueScenario';

export class RevenueScenarioService {
  /**
   * Get the current/latest revenue curve report for a user
   */
  static async getCurrentRevenueReport(userId: string): Promise<RevenueCurveReport | null> {
    try {
      const { data, error } = await supabase
        .from('revenue_curve_reports_current')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching current revenue report:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching current revenue report:', error);
      return null;
    }
  }

  /**
   * Create a new revenue scenario
   */
  static async createRevenueScenario(
    userId: string,
    scenarioData: CreateRevenueScenarioData
  ): Promise<{ success: boolean; scenario?: RevenueScenario; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.REVENUE_SCENARIOS)
        .insert({
          user_id: userId,
          ...scenarioData
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating revenue scenario:', error);
        return {
          success: false,
          error: `Failed to save scenario: ${error.message}`
        };
      }

      return { success: true, scenario: data };
    } catch (error) {
      console.error('Unexpected error creating revenue scenario:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all revenue scenarios for a user
   */
  static async getRevenueScenarios(userId: string): Promise<RevenueScenario[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.REVENUE_SCENARIOS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching revenue scenarios:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching revenue scenarios:', error);
      return [];
    }
  }

  /**
   * Get recent revenue scenarios for context (for AI chatbot)
   */
  static async getRecentScenarios(
    userId: string,
    limit: number = 10
  ): Promise<RevenueScenario[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.REVENUE_SCENARIOS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent scenarios:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching recent scenarios:', error);
      return [];
    }
  }

  /**
   * Delete a revenue scenario
   */
  static async deleteRevenueScenario(scenarioId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.REVENUE_SCENARIOS)
        .delete()
        .eq('id', scenarioId);

      if (error) {
        console.error('Error deleting revenue scenario:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting revenue scenario:', error);
      return false;
    }
  }

  /**
   * Get scenarios by base report (for comparing different scenarios against the same baseline)
   */
  static async getScenariosByBaseReport(
    userId: string,
    baseReportId: string
  ): Promise<RevenueScenario[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.REVENUE_SCENARIOS)
        .select('*')
        .eq('user_id', userId)
        .eq('base_report_id', baseReportId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scenarios by base report:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching scenarios by base report:', error);
      return [];
    }
  }

  /**
   * Check for similar scenarios (for caching/avoiding duplicates)
   */
  static async findSimilarScenario(
    userId: string,
    questionText: string,
    baseReportId: string
  ): Promise<RevenueScenario | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.REVENUE_SCENARIOS)
        .select('*')
        .eq('user_id', userId)
        .eq('base_report_id', baseReportId)
        .ilike('question_text', `%${questionText}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No similar scenario found is not an error
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error finding similar scenario:', error);
      return null;
    }
  }
}