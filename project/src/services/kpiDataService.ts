import { getRevenueKpis } from '../config/supabaseClient';

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
   * Fetch KPI metrics for a specific user & year from the backend API.
   */
  static async getKpis(userId: string, year: number): Promise<RevenueKPI | undefined> {
    try {
      const result = await getRevenueKpis(userId, year);
      const rows = result.rows || [];
      return rows.length > 0 ? rows[0] : undefined;
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      return undefined;
    }
  }
}
