// project/src/services/crewService.ts
import { supabase } from '../config/supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

export interface Crew {
  id?: string;
  user_id?: string;
  crew_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CrewRole {
  id?: string;
  user_id?: string;
  role_name: string;
  bonus_percentage: number;
  is_bonus_eligible: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CrewMember {
  id?: string;
  crew_id: string;
  employee_id: string;
  role_id?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  employee_name?: string;
  role_name?: string;
  bonus_percentage?: number;
}

export interface DailyRecordCrewMember {
  id?: string;
  daily_record_id: string;
  employee_id: string;
  role_id?: string;
  hours_worked?: number;
  bonus_percentage?: number;
  attributed_revenue?: number;
  attributed_bonus?: number;
  created_at?: string;
  // Joined fields
  employee_name?: string;
  role_name?: string;
}

// Default roles to create for new users
export const DEFAULT_CREW_ROLES: Omit<CrewRole, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { role_name: 'Lead Tech', bonus_percentage: 60, is_bonus_eligible: true, display_order: 1 },
  { role_name: 'Field Tech 1', bonus_percentage: 40, is_bonus_eligible: true, display_order: 2 },
  { role_name: 'Trainee', bonus_percentage: 0, is_bonus_eligible: false, display_order: 3 },
];

// ============================================================================
// CREWS
// ============================================================================

export async function getCrews(userId: string): Promise<Crew[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .eq('user_id', userId)
    .order('crew_name');

  if (error) {
    console.error('Error fetching crews:', error);
    return [];
  }

  return data || [];
}

export async function getCrewById(crewId: string): Promise<Crew | null> {
  if (!crewId) return null;

  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .eq('id', crewId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching crew:', error);
    return null;
  }

  return data;
}

export async function createCrew(userId: string, crew: Omit<Crew, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Crew | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('crews')
    .insert([{
      user_id: userId,
      crew_name: crew.crew_name,
      is_active: crew.is_active ?? true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating crew:', error);
    return null;
  }

  return data;
}

export async function updateCrew(crewId: string, updates: Partial<Crew>): Promise<boolean> {
  if (!crewId) return false;

  const { error } = await supabase
    .from('crews')
    .update({
      crew_name: updates.crew_name,
      is_active: updates.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', crewId);

  if (error) {
    console.error('Error updating crew:', error);
    return false;
  }

  return true;
}

export async function deleteCrew(crewId: string): Promise<boolean> {
  if (!crewId) return false;

  const { error } = await supabase
    .from('crews')
    .delete()
    .eq('id', crewId);

  if (error) {
    console.error('Error deleting crew:', error);
    return false;
  }

  return true;
}

// ============================================================================
// CREW ROLES
// ============================================================================

export async function getCrewRoles(userId: string): Promise<CrewRole[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('crew_roles')
    .select('*')
    .eq('user_id', userId)
    .order('display_order');

  if (error) {
    console.error('Error fetching crew roles:', error);
    return [];
  }

  return data || [];
}

export async function createCrewRole(userId: string, role: Omit<CrewRole, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<CrewRole | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('crew_roles')
    .insert([{
      user_id: userId,
      role_name: role.role_name,
      bonus_percentage: role.bonus_percentage,
      is_bonus_eligible: role.is_bonus_eligible ?? true,
      display_order: role.display_order ?? 0
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating crew role:', error);
    return null;
  }

  return data;
}

export async function updateCrewRole(roleId: string, updates: Partial<CrewRole>): Promise<boolean> {
  if (!roleId) return false;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.role_name !== undefined) updateData.role_name = updates.role_name;
  if (updates.bonus_percentage !== undefined) updateData.bonus_percentage = updates.bonus_percentage;
  if (updates.is_bonus_eligible !== undefined) updateData.is_bonus_eligible = updates.is_bonus_eligible;
  if (updates.display_order !== undefined) updateData.display_order = updates.display_order;

  const { error } = await supabase
    .from('crew_roles')
    .update(updateData)
    .eq('id', roleId);

  if (error) {
    console.error('Error updating crew role:', error);
    return false;
  }

  return true;
}

export async function deleteCrewRole(roleId: string): Promise<boolean> {
  if (!roleId) return false;

  const { error } = await supabase
    .from('crew_roles')
    .delete()
    .eq('id', roleId);

  if (error) {
    console.error('Error deleting crew role:', error);
    return false;
  }

  return true;
}

// Initialize default roles for a new user
export async function initializeDefaultRoles(userId: string): Promise<boolean> {
  if (!userId) return false;

  // Check if roles already exist
  const existingRoles = await getCrewRoles(userId);
  if (existingRoles.length > 0) {
    console.log('Crew roles already exist for user');
    return true;
  }

  // Create default roles
  for (const role of DEFAULT_CREW_ROLES) {
    const created = await createCrewRole(userId, role);
    if (!created) {
      console.error('Failed to create default role:', role.role_name);
      return false;
    }
  }

  console.log('Default crew roles initialized');
  return true;
}

// ============================================================================
// CREW MEMBERS
// ============================================================================

export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  if (!crewId) return [];

  const { data, error } = await supabase
    .from('crew_members')
    .select(`
      *,
      employee_info:employee_id (name),
      crew_roles:role_id (role_name, bonus_percentage)
    `)
    .eq('crew_id', crewId);

  if (error) {
    console.error('Error fetching crew members:', error);
    return [];
  }

  // Flatten joined data
  return (data || []).map(member => ({
    ...member,
    employee_name: (member.employee_info as any)?.name,
    role_name: (member.crew_roles as any)?.role_name,
    bonus_percentage: (member.crew_roles as any)?.bonus_percentage
  }));
}

export async function addCrewMember(member: Omit<CrewMember, 'id' | 'created_at' | 'updated_at'>): Promise<CrewMember | null> {
  const { data, error } = await supabase
    .from('crew_members')
    .insert([{
      crew_id: member.crew_id,
      employee_id: member.employee_id,
      role_id: member.role_id || null,
      is_default: member.is_default ?? true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding crew member:', error);
    return null;
  }

  return data;
}

export async function updateCrewMember(memberId: string, updates: Partial<CrewMember>): Promise<boolean> {
  if (!memberId) return false;

  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.role_id !== undefined) updateData.role_id = updates.role_id || null;
  if (updates.is_default !== undefined) updateData.is_default = updates.is_default;

  const { error } = await supabase
    .from('crew_members')
    .update(updateData)
    .eq('id', memberId);

  if (error) {
    console.error('Error updating crew member:', error);
    return false;
  }

  return true;
}

export async function removeCrewMember(memberId: string): Promise<boolean> {
  if (!memberId) return false;

  const { error } = await supabase
    .from('crew_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing crew member:', error);
    return false;
  }

  return true;
}

// Get all crews with their members for a user
export async function getCrewsWithMembers(userId: string): Promise<(Crew & { members: CrewMember[] })[]> {
  if (!userId) return [];

  const crews = await getCrews(userId);
  const crewsWithMembers = await Promise.all(
    crews.map(async (crew) => ({
      ...crew,
      members: await getCrewMembers(crew.id!)
    }))
  );

  return crewsWithMembers;
}

// ============================================================================
// DAILY RECORD CREW MEMBERS (for job-level tracking)
// ============================================================================

export async function getDailyRecordCrewMembers(dailyRecordId: string): Promise<DailyRecordCrewMember[]> {
  if (!dailyRecordId) return [];

  const { data, error } = await supabase
    .from('daily_record_crew_members')
    .select(`
      *,
      employee_info:employee_id (name),
      crew_roles:role_id (role_name, bonus_percentage)
    `)
    .eq('daily_record_id', dailyRecordId);

  if (error) {
    console.error('Error fetching daily record crew members:', error);
    return [];
  }

  return (data || []).map(member => ({
    ...member,
    employee_name: (member.employee_info as any)?.name,
    role_name: (member.crew_roles as any)?.role_name
  }));
}

export async function addDailyRecordCrewMember(member: Omit<DailyRecordCrewMember, 'id' | 'created_at'>): Promise<DailyRecordCrewMember | null> {
  const { data, error } = await supabase
    .from('daily_record_crew_members')
    .insert([{
      daily_record_id: member.daily_record_id,
      employee_id: member.employee_id,
      role_id: member.role_id || null,
      hours_worked: member.hours_worked,
      bonus_percentage: member.bonus_percentage,
      attributed_revenue: member.attributed_revenue,
      attributed_bonus: member.attributed_bonus
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding daily record crew member:', error);
    return null;
  }

  return data;
}

export async function removeDailyRecordCrewMember(id: string): Promise<boolean> {
  if (!id) return false;

  const { error } = await supabase
    .from('daily_record_crew_members')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error removing daily record crew member:', error);
    return false;
  }

  return true;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

// Validate bonus percentages sum to 100% for bonus-eligible members
export function validateBonusPercentages(roles: CrewRole[]): { valid: boolean; total: number; message: string } {
  const eligibleRoles = roles.filter(r => r.is_bonus_eligible);
  const total = eligibleRoles.reduce((sum, r) => sum + r.bonus_percentage, 0);
  
  if (Math.abs(total - 100) < 0.01) {
    return { valid: true, total, message: 'Bonus percentages sum to 100%' };
  } else if (total < 100) {
    return { valid: false, total, message: `Bonus percentages sum to ${total.toFixed(0)}% (${(100 - total).toFixed(0)}% unallocated)` };
  } else {
    return { valid: false, total, message: `Bonus percentages sum to ${total.toFixed(0)}% (exceeds 100%)` };
  }
}

// ============================================================================
// CREW DAILY ATTRIBUTIONS
// ============================================================================

export interface CrewDailyAttribution {
  id?: string;
  user_id: string;
  daily_record_id: string;
  crew_id: string;
  employee_id: string;
  role_id?: string;
  role_name: string;
  bonus_percentage: number;
  is_bonus_eligible: boolean;
  attributed_revenue: number;
  attributed_bonus: number;
  attributed_hours: number;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  employee_name?: string;
  crew_name?: string;
  record_date?: string;
}

// Create attributions for all crew members when a crew job is saved
export async function createCrewAttributions(
  userId: string,
  dailyRecordId: string,
  crewId: string,
  totalRevenue: number,
  totalBonus: number,
  totalHours: number,
  crewMembers: CrewMember[],
  crewRoles: CrewRole[]
): Promise<CrewDailyAttribution[]> {
  if (!userId || !dailyRecordId || !crewId || crewMembers.length === 0) {
    console.error('Missing required data for crew attributions');
    return [];
  }

  // Calculate attributions for each member
  const attributions = crewMembers.map(member => {
    const role = crewRoles.find(r => r.id === member.role_id);
    const bonusPercent = role?.bonus_percentage || 0;
    const isEligible = role?.is_bonus_eligible ?? false;
    
    // Calculate attributed amounts based on role percentage
    const attributedBonus = isEligible ? (totalBonus * bonusPercent / 100) : 0;
    // Revenue and hours split equally among all members
    const attributedRevenue = totalRevenue / crewMembers.length;
    const attributedHours = totalHours / crewMembers.length;

    return {
      user_id: userId,
      daily_record_id: dailyRecordId,
      crew_id: crewId,
      employee_id: member.employee_id,
      role_id: member.role_id || null,
      role_name: role?.role_name || 'Unknown',
      bonus_percentage: bonusPercent,
      is_bonus_eligible: isEligible,
      attributed_revenue: attributedRevenue,
      attributed_bonus: attributedBonus,
      attributed_hours: attributedHours
    };
  });

  const { data, error } = await supabase
    .from('crew_daily_attributions')
    .insert(attributions)
    .select();

  if (error) {
    console.error('Error creating crew attributions:', error);
    return [];
  }

  console.log(`✅ Created ${data.length} crew attributions for daily record ${dailyRecordId}`);
  return data;
}

// Backfill attributions for existing crew jobs that don't have attributions
export async function backfillCrewAttributions(
  userId: string
): Promise<{ success: number; failed: number; skipped: number }> {
  const result = { success: 0, failed: 0, skipped: 0 };
  
  if (!userId) return result;

  // Get all crews and roles for this user
  const [crews, roles] = await Promise.all([
    getCrews(userId),
    getCrewRoles(userId)
  ]);

  // Get crew members for each crew
  const crewMembersMap: { [crewId: string]: CrewMember[] } = {};
  for (const crew of crews) {
    if (crew.id) {
      crewMembersMap[crew.id] = await getCrewMembers(crew.id);
    }
  }

  // Get all pay periods for this user
  const { data: payPeriods } = await supabase
    .from('pay_periods')
    .select('id')
    .eq('user_id', userId);

  if (!payPeriods?.length) {
    console.log('No pay periods found');
    return result;
  }

  const payPeriodIds = payPeriods.map(pp => pp.id);

  // Get all crew jobs that might need attributions
  const { data: crewJobs, error } = await supabase
    .from('employee_daily_records')
    .select('id, crew_id, total_job_revenue, total_hours_worked, bonus_qualified_for_percent, appointment_based_bonus')
    .in('pay_period_id', payPeriodIds)
    .eq('is_crew_job', true)
    .not('crew_id', 'is', null);

  if (error || !crewJobs?.length) {
    console.log('No crew jobs found to backfill');
    return result;
  }

  console.log(`Found ${crewJobs.length} crew jobs to check for attributions`);

  for (const job of crewJobs) {
    // Check if attributions already exist for this record
    const { data: existingAttrs } = await supabase
      .from('crew_daily_attributions')
      .select('id')
      .eq('daily_record_id', job.id)
      .limit(1);

    if (existingAttrs && existingAttrs.length > 0) {
      result.skipped++;
      continue;
    }

    // Get crew members for this crew
    const crewMembers = crewMembersMap[job.crew_id];
    if (!crewMembers || crewMembers.length === 0) {
      console.log(`No crew members found for crew ${job.crew_id}`);
      result.failed++;
      continue;
    }

    // Create attributions
    const totalBonus = (job.bonus_qualified_for_percent || 0) + (job.appointment_based_bonus || 0);
    const attrs = await createCrewAttributions(
      userId,
      job.id,
      job.crew_id,
      job.total_job_revenue || 0,
      totalBonus,
      job.total_hours_worked || 0,
      crewMembers,
      roles
    );

    if (attrs.length > 0) {
      result.success++;
    } else {
      result.failed++;
    }
  }

  console.log(`Backfill complete: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped`);
  return result;
}

// Get all attributions for an employee (for their LER page)
export async function getEmployeeAttributions(
  userId: string,
  employeeId: string,
  _startDate?: string,
  _endDate?: string
): Promise<CrewDailyAttribution[]> {
  if (!userId || !employeeId) return [];

  // Note: _startDate and _endDate are reserved for future date filtering
  const query = supabase
    .from('crew_daily_attributions')
    .select(`
      *,
      crews:crew_id (crew_name),
      employee_info:employee_id (name),
      employee_daily_records:daily_record_id (date)
    `)
    .eq('user_id', userId)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching employee attributions:', error);
    return [];
  }

  // Flatten joined data
  return (data || []).map(attr => ({
    ...attr,
    crew_name: attr.crews?.crew_name,
    employee_name: attr.employee_info?.name,
    record_date: attr.employee_daily_records?.date
  }));
}

// Get attributions for a specific daily record
export async function getDailyRecordAttributions(dailyRecordId: string): Promise<CrewDailyAttribution[]> {
  if (!dailyRecordId) return [];

  const { data, error } = await supabase
    .from('crew_daily_attributions')
    .select(`
      *,
      employee_info:employee_id (name)
    `)
    .eq('daily_record_id', dailyRecordId);

  if (error) {
    console.error('Error fetching daily record attributions:', error);
    return [];
  }

  return (data || []).map(attr => ({
    ...attr,
    employee_name: attr.employee_info?.name
  }));
}

// Delete attributions for a daily record (when record is deleted or updated)
export async function deleteCrewAttributions(dailyRecordId: string): Promise<boolean> {
  if (!dailyRecordId) return false;

  const { error } = await supabase
    .from('crew_daily_attributions')
    .delete()
    .eq('daily_record_id', dailyRecordId);

  if (error) {
    console.error('Error deleting crew attributions:', error);
    return false;
  }

  return true;
}

// Get summary of crew attributions for an employee in a pay period
export async function getEmployeeCrewEarningsSummary(
  userId: string,
  employeeId: string,
  payPeriodId: string
): Promise<{
  totalAttributedRevenue: number;
  totalAttributedBonus: number;
  totalAttributedHours: number;
  crewJobCount: number;
}> {
  if (!userId || !employeeId || !payPeriodId) {
    return { totalAttributedRevenue: 0, totalAttributedBonus: 0, totalAttributedHours: 0, crewJobCount: 0 };
  }

  // Get daily records for this pay period that are crew jobs
  const { data: dailyRecords, error: recordsError } = await supabase
    .from('employee_daily_records')
    .select('id')
    .eq('pay_period_id', payPeriodId)
    .eq('is_crew_job', true);

  if (recordsError || !dailyRecords?.length) {
    return { totalAttributedRevenue: 0, totalAttributedBonus: 0, totalAttributedHours: 0, crewJobCount: 0 };
  }

  const recordIds = dailyRecords.map(r => r.id);

  // Get attributions for these records for this employee
  const { data: attributions, error: attrError } = await supabase
    .from('crew_daily_attributions')
    .select('attributed_revenue, attributed_bonus, attributed_hours')
    .eq('user_id', userId)
    .eq('employee_id', employeeId)
    .in('daily_record_id', recordIds);

  if (attrError || !attributions?.length) {
    return { totalAttributedRevenue: 0, totalAttributedBonus: 0, totalAttributedHours: 0, crewJobCount: 0 };
  }

  return {
    totalAttributedRevenue: attributions.reduce((sum, a) => sum + (a.attributed_revenue || 0), 0),
    totalAttributedBonus: attributions.reduce((sum, a) => sum + (a.attributed_bonus || 0), 0),
    totalAttributedHours: attributions.reduce((sum, a) => sum + (a.attributed_hours || 0), 0),
    crewJobCount: attributions.length
  };
}

// ============================================================================
// CREW PERFORMANCE ANALYTICS
// ============================================================================

export interface CrewPerformanceMetrics {
  crewId: string;
  crewName: string;
  totalRevenue: number;
  totalJobs: number;
  totalHours: number;
  avgRevenuePerJob: number;
  avgLER: number;
  totalBonus: number;
  totalGrossProfit: number;
  grossProfitPercent: number;
  memberContributions: MemberContribution[];
}

export interface MemberContribution {
  employeeId: string;
  employeeName: string;
  roleName: string;
  bonusPercentage: number;
  attributedRevenue: number;
  attributedBonus: number;
  attributedHours: number;
  jobCount: number;
}

export interface CrewVsSoloComparison {
  crewJobs: {
    totalJobs: number;
    totalRevenue: number;
    avgRevenuePerJob: number;
    avgLER: number;
    totalHours: number;
  };
  soloJobs: {
    totalJobs: number;
    totalRevenue: number;
    avgRevenuePerJob: number;
    avgLER: number;
    totalHours: number;
  };
}

// Get performance metrics for a specific crew
export async function getCrewPerformanceMetrics(
  userId: string,
  crewId: string,
  year?: number,
  month?: number // 0-indexed (0 = January)
): Promise<CrewPerformanceMetrics | null> {
  if (!userId || !crewId) return null;

  // Get crew info
  const crew = await getCrewById(crewId);
  if (!crew) return null;

  // Build date filter
  let startDate: string | undefined;
  let endDate: string | undefined;
  
  if (year !== undefined) {
    if (month !== undefined) {
      // Specific month
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
    } else {
      // Full year (YTD)
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }
  }

  // Get all daily records for this crew
  let query = supabase
    .from('employee_daily_records')
    .select('id, date, total_job_revenue, number_of_jobs, total_hours_worked, gross_profit_before_bonus, employee_base_pay, ler')
    .eq('crew_id', crewId)
    .eq('is_crew_job', true);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data: records, error: recordsError } = await query;

  if (recordsError) {
    console.error('Error fetching crew records:', recordsError);
    return null;
  }

  if (!records || records.length === 0) {
    return {
      crewId,
      crewName: crew.crew_name,
      totalRevenue: 0,
      totalJobs: 0,
      totalHours: 0,
      avgRevenuePerJob: 0,
      avgLER: 0,
      totalBonus: 0,
      totalGrossProfit: 0,
      grossProfitPercent: 0,
      memberContributions: []
    };
  }

  // Calculate crew totals
  const totalRevenue = records.reduce((sum, r) => sum + (r.total_job_revenue || 0), 0);
  const totalJobs = records.reduce((sum, r) => sum + (r.number_of_jobs || 0), 0);
  const totalHours = records.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);
  const totalGrossProfit = records.reduce((sum, r) => sum + (r.gross_profit_before_bonus || 0), 0);
  const totalBasePay = records.reduce((sum, r) => sum + (r.employee_base_pay || 0), 0);
  const avgLER = totalBasePay > 0 ? totalGrossProfit / totalBasePay : 0;
  const avgRevenuePerJob = totalJobs > 0 ? totalRevenue / totalJobs : 0;
  const grossProfitPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  // Get attributions for member contributions
  const recordIds = records.map(r => r.id);
  const { data: attributions, error: attrError } = await supabase
    .from('crew_daily_attributions')
    .select('employee_id, role_name, bonus_percentage, attributed_revenue, attributed_bonus, attributed_hours')
    .eq('crew_id', crewId)
    .in('daily_record_id', recordIds);

  if (attrError) {
    console.error('Error fetching attributions:', attrError);
  }

  // Aggregate member contributions
  const memberMap = new Map<string, MemberContribution>();
  const totalBonus = (attributions || []).reduce((sum, a) => sum + (a.attributed_bonus || 0), 0);

  for (const attr of attributions || []) {
    const existing = memberMap.get(attr.employee_id);
    if (existing) {
      existing.attributedRevenue += attr.attributed_revenue || 0;
      existing.attributedBonus += attr.attributed_bonus || 0;
      existing.attributedHours += attr.attributed_hours || 0;
      existing.jobCount += 1;
    } else {
      memberMap.set(attr.employee_id, {
        employeeId: attr.employee_id,
        employeeName: '', // Will be filled below
        roleName: attr.role_name || 'Unknown',
        bonusPercentage: attr.bonus_percentage || 0,
        attributedRevenue: attr.attributed_revenue || 0,
        attributedBonus: attr.attributed_bonus || 0,
        attributedHours: attr.attributed_hours || 0,
        jobCount: 1
      });
    }
  }

  // Get employee names
  const employeeIds = Array.from(memberMap.keys());
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employee_info')
      .select('id, name')
      .in('id', employeeIds);

    for (const emp of employees || []) {
      const member = memberMap.get(emp.id);
      if (member) {
        member.employeeName = emp.name;
      }
    }
  }

  return {
    crewId,
    crewName: crew.crew_name,
    totalRevenue,
    totalJobs,
    totalHours,
    avgRevenuePerJob,
    avgLER,
    totalBonus,
    totalGrossProfit,
    grossProfitPercent,
    memberContributions: Array.from(memberMap.values()).sort((a, b) => b.attributedRevenue - a.attributedRevenue)
  };
}

// Get crew vs solo comparison for a user
export async function getCrewVsSoloComparison(
  userId: string,
  year?: number,
  month?: number // 0-indexed
): Promise<CrewVsSoloComparison> {
  const defaultResult: CrewVsSoloComparison = {
    crewJobs: { totalJobs: 0, totalRevenue: 0, avgRevenuePerJob: 0, avgLER: 0, totalHours: 0 },
    soloJobs: { totalJobs: 0, totalRevenue: 0, avgRevenuePerJob: 0, avgLER: 0, totalHours: 0 }
  };

  if (!userId) return defaultResult;

  // Build date filter
  let startDate: string | undefined;
  let endDate: string | undefined;
  
  if (year !== undefined) {
    if (month !== undefined) {
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }
  }

  // First get pay periods for this user
  const { data: payPeriods, error: ppError } = await supabase
    .from('pay_periods')
    .select('id')
    .eq('user_id', userId);

  if (ppError || !payPeriods?.length) {
    console.error('Error fetching pay periods:', ppError);
    return defaultResult;
  }

  const payPeriodIds = payPeriods.map(pp => pp.id);

  // Get all daily records for these pay periods
  let query = supabase
    .from('employee_daily_records')
    .select('is_crew_job, total_job_revenue, number_of_jobs, total_hours_worked, gross_profit_before_bonus, employee_base_pay')
    .in('pay_period_id', payPeriodIds);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data: records, error } = await query;

  if (error || !records) {
    console.error('Error fetching records for comparison:', error);
    return defaultResult;
  }

  // Separate crew and solo jobs
  const crewRecords = records.filter(r => r.is_crew_job === true);
  const soloRecords = records.filter(r => r.is_crew_job !== true);

  // Calculate crew metrics
  const crewRevenue = crewRecords.reduce((sum, r) => sum + (r.total_job_revenue || 0), 0);
  const crewJobs = crewRecords.reduce((sum, r) => sum + (r.number_of_jobs || 0), 0);
  const crewHours = crewRecords.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);
  const crewGrossProfit = crewRecords.reduce((sum, r) => sum + (r.gross_profit_before_bonus || 0), 0);
  const crewBasePay = crewRecords.reduce((sum, r) => sum + (r.employee_base_pay || 0), 0);
  const crewAvgLER = crewBasePay > 0 ? crewGrossProfit / crewBasePay : 0;

  // Calculate solo metrics
  const soloRevenue = soloRecords.reduce((sum, r) => sum + (r.total_job_revenue || 0), 0);
  const soloJobs = soloRecords.reduce((sum, r) => sum + (r.number_of_jobs || 0), 0);
  const soloHours = soloRecords.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0);
  const soloGrossProfit = soloRecords.reduce((sum, r) => sum + (r.gross_profit_before_bonus || 0), 0);
  const soloBasePay = soloRecords.reduce((sum, r) => sum + (r.employee_base_pay || 0), 0);
  const soloAvgLER = soloBasePay > 0 ? soloGrossProfit / soloBasePay : 0;

  return {
    crewJobs: {
      totalJobs: crewJobs,
      totalRevenue: crewRevenue,
      avgRevenuePerJob: crewJobs > 0 ? crewRevenue / crewJobs : 0,
      avgLER: crewAvgLER,
      totalHours: crewHours
    },
    soloJobs: {
      totalJobs: soloJobs,
      totalRevenue: soloRevenue,
      avgRevenuePerJob: soloJobs > 0 ? soloRevenue / soloJobs : 0,
      avgLER: soloAvgLER,
      totalHours: soloHours
    }
  };
}

// Get all crews with their performance summary
export async function getAllCrewsPerformanceSummary(
  userId: string,
  year?: number,
  month?: number
): Promise<CrewPerformanceMetrics[]> {
  if (!userId) return [];

  const crews = await getCrews(userId);
  const results: CrewPerformanceMetrics[] = [];

  for (const crew of crews.filter(c => c.is_active)) {
    const metrics = await getCrewPerformanceMetrics(userId, crew.id!, year, month);
    if (metrics) {
      results.push(metrics);
    }
  }

  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}
