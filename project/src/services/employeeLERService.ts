import { supabase } from '../config/supabaseClient';

// Types
export interface EmployeeInfo {
  id?: string;
  user_id?: string;
  name: string;
  position: string;
  current_base_rate: number;
}

export interface PayPeriod {
  id?: string;
  user_id?: string;  // Clerk user ID (company owner) - company-wide periods
  period_name: string;
  start_date: string;
  end_date: string;
  year: number;  // Calendar year for filtering (e.g., 2024, 2025)
}

export interface DailyRecord {
  id?: string;
  pay_period_id?: string;
  employee_id?: string;
  work_day: string;
  date: string;
  called_out: boolean;
  number_of_jobs: number;
  job_types: {
    [serviceName: string]: number;
  };
  total_job_revenue: number;
  total_hours_worked: number;
  total_job_time: number;
  base_rate: number;  // Hourly rate used for this daily record
  employee_base_pay: number;
  overtime_hours: number;
  overtime_pay: number;
  cogs_no_labor: number;
  cogs_no_labor_percent: number;
  overhead_costs_percent: number;
  gross_profit_before_bonus: number;
  gross_profit_before_bonus_percent: number;
  ler: number;
  qualify_for_bonus: boolean;
  bonus_qualified_for_percent: number;
  appointment_based_bonus: number;
  tip_amount: number;
  total_employee_pay: number;
  daily_hourly_with_tips_and_bonus: number;
  daily_net_profit_after_bonus: number;
  daily_net_profit_after_bonus_percent: number;
  notes: string;
  service_breakdown?: {
    services: Array<{
      serviceId: string;
      serviceName: string;
      jobs: number;
      hours: number;
      revenue: number;
    }>;
  };
}

export interface COGSSettings {
  grill: number;
  oven: number;
  range: number;
  ventHood: number;
}

export interface CompanySettings {
  overheadPercent: number;
  bonusThresholdMin: number;
  bonusThresholdMax: number;
  overtimeHoursDaily: number;
  overtimeMultiplier: number;
  // Pay schedule configuration
  paySchedule?: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'custom';
  payDayOfWeek?: number;  // 0=Sunday, 5=Friday
  payReferenceDate?: string;  // For bi-weekly calculations
  paySemiMonthlyDates?: [number, number];  // e.g., [1, 15]
  // Appointment bonus configuration
  enableAppointmentBonus?: boolean;
  appointmentBonus3Jobs?: number;
  appointmentBonus4Jobs?: number;
  appointmentBonus5Jobs?: number;
  appointmentBonus6PlusJobs?: number;
}

// ============================================
// EMPLOYEE INFO
// ============================================

// Get all employees for a manager
export async function getAllEmployees(userId: string): Promise<EmployeeInfo[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('employee_info')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }

  return data ? data.map(emp => ({
    id: emp.id,
    user_id: emp.user_id,
    name: emp.name,
    position: emp.position,
    current_base_rate: parseFloat(emp.current_base_rate)
  })) : [];
}

// Get single employee by ID
export async function getEmployeeById(employeeId: string): Promise<EmployeeInfo | null> {
  if (!employeeId) return null;

  const { data, error } = await supabase
    .from('employee_info')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee info:', error);
    return null;
  }

  return data ? {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    position: data.position,
    current_base_rate: parseFloat(data.current_base_rate)
  } : null;
}

// Legacy function - kept for backward compatibility
export async function getEmployeeInfo(userId: string): Promise<EmployeeInfo | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('employee_info')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee info (legacy function):', error);
    console.error('This is expected if using multi-employee mode. Use getAllEmployees() instead.');
    return null;
  }

  return data ? {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    position: data.position,
    current_base_rate: parseFloat(data.current_base_rate)
  } : null;
}

export async function createEmployeeInfo(userId: string, info: EmployeeInfo): Promise<EmployeeInfo | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('employee_info')
    .insert([{
      user_id: userId,
      name: info.name,
      position: info.position,
      current_base_rate: info.current_base_rate
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating employee info:', error);
    return null;
  }

  return data ? {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    position: data.position,
    current_base_rate: parseFloat(data.current_base_rate)
  } : null;
}

// Update employee by ID (for multi-employee support)
export async function updateEmployeeById(employeeId: string, info: Partial<EmployeeInfo>): Promise<boolean> {
  if (!employeeId) return false;

  const { error } = await supabase
    .from('employee_info')
    .update({
      name: info.name,
      position: info.position,
      current_base_rate: info.current_base_rate
    })
    .eq('id', employeeId);

  if (error) {
    console.error('Error updating employee info:', error);
    return false;
  }

  return true;
}

// Legacy function - updates first employee for user
export async function updateEmployeeInfo(userId: string, info: EmployeeInfo): Promise<boolean> {
  if (!userId) return false;

  const { error } = await supabase
    .from('employee_info')
    .update({
      name: info.name,
      position: info.position,
      current_base_rate: info.current_base_rate
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating employee info (legacy):', error);
    return false;
  }

  return true;
}

// ============================================
// PAY PERIODS
// ============================================

// Get all company-wide pay periods for a user
export async function getPayPeriods(userId: string): Promise<PayPeriod[]> {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching pay periods:', error);
    return [];
  }

  return data || [];
}

// Create a company-wide pay period
export async function createPayPeriod(userId: string, period: PayPeriod): Promise<PayPeriod | null> {
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from('pay_periods')
    .insert([{
      user_id: userId,
      period_name: period.period_name,
      start_date: period.start_date,
      end_date: period.end_date,
      year: period.year
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating pay period:', error);
    return null;
  }

  return data;
}

// Update a pay period
export async function updatePayPeriod(payPeriodId: string, updates: { period_name?: string; start_date?: string; end_date?: string; year?: number }): Promise<boolean> {
  const { error } = await supabase
    .from('pay_periods')
    .update(updates)
    .eq('id', payPeriodId);

  if (error) {
    console.error('Error updating pay period:', error);
    return false;
  }

  return true;
}

export async function deletePayPeriod(payPeriodId: string): Promise<boolean> {
  // First check if there are any daily records
  const { data: records } = await supabase
    .from('employee_daily_records')
    .select('id')
    .eq('pay_period_id', payPeriodId)
    .limit(1);

  if (records && records.length > 0) {
    console.error('Cannot delete pay period with existing daily records');
    return false;
  }

  const { error } = await supabase
    .from('pay_periods')
    .delete()
    .eq('id', payPeriodId);

  if (error) {
    console.error('Error deleting pay period:', error);
    return false;
  }

  return true;
}

// Delete all pay periods for a company (user)
export async function deleteAllPayPeriodsForUser(userId: string): Promise<{ success: boolean; deletedCount: number; message?: string }> {
  if (!userId) {
    return {
      success: false,
      deletedCount: 0,
      message: 'User ID is required.'
    };
  }
  
  // Get all pay period IDs for this user
  const { data: periods } = await supabase
    .from('pay_periods')
    .select('id')
    .eq('user_id', userId);

  if (!periods || periods.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      message: 'No pay periods to delete.'
    };
  }

  const periodIds = periods.map(p => p.id);
  const count = periodIds.length;

  // Check if there are any daily records for these pay periods
  const { data: records } = await supabase
    .from('employee_daily_records')
    .select('id')
    .in('pay_period_id', periodIds)
    .limit(1);

  if (records && records.length > 0) {
    return {
      success: false,
      deletedCount: 0,
      message: 'Cannot delete pay periods that have daily records. Please delete all daily records first.'
    };
  }

  // Delete all pay periods for this user
  const { error } = await supabase
    .from('pay_periods')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting all pay periods:', error);
    return {
      success: false,
      deletedCount: 0,
      message: 'Error deleting pay periods. Please try again.'
    };
  }

  return {
    success: true,
    deletedCount: count
  };
}

// ============================================
// DAILY RECORDS
// ============================================

export async function getDailyRecords(payPeriodId: string, employeeId?: string): Promise<DailyRecord[]> {
  let query = supabase
    .from('employee_daily_records')
    .select('*')
    .eq('pay_period_id', payPeriodId);
  
  // Filter by employee if provided (for multi-employee support)
  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  
  const { data, error } = await query.order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily records:', error);
    return [];
  }

  return data || [];
}

export async function createDailyRecord(payPeriodId: string, record: DailyRecord, employeeId?: string): Promise<DailyRecord | null> {
  console.log('🔧 createDailyRecord called with:', {
    payPeriodId,
    employeeId,
    recordEmployeeId: record.employee_id,
    finalEmployeeId: employeeId || record.employee_id,
    date: record.date
  });
  
  const { data, error } = await supabase
    .from('employee_daily_records')
    .insert([{
      pay_period_id: payPeriodId,
      employee_id: employeeId || record.employee_id,
      work_day: record.work_day,
      date: record.date,
      called_out: record.called_out,
      number_of_jobs: record.number_of_jobs,
      job_types: record.job_types,
      total_job_revenue: record.total_job_revenue,
      total_hours_worked: record.total_hours_worked,
      total_job_time: record.total_job_time,
      base_rate: record.base_rate,
      employee_base_pay: record.employee_base_pay,
      overtime_hours: record.overtime_hours,
      overtime_pay: record.overtime_pay,
      cogs_no_labor: record.cogs_no_labor,
      cogs_no_labor_percent: record.cogs_no_labor_percent,
      overhead_costs_percent: record.overhead_costs_percent,
      gross_profit_before_bonus: record.gross_profit_before_bonus,
      gross_profit_before_bonus_percent: record.gross_profit_before_bonus_percent,
      ler: record.ler,
      qualify_for_bonus: record.qualify_for_bonus,
      bonus_qualified_for_percent: record.bonus_qualified_for_percent,
      appointment_based_bonus: record.appointment_based_bonus,
      tip_amount: record.tip_amount,
      total_employee_pay: record.total_employee_pay,
      daily_hourly_with_tips_and_bonus: record.daily_hourly_with_tips_and_bonus,
      daily_net_profit_after_bonus: record.daily_net_profit_after_bonus,
      daily_net_profit_after_bonus_percent: record.daily_net_profit_after_bonus_percent,
      notes: record.notes,
      service_breakdown: record.service_breakdown || { services: [] }
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating daily record:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return null;
  }

  console.log('✅ Daily record created successfully:', data?.id);
  return data;
}

export async function updateDailyRecord(recordId: string, record: DailyRecord): Promise<boolean> {
  const updateData: any = {
      work_day: record.work_day,
      date: record.date,
      called_out: record.called_out,
      number_of_jobs: record.number_of_jobs,
      job_types: record.job_types,
      total_job_revenue: record.total_job_revenue,
      total_hours_worked: record.total_hours_worked,
      total_job_time: record.total_job_time,
      base_rate: record.base_rate,
      employee_base_pay: record.employee_base_pay,
      overtime_hours: record.overtime_hours,
      overtime_pay: record.overtime_pay,
      cogs_no_labor: record.cogs_no_labor,
      cogs_no_labor_percent: record.cogs_no_labor_percent,
      overhead_costs_percent: record.overhead_costs_percent,
      gross_profit_before_bonus: record.gross_profit_before_bonus,
      gross_profit_before_bonus_percent: record.gross_profit_before_bonus_percent,
      ler: record.ler,
      qualify_for_bonus: record.qualify_for_bonus,
      bonus_qualified_for_percent: record.bonus_qualified_for_percent,
      appointment_based_bonus: record.appointment_based_bonus,
      tip_amount: record.tip_amount,
      total_employee_pay: record.total_employee_pay,
      daily_hourly_with_tips_and_bonus: record.daily_hourly_with_tips_and_bonus,
      daily_net_profit_after_bonus: record.daily_net_profit_after_bonus,
      daily_net_profit_after_bonus_percent: record.daily_net_profit_after_bonus_percent,
      notes: record.notes,
      service_breakdown: record.service_breakdown || { services: [] }
    };
  
  // Include employee_id if provided
  if (record.employee_id) {
    updateData.employee_id = record.employee_id;
  }
  
  const { error } = await supabase
    .from('employee_daily_records')
    .update(updateData)
    .eq('id', recordId);

  if (error) {
    console.error('Error updating daily record:', error);
    return false;
  }

  return true;
}

export async function deleteDailyRecord(recordId: string): Promise<boolean> {
  const { error } = await supabase
    .from('employee_daily_records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('Error deleting daily record:', error);
    return false;
  }

  return true;
}

// ============================================
// COGS SETTINGS
// ============================================

// Get services with IDs and names
export async function getServices(userId: string): Promise<Array<{ id: string; serviceName: string }>> {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('services')
    .select('id, service_name')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data?.map(service => ({
    id: service.id,
    serviceName: service.service_name
  })) || [];
}

// Get services with COGS costs from services table
export async function getServicesWithCOGS(userId: string): Promise<{ [key: string]: number }> {
  if (!userId) {
    return {};
  }

  const { data, error } = await supabase
    .from('services')
    .select('service_name, cogs_cost')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching services with COGS:', error);
    return {};
  }

  // Convert to object: { "grill": 19.20, "oven": 16.20, ... }
  const cogsMap: { [key: string]: number } = {};
  data?.forEach(service => {
    if (service.service_name && service.cogs_cost) {
      cogsMap[service.service_name] = parseFloat(service.cogs_cost);
    }
  });

  return cogsMap;
}

// Legacy function - kept for backward compatibility
export async function getCOGSSettings(userId: string): Promise<COGSSettings> {
  if (!userId) {
    return { grill: 19.20, oven: 16.20, range: 15.00, ventHood: 20.00 };
  }

  const { data, error } = await supabase
    .from('cogs_settings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching COGS settings:', error);
    return { grill: 19.20, oven: 16.20, range: 15.00, ventHood: 20.00 };
  }

  // Convert array to object
  const settings: COGSSettings = { grill: 19.20, oven: 16.20, range: 15.00, ventHood: 20.00 };
  data?.forEach(item => {
    if (item.service_name === 'grill') settings.grill = parseFloat(item.cost_per_service);
    if (item.service_name === 'oven') settings.oven = parseFloat(item.cost_per_service);
    if (item.service_name === 'range') settings.range = parseFloat(item.cost_per_service);
    if (item.service_name === 'ventHood') settings.ventHood = parseFloat(item.cost_per_service);
  });

  return settings;
}

export async function saveCOGSSettings(userId: string, settings: COGSSettings): Promise<boolean> {
  if (!userId) return false;

  // Upsert each service
  const services = [
    { service_name: 'grill', cost_per_service: settings.grill },
    { service_name: 'oven', cost_per_service: settings.oven },
    { service_name: 'range', cost_per_service: settings.range },
    { service_name: 'ventHood', cost_per_service: settings.ventHood }
  ];

  for (const service of services) {
    const { error } = await supabase
      .from('cogs_settings')
      .upsert({
        user_id: userId,
        service_name: service.service_name,
        cost_per_service: service.cost_per_service
      }, {
        onConflict: 'user_id,service_name'
      });

    if (error) {
      console.error('Error saving COGS setting:', error);
      return false;
    }
  }

  return true;
}

// ============================================
// COMPANY SETTINGS
// ============================================

export async function getCompanySettings(userId: string): Promise<CompanySettings> {
  if (!userId) {
    return {
      overheadPercent: 32,
      bonusThresholdMin: 25,
      bonusThresholdMax: 100,
      overtimeHoursDaily: 12,
      overtimeMultiplier: 1.5,
      paySchedule: 'bi-weekly',
      payDayOfWeek: 5,  // Friday
      payReferenceDate: undefined,
      paySemiMonthlyDates: [1, 16]
    };
  }

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching company settings:', error);
    return {
      overheadPercent: 32,
      bonusThresholdMin: 25,
      bonusThresholdMax: 100,
      overtimeHoursDaily: 12,
      overtimeMultiplier: 1.5,
      paySchedule: 'bi-weekly',
      payDayOfWeek: 5,  // Friday
      payReferenceDate: undefined,
      paySemiMonthlyDates: [1, 16]
    };
  }

  if (!data) {
    return {
      overheadPercent: 32,
      bonusThresholdMin: 25,
      bonusThresholdMax: 100,
      overtimeHoursDaily: 12,
      overtimeMultiplier: 1.5,
      paySchedule: 'bi-weekly',
      payDayOfWeek: 5,  // Friday
      payReferenceDate: undefined,
      paySemiMonthlyDates: [1, 15]
    };
  }

  return {
    overheadPercent: parseFloat(data.overhead_percent) || 32,
    bonusThresholdMin: parseFloat(data.bonus_threshold_min) || 25,
    bonusThresholdMax: parseFloat(data.bonus_threshold_max) || 100,
    overtimeHoursDaily: parseFloat(data.overtime_hours_daily) || 12,
    overtimeMultiplier: parseFloat(data.overtime_multiplier) || 1.5,
    paySchedule: data.pay_schedule || 'bi-weekly',
    payDayOfWeek: data.pay_day_of_week !== null ? parseInt(data.pay_day_of_week) : 5,
    payReferenceDate: data.pay_reference_date || undefined,
    paySemiMonthlyDates: data.pay_semi_monthly_dates ? JSON.parse(data.pay_semi_monthly_dates) : [1, 15],
    enableAppointmentBonus: data.enable_appointment_bonus !== undefined ? data.enable_appointment_bonus : true,
    appointmentBonus3Jobs: parseFloat(data.appointment_bonus_3_jobs) || 7,
    appointmentBonus4Jobs: parseFloat(data.appointment_bonus_4_jobs) || 10,
    appointmentBonus5Jobs: parseFloat(data.appointment_bonus_5_jobs) || 15,
    appointmentBonus6PlusJobs: parseFloat(data.appointment_bonus_6_plus_jobs) || 20
  };
}

export async function saveCompanySettings(userId: string, settings: CompanySettings): Promise<boolean> {
  if (!userId) return false;

  const { error } = await supabase
    .from('company_settings')
    .upsert({
      user_id: userId,
      overhead_percent: settings.overheadPercent,
      bonus_threshold_min: settings.bonusThresholdMin,
      bonus_threshold_max: settings.bonusThresholdMax,
      overtime_hours_daily: settings.overtimeHoursDaily,
      overtime_multiplier: settings.overtimeMultiplier,
      pay_schedule: settings.paySchedule || 'bi-weekly',
      pay_day_of_week: settings.payDayOfWeek !== undefined ? settings.payDayOfWeek : 5,
      pay_reference_date: settings.payReferenceDate || null,
      pay_semi_monthly_dates: settings.paySemiMonthlyDates ? JSON.stringify(settings.paySemiMonthlyDates) : JSON.stringify([1, 15]),
      enable_appointment_bonus: settings.enableAppointmentBonus !== undefined ? settings.enableAppointmentBonus : true,
      appointment_bonus_3_jobs: settings.appointmentBonus3Jobs || 7,
      appointment_bonus_4_jobs: settings.appointmentBonus4Jobs || 10,
      appointment_bonus_5_jobs: settings.appointmentBonus5Jobs || 15,
      appointment_bonus_6_plus_jobs: settings.appointmentBonus6PlusJobs || 20
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving company settings:', error);
    return false;
  }

  return true;
}
