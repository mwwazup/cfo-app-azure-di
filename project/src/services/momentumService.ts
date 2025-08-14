import { supabase } from '../config/supabaseClient';

export interface MomentumEntry {
  id: string;
  user_id: string;
  month: string;
  section: string;
  content: string;
  is_draft: boolean;
  feeling?: string;
  impact_score?: number;
  tags?: string[];
  additional_content?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMomentumEntryData {
  month: string;
  section: string;
  content: string;
  is_draft?: boolean;
  feeling?: string;
  impact_score?: number;
  tags?: string[];
  additional_content?: string;
}

export class MomentumService {
  /**
   * Get all momentum entries for a user
   */
  static async getMomentumEntries(userId: string): Promise<MomentumEntry[]> {
    try {
      const { data, error } = await supabase
        .from('momentum_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching momentum entries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching momentum entries:', error);
      return [];
    }
  }

  /**
   * Get momentum entries for a specific month
   */
  static async getMomentumEntriesForMonth(userId: string, month: string): Promise<MomentumEntry[]> {
    try {
      const { data, error } = await supabase
        .from('momentum_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .order('section');

      if (error) {
        console.error('Error fetching momentum entries for month:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching momentum entries for month:', error);
      return [];
    }
  }

  /**
   * Create or update momentum entry
   */
  static async upsertMomentumEntry(
    userId: string,
    entryData: CreateMomentumEntryData
  ): Promise<{ success: boolean; entry?: MomentumEntry; error?: string }> {
    console.log('MomentumService.upsertMomentumEntry - Starting:', {
      userId,
      entryData,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...',
      hasSupabaseClient: !!supabase
    });

    try {
      const dataToInsert = {
        user_id: userId,
        ...entryData
      };

      console.log('MomentumService.upsertMomentumEntry - Data to insert:', dataToInsert);

      const { data, error } = await supabase
        .from('momentum_entries')
        .upsert(dataToInsert, {
          onConflict: 'user_id,month,section'
        })
        .select()
        .single();

      console.log('MomentumService.upsertMomentumEntry - Supabase response:', {
        data,
        error,
        hasData: !!data,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details
      });

      if (error) {
        console.error('Error upserting momentum entry:', error);
        return {
          success: false,
          error: `Failed to save momentum entry: ${error.message} (Code: ${error.code})`
        };
      }

      console.log('MomentumService.upsertMomentumEntry - Success:', data);
      return { success: true, entry: data };
    } catch (error) {
      console.error('Unexpected error upserting momentum entry:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete momentum entry
   */
  static async deleteMomentumEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('momentum_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting momentum entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error deleting momentum entry:', error);
      return false;
    }
  }

  /**
   * Get momentum entries grouped by month
   */
  static async getMomentumByMonth(userId: string): Promise<Record<string, MomentumEntry[]>> {
    try {
      const entries = await this.getMomentumEntries(userId);
      
      return entries.reduce((acc, entry) => {
        if (!acc[entry.month]) {
          acc[entry.month] = [];
        }
        acc[entry.month].push(entry);
        return acc;
      }, {} as Record<string, MomentumEntry[]>);
    } catch (error) {
      console.error('Error grouping momentum by month:', error);
      return {};
    }
  }

  /**
   * Migrate localStorage data to database
   */
  static async migrateLocalStorageData(userId: string): Promise<boolean> {
    try {
      const migratedEntries: CreateMomentumEntryData[] = [];

      // Check localStorage for momentum data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`momentum_${userId}_`) || key?.startsWith(`momentum_wizard_${userId}_`)) {
          const monthKey = key.includes('wizard') ? key.split('_')[3] : key.split('_')[2];
          const stored = localStorage.getItem(key);
          
          if (stored) {
            try {
              const entries = JSON.parse(stored);
              
              if (Array.isArray(entries)) {
                entries.forEach((entry: any) => {
                  if (entry.section && entry.content) {
                    migratedEntries.push({
                      month: monthKey,
                      section: entry.section,
                      content: entry.content || '',
                      is_draft: entry.is_draft || false,
                      feeling: entry.feeling,
                      impact_score: entry.impact_score,
                      tags: entry.tags || [],
                      additional_content: entry.additional_content || entry.additionalContent
                    });
                  }
                });
              }
            } catch (parseError) {
              console.warn('Failed to parse localStorage entry:', key, parseError);
            }
          }
        }
      }

      // Batch insert migrated entries
      if (migratedEntries.length > 0) {
        const { error } = await supabase
          .from('momentum_entries')
          .upsert(
            migratedEntries.map(entry => ({
              user_id: userId,
              ...entry
            })),
            { onConflict: 'user_id,month,section' }
          );

        if (error) {
          console.error('Error migrating momentum data:', error);
          return false;
        }

        console.log(`Migrated ${migratedEntries.length} momentum entries to database`);
      }

      return true;
    } catch (error) {
      console.error('Error during momentum data migration:', error);
      return false;
    }
  }
}