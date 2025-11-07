import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/auth-context';
import * as serviceLaborService from '../services/serviceLaborService';

/**
 * Service Profitability Data
 * Combines service revenue, COGS, and labor costs for true profitability analysis
 */
export interface ServiceProfitabilityData {
  serviceId: string;
  serviceName: string;
  
  // Revenue metrics
  totalRevenue: number;
  totalJobs: number;
  avgRevenuePerJob: number;
  
  // Cost metrics
  totalCOGS: number;
  totalLaborCost: number;
  totalHours: number;
  avgHourlyLaborCost: number;
  
  // Profitability metrics
  grossProfitBeforeLabor: number;        // Revenue - COGS
  grossMarginBeforeLaborPercent: number; // (Revenue - COGS) / Revenue * 100
  netProfitAfterLabor: number;           // Revenue - COGS - Labor
  netMarginAfterLaborPercent: number;    // (Revenue - COGS - Labor) / Revenue * 100
  
  // Efficiency metrics
  laborCostPerJob: number;
  laborCostPercent: number;              // Labor / Revenue * 100
  hoursPerJob: number;
  revenuePerHour: number;
}

interface UseServiceLaborDataResult {
  data: ServiceProfitabilityData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch combined service profitability data
 * Includes revenue, COGS, and labor costs for accurate net profit calculation
 * 
 * @param year - Year to fetch data for
 * @param month - Optional month (1-12), null for YTD
 * @returns Service profitability data with loading state
 */
export function useServiceLaborData(
  year: number,
  month?: number | null
): UseServiceLaborDataResult {
  const { dbUserId } = useAuthContext();
  const [data, setData] = useState<ServiceProfitabilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!dbUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch service profitability summary from database view
      const profitabilityData = await serviceLaborService.getServiceProfitabilitySummary(
        dbUserId,
        year,
        month || undefined
      );

      // Transform data to include all calculated metrics
      const transformedData: ServiceProfitabilityData[] = profitabilityData.map(service => {
        const revenue = service.totalRevenue;
        const laborCost = service.totalLaborCost;
        const jobs = service.totalJobs;
        const hours = service.totalHours;
        
        // Calculate COGS (this will come from service_activities in future)
        // For now, we'll need to fetch it separately or it should be included in the view
        const cogs = 0; // TODO: Add COGS to the profitability summary view
        
        // Calculate profitability metrics
        const grossProfitBeforeLabor = revenue - cogs;
        const grossMarginBeforeLaborPercent = revenue > 0 
          ? (grossProfitBeforeLabor / revenue) * 100 
          : 0;
        
        const netProfitAfterLabor = revenue - cogs - laborCost;
        const netMarginAfterLaborPercent = revenue > 0 
          ? (netProfitAfterLabor / revenue) * 100 
          : 0;
        
        // Calculate efficiency metrics
        const laborCostPerJob = jobs > 0 ? laborCost / jobs : 0;
        const laborCostPercent = revenue > 0 ? (laborCost / revenue) * 100 : 0;
        const hoursPerJob = jobs > 0 ? hours / jobs : 0;
        const revenuePerHour = hours > 0 ? revenue / hours : 0;
        
        return {
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          totalRevenue: revenue,
          totalJobs: jobs,
          avgRevenuePerJob: service.avgRevenuePerJob,
          totalCOGS: cogs,
          totalLaborCost: laborCost,
          totalHours: hours,
          avgHourlyLaborCost: service.avgHourlyLaborCost,
          grossProfitBeforeLabor,
          grossMarginBeforeLaborPercent,
          netProfitAfterLabor,
          netMarginAfterLaborPercent,
          laborCostPerJob,
          laborCostPercent,
          hoursPerJob,
          revenuePerHour
        };
      });

      setData(transformedData);
    } catch (err) {
      console.error('Error fetching service labor data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch service labor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dbUserId, year, month]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook to check if service labor data exists for a given period
 * Useful for showing warnings when labor data is missing
 */
export function useHasServiceLaborData(year: number, month?: number | null): {
  hasData: boolean;
  loading: boolean;
} {
  const { data, loading } = useServiceLaborData(year, month);
  
  return {
    hasData: data.length > 0 && data.some(s => s.totalLaborCost > 0),
    loading
  };
}
