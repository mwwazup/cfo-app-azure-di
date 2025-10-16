import React, { useMemo } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuthContext } from '../../contexts/auth-context';
import type { Service } from '../../db/schema';

export interface ServiceRevenueData {
  serviceId: string;
  serviceName: string;
  color: string;
  monthlyRevenue: number[]; // 12 months
  totalRevenue: number;
  percentageOfTotal: number;
}

/**
 * Hook to fetch and aggregate service revenue data by month
 */
export function useServiceRevenueData(year: number, services: Service[]) {
  const { dbUserId } = useAuthContext();
  const [data, setData] = React.useState<ServiceRevenueData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchServiceRevenue = async () => {
      if (!dbUserId || services.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch all service activities for the year
        const { data: activities, error } = await supabase
          .from('service_activities')
          .select('service_id, month, total_revenue')
          .eq('user_id', dbUserId)
          .eq('year', year);

        if (error) throw error;

        // Aggregate by service and month
        const serviceRevenueMap = new Map<string, number[]>();
        
        services.forEach(service => {
          serviceRevenueMap.set(service.id, new Array(12).fill(0));
        });

        activities?.forEach(activity => {
          const monthlyData = serviceRevenueMap.get(activity.service_id);
          if (monthlyData && activity.month >= 1 && activity.month <= 12) {
            monthlyData[activity.month - 1] += Number(activity.total_revenue || 0);
          }
        });

        // Calculate totals and percentages
        const totalRevenue = Array.from(serviceRevenueMap.values())
          .flat()
          .reduce((sum, val) => sum + val, 0);

        const serviceData: ServiceRevenueData[] = services
          .map(service => {
            const monthlyRevenue = serviceRevenueMap.get(service.id) || new Array(12).fill(0);
            const serviceTotalRevenue = monthlyRevenue.reduce((sum, val) => sum + val, 0);
            
            return {
              serviceId: service.id,
              serviceName: service.serviceName,
              color: service.color || '#3B82F6',
              monthlyRevenue,
              totalRevenue: serviceTotalRevenue,
              percentageOfTotal: totalRevenue > 0 ? (serviceTotalRevenue / totalRevenue) * 100 : 0,
            };
          })
          .filter(s => s.totalRevenue > 0) // Only include services with revenue
          .sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue descending

        setData(serviceData);
      } catch (error) {
        console.error('Error fetching service revenue data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceRevenue();
  }, [dbUserId, year, services]);

  return { data, loading };
}

/**
 * Generate Chart.js datasets for service mix overlay
 */
export function generateServiceMixDatasets(
  serviceData: ServiceRevenueData[],
  visibleServices: Set<string>,
  showAsStacked: boolean = false
) {
  return serviceData
    .filter(service => visibleServices.has(service.serviceId))
    .map((service, index) => ({
      label: service.serviceName,
      data: service.monthlyRevenue,
      borderColor: service.color,
      backgroundColor: `${service.color}33`, // 20% opacity
      borderWidth: 2,
      borderDash: [5, 5], // Dashed line for services
      fill: showAsStacked,
      stack: showAsStacked ? 'services' : undefined,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: service.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      order: 10 + index, // Render behind main revenue lines
    }));
}

/**
 * Service Mix Legend Component
 */
interface ServiceMixLegendProps {
  serviceData: ServiceRevenueData[];
  visibleServices: Set<string>;
  onToggleService: (serviceId: string) => void;
}

export function ServiceMixLegend({
  serviceData,
  visibleServices,
  onToggleService,
}: ServiceMixLegendProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-lg">
      {serviceData.map((service) => {
        const isVisible = visibleServices.has(service.serviceId);
        
        return (
          <button
            key={service.serviceId}
            onClick={() => onToggleService(service.serviceId)}
            className={`flex items-center gap-2 p-2 rounded border transition-all ${
              isVisible
                ? 'border-gray-300 bg-white shadow-sm'
                : 'border-gray-200 bg-gray-100 opacity-50'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: service.color }}
            />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium truncate">{service.serviceName}</p>
              <p className="text-xs text-gray-500">
                ${service.totalRevenue.toLocaleString()} ({service.percentageOfTotal.toFixed(1)}%)
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Service Mix Summary Stats
 */
interface ServiceMixStatsProps {
  serviceData: ServiceRevenueData[];
  selectedMonth?: number;
}

export function ServiceMixStats({ serviceData, selectedMonth }: ServiceMixStatsProps) {
  const stats = useMemo(() => {
    if (serviceData.length === 0) return null;

    const topService = serviceData[0];
    const totalRevenue = serviceData.reduce((sum, s) => sum + s.totalRevenue, 0);
    
    let monthRevenue = 0;
    let topMonthService = topService;
    
    if (selectedMonth !== undefined && selectedMonth >= 0 && selectedMonth < 12) {
      monthRevenue = serviceData.reduce((sum, s) => sum + s.monthlyRevenue[selectedMonth], 0);
      topMonthService = serviceData.reduce((top, current) => 
        current.monthlyRevenue[selectedMonth] > top.monthlyRevenue[selectedMonth] ? current : top
      );
    }

    return {
      topService,
      totalRevenue,
      serviceCount: serviceData.length,
      monthRevenue,
      topMonthService,
    };
  }, [serviceData, selectedMonth]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div>
        <p className="text-xs text-gray-600">Top Service</p>
        <p className="font-semibold text-sm">{stats.topService.serviceName}</p>
        <p className="text-xs text-gray-500">
          ${stats.topService.totalRevenue.toLocaleString()} ({stats.topService.percentageOfTotal.toFixed(1)}%)
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-600">Total Services</p>
        <p className="font-semibold text-sm">{stats.serviceCount} Active</p>
        <p className="text-xs text-gray-500">
          ${stats.totalRevenue.toLocaleString()} total
        </p>
      </div>
      {selectedMonth !== undefined && (
        <div>
          <p className="text-xs text-gray-600">Month Leader</p>
          <p className="font-semibold text-sm">{stats.topMonthService.serviceName}</p>
          <p className="text-xs text-gray-500">
            ${stats.topMonthService.monthlyRevenue[selectedMonth].toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
