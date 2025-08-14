import { supabase, TABLES } from '../config/supabaseClient';
import { CoachingMoment, CreateCoachingMomentData } from '../models/CoachingMoment';

export class CoachingService {
  /**
   * Fetch all coaching moments for a specific user
   */
  static async getCoachingMoments(userId: string): Promise<CoachingMoment[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COACHING_MOMENTS)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching coaching moments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching coaching moments:', error);
      return [];
    }
  }

  /**
   * Create a new coaching moment
   */
  static async createCoachingMoment(
    userId: string, 
    momentData: CreateCoachingMomentData
  ): Promise<{ success: boolean; moment?: CoachingMoment; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COACHING_MOMENTS)
        .insert({
          user_id: userId,
          ...momentData,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating coaching moment:', error);
        return { 
          success: false, 
          error: `Failed to save coaching moment: ${error.message}` 
        };
      }

      return { success: true, moment: data };
    } catch (error) {
      console.error('Unexpected error creating coaching moment:', error);
      return { 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete a coaching moment
   */
  static async deleteCoachingMoment(momentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.COACHING_MOMENTS)
        .delete()
        .eq('id', momentId);

      if (error) {
        console.error('Error deleting coaching moment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting coaching moment:', error);
      return false;
    }
  }

  /**
   * Get coaching moments by scenario type
   */
  static async getCoachingMomentsByType(
    userId: string, 
    scenarioType: string
  ): Promise<CoachingMoment[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COACHING_MOMENTS)
        .select('*')
        .eq('user_id', userId)
        .eq('scenario_type', scenarioType)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching coaching moments by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching coaching moments by type:', error);
      return [];
    }
  }

  /**
   * Get recent coaching moments (last N moments)
   */
  static async getRecentCoachingMoments(
    userId: string, 
    limit: number = 10
  ): Promise<CoachingMoment[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COACHING_MOMENTS)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent coaching moments:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching recent coaching moments:', error);
      return [];
    }
  }

  /**
   * Update a coaching moment
   */
  static async updateCoachingMoment(
    momentId: string, 
    updates: Partial<CreateCoachingMomentData>
  ): Promise<{ success: boolean; moment?: CoachingMoment; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLES.COACHING_MOMENTS)
        .update(updates)
        .eq('id', momentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating coaching moment:', error);
        return { 
          success: false, 
          error: `Failed to update coaching moment: ${error.message}` 
        };
      }

      return { success: true, moment: data };
    } catch (error) {
      console.error('Unexpected error updating coaching moment:', error);
      return { 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}