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
  // Crew tracking fields (Phase 2)
  crew_id?: string;
  is_crew_job?: boolean;
  tracking_mode?: 'employee' | 'crew';
  // Record type for hybrid tracking
  record_type?: 'solo' | 'crew';
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
  // Crew capacity configuration
  numberOfCrews?: number;  // How many crews do you run?
  employeesPerCrew?: number;  // How many employees per crew?
  monthlyCrewCapacity?: number;  // Expected revenue per crew per month
  // Crew-specific bonus thresholds (crews have higher labor costs)
  crewBonusThresholdMin?: number;  // Default 15% (lower than solo 25%)
  crewBonusThresholdMax?: number;  // Default 100%
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

// Bulk delete daily records
export const bulkDeleteDailyRecords = async (recordIds: string[]): Promise<{ success: number; errors: string[] }> => {
  try {
    const errors: string[] = [];
    let success = 0;
    
    // Delete in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('employee_daily_records')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error('Bulk delete error:', error);
        errors.push(`Failed to delete batch starting at index ${i}: ${error.message}`);
      } else {
        success += batch.length;
      }
    }
    
    return { success, errors };
  } catch (error) {
    console.error('Bulk delete error:', error);
    return { success: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
};

// Get daily records for a specific employee within a pay period
export async function getDailyRecordsForEmployee(employeeId: string, payPeriodId: string): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('pay_period_id', payPeriodId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily records for employee:', error);
    return [];
  }

  return data || [];
}

// Get or create pay period for a specific date
// Used for crew entry mode where we need to find/create periods for multiple employees
export async function getOrCreatePayPeriod(
  userId: string,
  employeeId: string,
  date: string,
  paySchedule: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'custom' = 'bi-weekly',
  payDayOfWeek: number = 5,
  payReferenceDate?: string,
  paySemiMonthlyDates?: [number, number]
): Promise<PayPeriod | null> {
  console.log(`🔍 getOrCreatePayPeriod called with:`, {
    userId,
    employeeId,
    date,
    paySchedule,
    payDayOfWeek,
    payReferenceDate,
    paySemiMonthlyDates
  });
  
  if (!userId || !date) {
    console.error('❌ Missing userId or date');
    return null;
  }
  
  // Parse the date without timezone conversion
  const [year, month, day] = date.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day); // month is 0-indexed
  console.log(`📅 Target date: ${targetDate.toISOString()}`);
  
  // Get existing pay periods for this user
  console.log('📋 Fetching existing pay periods...');
  const existingPeriods = await getPayPeriods(userId);
  console.log(`📊 Found ${existingPeriods.length} existing periods:`, existingPeriods.map(p => ({ id: p.id, name: p.period_name, start: p.start_date, end: p.end_date })));
  
  // Find a period that contains this date
  const matchingPeriod = existingPeriods.find(p => {
    const [sYear, sMonth, sDay] = p.start_date.split('-').map(Number);
    const [eYear, eMonth, eDay] = p.end_date.split('-').map(Number);
    const startDate = new Date(sYear, sMonth - 1, sDay);
    const endDate = new Date(eYear, eMonth - 1, eDay);
    return targetDate >= startDate && targetDate <= endDate;
  });
  
  if (matchingPeriod) {
    console.log(`✅ Found matching period: ${matchingPeriod.period_name}`);
    return matchingPeriod;
  }
  
  console.log('⚠️ No matching period found, creating new one...');
  
  // No matching period found - create one
  // Calculate period boundaries based on pay schedule
  let periodStart: Date;
  let periodEnd: Date;
  let periodName: string;
  
  if (paySchedule === 'bi-weekly') {
    // Find the start of the bi-weekly period
    // Use reference date or default to a known Friday
    let refDate: Date;
    if (payReferenceDate) {
      const [rYear, rMonth, rDay] = payReferenceDate.split('-').map(Number);
      refDate = new Date(rYear, rMonth - 1, rDay);
    } else {
      refDate = new Date(2024, 0, 5); // 2024-01-05
    }
    const daysSinceRef = Math.floor((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const periodNumber = Math.floor(daysSinceRef / 14);
    
    periodStart = new Date(refDate.getTime() + periodNumber * 14 * 24 * 60 * 60 * 1000);
    periodEnd = new Date(periodStart.getTime() + 13 * 24 * 60 * 60 * 1000);
    
    const startMonth = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endMonth = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    periodName = `${startMonth} - ${endMonth}, ${year}`;
  } else if (paySchedule === 'semi-monthly') {
    const [firstDate, secondDate] = paySemiMonthlyDates || [1, 16];
    const day = targetDate.getDate();
    
    if (day < secondDate) {
      periodStart = new Date(year, targetDate.getMonth(), firstDate);
      periodEnd = new Date(year, targetDate.getMonth(), secondDate - 1);
    } else {
      periodStart = new Date(year, targetDate.getMonth(), secondDate);
      // End on last day of month
      periodEnd = new Date(year, targetDate.getMonth() + 1, 0);
    }
    
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'long' });
    periodName = `${monthName} ${periodStart.getDate()}-${periodEnd.getDate()}, ${year}`;
  } else if (paySchedule === 'monthly') {
    periodStart = new Date(year, targetDate.getMonth(), 1);
    periodEnd = new Date(year, targetDate.getMonth() + 1, 0);
    periodName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else if (paySchedule === 'weekly') {
    // Find the start of the week (based on payDayOfWeek)
    const currentDay = targetDate.getDay();
    const daysToStart = (currentDay - payDayOfWeek + 7) % 7;
    periodStart = new Date(targetDate.getTime() - daysToStart * 24 * 60 * 60 * 1000);
    periodEnd = new Date(periodStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    const startStr = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    periodName = `Week of ${startStr} - ${endStr}, ${year}`;
  } else {
    // Custom - default to monthly
    periodStart = new Date(year, targetDate.getMonth(), 1);
    periodEnd = new Date(year, targetDate.getMonth() + 1, 0);
    periodName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  
  // Format dates as YYYY-MM-DD (local timezone safe)
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  console.log(`📝 Creating new pay period:`, {
    period_name: periodName,
    start_date: formatDate(periodStart),
    end_date: formatDate(periodEnd),
    year
  });
  
  // Create the new period
  const newPeriod = await createPayPeriod(userId, {
    period_name: periodName,
    start_date: formatDate(periodStart),
    end_date: formatDate(periodEnd),
    year
  });
  
  console.log(`✅ Created new period:`, newPeriod);
  
  return newPeriod;
}

// Get all daily records for a specific date (across all employees)
export async function getDailyRecordsForDate(date: string): Promise<DailyRecord[]> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching daily records for date:', error);
    throw error;
  }
  
  return (data || []).map(record => ({
    ...record,
    serviceBreakdown: record.service_breakdown?.services || []
  }));
}

// Get all daily records for a specific pay period and employee (used for checking duplicates)
// Now also returns is_crew_job to allow one solo + one crew record per day
export async function getDailyRecordsForPeriod(
  payPeriodId: string, 
  employeeId?: string
): Promise<Array<{ date: string; is_crew_job: boolean }>> {
  let query = supabase
    .from('employee_daily_records')
    .select('date, is_crew_job')
    .eq('pay_period_id', payPeriodId);
  
  // Filter by employee if provided
  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching daily records for period:', error);
    return [];
  }
  
  return (data || []).map(r => ({
    date: r.date,
    is_crew_job: r.is_crew_job || false
  }));
}

// Find all linked crew records (same date, same crew_id, is_crew_job=true)
// Used for editing crew records - when one is edited, all linked records should be updated
export async function findLinkedCrewRecords(
  userId: string,
  date: string,
  crewId: string
): Promise<Array<{ id: string; employee_id: string; pay_period_id: string }>> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .select('id, employee_id, pay_period_id')
    .eq('user_id', userId)
    .eq('date', date)
    .eq('crew_id', crewId)
    .eq('is_crew_job', true);
  
  if (error) {
    console.error('Error finding linked crew records:', error);
    return [];
  }
  
  return data || [];
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

  // Transform service_breakdown from { services: [] } to [] for frontend compatibility
  // Handle both wrapped and unwrapped formats
  return (data || []).map(record => ({
    ...record,
    serviceBreakdown: record.service_breakdown?.services || record.service_breakdown || []
  }));
}

export async function createDailyRecord(payPeriodId: string, record: DailyRecord, employeeId?: string): Promise<DailyRecord | null> {
  console.log('🔧 createDailyRecord called with:', {
    payPeriodId,
    employeeId,
    recordEmployeeId: record.employee_id,
    finalEmployeeId: employeeId || record.employee_id,
    date: record.date,
    isCrewJob: record.is_crew_job,
    crewId: record.crew_id
  });
  
  // Validate date is within pay period
  if (payPeriodId && record.date) {
    console.log('📅 Validating date against pay period...');
    // This is a basic check - you may need to fetch the pay period dates to validate properly
    console.log('⚠️ TODO: Add proper date validation against pay period');
  }
  
  // Log the full record being inserted
  const recordToInsert = {
    pay_period_id: payPeriodId, // Use the parameter, not record.pay_period_id
    employee_id: employeeId || record.employee_id, // Use parameter as priority
    work_day: record.work_day,
    date: record.date,
    called_out: record.called_out,
    number_of_jobs: record.number_of_jobs,
    job_types: record.job_types || {},
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
    service_breakdown: record.service_breakdown || { services: [] },
    // Crew tracking fields
    crew_id: record.crew_id || null,
    is_crew_job: record.is_crew_job || false,
    tracking_mode: record.tracking_mode || 'employee',
    record_type: record.is_crew_job ? 'crew' : 'solo'
  };
  
  console.log('📝 Record to insert:', {
    ...recordToInsert,
    job_types: recordToInsert.job_types,
    service_breakdown: recordToInsert.service_breakdown
  });
  
  const { data, error } = await supabase
    .from('employee_daily_records')
    .insert([recordToInsert])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating daily record:', error);
    console.error('Raw error JSON:', JSON.stringify(error, null, 2));
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    
    // Check if it's a duplicate/unique constraint error
    if (error.code === '23505') {
      console.error('⚠️ This appears to be a duplicate record error');
      console.error('Check if a record already exists for this date/employee/pay period');
    }
    
    return null;
  }

  console.log('✅ Record created successfully:', data);
  return data;
}

export async function getDailyRecordById(recordId: string): Promise<DailyRecord | null> {
  const { data, error } = await supabase
    .from('employee_daily_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (error) {
    console.error('Error fetching daily record by ID:', error);
    return null;
  }

  return data;
}

export async function updateDailyRecord(recordId: string, record: Partial<DailyRecord>): Promise<boolean> {
  // Build update object with only defined fields to avoid overwriting with undefined
  const updateData: any = {};
  
  // Only include fields that are explicitly provided (not undefined)
  if (record.pay_period_id !== undefined) updateData.pay_period_id = record.pay_period_id;
  if (record.employee_id !== undefined) updateData.employee_id = record.employee_id;
  if (record.work_day !== undefined) updateData.work_day = record.work_day;
  if (record.date !== undefined) updateData.date = record.date;
  if (record.called_out !== undefined) updateData.called_out = record.called_out;
  if (record.number_of_jobs !== undefined) updateData.number_of_jobs = record.number_of_jobs;
  if (record.job_types !== undefined) updateData.job_types = record.job_types;
  if (record.total_job_revenue !== undefined) updateData.total_job_revenue = record.total_job_revenue;
  if (record.total_hours_worked !== undefined) updateData.total_hours_worked = record.total_hours_worked;
  if (record.total_job_time !== undefined) updateData.total_job_time = record.total_job_time;
  if (record.base_rate !== undefined) updateData.base_rate = record.base_rate;
  if (record.employee_base_pay !== undefined) updateData.employee_base_pay = record.employee_base_pay;
  if (record.overtime_hours !== undefined) updateData.overtime_hours = record.overtime_hours;
  if (record.overtime_pay !== undefined) updateData.overtime_pay = record.overtime_pay;
  if (record.cogs_no_labor !== undefined) updateData.cogs_no_labor = record.cogs_no_labor;
  if (record.cogs_no_labor_percent !== undefined) updateData.cogs_no_labor_percent = record.cogs_no_labor_percent;
  if (record.overhead_costs_percent !== undefined) updateData.overhead_costs_percent = record.overhead_costs_percent;
  if (record.gross_profit_before_bonus !== undefined) updateData.gross_profit_before_bonus = record.gross_profit_before_bonus;
  if (record.gross_profit_before_bonus_percent !== undefined) updateData.gross_profit_before_bonus_percent = record.gross_profit_before_bonus_percent;
  if (record.ler !== undefined) updateData.ler = record.ler;
  if (record.qualify_for_bonus !== undefined) updateData.qualify_for_bonus = record.qualify_for_bonus;
  if (record.bonus_qualified_for_percent !== undefined) updateData.bonus_qualified_for_percent = record.bonus_qualified_for_percent;
  if (record.appointment_based_bonus !== undefined) updateData.appointment_based_bonus = record.appointment_based_bonus;
  if (record.tip_amount !== undefined) updateData.tip_amount = record.tip_amount;
  if (record.total_employee_pay !== undefined) updateData.total_employee_pay = record.total_employee_pay;
  if (record.daily_hourly_with_tips_and_bonus !== undefined) updateData.daily_hourly_with_tips_and_bonus = record.daily_hourly_with_tips_and_bonus;
  if (record.daily_net_profit_after_bonus !== undefined) updateData.daily_net_profit_after_bonus = record.daily_net_profit_after_bonus;
  if (record.daily_net_profit_after_bonus_percent !== undefined) updateData.daily_net_profit_after_bonus_percent = record.daily_net_profit_after_bonus_percent;
  if (record.notes !== undefined) updateData.notes = record.notes;
  if (record.service_breakdown !== undefined) updateData.service_breakdown = record.service_breakdown;
  if (record.crew_id !== undefined) updateData.crew_id = record.crew_id;
  if (record.is_crew_job !== undefined) updateData.is_crew_job = record.is_crew_job;
  if (record.tracking_mode !== undefined) updateData.tracking_mode = record.tracking_mode;
  if (record.record_type !== undefined) updateData.record_type = record.record_type;
  
  console.log('📝 updateDailyRecord - fields being updated:', Object.keys(updateData));
  console.log('📝 updateDailyRecord - called_out value:', updateData.called_out);
  console.log('📝 updateDailyRecord - full updateData:', JSON.stringify(updateData, null, 2));
  
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
  try {
    // First delete related crew member records
    const { error: crewError } = await supabase
      .from('daily_record_crew_members')
      .delete()
      .eq('daily_record_id', recordId);

    if (crewError) {
      console.error('Error deleting crew member records:', crewError);
      // Continue with main record deletion even if crew deletion fails
    }

    // Then delete the main daily record
    const { error } = await supabase
      .from('employee_daily_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Error deleting daily record:', error);
      return false;
    }

    console.log('✅ Record and related crew members deleted successfully');
    return true;
  } catch (error) {
    console.error('Error during record deletion:', error);
    return false;
  }
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
      paySemiMonthlyDates: [1, 16],
      crewBonusThresholdMin: 15,
      crewBonusThresholdMax: 100
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
      paySemiMonthlyDates: [1, 16],
      crewBonusThresholdMin: 15,
      crewBonusThresholdMax: 100
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
      paySemiMonthlyDates: [1, 15],
      crewBonusThresholdMin: 15,
      crewBonusThresholdMax: 100
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
    appointmentBonus6PlusJobs: parseFloat(data.appointment_bonus_6_plus_jobs) || 20,
    // Crew capacity settings
    numberOfCrews: data.number_of_crews ? parseInt(data.number_of_crews) : 0,
    employeesPerCrew: data.employees_per_crew ? parseInt(data.employees_per_crew) : 0,
    monthlyCrewCapacity: data.monthly_crew_capacity ? parseFloat(data.monthly_crew_capacity) : 0,
    // Crew-specific bonus thresholds
    crewBonusThresholdMin: parseFloat(data.crew_bonus_threshold_min) || 15,
    crewBonusThresholdMax: parseFloat(data.crew_bonus_threshold_max) || 100
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
      appointment_bonus_6_plus_jobs: settings.appointmentBonus6PlusJobs || 20,
      // Crew capacity settings
      number_of_crews: settings.numberOfCrews || null,
      employees_per_crew: settings.employeesPerCrew || null,
      monthly_crew_capacity: settings.monthlyCrewCapacity || null,
      // Crew-specific bonus thresholds
      crew_bonus_threshold_min: settings.crewBonusThresholdMin || 15,
      crew_bonus_threshold_max: settings.crewBonusThresholdMax || 100
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving company settings:', error);
    return false;
  }

  return true;
}

// ============================================
// CSV IMPORT HELPERS
// ============================================

export interface ExistingRecordInfo {
  employeeId: string;
  employeeName: string;
  date: string;
  recordType: 'solo' | 'crew';
  id: string;
}

/**
 * Check for existing daily records that would conflict with a CSV import
 * Returns a list of existing records that match the employee+date combinations
 */
export async function checkExistingRecordsForImport(
  userId: string,
  employeeDatePairs: Array<{ employeeId: string; employeeName: string; date: string; isCrewJob: boolean }>
): Promise<ExistingRecordInfo[]> {
  if (!userId || employeeDatePairs.length === 0) {
    return [];
  }

  // Get unique employee IDs
  const employeeIds = [...new Set(employeeDatePairs.map(p => p.employeeId))];
  
  // Get unique dates
  const dates = [...new Set(employeeDatePairs.map(p => p.date))];

  // Query for existing records
  const { data, error } = await supabase
    .from('employee_daily_records')
    .select('id, employee_id, date, record_type')
    .in('employee_id', employeeIds)
    .in('date', dates);

  if (error) {
    console.error('Error checking existing records:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Map employee IDs to names for the response
  const employeeNameMap = new Map<string, string>();
  employeeDatePairs.forEach(p => {
    employeeNameMap.set(p.employeeId, p.employeeName);
  });

  // Filter to only records that match the import type (solo vs crew)
  const existingRecords: ExistingRecordInfo[] = [];
  
  data.forEach(record => {
    // Find matching import pair
    const matchingPair = employeeDatePairs.find(
      p => p.employeeId === record.employee_id && p.date === record.date
    );
    
    if (matchingPair) {
      // Check if record type matches what we're trying to import
      const importRecordType = matchingPair.isCrewJob ? 'crew' : 'solo';
      if (record.record_type === importRecordType) {
        existingRecords.push({
          employeeId: record.employee_id,
          employeeName: employeeNameMap.get(record.employee_id) || 'Unknown',
          date: record.date,
          recordType: record.record_type as 'solo' | 'crew',
          id: record.id
        });
      }
    }
  });

  return existingRecords;
}

/**
 * Migration: Fix Crew LER Values
 * 
 * This function corrects the LER values for crew records.
 * All crew members on the same crew day should have the SAME crew-level LER.
 * 
 * IMPORTANT: This ONLY affects crew records. Solo records are NOT touched.
 */
export async function migrateCrewLER(): Promise<{
  updated: number;
  skipped: number;
  errors: number;
  details: string[];
}> {
  const result = {
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [] as string[]
  };

  console.log('🚀 Starting Crew LER Migration...');
  console.log('⚠️  This will ONLY update crew records (is_crew_job = true)');
  console.log('✅ Solo records will NOT be affected\n');

  // Step 1: Fetch all crew records
  const { data: crewRecords, error: fetchError } = await supabase
    .from('employee_daily_records')
    .select('id, date, crew_id, employee_id, gross_profit_before_bonus, employee_base_pay, ler')
    .eq('is_crew_job', true)
    .not('crew_id', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching crew records:', fetchError);
    result.errors = 1;
    result.details.push(`Error fetching crew records: ${fetchError.message}`);
    return result;
  }

  if (!crewRecords || crewRecords.length === 0) {
    console.log('ℹ️  No crew records found. Nothing to migrate.');
    result.details.push('No crew records found');
    return result;
  }

  console.log(`📊 Found ${crewRecords.length} crew records to process\n`);
  result.details.push(`Found ${crewRecords.length} crew records`);

  // Step 2: Group records by date + crew_id
  const crewDayGroups = new Map<string, typeof crewRecords>();
  
  crewRecords.forEach((record) => {
    const key = `${record.date}-${record.crew_id}`;
    const existing = crewDayGroups.get(key);
    if (existing) {
      existing.push(record);
    } else {
      crewDayGroups.set(key, [record]);
    }
  });

  console.log(`📅 Grouped into ${crewDayGroups.size} unique crew days\n`);
  result.details.push(`Grouped into ${crewDayGroups.size} unique crew days`);

  // Step 3: Calculate correct crew LER for each group and update records
  for (const [key, records] of crewDayGroups) {
    const [date] = key.split('-');
    
    // Calculate total gross profit and total labor cost for the crew day
    const totalGrossProfit = records.reduce((sum, r) => sum + (r.gross_profit_before_bonus || 0), 0);
    const totalLaborCost = records.reduce((sum, r) => sum + (r.employee_base_pay || 0), 0);
    
    // Calculate crew-level LER
    const crewLER = totalLaborCost > 0 ? totalGrossProfit / totalLaborCost : 0;
    
    // Check if all records already have the correct LER (within tolerance)
    const allCorrect = records.every(r => Math.abs(r.ler - crewLER) < 0.01);
    
    if (allCorrect) {
      result.skipped += records.length;
      continue;
    }

    console.log(`📝 Crew day ${date}: ${records.length} members, LER ${crewLER.toFixed(2)} (was: ${records.map(r => r.ler.toFixed(2)).join(', ')})`);

    // Update all records in this group with the crew LER
    for (const record of records) {
      const { error: updateError } = await supabase
        .from('employee_daily_records')
        .update({ ler: crewLER })
        .eq('id', record.id);

      if (updateError) {
        console.error(`   ❌ Error updating record ${record.id}:`, updateError);
        result.errors++;
      } else {
        result.updated++;
      }
    }
  }

  // Summary
  console.log('\n========== Migration Complete ==========');
  console.log(`✅ Updated: ${result.updated} records`);
  console.log(`⏭️  Skipped (already correct): ${result.skipped} records`);
  console.log(`❌ Errors: ${result.errors} records`);
  console.log('=========================================\n');

  result.details.push(`Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
  
  return result;
}
