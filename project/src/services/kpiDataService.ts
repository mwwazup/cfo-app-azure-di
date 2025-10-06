import { mapClerkIdToLegacyUserId } from '../utils/userIdMapping.ts';
import { supabase } from '../config/supabaseClient';

export interface RevenueKPI {
  user_id: string;
  year: number;
  total_revenue: number;
  avg_monthly_revenue: number;
  annual_fir_target: number | null;
  gap_to_target: number | null;
  prev_year_revenue: number | null;
}

export class KPIDataService {
  /**
   * Fetch KPI metrics for a specific user & year from the `revenue_kpis` view.
   */
  static async getKpis(userId: string, year: number): Promise<RevenueKPI | undefined> {
    const normalizedId = mapClerkIdToLegacyUserId(userId);
    if (!normalizedId) {
      return undefined;
    }
    try {
      const { data, error } = await supabase
        .from('revenue_kpis')
        .select('*')
        .eq('user_id', normalizedId)
        .eq('year', year)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle empty results

      if (error) {
        console.error('Error fetching KPIs:', error.message);
        return undefined;
      }

      return data ?? undefined;
    } catch (e) {
      console.error('Unexpected error fetching KPIs:', e);
      return undefined;
    }
  }
}
