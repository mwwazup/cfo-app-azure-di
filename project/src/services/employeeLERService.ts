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
  employee_id?: string;
  period_name: string;
  start_date: string;
  end_date: string;
  base_rate?: number;  // Hourly rate at time of pay period creation
}

export interface DailyRecord {
  id?: string;
  pay_period_id?: string;
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
    console.error('Error updating employee info:', error);
    return false;
  }

  return true;
}

// ============================================
// PAY PERIODS
// ============================================

export async function getPayPeriods(employeeId: string): Promise<PayPeriod[]> {
  const { data, error } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching pay periods:', error);
    return [];
  }

  return data || [];
}

export async function createPayPeriod(employeeId: string, period: PayPeriod, baseRate: number): Promise<PayPeriod | null> {
  const { data, error } = await supabase
    .from('pay_periods')
    .insert([{
      employee_id: employeeId,
      period_name: period.period_name,
      start_date: period.start_date,
      end_date: period.end_date,
      base_rate: baseRate  // Store the base rate at time of pay period creation
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating pay period:', error);
    return null;
  }

  return data;
}

export async function updatePayPeriod(payPeriodId: string, updates: { period_name?: string; start_date?: string; end_date?: string; base_rate?: number }): Promise<boolean> {
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

// ============================================
// DAILY RECORDS
// ============================================

export async function getDailyRecords(payPeriodId: string): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .select('*')
    .eq('pay_period_id', payPeriodId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily records:', error);
    return [];
  }

  return data || [];
}

export async function createDailyRecord(payPeriodId: string, record: DailyRecord): Promise<DailyRecord | null> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .insert([{
      pay_period_id: payPeriodId,
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
      notes: record.notes
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating daily record:', error);
    return null;
  }

  return data;
}

export async function updateDailyRecord(recordId: string, record: DailyRecord): Promise<boolean> {
  const { error } = await supabase
    .from('employee_daily_records')
    .update({
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
      notes: record.notes
    })
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
      overtimeMultiplier: 1.5
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
      overtimeMultiplier: 1.5
    };
  }

  if (!data) {
    return {
      overheadPercent: 32,
      bonusThresholdMin: 25,
      bonusThresholdMax: 100,
      overtimeHoursDaily: 12,
      overtimeMultiplier: 1.5
    };
  }

  return {
    overheadPercent: parseFloat(data.overhead_percent),
    bonusThresholdMin: parseFloat(data.bonus_threshold_min),
    bonusThresholdMax: parseFloat(data.bonus_threshold_max),
    overtimeHoursDaily: parseFloat(data.overtime_hours_daily),
    overtimeMultiplier: parseFloat(data.overtime_multiplier)
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
      overtime_multiplier: settings.overtimeMultiplier
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving company settings:', error);
    return false;
  }

  return true;
}
