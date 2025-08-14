import { supabase } from '../config/supabaseClient';

export interface RevenueData {
  id: string;
  user_id: string;
  year: number;
  month: number;
  actual_revenue: number;
  desired_revenue?: number;
  target_revenue?: number;
  profit_margin?: number;
  is_locked: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRevenueDataEntry {
  year: number;
  month: number;
  actual_revenue: number;
  desired_revenue?: number;
  target_revenue?: number;
  profit_margin?: number;
  is_locked?: boolean;
  notes?: string;
}

export class RevenueDataService {
  /**
   * Get revenue data for a specific year
   */
  static async getRevenueDataForYear(userId: string, year: number): Promise<RevenueData[]> {
    try {
      const { data, error } = await supabase
        .from('revenue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .order('month');

      if (error) {
        console.error('Error fetching revenue data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching revenue data:', error);
      return [];
    }
  }

  /**
   * Update monthly revenue
   */
  static async updateMonthlyRevenue(
    userId: string,
    year: number,
    month: number,
    revenue: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, check if the record exists
      const { data: existingRecord } = await supabase
        .from('revenue_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .single();

      if (existingRecord) {
        // Update existing record, preserving other fields
        const { error } = await supabase
          .from('revenue_entries')
          .update({
            actual_revenue: revenue,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('year', year)
          .eq('month', month);

        if (error) {
          console.error('Error updating monthly revenue:', error);
          return {
            success: false,
            error: `Failed to update revenue: ${error.message}`
          };
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('revenue_entries')
          .insert({
            user_id: userId,
            year,
            month,
            actual_revenue: revenue,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error creating monthly revenue:', error);
          return {
            success: false,
            error: `Failed to create revenue: ${error.message}`
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating monthly revenue:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update target revenue and profit margin for a year
   */
  static async updateYearTargets(
    userId: string,
    year: number,
    targetRevenue: number,
    profitMargin: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update all months for the year with new targets
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      // Smart distribution to avoid rounding errors
      const baseAmount = Math.floor(targetRevenue / 12 * 100) / 100; // Round down to 2 decimal places
      const totalBase = baseAmount * 12;
      const remainder = Math.round((targetRevenue - totalBase) * 100) / 100; // Calculate remainder in cents
      
      const updates = months.map((month, index) => {
        let monthlyAmount = baseAmount;
        
        // Distribute the remainder across the first few months (in cents)
        if (index < Math.round(remainder * 100)) {
          monthlyAmount += 0.01;
        }
        
        return {
          user_id: userId,
          year,
          month,
          desired_revenue: monthlyAmount,
          profit_margin: profitMargin,
          updated_at: new Date().toISOString()
        };
      });

      // Verify the total equals the target (for debugging)
      const calculatedTotal = updates.reduce((sum, update) => sum + update.desired_revenue, 0);
      if (Math.abs(calculatedTotal - targetRevenue) > 0.01) {
        console.warn(`FIR distribution mismatch: ${calculatedTotal} vs ${targetRevenue}`);
      }

      const { error } = await supabase
        .from('revenue_entries')
        .upsert(updates, {
          onConflict: 'user_id,year,month'
        });

      if (error) {
        console.error('Error updating year targets:', error);
        return {
          success: false,
          error: `Failed to update targets: ${error.message}`
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating year targets:', error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get all available years for a user
   */
  static async getAvailableYears(userId: string): Promise<number[]> {
    try {
      const { data, error } = await supabase
        .from('revenue_entries')
        .select('year')
        .eq('user_id', userId)
        .order('year', { ascending: false });

      if (error) {
        console.error('Error fetching available years:', error);
        return [];
      }

      const uniqueYears = [...new Set(data.map(item => item.year))];
      return uniqueYears;
    } catch (error) {
      console.error('Unexpected error fetching available years:', error);
      return [];
    }
  }

  /**
   * Migrate localStorage revenue data to database
   */
  static async migrateRevenueData(userId: string): Promise<boolean> {
    try {
      const migratedEntries: any[] = [];

      // Check localStorage for revenue data
      const storedData = localStorage.getItem('bigfigcfo-all-years-data');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        Object.entries(parsedData).forEach(([year, yearData]: [string, any]) => {
          if (yearData && yearData.data) {
            yearData.data.forEach((monthData: any, index: number) => {
              if (monthData.revenue > 0) {
                migratedEntries.push({
                  user_id: userId,
                  year: parseInt(year),
                  month: index + 1,
                  actual_revenue: monthData.revenue,
                  desired_revenue: yearData.targetRevenue ? yearData.targetRevenue / 12 : null,
                  notes: `Migrated from localStorage`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            });
          }
        });
      }

      // Batch insert migrated entries
      if (migratedEntries.length > 0) {
        const { error } = await supabase
          .from('revenue_entries')
          .upsert(migratedEntries, {
            onConflict: 'user_id,year,month'
          });

        if (error) {
          console.error('Error migrating revenue data:', error);
          return false;
        }

        console.log(`Migrated ${migratedEntries.length} revenue entries to database`);
      }

      return true;
    } catch (error) {
      console.error('Error during revenue data migration:', error);
      return false;
    }
  }
}