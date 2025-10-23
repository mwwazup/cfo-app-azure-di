// User ID mapping removed - backend handles user ID conversion
import { upsertMonthlyRevenue, getRevenueEntries, getAvailableYears } from '../config/supabaseClient';

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
      const result = await getRevenueEntries(userId, year); // Let backend handle user ID conversion
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching revenue data:', error);
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
      await upsertMonthlyRevenue({
        userId: userId, // Let backend handle user ID conversion
        year,
        month,
        actualRevenue: revenue
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating monthly revenue:', error);
      
      // Check if this is an RLS policy violation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('row-level security policy') || errorMessage.includes('42501')) {
        return {
          success: false,
          error: 'Authentication issue: Please refresh the page and try logging in again. If the problem persists, contact support.'
        };
      }
      
      return {
        success: false,
        error: `Failed to update revenue: ${errorMessage}`
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
    profitMargin: number,
    monthlyFIRTargets?: number[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update all months for the year with new targets
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      // Use intelligent monthly FIR targets if provided, otherwise fall back to flat distribution
      let monthlyTargets: number[];
      
      if (monthlyFIRTargets && monthlyFIRTargets.length === 12) {
        // Use the intelligent seasonal distribution
        monthlyTargets = monthlyFIRTargets;
      } else {
        // Fallback: Smart flat distribution to avoid rounding errors
        const baseAmount = Math.floor(targetRevenue / 12 * 100) / 100;
        const totalBase = baseAmount * 12;
        const remainder = Math.round((targetRevenue - totalBase) * 100) / 100;
        
        monthlyTargets = months.map((_, i) => {
          let monthlyAmount = baseAmount;
          // Distribute the remainder across the first few months (in cents)
          if (i < Math.round(remainder * 100)) {
            monthlyAmount += 0.01;
          }
          return monthlyAmount;
        });
      }
      
      // Update each month using the backend API
      console.log(`📤 Updating ${months.length} months with FIR targets for user ${userId}`);
      
      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        const monthlyAmount = monthlyTargets[i];
        
        console.log(`  Month ${month}: $${monthlyAmount.toFixed(2)}`);
        
        await upsertMonthlyRevenue({
          userId: userId, // Let backend handle user ID conversion
          year,
          month,
          desiredRevenue: monthlyAmount,
          profitMargin: profitMargin
        });
      }
      
      console.log(`✅ All ${months.length} months updated successfully`);

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
      const result = await getAvailableYears(userId); // Let backend handle user ID conversion
      return result.years || [];
    } catch (error) {
      console.error('Error fetching available years:', error);
      return [];
    }
  }

  /**
   * Migrate localStorage revenue data to database
   */
  static async migrateRevenueData(userId: string): Promise<boolean> {
    try {
      // Check localStorage for revenue data
      const storedData = localStorage.getItem('bigfigcfo-all-years-data');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        // Migrate each entry using the backend API
        for (const [year, yearData] of Object.entries(parsedData) as [string, any][]) {
          if (yearData && yearData.data) {
            for (let index = 0; index < yearData.data.length; index++) {
              const monthData = yearData.data[index];
              if (monthData.revenue > 0) {
                await upsertMonthlyRevenue({
                  userId: userId, // Let backend handle user ID conversion
                  year: parseInt(year),
                  month: index + 1,
                  actualRevenue: monthData.revenue,
                  desiredRevenue: yearData.targetRevenue ? yearData.targetRevenue / 12 : undefined,
                  notes: 'Migrated from localStorage'
                });
              }
            }
          }
        }
        
        console.log('Successfully migrated revenue data from localStorage');
      }

      return true;
    } catch (error) {
      console.error('Error during revenue data migration:', error);
      return false;
    }
  }
}