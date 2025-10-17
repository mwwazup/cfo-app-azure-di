import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuthContext } from '../contexts/auth-context';
import type { Service, ServiceActivity } from '../db/schema';

export interface ServiceWithActivities extends Service {
  activities?: ServiceActivity[];
}

export interface WeeklyActivity {
  weekOfMonth: number;
  weekStartDate: string;
  weekEndDate: string;
  appointmentCount: number;
  totalRevenue: number;
  isAutoCalculated: boolean;
}

export interface MonthlyServiceSummary {
  serviceId: string;
  serviceName: string;
  serviceCategory: string | null;
  color: string | null;
  year: number;
  month: number;
  totalAppointments: number;
  totalRevenue: number;
  avgTicketPrice: number;
  weeksWithActivity: number;
}

/**
 * Hook for managing user services
 */
export function useServices() {
  const { dbUserId } = useAuthContext();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    if (!dbUserId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      
      // Map snake_case database columns to camelCase for TypeScript
      const mappedServices = (data || []).map((service: any) => ({
        id: service.id,
        userId: service.user_id,
        serviceName: service.service_name,
        serviceCategory: service.service_category,
        color: service.color,
        defaultPrice: service.default_price,
        isAutoPricingEnabled: service.is_auto_pricing_enabled,
        displayOrder: service.display_order,
        isActive: service.is_active,
        notes: service.notes,
        createdAt: service.created_at,
        updatedAt: service.updated_at,
      }));
      
      setServices(mappedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [dbUserId]);

  const createService = async (serviceData: {
    serviceName: string;
    serviceCategory?: string;
    color?: string;
    defaultPrice?: number;
    isAutoPricingEnabled?: boolean;
    displayOrder?: number;
  }) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('services')
      .insert({
        user_id: dbUserId,
        service_name: serviceData.serviceName,
        service_category: serviceData.serviceCategory,
        color: serviceData.color,
        default_price: serviceData.defaultPrice,
        is_auto_pricing_enabled: serviceData.isAutoPricingEnabled || false,
        display_order: serviceData.displayOrder || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchServices();
    return data;
  };

  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('services')
      .update({
        service_name: updates.serviceName,
        service_category: updates.serviceCategory,
        color: updates.color,
        default_price: updates.defaultPrice,
        is_auto_pricing_enabled: updates.isAutoPricingEnabled,
        display_order: updates.displayOrder,
        notes: updates.notes,
      })
      .eq('id', serviceId)
      .eq('user_id', dbUserId)
      .select()
      .single();

    if (error) throw error;
    
    await fetchServices();
    return data;
  };

  const deleteService = async (serviceId: string) => {
    if (!dbUserId) throw new Error('User not authenticated');

    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .eq('user_id', dbUserId);

    if (error) throw error;
    
    await fetchServices();
  };

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    refreshServices: fetchServices,
  };
}

/**
 * Hook for managing service activities (weekly tracking)
 */
export function useServiceActivities(year?: number, month?: number) {
  const { dbUserId } = useAuthContext();
  const [activities, setActivities] = useState<ServiceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    if (!dbUserId) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('service_activities')
        .select('*, service:services(*)')
        .eq('user_id', dbUserId);

      if (year) query = query.eq('year', year);
      if (month) query = query.eq('month', month);

      query = query.order('week_start_date', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      // Map snake_case database columns to camelCase
      const mappedActivities = (data || []).map((activity: any) => ({
        id: activity.id,
        userId: activity.user_id,
        serviceId: activity.service_id,
        year: activity.year,
        month: activity.month,
        weekOfMonth: activity.week_of_month,
        weekStartDate: activity.week_start_date,
        weekEndDate: activity.week_end_date,
        appointmentCount: activity.appointment_count,
        totalRevenue: activity.total_revenue,
        avgTicketPrice: activity.avg_ticket_price,
        isAutoCalculated: activity.is_auto_calculated,
        notes: activity.notes,
        createdAt: activity.created_at,
        updatedAt: activity.updated_at,
        // Map nested service if it exists
        service: activity.service ? {
          id: activity.service.id,
          userId: activity.service.user_id,
          serviceName: activity.service.service_name,
          serviceCategory: activity.service.service_category,
          color: activity.service.color,
          defaultPrice: activity.service.default_price,
          isAutoPricingEnabled: activity.service.is_auto_pricing_enabled,
          displayOrder: activity.service.display_order,
          isActive: activity.service.is_active,
          notes: activity.service.notes,
          createdAt: activity.service.created_at,
          updatedAt: activity.service.updated_at,
        } : undefined,
      }));
      
      setActivities(mappedActivities);
    } catch (err) {
      console.error('Error fetching service activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [dbUserId, year, month]);

  const createActivity = async (activityData: {
    serviceId: string;
    year: number;
    month: number;
    weekOfMonth: number;
    weekStartDate: string;
    weekEndDate: string;
    appointmentCount: number;
    totalRevenue?: number;
  }) => {
    if (!dbUserId) throw new Error('User not authenticated');

    // Get service to check if auto-pricing is enabled
    const { data: service } = await supabase
      .from('services')
      .select('default_price, is_auto_pricing_enabled')
      .eq('id', activityData.serviceId)
      .single();

    let totalRevenue = activityData.totalRevenue || 0;
    let isAutoCalculated = false;

    // Auto-calculate revenue if enabled and no manual revenue provided
    if (service?.is_auto_pricing_enabled && service.default_price && !activityData.totalRevenue) {
      totalRevenue = Number(service.default_price) * activityData.appointmentCount;
      isAutoCalculated = true;
    }

    // Use upsert to update if exists, insert if not
    const { data, error } = await supabase
      .from('service_activities')
      .upsert({
        user_id: dbUserId,
        service_id: activityData.serviceId,
        year: activityData.year,
        month: activityData.month,
        week_of_month: activityData.weekOfMonth,
        week_start_date: activityData.weekStartDate,
        week_end_date: activityData.weekEndDate,
        appointment_count: activityData.appointmentCount,
        total_revenue: totalRevenue,
        is_auto_calculated: isAutoCalculated,
      }, {
        onConflict: 'service_id,year,month,week_of_month', // Unique constraint columns
      })
      .select()
      .single();

    if (error) throw error;
    
    await fetchActivities();
    return data;
  };

  const updateActivity = async (activityId: string, updates: {
    appointmentCount?: number;
    totalRevenue?: number;
  }) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('service_activities')
      .update({
        appointment_count: updates.appointmentCount,
        total_revenue: updates.totalRevenue,
        is_auto_calculated: false, // Manual update disables auto-calculation
      })
      .eq('id', activityId)
      .eq('user_id', dbUserId)
      .select()
      .single();

    if (error) throw error;
    
    await fetchActivities();
    return data;
  };

  const deleteActivity = async (activityId: string) => {
    if (!dbUserId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('service_activities')
      .delete()
      .eq('id', activityId)
      .eq('user_id', dbUserId);

    if (error) throw error;
    
    await fetchActivities();
  };

  return {
    activities,
    loading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    refreshActivities: fetchActivities,
  };
}

/**
 * Hook for getting monthly service summaries
 */
export function useMonthlyServiceSummary(year: number, month: number) {
  const { dbUserId } = useAuthContext();
  const [summaries, setSummaries] = useState<MonthlyServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummaries = async () => {
      if (!dbUserId) return;

      try {
        setLoading(true);
        setError(null);

        // Use the service_monthly_summary view
        const { data, error: fetchError } = await supabase
          .from('service_monthly_summary')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('year', year)
          .eq('month', month);

        if (fetchError) throw fetchError;
        setSummaries(data || []);
      } catch (err) {
        console.error('Error fetching monthly summaries:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch summaries');
      } finally {
        setLoading(false);
      }
    };

    fetchSummaries();
  }, [dbUserId, year, month]);

  return { summaries, loading, error };
}

/**
 * Hook for getting service revenue data for charting
 * Returns monthly revenue totals for each service across a year
 */
export function useServiceRevenueData(year: number) {
  const { dbUserId } = useAuthContext();
  const { services } = useServices();
  const [revenueData, setRevenueData] = useState<{
    serviceId: string;
    serviceName: string;
    color: string;
    monthlyRevenue: { month: number; revenue: number }[];
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!dbUserId || services.length === 0) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all activities for the year
        const { data: activities, error: fetchError } = await supabase
          .from('service_activities')
          .select('service_id, month, total_revenue')
          .eq('user_id', dbUserId)
          .eq('year', year);

        if (fetchError) throw fetchError;

        // Aggregate by service and month
        const serviceMap = new Map<string, { month: number; revenue: number }[]>();
        
        activities?.forEach((activity) => {
          if (!serviceMap.has(activity.service_id)) {
            serviceMap.set(activity.service_id, []);
          }
          
          const existing = serviceMap.get(activity.service_id)!;
          const monthData = existing.find(m => m.month === activity.month);
          
          if (monthData) {
            monthData.revenue += Number(activity.total_revenue || 0);
          } else {
            existing.push({
              month: activity.month,
              revenue: Number(activity.total_revenue || 0)
            });
          }
        });

        // Map to service details
        const chartData = Array.from(serviceMap.entries()).map(([serviceId, monthlyData]) => {
          const service = services.find(s => s.id === serviceId);
          return {
            serviceId,
            serviceName: service?.serviceName || 'Unknown Service',
            color: service?.color || '#3B82F6',
            monthlyRevenue: monthlyData.sort((a, b) => a.month - b.month)
          };
        });

        setRevenueData(chartData);
      } catch (err) {
        console.error('Error fetching service revenue data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch revenue data');
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [dbUserId, year, services]);

  return {
    revenueData,
    loading,
    error,
  };
}

/**
 * Utility function to calculate week of month from a date
 */
export function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDayOfMonth.getDay();
  
  return Math.ceil((dayOfMonth + dayOfWeek) / 7);
}

/**
 * Utility function to get week start and end dates
 */
export function getWeekDates(date: Date): { start: Date; end: Date } {
  const dayOfWeek = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  
  return { start, end };
}
