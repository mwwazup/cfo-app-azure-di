/**
 * Service Labor Service
 * Handles CRUD operations for service_labor_records table
 * Links employee work to specific services for profitability analysis
 */

import { supabase } from '../config/supabaseClient';

// TypeScript interfaces matching database schema
export interface ServiceLaborRecord {
  id?: string;
  user_id: string;
  employee_id: string;
  service_id: string;
  pay_period_id: string;
  date: string;
  jobs_completed: number;
  hours_worked: number;
  revenue_generated: number;
  base_pay: number;
  overtime_pay: number;
  bonuses: number;
  tips: number;
  total_labor_cost: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  jobs: number;
  hours: number;
  revenue: number;
}

/**
 * Create service labor records for a daily entry
 * @param userId - Clerk user ID
 * @param employeeId - Employee UUID
 * @param payPeriodId - Pay period UUID
 * @param date - Date of work (YYYY-MM-DD)
 * @param serviceBreakdown - Array of services performed
 * @param laborCosts - Calculated labor costs
 * @returns Array of created records
 */
export async function createServiceLaborRecords(
  userId: string,
  employeeId: string,
  payPeriodId: string,
  date: string,
  serviceBreakdown: ServiceBreakdownItem[],
  laborCosts: {
    basePay: number;
    overtimePay: number;
    bonuses: number;
    tips: number;
  }
): Promise<ServiceLaborRecord[]> {
  try {
    // Calculate total hours for proportional allocation
    const totalHours = serviceBreakdown.reduce((sum, item) => sum + item.hours, 0);
    
    // Create a record for each service
    const records: ServiceLaborRecord[] = serviceBreakdown.map(item => {
      // Allocate labor costs proportionally based on hours worked
      const hoursProportion = totalHours > 0 ? item.hours / totalHours : 0;
      
      const allocatedBasePay = laborCosts.basePay * hoursProportion;
      const allocatedOvertimePay = laborCosts.overtimePay * hoursProportion;
      const allocatedBonuses = laborCosts.bonuses * hoursProportion;
      const allocatedTips = laborCosts.tips * hoursProportion;
      
      const totalLaborCost = allocatedBasePay + allocatedOvertimePay + allocatedBonuses + allocatedTips;
      
      return {
        user_id: userId,
        employee_id: employeeId,
        service_id: item.serviceId,
        pay_period_id: payPeriodId,
        date,
        jobs_completed: item.jobs,
        hours_worked: item.hours,
        revenue_generated: item.revenue,
        base_pay: Math.round(allocatedBasePay * 100) / 100,
        overtime_pay: Math.round(allocatedOvertimePay * 100) / 100,
        bonuses: Math.round(allocatedBonuses * 100) / 100,
        tips: Math.round(allocatedTips * 100) / 100,
        total_labor_cost: Math.round(totalLaborCost * 100) / 100
      };
    });
    
    // Insert all records
    const { data, error } = await supabase
      .from('service_labor_records')
      .insert(records)
      .select();
    
    if (error) {
      console.error('Error creating service labor records:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to create service labor records:', error);
    throw error;
  }
}

/**
 * Get service labor records for a specific pay period
 * @param userId - Clerk user ID
 * @param payPeriodId - Pay period UUID
 * @returns Array of service labor records
 */
export async function getServiceLaborRecordsByPeriod(
  userId: string,
  payPeriodId: string
): Promise<ServiceLaborRecord[]> {
  try {
    const { data, error } = await supabase
      .from('service_labor_records')
      .select('*')
      .eq('user_id', userId)
      .eq('pay_period_id', payPeriodId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching service labor records:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch service labor records:', error);
    throw error;
  }
}

/**
 * Get service labor records for a specific date
 * @param userId - Clerk user ID
 * @param date - Date (YYYY-MM-DD)
 * @returns Array of service labor records
 */
export async function getServiceLaborRecordsByDate(
  userId: string,
  date: string
): Promise<ServiceLaborRecord[]> {
  try {
    const { data, error } = await supabase
      .from('service_labor_records')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);
    
    if (error) {
      console.error('Error fetching service labor records by date:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch service labor records by date:', error);
    throw error;
  }
}

/**
 * Get aggregated service labor data for a date range
 * @param userId - Clerk user ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Aggregated data by service
 */
export async function getAggregatedServiceLaborData(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  serviceId: string;
  serviceName: string;
  totalJobs: number;
  totalHours: number;
  totalRevenue: number;
  totalLaborCost: number;
}[]> {
  try {
    const { data, error } = await supabase
      .from('service_labor_records')
      .select(`
        service_id,
        jobs_completed,
        hours_worked,
        revenue_generated,
        total_labor_cost,
        services (
          service_name
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) {
      console.error('Error fetching aggregated service labor data:', error);
      throw error;
    }
    
    if (!data) return [];
    
    // Aggregate by service
    const aggregated = data.reduce((acc: any, record: any) => {
      const serviceId = record.service_id;
      const serviceName = record.services?.service_name || 'Unknown';
      
      if (!acc[serviceId]) {
        acc[serviceId] = {
          serviceId,
          serviceName,
          totalJobs: 0,
          totalHours: 0,
          totalRevenue: 0,
          totalLaborCost: 0
        };
      }
      
      acc[serviceId].totalJobs += record.jobs_completed || 0;
      acc[serviceId].totalHours += record.hours_worked || 0;
      acc[serviceId].totalRevenue += record.revenue_generated || 0;
      acc[serviceId].totalLaborCost += record.total_labor_cost || 0;
      
      return acc;
    }, {});
    
    return Object.values(aggregated);
  } catch (error) {
    console.error('Failed to fetch aggregated service labor data:', error);
    throw error;
  }
}

/**
 * Update service labor records for a specific date
 * @param userId - Clerk user ID
 * @param date - Date to update
 * @param serviceBreakdown - New service breakdown
 * @param laborCosts - New labor costs
 * @returns Updated records
 */
export async function updateServiceLaborRecords(
  userId: string,
  employeeId: string,
  payPeriodId: string,
  date: string,
  serviceBreakdown: ServiceBreakdownItem[],
  laborCosts: {
    basePay: number;
    overtimePay: number;
    bonuses: number;
    tips: number;
  }
): Promise<ServiceLaborRecord[]> {
  try {
    // Delete existing records for this date
    const { error: deleteError } = await supabase
      .from('service_labor_records')
      .delete()
      .eq('user_id', userId)
      .eq('employee_id', employeeId)
      .eq('date', date);
    
    if (deleteError) {
      console.error('Error deleting old service labor records:', deleteError);
      throw deleteError;
    }
    
    // Create new records
    return await createServiceLaborRecords(
      userId,
      employeeId,
      payPeriodId,
      date,
      serviceBreakdown,
      laborCosts
    );
  } catch (error) {
    console.error('Failed to update service labor records:', error);
    throw error;
  }
}

/**
 * Delete service labor records for a specific date
 * @param userId - Clerk user ID
 * @param date - Date to delete
 */
export async function deleteServiceLaborRecords(
  userId: string,
  date: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('service_labor_records')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);
    
    if (error) {
      console.error('Error deleting service labor records:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete service labor records:', error);
    throw error;
  }
}

/**
 * Get service profitability summary for a date range
 * Uses the service_profitability_summary view
 * @param userId - Clerk user ID
 * @param year - Year
 * @param month - Month (optional, null for YTD)
 * @returns Service profitability data
 */
export async function getServiceProfitabilitySummary(
  userId: string,
  year: number,
  month?: number
): Promise<{
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  totalJobs: number;
  avgRevenuePerJob: number;
  totalHours: number;
  totalLaborCost: number;
  avgHourlyLaborCost: number;
  grossProfitAfterLabor: number;
  grossMarginAfterLaborPercent: number;
}[]> {
  try {
    let query = supabase
      .from('service_profitability_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('month', `${year}-01-01`);
    
    if (month) {
      const monthStr = month.toString().padStart(2, '0');
      query = query
        .gte('month', `${year}-${monthStr}-01`)
        .lt('month', `${year}-${monthStr === '12' ? '01' : (parseInt(monthStr) + 1).toString().padStart(2, '0')}-01`);
    } else {
      query = query.lt('month', `${year + 1}-01-01`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching service profitability summary:', error);
      throw error;
    }
    
    return (data || []).map((row: any) => ({
      serviceId: row.service_id,
      serviceName: row.service_name,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      totalJobs: row.total_jobs || 0,
      avgRevenuePerJob: parseFloat(row.avg_revenue_per_job) || 0,
      totalHours: parseFloat(row.total_hours) || 0,
      totalLaborCost: parseFloat(row.total_labor_cost) || 0,
      avgHourlyLaborCost: parseFloat(row.avg_hourly_labor_cost) || 0,
      grossProfitAfterLabor: parseFloat(row.gross_profit_after_labor) || 0,
      grossMarginAfterLaborPercent: parseFloat(row.gross_margin_after_labor_percent) || 0
    }));
  } catch (error) {
    console.error('Failed to fetch service profitability summary:', error);
    throw error;
  }
}
