import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Award,
  Users,
  User,
  Calendar,
  Plus,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AddDailyRecordWithServices, EmployeeForCrewEntry } from '../components/employee/AddDailyRecordWithServices';
import { CompanySettingsDialog } from '../components/employee/CompanySettingsDialog';
import { CSVUploadDialog } from '../components/employee/CSVUploadDialog';
import { CrewEditConfirmationModal } from '../components/employee/CrewEditConfirmationModal';
import { MasterCrewEditModal } from '../components/employee/MasterCrewEditModal';
import { COMPANY_SETTINGS } from '../components/employee/AddDailyRecordWithServices';
import * as employeeLERService from '../services/employeeLERService';
import * as serviceLaborService from '../services/serviceLaborService';
import * as crewService from '../services/crewService';
import type { Crew, CrewRole, CrewMember, CrewPerformanceMetrics, CrewVsSoloComparison, CrewWorkDay } from '../services/crewService';
import type { ServiceBreakdownItem } from '../services/serviceLaborService';
import { useAuthContext } from '../contexts/auth-context';
import { useRevenue } from '../contexts/revenue-context';

// Types
interface JobTypes {
  [serviceName: string]: number;
}

interface DailyRecord {
  id?: string;
  workDay: string;
  date: string;
  calledOut: boolean;
  numberOfJobs: number;
  jobTypes: JobTypes;
  totalJobRevenue: number;
  totalHoursWorked: number;
  totalJobTime: number;
  baseRate: number;
  employeeBasePay: number;
  overtimeHours: number;
  overtimePay: number;
  cogsNoLabor: number;
  cogsNoLaborPercent: number;
  overheadCostsPercent: number;
  grossProfitBeforeBonus: number;
  grossProfitBeforeBonusPercent: number;
  ler: number;
  qualifyForBonus: boolean;
  bonusQualifiedForPercent: number;
  appointmentBasedBonus: number;
  tipAmount: number;
  totalEmployeePay: number;
  dailyHourlyWithTipsAndBonus: number;
  dailyNetProfitAfterBonus: number;
  dailyNetProfitAfterBonusPercent: number;
  notes: string;
  serviceBreakdown?: ServiceBreakdownItem[];
  // Crew tracking fields
  crewId?: string;
  isCrewJob?: boolean;
  trackingMode?: 'employee' | 'crew';
}

interface PayPeriod {
  periodId?: string;
  periodName: string;
  startDate: string;
  endDate: string;
  baseRate?: number;  // Hourly rate at time of pay period creation
  dailyRecords: DailyRecord[];
  periodTotals: {
    totalJobs: number;
    totalRevenue: number;
    totalHoursWorked: number;
    avgLER: number;
    totalLERBonuses: number;
    totalApptBonuses: number;
    totalBonuses: number;
    totalTips: number;
    totalEmployeePay: number;
    avgGrossProfitPercent: number;
    netProfitAfterBonusPercent: number;
  };
}

// Local interface for component state (camelCase)
interface EmployeeInfo {
  id?: string;
  name: string;
  position: string;
  currentBaseRate: number;
}

// Import the service type for API responses (snake_case)
import type { EmployeeInfo as EmployeeInfoDB } from '../services/employeeLERService';

// Utility function to parse date strings locally (timezone-safe)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const EmployeeLERPage: React.FC = () => {
  // Get Clerk user ID
  const { dbUserId } = useAuthContext();
  
  // Revenue context for FIR targets
  const { currentYear: _revenueCurrentYear // calculated for potential future use
  } = useRevenue();
  
  // Multi-employee state (uses DB type with snake_case)
  const [allEmployees, setAllEmployees] = useState<EmployeeInfoDB[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  // Employee and period state
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    name: 'Jared',
    position: 'Senior Tech',
    currentBaseRate: 32.46
  });

  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(-1); // -1 means "All Pay Periods"
  const [payPeriodsData, setPayPeriodsData] = useState<PayPeriod[]>([]);
  
  // Insights panel state
  const [insightsViewMode, setInsightsViewMode] = useState<'period' | 'ytd'>('period');
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [showAddDay, setShowAddDay] = useState(false);
  const [openInCrewMode, setOpenInCrewMode] = useState(false); // When true, modal opens in crew mode
  const [showCOGSSettings, setShowCOGSSettings] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [servicesWithCOGS, setServicesWithCOGS] = useState<{ [key: string]: number }>({});
  const [services, setServices] = useState<Array<{ id: string; serviceName: string }>>([]);
  const [companySettings, setCompanySettings] = useState(COMPANY_SETTINGS);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{record: DailyRecord, index: number} | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [needsCalculation, setNeedsCalculation] = useState(false);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // Date sort order for daily records
  
  // Bulk delete state
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  
  // Crew edit confirmation state
  const [showCrewEditConfirm, setShowCrewEditConfirm] = useState(false);
  const [pendingCrewEdit, setPendingCrewEdit] = useState<{
    record: DailyRecord;
    serviceBreakdown: ServiceBreakdownItem[];
    linkedRecords: any[];
  } | null>(null);
  
  // Crew tracking state
  const [crews, setCrews] = useState<Crew[]>([]);
  const [crewRoles, setCrewRoles] = useState<CrewRole[]>([]);
  const [crewMembersMap, setCrewMembersMap] = useState<{ [crewId: string]: CrewMember[] }>({});
  const [crewEarningsSummary, setCrewEarningsSummary] = useState<{
    totalAttributedRevenue: number;
    totalAttributedBonus: number;
    totalAttributedHours: number;
    crewJobCount: number;
  }>({ totalAttributedRevenue: 0, totalAttributedBonus: 0, totalAttributedHours: 0, crewJobCount: 0 });

  // Crew Performance View state
  const [viewMode, setViewMode] = useState<'individual' | 'crew'>('individual');
  const [selectedCrewId, setSelectedCrewId] = useState<string>('');
  const [crewPerformance, setCrewPerformance] = useState<CrewPerformanceMetrics | null>(null);
  const [crewFilterYear, setCrewFilterYear] = useState<number>(new Date().getFullYear());
  const [crewFilterMonth, setCrewFilterMonth] = useState<number | 'ytd'>('ytd');
  const [crewSelectedPayPeriod, setCrewSelectedPayPeriod] = useState<string>('all');
  const [crewWorkDays, setCrewWorkDays] = useState<CrewWorkDay[]>([]);
  const [editingCrewWorkDay, setEditingCrewWorkDay] = useState<CrewWorkDay | null>(null);
  const [showMasterCrewEdit, setShowMasterCrewEdit] = useState(false);

  // Helper function to convert DailyRecord to Supabase format
  function convertToSupabaseFormat(record: DailyRecord): employeeLERService.DailyRecord {
    return {
      work_day: record.workDay,
      date: record.date,
      called_out: record.calledOut,
      number_of_jobs: record.numberOfJobs,
      job_types: record.jobTypes,
      total_job_revenue: record.totalJobRevenue,
      total_hours_worked: record.totalHoursWorked,
      total_job_time: record.totalJobTime,
      base_rate: record.baseRate,
      employee_base_pay: record.employeeBasePay,
      overtime_hours: record.overtimeHours,
      overtime_pay: record.overtimePay,
      cogs_no_labor: record.cogsNoLabor,
      cogs_no_labor_percent: record.cogsNoLaborPercent,
      overhead_costs_percent: record.overheadCostsPercent,
      gross_profit_before_bonus: record.grossProfitBeforeBonus,
      gross_profit_before_bonus_percent: record.grossProfitBeforeBonusPercent,
      ler: record.ler,
      qualify_for_bonus: record.qualifyForBonus,
      bonus_qualified_for_percent: record.bonusQualifiedForPercent,
      appointment_based_bonus: record.appointmentBasedBonus,
      tip_amount: record.tipAmount,
      total_employee_pay: record.totalEmployeePay,
      daily_hourly_with_tips_and_bonus: record.dailyHourlyWithTipsAndBonus,
      daily_net_profit_after_bonus: record.dailyNetProfitAfterBonus,
      daily_net_profit_after_bonus_percent: record.dailyNetProfitAfterBonusPercent,
      notes: record.notes,
      service_breakdown: record.serviceBreakdown ? { services: record.serviceBreakdown } : { services: [] },
      // Crew tracking fields
      crew_id: record.crewId,
      is_crew_job: record.isCrewJob || false,
      tracking_mode: record.trackingMode || 'employee'
    };
  }

  // Load all employees on mount
  useEffect(() => {
    if (dbUserId) {
      loadAllEmployees();
    }
  }, [dbUserId]);

  // Load data when selected employee changes
  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeData(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  async function loadAllEmployees() {
    if (!dbUserId) return;
    
    try {
      const employees = await employeeLERService.getAllEmployees(dbUserId);
      console.log('👥 All employees loaded:', employees.length);
      
      setAllEmployees(employees);
      
      // Load crew data for crew job tracking
      const [crewList, roleList] = await Promise.all([
        crewService.getCrews(dbUserId),
        crewService.getCrewRoles(dbUserId)
      ]);
      setCrews(crewList);
      setCrewRoles(roleList);
      
      // Load crew members for each crew
      const membersMap: { [crewId: string]: CrewMember[] } = {};
      for (const crew of crewList) {
        if (crew.id) {
          const members = await crewService.getCrewMembers(crew.id);
          console.log(`🔍 Loading members for crew ${crew.id} (${crew.crew_name}):`, members);
          membersMap[crew.id] = members;
        }
      }
      setCrewMembersMap(membersMap);
      console.log('👥 Crews loaded:', crewList.length, 'with members for', Object.keys(membersMap).length, 'crews');
      console.log('📊 Crew members map:', membersMap);
      
      // If no employees exist, show needs setup state
      if (employees.length === 0) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }
      
      // Auto-select first employee
      if (employees.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(employees[0].id!);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setLoading(false);
    }
  }

  // Refresh services from Service Mix
  async function refreshServices() {
    if (!dbUserId) return;
    
    try {
      const servicesWithCOGS = await employeeLERService.getServicesWithCOGS(dbUserId);
      console.log('🔄 Services refreshed:', servicesWithCOGS);
      setServicesWithCOGS(servicesWithCOGS);
      
      // Also load full services list with real IDs for CSV upload
      const servicesList = await employeeLERService.getServices(dbUserId);
      console.log('📋 Services list loaded:', servicesList);
      setServices(servicesList);
    } catch (error) {
      console.error('Error refreshing services:', error);
    }
  }

  // Load crew performance data when crew view is selected
  async function loadCrewPerformance(crewId: string) {
    if (!dbUserId || !crewId) return;
    
    try {
      // crewFilterMonth is 0-indexed (January = 0), service also expects 0-indexed
      const month = crewFilterMonth === 'ytd' ? undefined : (crewFilterMonth as number);
      const metrics = await crewService.getCrewPerformanceMetrics(dbUserId, crewId, crewFilterYear, month);
      setCrewPerformance(metrics);
    } catch (error) {
      console.error('Error loading crew performance:', error);
    }
  }

  // Load crew work days for the selected crew
  async function loadCrewWorkDays(crewId: string) {
    if (!dbUserId || !crewId) return;
    
    try {
      // crewFilterMonth is 0-indexed (January = 0), service also expects 0-indexed
      const month = crewFilterMonth === 'ytd' ? undefined : (crewFilterMonth as number);
      console.log('🔍 Loading crew work days:', { crewId, year: crewFilterYear, month, dbUserId });
      const days = await crewService.getCrewWorkDays(dbUserId, crewId, crewFilterYear, month);
      console.log('📅 Crew work days loaded:', days.length, 'days');
      setCrewWorkDays(days);
    } catch (error) {
      console.error('Error loading crew work days:', error);
      setCrewWorkDays([]);
    }
  }

  // Load crew data when switching to crew view or changing filters
  useEffect(() => {
    if ((viewMode as any) === 'crew' && dbUserId) {
      if (selectedCrewId) {
        loadCrewPerformance(selectedCrewId);
        loadCrewWorkDays(selectedCrewId);
      }
    }
  }, [viewMode, selectedCrewId, crewFilterYear, crewFilterMonth, dbUserId]);

  // Helper function to get week start date (Sunday)
  function getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is 0
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  // Recalculate overtime considering both daily (>12 hrs) and weekly (>40 hrs) limits
  function recalculateOvertimeForRecords(records: DailyRecord[]): DailyRecord[] {
    if (records.length === 0) return records;
    
    // Group records by week
    const weekGroups: { [weekStart: string]: DailyRecord[] } = {};
    
    records.forEach(record => {
      const recordDate = new Date(record.date + 'T00:00:00');
      const weekStart = getWeekStart(recordDate);
      
      if (!weekGroups[weekStart]) {
        weekGroups[weekStart] = [];
      }
      weekGroups[weekStart].push(record);
    });

    // Process each week
    const updatedRecords: DailyRecord[] = [];
    
    Object.values(weekGroups).forEach(weekRecords => {
      // Sort by date
      weekRecords.sort((a, b) => a.date.localeCompare(b.date));
      
      let weeklyHoursAccumulated = 0;
      const WEEKLY_OT_THRESHOLD = 40;
      const DAILY_OT_THRESHOLD = COMPANY_SETTINGS.overtimeHoursDaily;
      const OT_MULTIPLIER = COMPANY_SETTINGS.overtimeMultiplier;
      
      weekRecords.forEach(record => {
        const dailyHours = record.totalHoursWorked;
        const baseRate = record.baseRate;
        
        // Calculate daily overtime (over 12 hours)
        let dailyOTHours = Math.max(0, dailyHours - DAILY_OT_THRESHOLD);
        let regularHoursFromDaily = Math.min(dailyHours, DAILY_OT_THRESHOLD);
        
        // Calculate weekly overtime (over 40 hours cumulative)
        const hoursBeforeThisDay = weeklyHoursAccumulated;
        const regularHoursAvailable = Math.max(0, WEEKLY_OT_THRESHOLD - hoursBeforeThisDay);
        
        // Determine which hours are weekly OT
        let weeklyOTHours = 0;
        if (regularHoursFromDaily > regularHoursAvailable) {
          // Some of the "regular" hours from daily calc are actually weekly OT
          weeklyOTHours = regularHoursFromDaily - regularHoursAvailable;
        }
        
        // Total OT is the greater of daily OT or weekly OT
        const totalOTHours = Math.max(dailyOTHours, weeklyOTHours);
        const totalRegularHours = dailyHours - totalOTHours;
        
        // Recalculate pay
        const regularPay = totalRegularHours * baseRate;
        const overtimePay = totalOTHours * (baseRate * OT_MULTIPLIER);
        const basePay = regularPay + overtimePay;
        
        // For CREW records, preserve the saved LER/profit values from database
        // These are crew-level metrics that shouldn't be recalculated from individual split revenue
        // For SOLO records, recalculate based on overtime adjustments to ensure accurate bonus qualification
        const isCrewRecord = record.isCrewJob || record.trackingMode === 'crew';
        
        let grossProfitBeforeBonus: number;
        let grossProfitBeforeBonusPercent: number;
        let ler: number;
        let dailyNetProfitAfterBonus: number;
        let dailyNetProfitAfterBonusPercent: number;
        
        if (isCrewRecord) {
          // CREW: Preserve saved crew-level metrics from database
          grossProfitBeforeBonus = record.grossProfitBeforeBonus;
          grossProfitBeforeBonusPercent = record.grossProfitBeforeBonusPercent;
          ler = record.ler;
          dailyNetProfitAfterBonus = record.dailyNetProfitAfterBonus;
          dailyNetProfitAfterBonusPercent = record.dailyNetProfitAfterBonusPercent;
        } else {
          // SOLO: Recalculate based on overtime adjustments
          // This is critical for accurate bonus qualification - overtime increases labor cost, reducing LER
          const totalCostOfJob = basePay + record.cogsNoLabor + (record.totalJobRevenue * (record.overheadCostsPercent / 100));
          grossProfitBeforeBonus = record.totalJobRevenue - totalCostOfJob;
          grossProfitBeforeBonusPercent = record.totalJobRevenue > 0 
            ? (grossProfitBeforeBonus / record.totalJobRevenue) * 100 
            : 0;
          ler = basePay > 0 ? grossProfitBeforeBonus / basePay : 0;
          dailyNetProfitAfterBonus = record.totalJobRevenue - totalCostOfJob - record.bonusQualifiedForPercent - record.appointmentBasedBonus;
          dailyNetProfitAfterBonusPercent = record.totalJobRevenue > 0 
            ? (dailyNetProfitAfterBonus / record.totalJobRevenue) * 100 
            : 0;
        }
        
        // PRESERVE bonus qualification and amounts from database - don't recalculate them here
        const qualifyForBonus = record.qualifyForBonus;
        const bonusQualifiedForPercent = record.bonusQualifiedForPercent;
        const appointmentBasedBonus = record.appointmentBasedBonus;
        const totalEmployeePay = basePay + bonusQualifiedForPercent + appointmentBasedBonus + record.tipAmount;
        const dailyHourlyWithTipsAndBonus = dailyHours > 0 ? totalEmployeePay / dailyHours : 0;
        
        // Update record with recalculated values
        updatedRecords.push({
          ...record,
          overtimeHours: totalOTHours,
          overtimePay,
          employeeBasePay: basePay,
          grossProfitBeforeBonus,
          grossProfitBeforeBonusPercent,
          ler,
          qualifyForBonus,
          bonusQualifiedForPercent,
          totalEmployeePay,
          dailyHourlyWithTipsAndBonus,
          dailyNetProfitAfterBonus,
          dailyNetProfitAfterBonusPercent
        });
        
        // Accumulate weekly hours
        weeklyHoursAccumulated += dailyHours;
      });
    });
    
    return updatedRecords;
  }

  async function loadEmployeeData(employeeId: string) {
    if (!employeeId) {
      console.error('❌ loadEmployeeData called with undefined/empty employeeId');
      console.error('Current selectedEmployeeId:', selectedEmployeeId);
      console.error('Stack trace:', new Error().stack);
      return;
    }
    
    console.log('🔄 Loading employee data for:', employeeId);
    setLoading(true);
    
    console.log('🧹 Clearing previous pay periods data...');
    setPayPeriodsData([]);
    // Don't reset selectedPeriodIndex - let it persist across reloads
    
    try {
      console.log('🔍 Loading data for employee:', employeeId);
      
      // Load employee info by ID
      const empInfo = await employeeLERService.getEmployeeById(employeeId);
      console.log('👤 Employee info loaded:', empInfo);
      
      if (!empInfo) {
        console.error('Employee not found for ID:', employeeId);
        setLoading(false);
        return;
      }
      
      if (empInfo && empInfo.id) {
        setEmployeeInfo({
          id: empInfo.id,
          name: empInfo.name,
          position: empInfo.position,
          currentBaseRate: empInfo.current_base_rate
        });
        
        // Load company-wide pay periods (using user_id, not employee_id)
        const periods = await employeeLERService.getPayPeriods(dbUserId!);
        console.log('📅 Pay periods loaded:', periods.length, 'periods');
        
        if (periods.length > 0) {
          // Load daily records for each period (filtered by employee)
          const periodsWithRecords = await Promise.all(
            periods.map(async (period) => {
              const records = await employeeLERService.getDailyRecords(period.id!, empInfo.id);
              console.log(`📊 Period "${period.period_name}" for ${empInfo.name}:`, records.length, 'daily records');
              
              // Map records to DailyRecord format
              if (records.length > 0) {
                console.log('🗄️ Raw records from database:', records);
                console.log('🔍 First record service_breakdown:', records[0]?.service_breakdown);
                console.log('💰 First record bonus fields:', {
                  bonus_qualified_for_percent: records[0]?.bonus_qualified_for_percent,
                  appointment_based_bonus: records[0]?.appointment_based_bonus,
                  qualify_for_bonus: records[0]?.qualify_for_bonus
                });
                console.log('💵 First record base_rate:', records[0]?.base_rate);
              }
              const mappedRecords: DailyRecord[] = records.map(r => ({
                  id: r.id,
                  workDay: r.work_day,
                  date: r.date,
                  calledOut: r.called_out,
                  numberOfJobs: r.number_of_jobs,
                  jobTypes: r.job_types,
                  totalJobRevenue: r.total_job_revenue,
                  totalHoursWorked: r.total_hours_worked,
                  totalJobTime: r.total_job_time,
                  baseRate: r.base_rate,
                  employeeBasePay: r.employee_base_pay,
                  overtimeHours: r.overtime_hours,
                  overtimePay: r.overtime_pay,
                  cogsNoLabor: r.cogs_no_labor,
                  cogsNoLaborPercent: r.cogs_no_labor_percent,
                  overheadCostsPercent: r.overhead_costs_percent,
                  grossProfitBeforeBonus: r.gross_profit_before_bonus,
                  grossProfitBeforeBonusPercent: r.gross_profit_before_bonus_percent,
                  ler: r.ler,
                  qualifyForBonus: r.qualify_for_bonus,
                  bonusQualifiedForPercent: r.bonus_qualified_for_percent,
                  appointmentBasedBonus: r.appointment_based_bonus,
                  tipAmount: r.tip_amount,
                  totalEmployeePay: r.total_employee_pay,
                  dailyHourlyWithTipsAndBonus: r.daily_hourly_with_tips_and_bonus,
                  dailyNetProfitAfterBonus: r.daily_net_profit_after_bonus,
                  dailyNetProfitAfterBonusPercent: r.daily_net_profit_after_bonus_percent,
                  notes: r.notes,
                  serviceBreakdown: r.service_breakdown?.services || [],
                  // Crew tracking fields
                  crewId: r.crew_id,
                  isCrewJob: r.is_crew_job || false,
                  trackingMode: r.tracking_mode || 'employee'
                }));
              
              // Recalculate overtime considering both daily and weekly thresholds
              const recalculatedRecords = recalculateOvertimeForRecords(mappedRecords);
              console.log(`   ⚡ Overtime recalculated for weekly thresholds`);
              
              if (recalculatedRecords.length > 0) {
                console.log('   💰 After recalculation, first record bonuses:', {
                  bonusQualifiedForPercent: recalculatedRecords[0].bonusQualifiedForPercent,
                  appointmentBasedBonus: recalculatedRecords[0].appointmentBasedBonus
                });
              }
              
              // Calculate totals from recalculated records (filter out negative LER)
              const workingRecords = recalculatedRecords.filter(r => !r.calledOut && r.numberOfJobs > 0 && r.ler >= 0);
              console.log(`   └─ Working records:`, workingRecords.length);
              
              return {
                periodName: period.period_name,
                startDate: period.start_date,
                endDate: period.end_date,
                periodId: period.id,
                dailyRecords: recalculatedRecords,
                periodTotals: {
                  totalJobs: workingRecords.reduce((sum, r) => sum + r.numberOfJobs, 0),
                  totalRevenue: workingRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
                  totalHoursWorked: workingRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
                  avgLER: workingRecords.length > 0 ? workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length : 0,
                  totalLERBonuses: workingRecords.reduce((sum, r) => sum + r.bonusQualifiedForPercent, 0),
                  totalApptBonuses: workingRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0),
                  totalBonuses: workingRecords.reduce((sum, r) => sum + (r.bonusQualifiedForPercent + r.appointmentBasedBonus), 0),
                  totalTips: workingRecords.reduce((sum, r) => sum + r.tipAmount, 0),
                  totalEmployeePay: workingRecords.reduce((sum, r) => sum + r.totalEmployeePay, 0),
                  avgGrossProfitPercent: workingRecords.length > 0 ? workingRecords.reduce((sum, r) => sum + r.grossProfitBeforeBonusPercent, 0) / workingRecords.length : 0,
                  netProfitAfterBonusPercent: workingRecords.length > 0 ? workingRecords.reduce((sum, r) => sum + r.dailyNetProfitAfterBonusPercent, 0) / workingRecords.length : 0
                }
              };
            })
          );
          
          console.log('✅ Setting pay periods data:', periodsWithRecords.length, 'periods with records');
          setPayPeriodsData(periodsWithRecords);
          
          // Validate selectedPeriodIndex is still valid after reload
          if (selectedPeriodIndex >= periodsWithRecords.length) {
            console.log('⚠️ Selected period index out of bounds, resetting to 0');
            setSelectedPeriodIndex(0);
          }
          
          // Load crew earnings summary for this employee in the current pay period
          const currentPeriodId = periodsWithRecords[selectedPeriodIndex]?.periodId || periodsWithRecords[0]?.periodId;
          if (currentPeriodId) {
            const crewSummary = await crewService.getEmployeeCrewEarningsSummary(
              dbUserId!,
              employeeId,
              currentPeriodId
            );
            setCrewEarningsSummary(crewSummary);
            console.log('👥 Crew earnings summary loaded:', crewSummary);
          }
        } else {
          console.log('⚠️ No pay periods found for employee');
          setSelectedPeriodIndex(0);
        }
      }
      
      // Load services with COGS costs
      await refreshServices();
      
      const loadedSettings = await employeeLERService.getCompanySettings(dbUserId!);
      // Ensure paySchedule has a default value to match expected type
      const settingsWithDefaults = {
        ...COMPANY_SETTINGS,
        ...loadedSettings,
        paySchedule: loadedSettings.paySchedule || 'bi-weekly'
      } as typeof COMPANY_SETTINGS;
      setCompanySettings(settingsWithDefaults);
      Object.assign(COMPANY_SETTINGS, settingsWithDefaults);
      
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  }

  // CSV Import Handler
  const handleCSVImport = async (csvRows: Array<{
    date: string;
    employeeName: string;
    crewName?: string;
    role?: 'crew' | 'helper';
    serviceName: string;
    jobs: number;
    hours: number;
    revenue: number;
    totalDailyHours?: number;
    tips?: number;
    notes?: string;
  }>, skipExistingCheck?: boolean): Promise<{ success: boolean; skipped?: boolean }> => {
    if (!dbUserId) {
      alert('Error: User not authenticated');
      return { success: false };
    }

    try {
      // Group solo rows by employee and date (rows without crew name)
      const groupedByEmployeeAndDate: { [key: string]: typeof csvRows } = {};
      
      csvRows.filter(row => !row.crewName).forEach(row => {
        const key = `${row.employeeName}|${row.date}`;
        if (!groupedByEmployeeAndDate[key]) {
          groupedByEmployeeAndDate[key] = [];
        }
        groupedByEmployeeAndDate[key].push(row);
      });
      
      // Group crew rows by crew name and date (rows with crew name)
      const groupedByCrewAndDate: { [key: string]: typeof csvRows } = {};
      
      csvRows.filter(row => row.crewName).forEach(row => {
        const key = `${row.crewName!}|${row.date}`;
        if (!groupedByCrewAndDate[key]) {
          groupedByCrewAndDate[key] = [];
        }
        groupedByCrewAndDate[key].push(row);
      });

      // === PRE-IMPORT CHECK FOR EXISTING RECORDS ===
      if (!skipExistingCheck) {
        // Build list of employee+date pairs to check
        const employeeDatePairs: Array<{ employeeId: string; employeeName: string; date: string; isCrewJob: boolean }> = [];
        
        // Add solo job pairs
        for (const [key] of Object.entries(groupedByEmployeeAndDate)) {
          const [employeeName, date] = key.split('|');
          const employee = allEmployees.find(e => e.name.toLowerCase() === employeeName.toLowerCase());
          if (employee?.id) {
            employeeDatePairs.push({ employeeId: employee.id, employeeName, date, isCrewJob: false });
          }
        }
        
        // Add crew job pairs (need to expand crew members)
        for (const [key, rows] of Object.entries(groupedByCrewAndDate)) {
          const [, date] = key.split('|'); // crewName not needed here, just date
          const crewEmployeeNames = [...new Set(rows.map(r => r.employeeName))];
          for (const empName of crewEmployeeNames) {
            const employee = allEmployees.find(e => e.name.toLowerCase() === empName.toLowerCase());
            if (employee?.id) {
              employeeDatePairs.push({ employeeId: employee.id, employeeName: empName, date, isCrewJob: true });
            }
          }
        }
        
        // Check for existing records
        if (employeeDatePairs.length > 0) {
          const existingRecords = await employeeLERService.checkExistingRecordsForImport(dbUserId, employeeDatePairs);
          
          if (existingRecords.length > 0) {
            // Group by record type for clearer message
            const soloConflicts = existingRecords.filter(r => r.recordType === 'solo');
            const crewConflicts = existingRecords.filter(r => r.recordType === 'crew');
            
            let warningMessage = `⚠️ Found ${existingRecords.length} existing record(s) that will conflict with this import:\n\n`;
            
            if (soloConflicts.length > 0) {
              warningMessage += `SOLO RECORDS (${soloConflicts.length}):\n`;
              // Show first 5 conflicts
              soloConflicts.slice(0, 5).forEach(r => {
                warningMessage += `  • ${r.employeeName} on ${r.date}\n`;
              });
              if (soloConflicts.length > 5) {
                warningMessage += `  ... and ${soloConflicts.length - 5} more\n`;
              }
              warningMessage += '\n';
            }
            
            if (crewConflicts.length > 0) {
              warningMessage += `CREW RECORDS (${crewConflicts.length}):\n`;
              crewConflicts.slice(0, 5).forEach(r => {
                warningMessage += `  • ${r.employeeName} on ${r.date}\n`;
              });
              if (crewConflicts.length > 5) {
                warningMessage += `  ... and ${crewConflicts.length - 5} more\n`;
              }
              warningMessage += '\n';
            }
            
            warningMessage += `These records already exist. Importing will fail for these dates.\n\n`;
            warningMessage += `Options:\n`;
            warningMessage += `1. Delete existing records first, then re-import\n`;
            warningMessage += `2. Remove conflicting dates from your CSV\n`;
            warningMessage += `3. Cancel and keep existing data\n\n`;
            warningMessage += `Do you want to continue anyway? (Conflicting records will be skipped)`;
            
            const shouldContinue = window.confirm(warningMessage);
            if (!shouldContinue) {
              return { success: false, skipped: true };
            }
          }
        }
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each employee-date combination
      for (const [key, rows] of Object.entries(groupedByEmployeeAndDate)) {
        const [employeeName, date] = key.split('|');
        
        try {
          // Find employee
          const employee = allEmployees.find(e => e.name.toLowerCase() === employeeName.toLowerCase());
          if (!employee || !employee.id) {
            errors.push(`Employee "${employeeName}" not found`);
            errorCount++;
            continue;
          }

          // Find existing pay period that contains this date (use local dates to avoid timezone issues)
          const recordDate = parseLocalDate(date);
          
          // Reload all company-wide pay periods to ensure we have the latest data
          const allPayPeriods = await employeeLERService.getPayPeriods(dbUserId);
          console.log(`📅 Looking for pay period for date ${date}:`, {
            recordDate,
            availablePayPeriods: allPayPeriods.map(p => ({
              name: p.period_name,
              start: p.start_date,
              end: p.end_date
            }))
          });
          
          let payPeriod = allPayPeriods.find(p => {
            const start = parseLocalDate(p.start_date);
            const end = parseLocalDate(p.end_date);
            const matches = recordDate >= start && recordDate <= end;
            console.log(`  Checking ${p.period_name} (${p.start_date} to ${p.end_date}): ${matches}`);
            return matches;
          });

          if (!payPeriod) {
            errors.push(`No pay period found for date ${date}. Please create a pay period first.`);
            errorCount++;
            continue;
          }
          
          console.log(`✅ Found pay period: ${payPeriod.period_name}`);
          
          // Load ALL existing daily records for this pay period (including orphaned ones with NULL employee_id)
          // We need to check for duplicates across ALL records, not just this employee's records
          const existingDailyRecords = await employeeLERService.getDailyRecords(payPeriod.id!);
          console.log(`📋 Loaded ${existingDailyRecords.length} existing records for pay period ${payPeriod.period_name}:`, 
            existingDailyRecords.map(r => ({ date: r.date, employee_id: r.employee_id || 'NULL', serviceBreakdownCount: (r.service_breakdown as any)?.length || 0 })));
          
          // Debug: Check if serviceBreakdown is properly loaded
          existingDailyRecords.forEach((record, idx) => {
            if (record.is_crew_job && record.service_breakdown) {
              console.log(`🔍 Crew record ${idx} (${record.date}): serviceBreakdown =`, record.service_breakdown);
            }
          });

          // Build service breakdown
          const serviceBreakdown: ServiceBreakdownItem[] = rows.map(row => ({
            serviceId: services.find(s => s.serviceName.toLowerCase() === row.serviceName.toLowerCase())?.id || '',
            serviceName: row.serviceName,
            jobs: row.jobs,
            hours: row.hours,
            revenue: row.revenue
          }));

          // Calculate totals
          const totalJobs = serviceBreakdown.reduce((sum, s) => sum + s.jobs, 0);
          const totalHours = serviceBreakdown.reduce((sum, s) => sum + s.hours, 0);
          const totalRevenue = serviceBreakdown.reduce((sum, s) => sum + s.revenue, 0);
          const totalDailyHours = rows[0].totalDailyHours || totalHours;
          const tips = rows[0].tips || 0;
          const notes = rows[0].notes || '';

          // Build job types object
          const jobTypes: { [key: string]: number } = {};
          serviceBreakdown.forEach(s => {
            jobTypes[s.serviceName] = (jobTypes[s.serviceName] || 0) + s.jobs;
          });

          // Calculate metrics
          const baseRate = employee.current_base_rate;
          const dayOfWeek = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
          
          // Calculate COGS - servicesWithCOGS contains $ cost per job, NOT percentage
          const totalCOGS = serviceBreakdown.reduce((sum, s) => {
            const costPerJob = servicesWithCOGS[s.serviceName] || 0;
            return sum + (costPerJob * s.jobs); // $ per job × number of jobs
          }, 0);

          // Calculate base pay and overtime
          let regularHours = totalDailyHours;
          let overtimeHours = 0;
          let basePay = 0;
          let overtimePay = 0;

          if (totalDailyHours > companySettings.overtimeHoursDaily) {
            regularHours = companySettings.overtimeHoursDaily;
            overtimeHours = totalDailyHours - companySettings.overtimeHoursDaily;
            basePay = regularHours * baseRate;
            overtimePay = overtimeHours * baseRate * companySettings.overtimeMultiplier;
          } else {
            basePay = totalDailyHours * baseRate;
          }

          const totalEmployeeBasePay = basePay + overtimePay;
          
          // Calculate overhead allocation
          const overheadAllocation = totalRevenue * (companySettings.overheadPercent / 100);
          
          // Gross Profit = Revenue - COGS - Labor - Overhead
          const grossProfit = totalRevenue - totalCOGS - totalEmployeeBasePay - overheadAllocation;
          const grossProfitPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
          const ler = totalEmployeeBasePay > 0 ? grossProfit / totalEmployeeBasePay : 0;

          // Calculate bonuses - qualification based on GROSS PROFIT PERCENTAGE, not LER
          console.log('💰 Bonus calculation:', {
            grossProfitPercent,
            ler,
            totalJobs,
            bonusThresholdMin: companySettings.bonusThresholdMin,
            bonusThresholdMax: companySettings.bonusThresholdMax,
            enableAppointmentBonus: companySettings.enableAppointmentBonus
          });
          
          let bonusQualified = 0;
          let appointmentBonus = 0;
          const qualifyForBonus = grossProfitPercent >= companySettings.bonusThresholdMin && grossProfitPercent <= companySettings.bonusThresholdMax;

          if (qualifyForBonus) {
            // Bonus = LER × Daily Hours (same as Edit modal)
            bonusQualified = ler * totalDailyHours;
          }

          if (companySettings.enableAppointmentBonus && totalJobs >= 3) {
            if (totalJobs >= 6) appointmentBonus = companySettings.appointmentBonus6PlusJobs;
            else if (totalJobs === 5) appointmentBonus = companySettings.appointmentBonus5Jobs;
            else if (totalJobs === 4) appointmentBonus = companySettings.appointmentBonus4Jobs;
            else if (totalJobs === 3) appointmentBonus = companySettings.appointmentBonus3Jobs;
          }
          
          console.log('💰 Bonuses calculated:', { bonusQualified, appointmentBonus, totalBonuses: bonusQualified + appointmentBonus });

          const totalBonuses = bonusQualified + appointmentBonus;
          const totalEmployeePay = totalEmployeeBasePay + totalBonuses + tips;
          const netProfit = grossProfit - totalBonuses;
          const netProfitPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
          const hourlyWithBonusAndTips = totalDailyHours > 0 ? totalEmployeePay / totalDailyHours : 0;

          // Create daily record
          const dailyRecord: employeeLERService.DailyRecord = {
            work_day: dayOfWeek,
            date: date,
            called_out: false,
            number_of_jobs: totalJobs,
            job_types: jobTypes,
            total_job_revenue: totalRevenue,
            total_hours_worked: totalDailyHours,
            total_job_time: totalHours,
            base_rate: baseRate,
            employee_base_pay: totalEmployeeBasePay,
            overtime_hours: overtimeHours,
            overtime_pay: overtimePay,
            cogs_no_labor: totalCOGS,
            cogs_no_labor_percent: totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0,
            overhead_costs_percent: companySettings.overheadPercent,
            gross_profit_before_bonus: grossProfit,
            gross_profit_before_bonus_percent: grossProfitPercent,
            ler: ler,
            qualify_for_bonus: qualifyForBonus,
            bonus_qualified_for_percent: bonusQualified,
            appointment_based_bonus: appointmentBonus,
            tip_amount: tips,
            total_employee_pay: totalEmployeePay,
            daily_hourly_with_tips_and_bonus: hourlyWithBonusAndTips,
            daily_net_profit_after_bonus: netProfit,
            daily_net_profit_after_bonus_percent: netProfitPercent,
            notes: notes,
            service_breakdown: { services: serviceBreakdown }
          };

          // Check if record already exists for this date AND employee (or orphaned records with NULL employee_id for this date)
          console.log(`🔍 Looking for existing record with date: "${date}" and employee_id: "${employee.id}" (type: ${typeof date})`);
          const existingRecord = existingDailyRecords.find((r: any) => {
            const dateMatch = r.date === date;
            const employeeMatch = r.employee_id === employee.id || r.employee_id === null;
            console.log(`  Comparing with record date: "${r.date}", employee_id: "${r.employee_id || 'NULL'}" - Date Match: ${dateMatch}, Employee Match: ${employeeMatch}`);
            return dateMatch && employeeMatch;
          });
          console.log(`🔍 Found existing record:`, existingRecord ? `YES (id: ${existingRecord.id}, employee_id: ${existingRecord.employee_id || 'NULL'})` : 'NO');
          
          let recordId: string | undefined;
          
          if (existingRecord && existingRecord.id) {
            // Record exists - update it and assign employee_id
            dailyRecord.employee_id = employee.id;
            console.log(`🔄 Updating existing record for ${employeeName} on ${date} (${existingRecord.employee_id ? 'has employee_id' : 'ORPHANED - assigning employee_id'})`);
            const updated = await employeeLERService.updateDailyRecord(existingRecord.id, dailyRecord);
            if (updated) {
              recordId = existingRecord.id;
              console.log(`✅ Updated record for ${employeeName} on ${date}`);
            } else {
              errors.push(`Failed to update record for ${employeeName} on ${date}`);
              errorCount++;
              continue;
            }
          } else {
            // No record exists - create new one with employee_id
            console.log(`📝 Creating new record for ${employeeName} on ${date} with employee_id: ${employee.id}`);
            const createdRecord = await employeeLERService.createDailyRecord(payPeriod.id!, dailyRecord, employee.id);
            recordId = createdRecord?.id;
            if (!recordId) {
              console.error(`❌ Failed to create record for ${employeeName} on ${date}`);
              errors.push(`Failed to create record for ${employeeName} on ${date}`);
              errorCount++;
              continue;
            }
            console.log(`✅ Created record with ID: ${recordId}`);
          }
          
          if (recordId) {
            // Create service labor records
            const laborCosts = {
              basePay: basePay,
              overtimePay: overtimePay,
              bonuses: totalBonuses,
              tips: tips
            };

            await serviceLaborService.createServiceLaborRecords(
              dbUserId,
              employee.id,
              payPeriod.id!,
              date,
              serviceBreakdown,
              laborCosts
            );

            successCount++;
          } else {
            errors.push(`Failed to create record for ${employeeName} on ${date}`);
            errorCount++;
          }
        } catch (error: any) {
          console.error(`Error processing ${employeeName} on ${date}:`, error);
          
          // Check if it's a duplicate key error
          if (error?.code === '23505') {
            errors.push(`Record for ${employeeName} on ${date} already exists - skipped`);
          } else {
            errors.push(`Error processing ${employeeName} on ${date}: ${error?.message || error}`);
          }
          errorCount++;
        }
      }

      // Process crew jobs - create linked records for each crew member
      for (const [key, rows] of Object.entries(groupedByCrewAndDate)) {
        const keyParts = key.split('|');
        const crewName = keyParts[0];
        const date = keyParts[1] as string; // We know this exists since we built the key with both parts
        
        try {
          // Get unique employees in this crew for this date
          const crewEmployeeNames = [...new Set(rows.map(r => r.employeeName))];
          const crewEmployees = crewEmployeeNames
            .map(name => {
              const emp = allEmployees.find(e => e.name.toLowerCase() === name.toLowerCase());
              return emp && emp.id ? { ...emp } : null;
            })
            .filter((e): e is typeof allEmployees[0] => !!e && !!e.id);
          
          if (crewEmployees.length === 0) {
            errors.push(`Crew "${crewName}" on ${date}: No valid employees found`);
            errorCount++;
            continue;
          }
          
          // Look up or create the crew in the crews table
          let existingCrews = await crewService.getCrews(dbUserId);
          let crew: typeof existingCrews[0] | undefined = existingCrews.find(c => c.crew_name.toLowerCase() === crewName.toLowerCase());
          
          if (!crew) {
            // Create the crew if it doesn't exist
            const newCrew = await crewService.createCrew(dbUserId, {
              crew_name: crewName,
              is_active: true
            });
            if (!newCrew) {
              errors.push(`Crew "${crewName}" on ${date}: Failed to create crew record`);
              errorCount++;
              continue;
            }
            crew = newCrew;
          }
          
          const crewId = crew.id!;
          
          // Find pay period for this date
          const recordDate = parseLocalDate(date);
          const allPayPeriods = await employeeLERService.getPayPeriods(dbUserId);
          const payPeriod = allPayPeriods.find(p => {
            const start = parseLocalDate(p.start_date);
            const end = parseLocalDate(p.end_date);
            return recordDate >= start && recordDate <= end;
          });
          
          if (!payPeriod) {
            errors.push(`Crew "${crewName}" on ${date}: No pay period found`);
            errorCount++;
            continue;
          }
          
          // Aggregate service breakdown from all rows for this crew+date
          // (services should be the same for all crew members on the same job)
          const uniqueServices = new Map<string, { serviceName: string; jobs: number; hours: number; revenue: number }>();
          rows.forEach(row => {
            const existing = uniqueServices.get(row.serviceName);
            if (!existing) {
              uniqueServices.set(row.serviceName, {
                serviceName: row.serviceName,
                jobs: row.jobs,
                hours: row.hours,
                revenue: row.revenue
              });
            }
          });
          
          const serviceBreakdown: ServiceBreakdownItem[] = Array.from(uniqueServices.values()).map(s => ({
            serviceId: services.find(svc => svc.serviceName.toLowerCase() === s.serviceName.toLowerCase())?.id || '',
            serviceName: s.serviceName,
            jobs: s.jobs,
            hours: s.hours,
            revenue: s.revenue
          }));
          
          // Calculate totals (shared across crew)
          const totalJobs = serviceBreakdown.reduce((sum, s) => sum + s.jobs, 0);
          const totalHours = serviceBreakdown.reduce((sum, s) => sum + s.hours, 0);
          const totalRevenue = serviceBreakdown.reduce((sum, s) => sum + s.revenue, 0);
          const firstRow = rows[0];
          const totalDailyHours = firstRow.totalDailyHours || totalHours;
          const tips = firstRow.tips || 0;
          const notes = firstRow.notes || '';
          
          // Build job types object
          const jobTypes: { [key: string]: number } = {};
          serviceBreakdown.forEach(s => {
            jobTypes[s.serviceName] = (jobTypes[s.serviceName] || 0) + s.jobs;
          });
          
          const dayOfWeek = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
          
          // Calculate COGS - servicesWithCOGS contains $ cost per job, NOT percentage
          const totalCOGS = serviceBreakdown.reduce((sum, s) => {
            const costPerJob = servicesWithCOGS[s.serviceName] || 0;
            return sum + (costPerJob * s.jobs); // $ per job × number of jobs
          }, 0);
          
          const crewMemberCount = crewEmployees.length;
          
          // ============================================
          // CREW-LEVEL CALCULATIONS (calculate once for the whole crew)
          // ============================================
          
          // Calculate total crew labor cost (sum of all members' labor)
          let totalCrewLaborCost = 0;
          const employeeData: Array<{
            employee: typeof crewEmployees[0];
            baseRate: number;
            hours: number;
            regularHours: number;
            overtimeHours: number;
            basePay: number;
            overtimePay: number;
            totalBasePay: number;
            laborCost: number;
            bonusPercentage: number;
          }> = [];
          
          for (const employee of crewEmployees) {
            const baseRate = employee.current_base_rate;
            const employeeHours = totalDailyHours;
            let regularHours = employeeHours;
            let overtimeHours = 0;
            let basePay = 0;
            let overtimePay = 0;
            
            if (employeeHours > companySettings.overtimeHoursDaily) {
              regularHours = companySettings.overtimeHoursDaily;
              overtimeHours = employeeHours - companySettings.overtimeHoursDaily;
              basePay = regularHours * baseRate;
              overtimePay = overtimeHours * baseRate * companySettings.overtimeMultiplier;
            } else {
              basePay = employeeHours * baseRate;
            }
            
            const totalBasePay = basePay + overtimePay;
            const laborCost = employeeHours * baseRate;
            totalCrewLaborCost += laborCost;
            
            // Get bonus percentage from crew_members table (default to equal split)
            const crewMembersList = crewMembersMap[crewId] || [];
            const crewMemberInfo = crewMembersList.find(cm => cm.employee_id === employee.id);
            const bonusPercentage = crewMemberInfo?.bonus_percentage ?? (100 / crewMemberCount);
            
            employeeData.push({
              employee,
              baseRate,
              hours: employeeHours,
              regularHours,
              overtimeHours,
              basePay,
              overtimePay,
              totalBasePay,
              laborCost,
              bonusPercentage
            });
          }
          
          // Calculate overhead allocation for crew
          const crewOverheadAllocation = totalRevenue * (companySettings.overheadPercent / 100);
          
          // CREW-LEVEL Gross Profit = Total Revenue - Total COGS - Total Crew Labor - Overhead
          const crewGrossProfit = totalRevenue - totalCOGS - totalCrewLaborCost - crewOverheadAllocation;
          const crewGrossProfitPercent = totalRevenue > 0 ? (crewGrossProfit / totalRevenue) * 100 : 0;
          
          // CREW-LEVEL LER = Crew Gross Profit / Total Crew Labor
          const crewLER = totalCrewLaborCost > 0 ? crewGrossProfit / totalCrewLaborCost : 0;
          
          // Bonus qualification based on CREW GROSS PROFIT PERCENTAGE (not LER)
          // Use crew-specific thresholds from company settings
          const crewBonusThresholdMin = companySettings.crewBonusThresholdMin || 15;
          const crewBonusThresholdMax = companySettings.crewBonusThresholdMax || 100;
          const crewQualifiesForBonus = crewGrossProfitPercent >= crewBonusThresholdMin && crewGrossProfitPercent <= crewBonusThresholdMax;
          
          // Calculate CREW-LEVEL bonuses (to be split by percentage)
          let totalCrewBonus = 0;
          let totalCrewAppointmentBonus = 0;
          
          if (crewQualifiesForBonus) {
            totalCrewBonus = crewGrossProfit * 0.10;
          }
          
          if (companySettings.enableAppointmentBonus && totalJobs >= 3) {
            if (totalJobs >= 6) totalCrewAppointmentBonus = companySettings.appointmentBonus6PlusJobs;
            else if (totalJobs === 5) totalCrewAppointmentBonus = companySettings.appointmentBonus5Jobs;
            else if (totalJobs === 4) totalCrewAppointmentBonus = companySettings.appointmentBonus4Jobs;
            else if (totalJobs === 3) totalCrewAppointmentBonus = companySettings.appointmentBonus3Jobs;
          }
          
          // ============================================
          // PER-EMPLOYEE RECORDS (using crew-level metrics)
          // ============================================
          
          for (const empData of employeeData) {
            const { employee, baseRate, hours: employeeHours, regularHours, overtimeHours, basePay, overtimePay, totalBasePay, laborCost, bonusPercentage } = empData;
            
            // Each crew member gets equal share of revenue (for display purposes)
            const attributedRevenue = crewMemberCount > 0 ? Math.round((totalRevenue / crewMemberCount) * 100) / 100 : 0;
            
            // Each crew member gets equal share of COGS (for display purposes)
            const attributedCOGS = crewMemberCount > 0 ? Math.round((totalCOGS / crewMemberCount) * 100) / 100 : 0;
            
            // Each crew member gets equal share of overhead
            const attributedOverhead = crewMemberCount > 0 ? Math.round((crewOverheadAllocation / crewMemberCount) * 100) / 100 : 0;
            
            // Employee's share of gross profit (for display - but LER uses crew-level)
            const employeeGrossProfit = attributedRevenue - attributedCOGS - laborCost - attributedOverhead;
            const employeeGrossProfitPercent = attributedRevenue > 0 ? (employeeGrossProfit / attributedRevenue) * 100 : 0;
            
            // Store CREW LER for this employee (same for all crew members)
            const ler = crewLER;
            
            // Bonus split by designated percentage (e.g., 60/40)
            const bonusQualified = crewQualifiesForBonus ? (totalCrewBonus * bonusPercentage / 100) : 0;
            const appointmentBonus = totalCrewAppointmentBonus * bonusPercentage / 100;
            
            const totalBonuses = bonusQualified + appointmentBonus;
            const tipsPerPerson = tips / crewEmployees.length;
            const totalEmployeePay = totalBasePay + totalBonuses + tipsPerPerson;
            const employeeNetProfit = employeeGrossProfit - bonusQualified - appointmentBonus;
            const employeeNetProfitPercent = attributedRevenue > 0 ? (employeeNetProfit / attributedRevenue) * 100 : 0;
            const hourlyWithBonusAndTips = employeeHours > 0 ? totalEmployeePay / employeeHours : 0;
            
            const recordNotes = `${notes} [Crew: ${crewName}]`.trim();
            
            const dailyRecord: employeeLERService.DailyRecord = {
              work_day: dayOfWeek,
              date: date,
              called_out: false,
              number_of_jobs: totalJobs,
              job_types: jobTypes,
              total_job_revenue: attributedRevenue,
              total_hours_worked: employeeHours,
              total_job_time: totalHours,
              base_rate: baseRate,
              employee_base_pay: totalBasePay,
              overtime_hours: overtimeHours,
              overtime_pay: overtimePay,
              cogs_no_labor: attributedCOGS,
              cogs_no_labor_percent: attributedRevenue > 0 ? (attributedCOGS / attributedRevenue) * 100 : 0,
              overhead_costs_percent: companySettings.overheadPercent,
              gross_profit_before_bonus: employeeGrossProfit,
              gross_profit_before_bonus_percent: employeeGrossProfitPercent,
              ler: ler,
              qualify_for_bonus: crewQualifiesForBonus,
              bonus_qualified_for_percent: bonusQualified,
              appointment_based_bonus: appointmentBonus,
              tip_amount: tipsPerPerson,
              total_employee_pay: totalEmployeePay,
              daily_hourly_with_tips_and_bonus: hourlyWithBonusAndTips,
              daily_net_profit_after_bonus: employeeNetProfit,
              daily_net_profit_after_bonus_percent: employeeNetProfitPercent,
              notes: recordNotes,
              service_breakdown: { services: serviceBreakdown },
              is_crew_job: true,
              crew_id: crewId
            };
            
            console.log(`📝 Creating crew record for ${employee.name} in "${crewName}" on ${date}`);
            const createdRecord = await employeeLERService.createDailyRecord(payPeriod.id!, dailyRecord, employee.id);
            
            if (createdRecord?.id) {
              // Create service labor records
              const laborCosts = {
                basePay: basePay,
                overtimePay: overtimePay,
                bonuses: totalBonuses,
                tips: tipsPerPerson
              };
              
              await serviceLaborService.createServiceLaborRecords(
                dbUserId,
                employee.id!,
                payPeriod.id!,
                date,
                serviceBreakdown,
                laborCosts
              );
              
              // Save crew composition to daily_record_crew_members
              await crewService.addDailyRecordCrewMember({
                daily_record_id: createdRecord.id,
                employee_id: employee.id!,
                role_id: undefined,
                hours_worked: employeeHours,
                bonus_percentage: crewMemberCount > 0 ? 100 / crewMemberCount : 0,
                attributed_revenue: attributedRevenue,
                attributed_bonus: totalBonuses,
                is_helper: false,
                helper_appointments: undefined
              });
              console.log(`💾 Saved crew member record for ${employee.name}`);
              
              successCount++;
              console.log(`✅ Created crew record for ${employee.name}`);
            } else {
              errors.push(`Failed to create crew record for ${employee.name} on ${date}`);
              errorCount++;
            }
          }
        } catch (error: any) {
          console.error(`Error processing crew "${crewName}" on ${date}:`, error);
          errors.push(`Error processing crew "${crewName}" on ${date}: ${error?.message || error}`);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        alert(`Successfully imported ${successCount} record(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setNeedsCalculation(true); // Trigger pulsating Calculate All button
        await loadEmployeeData(selectedEmployeeId);
      } else {
        alert(`Import failed. ${errors.slice(0, 5).join('\n')}`);
      }
      
      return { success: successCount > 0 };
    } catch (error) {
      console.error('CSV import error:', error);
      alert('Error importing CSV. Please check the console for details.');
      return { success: false };
    }
  };

  // Handle crew edit confirmation
  const handleConfirmCrewEdit = async () => {
    if (!pendingCrewEdit || !dbUserId) return;

    const { record, serviceBreakdown, linkedRecords } = pendingCrewEdit;
    let updateCount = 0;

    try {
      // Update all linked records with the same service breakdown and shared data
      for (const linkedRecord of linkedRecords) {
        const employee = allEmployees.find(e => e.id === linkedRecord.employee_id);
        if (!employee) continue;
        
        // Build the update record with shared crew data
        const crewUpdateRecord = {
          ...record,
          // Keep the original employee's base rate for their individual calculation
          baseRate: employee.current_base_rate || 0
        };
        
        const supabaseRecord = convertToSupabaseFormat(crewUpdateRecord);
        const success = await employeeLERService.updateDailyRecord(linkedRecord.id, supabaseRecord);
        
        if (success) {
          updateCount++;
          
          // Update service labor records for this employee
          const laborCosts = {
            basePay: record.employeeBasePay,
            overtimePay: record.overtimePay,
            bonuses: record.bonusQualifiedForPercent + record.appointmentBasedBonus,
            tips: record.tipAmount
          };
          
          await serviceLaborService.updateServiceLaborRecords(
            dbUserId,
            linkedRecord.employee_id,
            linkedRecord.pay_period_id,
            record.date,
            serviceBreakdown,
            laborCosts
          );
          
          // Update crew attributions
          await crewService.deleteCrewAttributions(linkedRecord.id);
        }
      }
      
      // Create new crew attributions for all members
      if (record.isCrewJob && record.crewId) {
        const crewMembers = crewMembersMap[record.crewId] || [];
        if (crewMembers.length > 0) {
          const totalBonus = record.bonusQualifiedForPercent + record.appointmentBasedBonus;
          // Create attributions for the first record (they're linked)
          await crewService.createCrewAttributions(
            dbUserId,
            record.id || '',
            record.crewId || '',
            record.totalJobRevenue,
            totalBonus,
            record.totalHoursWorked,
            crewMembers,
            crewRoles
          );
        }
      }
      
      // Refresh data
      await loadEmployeeData(selectedEmployeeId);
      
      alert(`✅ Successfully updated ${updateCount} crew member records`);
      setShowAddDay(false);
      setEditingRecord(null);
      setPendingCrewEdit(null);
      setShowCrewEditConfirm(false);
    } catch (error) {
      console.error('Error updating crew records:', error);
      alert('Error updating crew records. Please check the console for details.');
      setShowCrewEditConfirm(false);
      setPendingCrewEdit(null);
    }
  };

  // Handle bulk delete of records
  const handleBulkDelete = async () => {
    if (!selectedRecordIds.length) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedRecordIds.length} record(s)?\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const result = await employeeLERService.bulkDeleteDailyRecords(selectedRecordIds);
      
      if (result.errors.length > 0) {
        alert(`Successfully deleted ${result.success} record(s).\n\nErrors:\n${result.errors.join('\n')}`);
      } else {
        alert(`Successfully deleted ${result.success} record(s).`);
      }
      
      // Clear selection and reload data
      setSelectedRecordIds([]);
      await loadEmployeeData(selectedEmployeeId);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Error deleting records. Please check the console for details.');
    }
  };

  // Calculate All Days - works with filtered records (YTD or specific pay period)
  const handleCalculateAllDays = async (recordsToProcess?: typeof filteredDailyRecords) => {
    if (!dbUserId) {
      alert('Please wait for data to load');
      return;
    }
    
    // Use provided records or filtered records (works for both YTD and specific pay period)
    const records = recordsToProcess || filteredDailyRecords;
    
    if (records.length === 0) {
      alert('No records to recalculate');
      return;
    }
    
    // Clear the pulsating state when Calculate All is clicked
    setNeedsCalculation(false);

    const periodLabel = selectedPeriod 
      ? `"${selectedPeriod.periodName}"` 
      : `${filterMonth === 'all' ? 'Year to Date' : new Date(filterYear, filterMonth as number).toLocaleDateString('en-US', { month: 'long' })} ${filterYear}`;

    const confirmCalc = recordsToProcess ? true : window.confirm(
      `This will recalculate all ${records.length} days for ${periodLabel}.\n\nThis will update LER, bonuses, and profits based on current company settings and COGS values.\n\nContinue?`
    );

    if (!confirmCalc) return;

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each daily record
      for (const record of records) {
        try {
          // Skip called out days
          if (record.calledOut) {
            continue;
          }

          // Get service breakdown (it's already an array in the DailyRecord type)
          const serviceBreakdown: ServiceBreakdownItem[] = record.serviceBreakdown || [];
          
          if (serviceBreakdown.length === 0) {
            console.log(`Skipping ${record.date} - no services`);
            continue;
          }

          // Recalculate COGS with current settings (SAME AS EDIT MODAL)
          // COGS = jobs × cost per service (NOT revenue × percentage)
          console.log(`   📦 Service breakdown for ${record.date}:`, serviceBreakdown);
          const totalCOGS = serviceBreakdown.reduce((sum: number, s: ServiceBreakdownItem) => {
            const costPerService = servicesWithCOGS[s.serviceName] || 0;
            const cogsCost = s.jobs * costPerService;
            console.log(`      ${s.serviceName}: ${s.jobs} jobs × $${costPerService} = $${cogsCost.toFixed(2)}`);
            return sum + cogsCost;
          }, 0);
          console.log(`   💰 Total COGS: $${totalCOGS.toFixed(2)}`);

          // Recalculate base pay and overtime
          // USE EMPLOYEE'S CURRENT BASE RATE, not the stored rate in the record
          const baseRate = employeeInfo?.currentBaseRate || record.baseRate;
          const totalDailyHours = record.totalHoursWorked;
          console.log(`   💵 Base rate for ${record.date}: $${baseRate}/hr (employee current: $${employeeInfo?.currentBaseRate}/hr, record stored: $${record.baseRate}/hr)`);
          let regularHours = totalDailyHours;
          let overtimeHours = 0;
          let basePay = 0;
          let overtimePay = 0;

          if (totalDailyHours > companySettings.overtimeHoursDaily) {
            regularHours = companySettings.overtimeHoursDaily;
            overtimeHours = totalDailyHours - companySettings.overtimeHoursDaily;
            basePay = regularHours * baseRate;
            overtimePay = overtimeHours * baseRate * companySettings.overtimeMultiplier;
          } else {
            basePay = totalDailyHours * baseRate;
          }

          const totalEmployeeBasePay = basePay + overtimePay;
          
          // Calculate overhead allocation (same as Edit modal)
          const overheadAllocation = record.totalJobRevenue * (companySettings.overheadPercent / 100);
          
          // Calculate total cost of job: Labor + COGS + Overhead (same as Edit modal)
          const totalCostOfJob = totalEmployeeBasePay + totalCOGS + overheadAllocation;
          
          // Calculate gross profit BEFORE bonus (Revenue - Total Cost)
          const grossProfit = record.totalJobRevenue - totalCostOfJob;
          const grossProfitPercent = record.totalJobRevenue > 0 ? (grossProfit / record.totalJobRevenue) * 100 : 0;
          const ler = totalEmployeeBasePay > 0 ? grossProfit / totalEmployeeBasePay : 0;

          // Recalculate bonuses with current settings
          // Bonus qualification is based on gross profit PERCENTAGE, not LER ratio
          // Use crew thresholds for crew jobs
          let bonusQualified = 0;
          let appointmentBonus = 0;
          const thresholdMin = record.isCrewJob 
            ? (companySettings.crewBonusThresholdMin || 15)
            : companySettings.bonusThresholdMin;
          const thresholdMax = record.isCrewJob
            ? (companySettings.crewBonusThresholdMax || 100)
            : companySettings.bonusThresholdMax;
          const qualifyForBonus = grossProfitPercent >= thresholdMin && 
                                  grossProfitPercent <= thresholdMax;

          if (qualifyForBonus) {
            // CORRECT FORMULA: Bonus = LER × Daily Hours (same as Edit modal)
            bonusQualified = ler * totalDailyHours;
          }

          // Check if appointment bonus should be applied
          // NOTE: Edit modal uses a checkbox, but we check company settings here
          console.log(`   🎯 Appointment bonus check: enabled=${companySettings.enableAppointmentBonus}, jobs=${record.numberOfJobs}`);
          if (companySettings.enableAppointmentBonus && record.numberOfJobs >= 3) {
            if (record.numberOfJobs >= 6) appointmentBonus = companySettings.appointmentBonus6PlusJobs;
            else if (record.numberOfJobs === 5) appointmentBonus = companySettings.appointmentBonus5Jobs;
            else if (record.numberOfJobs === 4) appointmentBonus = companySettings.appointmentBonus4Jobs;
            else if (record.numberOfJobs === 3) appointmentBonus = companySettings.appointmentBonus3Jobs;
            console.log(`   💰 Appointment bonus awarded: $${appointmentBonus}`);
          }

          const totalBonuses = bonusQualified + appointmentBonus;
          const totalEmployeePay = totalEmployeeBasePay + totalBonuses + record.tipAmount;
          const netProfit = grossProfit - totalBonuses;
          const netProfitPercent = record.totalJobRevenue > 0 ? (netProfit / record.totalJobRevenue) * 100 : 0;
          const hourlyWithBonusAndTips = totalDailyHours > 0 ? totalEmployeePay / totalDailyHours : 0;

          console.log(`Recalculating ${record.date}:`, {
            revenue: record.totalJobRevenue,
            labor: totalEmployeeBasePay,
            cogs: totalCOGS,
            overhead: overheadAllocation,
            totalCost: totalCostOfJob,
            grossProfit,
            grossProfitPercent,
            ler,
            qualifyForBonus,
            bonusQualified,
            appointmentBonus,
            totalBonuses,
            numberOfJobs: record.numberOfJobs
          });

          // Update the record
          const updatedRecord: employeeLERService.DailyRecord = {
            work_day: record.workDay,
            date: record.date,
            called_out: record.calledOut,
            number_of_jobs: record.numberOfJobs,
            job_types: record.jobTypes,
            total_job_revenue: record.totalJobRevenue,
            total_hours_worked: record.totalHoursWorked,
            total_job_time: record.totalJobTime,
            base_rate: baseRate,
            employee_base_pay: totalEmployeeBasePay,
            overtime_hours: overtimeHours,
            overtime_pay: overtimePay,
            cogs_no_labor: totalCOGS,
            cogs_no_labor_percent: record.totalJobRevenue > 0 ? (totalCOGS / record.totalJobRevenue) * 100 : 0,
            overhead_costs_percent: companySettings.overheadPercent,
            gross_profit_before_bonus: grossProfit,
            gross_profit_before_bonus_percent: grossProfitPercent,
            ler: ler,
            qualify_for_bonus: qualifyForBonus,
            bonus_qualified_for_percent: bonusQualified,
            appointment_based_bonus: appointmentBonus,
            tip_amount: record.tipAmount,
            total_employee_pay: totalEmployeePay,
            daily_hourly_with_tips_and_bonus: hourlyWithBonusAndTips,
            daily_net_profit_after_bonus: netProfit,
            daily_net_profit_after_bonus_percent: netProfitPercent,
            notes: record.notes,
            service_breakdown: { services: serviceBreakdown }
          };

          const updated = await employeeLERService.updateDailyRecord(record.id!, updatedRecord);
          if (updated) {
            console.log(`✅ Saved ${record.date} with bonuses:`, {
              bonusQualified,
              appointmentBonus,
              totalBonuses
            });
            successCount++;
          } else {
            console.error(`❌ Failed to save ${record.date}`);
            errorCount++;
            errors.push(`Failed to update ${record.date}`);
          }
        } catch (error: any) {
          console.error(`Error recalculating ${record.date}:`, error);
          errorCount++;
          errors.push(`Error on ${record.date}: ${error?.message || error}`);
        }
      }

      // Reload data
      await loadEmployeeData(selectedEmployeeId);

      // Show results
      if (successCount > 0) {
        alert(`Successfully recalculated ${successCount} day(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      } else {
        alert(`Recalculation failed. ${errors.slice(0, 5).join('\n')}`);
      }
    } catch (error) {
      console.error('Calculate all error:', error);
      alert('Error recalculating days. Please check the console for details.');
    }
  };

  // Bulk Recalculate All Employees
  const [bulkRecalculating, setBulkRecalculating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, employee: '' });
  
  const handleBulkRecalculateAllEmployees = async () => {
    if (!dbUserId || allEmployees.length === 0) {
      alert('No employees found to recalculate');
      return;
    }
    
    const confirmBulk = window.confirm(
      `This will recalculate ALL records for ALL ${allEmployees.length} employees across ALL pay periods.\n\nThis may take several minutes.\n\nContinue?`
    );
    
    if (!confirmBulk) return;
    
    setBulkRecalculating(true);
    let totalSuccess = 0;
    let totalErrors = 0;
    
    try {
      for (let i = 0; i < allEmployees.length; i++) {
        const employee = allEmployees[i];
        setBulkProgress({ current: i + 1, total: allEmployees.length, employee: employee.name });
        
        // Load all records for this employee across all pay periods
        const allRecordsForEmployee: typeof filteredDailyRecords = [];
        
        for (const period of payPeriodsData) {
          for (const record of period.dailyRecords) {
            // Skip called out days and days with no services
            if (!record.calledOut && record.serviceBreakdown && record.serviceBreakdown.length > 0) {
              allRecordsForEmployee.push(record);
            }
          }
        }
        
        if (allRecordsForEmployee.length === 0) {
          console.log(`Skipping ${employee.name} - no records`);
          continue;
        }
        
        console.log(`Processing ${employee.name}: ${allRecordsForEmployee.length} records`);
        
        // Process each record for this employee
        for (const record of allRecordsForEmployee) {
          try {
            const serviceBreakdown: ServiceBreakdownItem[] = record.serviceBreakdown || [];
            
            // Recalculate COGS
            const totalCOGS = serviceBreakdown.reduce((sum: number, s: ServiceBreakdownItem) => {
              const costPerService = servicesWithCOGS[s.serviceName] || 0;
              return sum + (s.jobs * costPerService);
            }, 0);
            
            // Get employee's base rate
            const empInfo = allEmployees.find((e) => e.id === employee.id);
            const baseRate = empInfo?.current_base_rate || record.baseRate;
            const totalDailyHours = record.totalHoursWorked;
            
            // Calculate overtime
            let regularHours = totalDailyHours;
            let overtimeHours = 0;
            let basePay = 0;
            let overtimePay = 0;
            
            if (totalDailyHours > companySettings.overtimeHoursDaily) {
              regularHours = companySettings.overtimeHoursDaily;
              overtimeHours = totalDailyHours - companySettings.overtimeHoursDaily;
              basePay = regularHours * baseRate;
              overtimePay = overtimeHours * baseRate * companySettings.overtimeMultiplier;
            } else {
              basePay = totalDailyHours * baseRate;
            }
            
            const totalEmployeeBasePay = basePay + overtimePay;
            const overheadAllocation = record.totalJobRevenue * (companySettings.overheadPercent / 100);
            const totalCostOfJob = totalEmployeeBasePay + totalCOGS + overheadAllocation;
            const grossProfit = record.totalJobRevenue - totalCostOfJob;
            const grossProfitPercent = record.totalJobRevenue > 0 ? (grossProfit / record.totalJobRevenue) * 100 : 0;
            const ler = totalEmployeeBasePay > 0 ? grossProfit / totalEmployeeBasePay : 0;
            
            // Bonus qualification based on gross profit %
            let bonusQualified = 0;
            let appointmentBonus = 0;
            const thresholdMin = record.isCrewJob 
              ? (companySettings.crewBonusThresholdMin || 15)
              : companySettings.bonusThresholdMin;
            const thresholdMax = record.isCrewJob
              ? (companySettings.crewBonusThresholdMax || 100)
              : companySettings.bonusThresholdMax;
            const qualifyForBonus = grossProfitPercent >= thresholdMin && grossProfitPercent <= thresholdMax;
            
            if (qualifyForBonus) {
              bonusQualified = ler * totalDailyHours;
            }
            
            if (companySettings.enableAppointmentBonus && record.numberOfJobs >= 3) {
              if (record.numberOfJobs >= 6) appointmentBonus = companySettings.appointmentBonus6PlusJobs;
              else if (record.numberOfJobs === 5) appointmentBonus = companySettings.appointmentBonus5Jobs;
              else if (record.numberOfJobs === 4) appointmentBonus = companySettings.appointmentBonus4Jobs;
              else if (record.numberOfJobs === 3) appointmentBonus = companySettings.appointmentBonus3Jobs;
            }
            
            const totalBonuses = bonusQualified + appointmentBonus;
            const totalEmployeePay = totalEmployeeBasePay + totalBonuses + record.tipAmount;
            const netProfit = grossProfit - totalBonuses;
            const netProfitPercent = record.totalJobRevenue > 0 ? (netProfit / record.totalJobRevenue) * 100 : 0;
            const hourlyWithBonusAndTips = totalDailyHours > 0 ? totalEmployeePay / totalDailyHours : 0;
            
            const updatedRecord: employeeLERService.DailyRecord = {
              work_day: record.workDay,
              date: record.date,
              called_out: record.calledOut,
              number_of_jobs: record.numberOfJobs,
              job_types: record.jobTypes,
              total_job_revenue: record.totalJobRevenue,
              total_hours_worked: record.totalHoursWorked,
              total_job_time: record.totalJobTime,
              base_rate: baseRate,
              employee_base_pay: totalEmployeeBasePay,
              overtime_hours: overtimeHours,
              overtime_pay: overtimePay,
              cogs_no_labor: totalCOGS,
              cogs_no_labor_percent: record.totalJobRevenue > 0 ? (totalCOGS / record.totalJobRevenue) * 100 : 0,
              overhead_costs_percent: companySettings.overheadPercent,
              gross_profit_before_bonus: grossProfit,
              gross_profit_before_bonus_percent: grossProfitPercent,
              ler: ler,
              qualify_for_bonus: qualifyForBonus,
              bonus_qualified_for_percent: bonusQualified,
              appointment_based_bonus: appointmentBonus,
              tip_amount: record.tipAmount,
              total_employee_pay: totalEmployeePay,
              daily_hourly_with_tips_and_bonus: hourlyWithBonusAndTips,
              daily_net_profit_after_bonus: netProfit,
              daily_net_profit_after_bonus_percent: netProfitPercent,
              notes: record.notes,
              service_breakdown: { services: serviceBreakdown }
            };
            
            const updated = await employeeLERService.updateDailyRecord(record.id!, updatedRecord);
            if (updated) {
              totalSuccess++;
            } else {
              totalErrors++;
            }
          } catch (err) {
            console.error(`Error processing record ${record.date} for ${employee.name}:`, err);
            totalErrors++;
          }
        }
      }
      
      // Reload current employee's data
      await loadEmployeeData(selectedEmployeeId);
      
      alert(`Bulk recalculation complete!\n\n✅ ${totalSuccess} records updated\n❌ ${totalErrors} errors`);
    } catch (error) {
      console.error('Bulk recalculate error:', error);
      alert('Error during bulk recalculation. Check console for details.');
    } finally {
      setBulkRecalculating(false);
      setBulkProgress({ current: 0, total: 0, employee: '' });
    }
  };

  const payPeriods = payPeriodsData;

  const selectedPeriod = payPeriods[selectedPeriodIndex];

  // Filter records based on year/month/pay period selection
  const filteredDailyRecords = useMemo(() => {
    // If a specific pay period is selected (not "all"), show only that period's records
    if (selectedPeriodIndex !== -1 && selectedPeriod) {
      // Filter the selected period's records by year (and month if set)
      return selectedPeriod.dailyRecords.filter(record => {
        const recordDate = parseLocalDate(record.date);
        
        // Year filter
        if (recordDate.getFullYear() !== filterYear) {
          return false;
        }
        
        // Month filter (0-indexed) - only if not "all"
        if (filterMonth !== 'all' && recordDate.getMonth() !== filterMonth) {
          return false;
        }
        
        return true;
      }).sort((a, b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        return sortOrder === 'desc' 
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });
    }
    
    // If month is "all" (Year to Date) and no specific pay period, show all records for the selected year
    if (filterMonth === 'all') {
      const allRecords = payPeriodsData.flatMap(p => p.dailyRecords);
      return allRecords.filter(record => {
        const recordDate = parseLocalDate(record.date);
        return recordDate.getFullYear() === filterYear;
      }).sort((a, b) => {
        const dateA = parseLocalDate(a.date);
        const dateB = parseLocalDate(b.date);
        return sortOrder === 'desc' 
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });
    }
    
    // If a specific month is selected but no specific pay period, search across ALL pay periods for that month
    const allRecords = payPeriodsData.flatMap(period => period.dailyRecords);
    
    const filtered = allRecords.filter(record => {
      const recordDate = parseLocalDate(record.date);
      
      // Year filter
      if (recordDate.getFullYear() !== filterYear) {
        return false;
      }
      
      // Month filter (0-indexed)
      if (recordDate.getMonth() !== filterMonth) {
        return false;
      }
      
      return true;
    });
    
    // Sort by date based on sortOrder
    return filtered.sort((a, b) => {
      const dateA = parseLocalDate(a.date);
      const dateB = parseLocalDate(b.date);
      return sortOrder === 'desc' 
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });
  }, [payPeriodsData, selectedPeriod, selectedPeriodIndex, filterYear, filterMonth, sortOrder]);

  // Show each record as its own row (no aggregation)
  // This allows users to see and edit solo and crew records separately
  const aggregatedRecords = useMemo(() => {
    return filteredDailyRecords;
  }, [filteredDailyRecords]);

  // Calculate totals for filtered records (when month/year filter is active)
  const filteredTotals = useMemo(() => {
    if (aggregatedRecords.length === 0) {
      return {
        totalJobs: 0,
        totalRevenue: 0,
        totalHours: 0,
        totalOTHours: 0,
        avgLER: 0,
        totalLERBonus: 0,
        totalApptBonus: 0,
        totalBonuses: 0,
        totalPay: 0,
        totalNetProfit: 0,
        avgNetProfitPercent: 0
      };
    }

    const totalJobs = filteredDailyRecords.reduce((sum, r) => sum + r.numberOfJobs, 0);
    const totalRevenue = filteredDailyRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0);
    const totalHours = filteredDailyRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0);
    const totalOTHours = filteredDailyRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const totalLERBonus = filteredDailyRecords.reduce((sum, r) => sum + (r.qualifyForBonus ? r.bonusQualifiedForPercent : 0), 0);
    const totalApptBonus = filteredDailyRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0);
    const totalBonuses = totalLERBonus + totalApptBonus;
    const totalPay = filteredDailyRecords.reduce((sum, r) => sum + r.totalEmployeePay, 0);
    const totalNetProfit = filteredDailyRecords.reduce((sum, r) => sum + r.dailyNetProfitAfterBonus, 0);
    
    // Calculate average LER (simple average of stored LER values)
    // Filter out called out days, days with no jobs, and negative LER values
    const workingRecords = filteredDailyRecords.filter(r => !r.calledOut && r.numberOfJobs > 0 && r.ler >= 0);
    const soloWorkingRecords = workingRecords.filter(r => !r.isCrewJob);
    const crewWorkingRecords = workingRecords.filter(r => r.isCrewJob);
    const avgLER = workingRecords.length > 0 
      ? workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length 
      : 0;
    
    // Debug: Show breakdown by solo vs crew
    console.log('📊 LER Tracking filteredTotals:', {
      filterYear,
      filterMonth,
      totalFilteredRecords: filteredDailyRecords.length,
      totalRecords: workingRecords.length,
      soloRecords: soloWorkingRecords.length,
      crewRecords: crewWorkingRecords.length,
      soloAvgLER: soloWorkingRecords.length > 0 
        ? (soloWorkingRecords.reduce((sum, r) => sum + r.ler, 0) / soloWorkingRecords.length).toFixed(2)
        : 'N/A',
      crewAvgLER: crewWorkingRecords.length > 0 
        ? (crewWorkingRecords.reduce((sum, r) => sum + r.ler, 0) / crewWorkingRecords.length).toFixed(2)
        : 'N/A',
      combinedAvgLER: avgLER.toFixed(2),
      soloRecordDates: soloWorkingRecords.map(r => ({ date: r.date, ler: r.ler.toFixed(2) }))
    });
    
    // Calculate average net profit percent
    const avgNetProfitPercent = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return {
      totalJobs,
      totalRevenue,
      totalHours,
      totalOTHours,
      avgLER,
      totalLERBonus,
      totalApptBonus,
      totalBonuses,
      totalPay,
      totalNetProfit,
      avgNetProfitPercent
    };
  }, [filteredDailyRecords]);

  // Calculate KPIs based on current filter selection (not always YTD)
  const kpis = useMemo(() => {
    // Filter out called out days, days with no jobs, and negative LER values
    const workingRecords = filteredDailyRecords.filter(r => !r.calledOut && r.numberOfJobs > 0 && r.ler >= 0);
    
    if (workingRecords.length === 0) {
      return {
        avgLER: 0,
        totalBonusEarned: 0,
        avgHourlyRate: 0,
        profitMargin: 0,
        totalRevenue: 0,
        totalHours: 0,
        totalGrossProfit: 0
      };
    }

    // Calculate totals
    const totalRevenue = workingRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0);
    const totalHours = workingRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0);
    const totalGrossProfit = workingRecords.reduce((sum, r) => sum + r.grossProfitBeforeBonus, 0);
    const totalNetProfit = workingRecords.reduce((sum, r) => sum + r.dailyNetProfitAfterBonus, 0);
    const totalBonusEarned = workingRecords.reduce((sum, r) => sum + r.bonusQualifiedForPercent + r.appointmentBasedBonus, 0);
    const totalEmployeePay = workingRecords.reduce((sum, r) => sum + r.totalEmployeePay, 0);
    
    // Calculate averages
    // Average LER: sum of all daily LER values / number of working days
    const totalLER = workingRecords.reduce((sum, r) => sum + r.ler, 0);
    const avgLER = workingRecords.length > 0 ? totalLER / workingRecords.length : 0;
    const avgHourlyRate = totalHours > 0 ? totalEmployeePay / totalHours : 0;
    const profitMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return {
      avgLER,
      totalBonusEarned,
      avgHourlyRate,
      profitMargin,
      totalRevenue,
      totalHours,
      totalGrossProfit
    };
  }, [filteredDailyRecords]);
  
  // Dynamic label for KPI cards based on current filter
  const kpiPeriodLabel = useMemo(() => {
    if (selectedPeriod) {
      return selectedPeriod.periodName;
    }
    if (filterMonth === 'all') {
      return `${filterYear} YTD`;
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[filterMonth as number]} ${filterYear}`;
  }, [selectedPeriod, filterMonth, filterYear]);

  // Filter crew work days based on selected pay period
  const filteredCrewWorkDays = useMemo(() => {
    if (crewSelectedPayPeriod === 'all') {
      return crewWorkDays;
    }
    
    // Find the selected pay period
    const selectedPayPeriod = payPeriods.find(p => p.startDate === crewSelectedPayPeriod);
    if (!selectedPayPeriod) {
      return crewWorkDays;
    }
    
    const periodStart = parseLocalDate(selectedPayPeriod.startDate);
    const periodEnd = parseLocalDate(selectedPayPeriod.endDate);
    
    return crewWorkDays.filter(day => {
      const dayDate = parseLocalDate(day.date);
      return dayDate >= periodStart && dayDate <= periodEnd;
    });
  }, [crewWorkDays, crewSelectedPayPeriod, payPeriods]);

  // Dynamic label for crew KPI cards based on current filter
  const crewKpiPeriodLabel = useMemo(() => {
    if (crewSelectedPayPeriod !== 'all') {
      const selectedPayPeriod = payPeriods.find(p => p.startDate === crewSelectedPayPeriod);
      if (selectedPayPeriod) {
        return selectedPayPeriod.periodName;
      }
    }
    if (crewFilterMonth === 'ytd') {
      return `${crewFilterYear} YTD`;
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[crewFilterMonth as number]} ${crewFilterYear}`;
  }, [crewSelectedPayPeriod, crewFilterMonth, crewFilterYear, payPeriods]);

  // Calculate crew capacity metrics for Lighthouse guidance
  // TODO: Implement crew capacity metrics when needed
  // Placeholder for future crew capacity calculations

  // Helper function to calculate crew metrics for any given crew
  const calculateCrewMetrics = (crewId: string, year: number, month: number | 'ytd') => {
    // Filter records by crew_id and date
    const crewRecords = filteredDailyRecords.filter(record => {
      if (!record.crewId || record.crewId !== crewId) return false;
      
      const recordDate = parseLocalDate(record.date);
      if (recordDate.getFullYear() !== year) return false;
      
      if (month === 'ytd') {
        return true; // All records for the year
      } else {
        return recordDate.getMonth() === month;
      }
    });

    // Calculate metrics at CREW LEVEL to avoid negative LER from split revenue
    const totalJobs = crewRecords.reduce((sum, r) => sum + r.numberOfJobs, 0);
    const totalRevenue = crewRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0);
    const totalBasePay = crewRecords.reduce((sum, r) => sum + r.employeeBasePay, 0);
    const totalCOGS = crewRecords.reduce((sum, r) => sum + r.cogsNoLabor, 0);
    const avgRevenuePerJob = totalJobs > 0 ? totalRevenue / totalJobs : 0;
    
    // Crew LER = (Total Revenue - Total COGS - Total Labor) / Total Labor
    // This avoids the issue where individual employee LERs are negative due to revenue splitting
    const crewGrossProfit = totalRevenue - totalCOGS - totalBasePay;
    const avgLER = totalBasePay > 0 ? crewGrossProfit / totalBasePay : 0;

    return {
      totalJobs,
      totalRevenue,
      avgRevenuePerJob,
      avgLER
    };
  };

  // Calculate LER-focused insights based on view mode
  // This section focuses on efficiency and profitability metrics
  const employeeInsights = useMemo(() => {
    const insights: Array<{ type: 'success' | 'warning' | 'info' | 'tip'; title: string; message: string; }> = [];
    
    const records = insightsViewMode === 'period' 
      ? payPeriods[selectedPeriodIndex]?.dailyRecords || []
      : payPeriods.flatMap(p => p.dailyRecords);
    
    const workingRecords = records.filter(r => !r.calledOut && r.numberOfJobs > 0 && r.ler >= 0);
    
    if (workingRecords.length === 0) {
      insights.push({ type: 'info', title: 'No Data Yet', message: `No working days recorded for ${insightsViewMode === 'period' ? 'this pay period' : 'this year'}.` });
      return insights;
    }

    // LER calculations (workingRecords already filtered for ler >= 0)
    const avgLER = workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length;
    const avgProfit = workingRecords.reduce((sum, r) => sum + r.grossProfitBeforeBonusPercent, 0) / workingRecords.length;
    const lerVariance = workingRecords.reduce((sum, r) => sum + Math.pow(r.ler - avgLER, 2), 0) / workingRecords.length;
    const lerStdDev = Math.sqrt(lerVariance);
    const sortedByLER = [...workingRecords].sort((a, b) => b.ler - a.ler);
    const bestDay = sortedByLER[0];
    const worstDay = sortedByLER[sortedByLER.length - 1];
    const totalJobs = workingRecords.reduce((sum, r) => sum + r.numberOfJobs, 0);

    // LER Performance Level + Consistency Combined
    if (avgLER >= 1.5) {
      if (lerStdDev < 0.3) {
        insights.push({ type: 'success', title: 'Excellent & Consistent LER', message: `Average LER of ${avgLER.toFixed(2)} with excellent day-to-day consistency (σ=${lerStdDev.toFixed(2)}). Peak efficiency!` });
      } else if (lerStdDev > 0.6) {
        insights.push({ type: 'success', title: 'High LER, Variable Days', message: `Excellent ${avgLER.toFixed(2)} average LER, but varies significantly. Best: ${bestDay.ler.toFixed(2)}, Worst: ${worstDay.ler.toFixed(2)}. Focus on consistency.` });
      } else {
        insights.push({ type: 'success', title: 'Excellent LER', message: `Average LER of ${avgLER.toFixed(2)} is well above target. Strong contribution to profitability.` });
      }
    } else if (avgLER >= 1.0) {
      if (lerStdDev < 0.3) {
        insights.push({ type: 'success', title: 'Solid & Reliable LER', message: `Consistently meets target with ${avgLER.toFixed(2)} LER (σ=${lerStdDev.toFixed(2)}). Reliable efficiency.` });
      } else if (lerStdDev > 0.6) {
        insights.push({ type: 'info', title: 'LER Inconsistency', message: `Average ${avgLER.toFixed(2)} LER meets target, but swings from ${worstDay.ler.toFixed(2)} to ${bestDay.ler.toFixed(2)}. Identify what drives good days.` });
      } else {
        insights.push({ type: 'success', title: 'Target LER Achieved', message: `Average LER of ${avgLER.toFixed(2)} meets the 1.0 target. Solid profitability contribution.` });
      }
    } else if (avgLER >= 0.7) {
      if (lerStdDev > 0.6) {
        insights.push({ type: 'warning', title: 'LER Below Target + Inconsistent', message: `${avgLER.toFixed(2)} LER is below target with high variation. Best day hit ${bestDay.ler.toFixed(2)} - replicate those conditions.` });
      } else {
        insights.push({ type: 'warning', title: 'LER Approaching Target', message: `LER of ${avgLER.toFixed(2)} is close to the 1.0 target. Small efficiency gains will push you over.` });
      }
    } else {
      insights.push({ type: 'warning', title: 'LER Below Target', message: `LER of ${avgLER.toFixed(2)} is significantly below the 1.0 target. Review job efficiency and labor costs.` });
    }

    // LER Trend (if enough data)
    if (workingRecords.length >= 5) {
      const recentRecords = workingRecords.slice(-5);
      const olderRecords = workingRecords.slice(0, Math.max(1, workingRecords.length - 5));
      const recentAvgLER = recentRecords.reduce((sum, r) => sum + r.ler, 0) / recentRecords.length;
      const olderAvgLER = olderRecords.reduce((sum, r) => sum + r.ler, 0) / olderRecords.length;
      const lerChange = recentAvgLER - olderAvgLER;
      
      if (lerChange > 0.15) {
        insights.push({ type: 'success', title: 'LER Trending Up', message: `Recent LER (${recentAvgLER.toFixed(2)}) is improving vs earlier (${olderAvgLER.toFixed(2)}). +${lerChange.toFixed(2)} improvement!` });
      } else if (lerChange < -0.15) {
        insights.push({ type: 'warning', title: 'LER Trending Down', message: `Recent LER (${recentAvgLER.toFixed(2)}) is declining vs earlier (${olderAvgLER.toFixed(2)}). ${lerChange.toFixed(2)} drop - investigate causes.` });
      }
    }

    // Profit Margin (directly tied to LER)
    if (avgProfit >= 40) {
      insights.push({ type: 'success', title: 'High Profit Margin', message: `${avgProfit.toFixed(1)}% average gross profit margin. Excellent job-level profitability.` });
    } else if (avgProfit < 25) {
      insights.push({ type: 'warning', title: 'Low Profit Margin', message: `${avgProfit.toFixed(1)}% profit margin is below optimal. This directly impacts LER - review pricing or reduce job time.` });
    }

    // Best/Worst Day Analysis
    if (workingRecords.length >= 3 && bestDay.ler - worstDay.ler > 0.5) {
      insights.push({ 
        type: 'tip', 
        title: 'LER Range Analysis', 
        message: `Best day: ${bestDay.ler.toFixed(2)} LER on ${new Date(bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Worst: ${worstDay.ler.toFixed(2)} on ${new Date(worstDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Compare what was different.` 
      });
    }

    // Service-specific LER analysis
    const serviceLERData: { [key: string]: { totalLER: number; count: number; jobs: number } } = {};
    workingRecords.forEach(record => {
      Object.entries(record.jobTypes).forEach(([service, jobCount]) => {
        if (jobCount > 0) {
          if (!serviceLERData[service]) {
            serviceLERData[service] = { totalLER: 0, count: 0, jobs: 0 };
          }
          serviceLERData[service].totalLER += record.ler;
          serviceLERData[service].count += 1;
          serviceLERData[service].jobs += jobCount;
        }
      });
    });

    const serviceAverages = Object.entries(serviceLERData)
      .filter(([_, data]) => data.jobs >= 3)
      .map(([service, data]) => ({
        service,
        avgLER: data.totalLER / data.count,
        jobs: data.jobs
      }))
      .sort((a, b) => a.avgLER - b.avgLER);

    if (serviceAverages.length > 1) {
      const weakestService = serviceAverages[0];
      const strongestService = serviceAverages[serviceAverages.length - 1];
      
      insights.push({ 
        type: 'info', 
        title: 'LER by Service Type', 
        message: `Highest LER: ${strongestService.service} (${strongestService.avgLER.toFixed(2)}). Lowest: ${weakestService.service} (${weakestService.avgLER.toFixed(2)}). Focus efficiency training on ${weakestService.service}.` 
      });
    }

    return insights;
  }, [employeeInfo.name, payPeriods, selectedPeriodIndex, insightsViewMode]);

  // LER color coding
  const getLERColor = (ler: number): string => {
    if (ler >= 1.0) return 'text-green-600';
    if (ler >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLERBadgeColor = (ler: number): 'default' | 'secondary' | 'destructive' => {
    if (ler >= 1.0) return 'default';
    if (ler >= 0.7) return 'secondary';
    return 'destructive';
  };

  // Chart data - LER Trend (uses same filter as Daily Performance Records)
  // Shows daily curve when month is selected, monthly aggregation otherwise
  const lerTrendData = useMemo(() => {
    // If a specific month is selected, show daily data for that month
    if (filterMonth !== 'all') {
      return filteredDailyRecords
        .filter(record => !record.calledOut && record.numberOfJobs > 0)
        .map(record => {
          const recordDate = parseLocalDate(record.date);
          return {
            month: recordDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // e.g., "May 1"
            ler: Math.round(record.ler * 100) / 100,
            revenue: record.totalJobRevenue,
            days: 1
          };
        })
        .sort((a, b) => {
          // Sort by date
          const dateA = new Date(a.month + ', 2025');
          const dateB = new Date(b.month + ', 2025');
          return dateA.getTime() - dateB.getTime();
        });
    }
    
    // Otherwise, aggregate by month
    const monthlyData: { [key: string]: { totalLER: number; count: number; revenue: number } } = {};
    
    filteredDailyRecords.forEach(record => {
      if (!record.calledOut && record.numberOfJobs > 0) {
        const recordDate = parseLocalDate(record.date);
        const monthKey = recordDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { totalLER: 0, count: 0, revenue: 0 };
        }
        
        monthlyData[monthKey].totalLER += record.ler;
        monthlyData[monthKey].count += 1;
        monthlyData[monthKey].revenue += record.totalJobRevenue;
      }
    });
    
    // Convert to array and calculate averages
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: month.replace(/\s\d{4}/, ''), // Remove year from display (e.g., "Jan 2025" -> "Jan")
        ler: Math.round((data.totalLER / data.count) * 100) / 100, // Average LER for the month (rounded to 2 decimals)
        revenue: data.revenue,
        days: data.count
      }))
      .sort((a, b) => {
        // Sort by month chronologically
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
      });
  }, [filteredDailyRecords, filterMonth]);

  // Job Type Distribution (uses same filter as Daily Performance Records)
  const jobTypeData = useMemo(() => {
    const totals: { [key: string]: number } = {};
    
    // Use filteredDailyRecords so it respects the year/month filters
    filteredDailyRecords.forEach(record => {
      Object.entries(record.jobTypes).forEach(([serviceName, count]) => {
        totals[serviceName] = (totals[serviceName] || 0) + count;
      });
    });
    
    // Generate colors dynamically
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    
    return Object.entries(totals)
      .map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        value,
        color: colors[index % colors.length]
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort by count descending
  }, [filteredDailyRecords]);

  // Render main content
  let content;

  // Show loading state
  if (loading) {
    content = (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading employee data...</p>
        </div>
      </div>
    );
  }
  // Show empty state if no pay periods exist at all
  else if (payPeriodsData.length === 0) {
    content = (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-lg">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <div className="text-foreground text-xl mb-2">No Pay Periods Found</div>
          <div className="text-muted-foreground mb-6">
            {needsSetup 
              ? 'Complete your employee setup to get started with LER tracking.'
              : 'Generate pay periods from the Employee Hub page under Pay Schedule Settings.'}
          </div>
        </div>
      </div>
    );
  }
  // Show main dashboard
  else {
    content = (
    <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">
            Employee LER Tracking
          </h1>
          <p className="text-gray-400 dark:text-gray-400 mt-2">
            Track employee labor efficiency and performance-based compensation
          </p>
        </div>
      </div>

      {/* Main Filter Container - Individual View */}
      {(viewMode as any) === 'individual' && (
        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            {/* View Toggle - Only show if crews exist */}
            {crews.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground font-medium">View:</span>
                  <div className="flex gap-3 flex-1">
                    <button
                      onClick={() => setViewMode('individual')}
                      className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg border-2 transition-all ${
                        (viewMode as any) === 'individual' 
                          ? 'bg-accent text-accent-foreground border-accent' 
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50 hover:bg-muted/50'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-lg font-semibold">Individual</span>
                    </button>
                    <button
                      onClick={() => setViewMode('crew')}
                      className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg border-2 transition-all ${
                        (viewMode as any) === 'crew' 
                          ? 'bg-accent text-accent-foreground border-accent' 
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50 hover:bg-muted/50'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-lg font-semibold">Crew</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Employee Selector with Info */}
            {allEmployees.length > 1 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="employee-select" className="text-sm font-medium whitespace-nowrap">
                      Select Employee:
                    </Label>
                    <Select value={selectedEmployeeId || ''} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {allEmployees.map((emp) => (
                          <SelectItem key={emp.id || ''} value={emp.id || ''}>
                            {emp.name} - {emp.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {employeeInfo && (
                    <div className="flex-1 flex items-center justify-evenly text-muted-foreground border-l border-border pl-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{employeeInfo.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        <span>{employeeInfo.position}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Base Rate: ${employeeInfo.currentBaseRate}/hr</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filters: Year → Month → Pay Period */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Year Filter */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  <Select 
                    value={filterYear.toString()}
                    onValueChange={(value) => {
                      setFilterYear(parseInt(value));
                      setSelectedPeriodIndex(-1); // Reset to 'All Pay Periods' when year changes
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        // Get years from daily records
                        const recordYears = payPeriodsData.flatMap(p => 
                          p.dailyRecords.map(r => new Date(r.date).getFullYear())
                        );
                        // Get years from pay period dates as fallback
                        const periodYears = payPeriodsData.flatMap(p => [
                          new Date(p.startDate).getFullYear(),
                          new Date(p.endDate).getFullYear()
                        ]);
                        // Always include current year
                        const currentYear = new Date().getFullYear();
                        const allYears = new Set([...recordYears, ...periodYears, currentYear]);
                        return Array.from(allYears).sort((a, b) => b - a).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <Select 
                    value={filterMonth === 'all' ? 'all' : filterMonth.toString()}
                    onValueChange={(value) => {
                      setFilterMonth(value === 'all' ? 'all' : parseInt(value));
                      setSelectedPeriodIndex(-1); // Reset to 'All Pay Periods' when month changes
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Year to Date</SelectItem>
                      <SelectItem value="0">January</SelectItem>
                      <SelectItem value="1">February</SelectItem>
                      <SelectItem value="2">March</SelectItem>
                      <SelectItem value="3">April</SelectItem>
                      <SelectItem value="4">May</SelectItem>
                      <SelectItem value="5">June</SelectItem>
                      <SelectItem value="6">July</SelectItem>
                      <SelectItem value="7">August</SelectItem>
                      <SelectItem value="8">September</SelectItem>
                      <SelectItem value="9">October</SelectItem>
                      <SelectItem value="10">November</SelectItem>
                      <SelectItem value="11">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pay Period Selector - Filtered by Year/Month */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium whitespace-nowrap">Pay Period:</Label>
                  <Select
                    value={selectedPeriodIndex === -1 ? 'all' : selectedPeriodIndex.toString()}
                    onValueChange={(value) => setSelectedPeriodIndex(value === 'all' ? -1 : Number(value))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Pay Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pay Periods</SelectItem>
                      {payPeriods
                        .map((period, index) => ({ period, index }))
                        .filter(({ period }) => {
                          // Filter by year
                          const periodStart = new Date(period.startDate);
                          const periodEnd = new Date(period.endDate);
                          const yearMatch = periodStart.getFullYear() === filterYear || periodEnd.getFullYear() === filterYear;
                          if (!yearMatch) return false;
                          
                          // Filter by month if set
                          if (filterMonth !== 'all') {
                            const periodStart = new Date(period.startDate);
                            const periodEnd = new Date(period.endDate);
                            const monthStart = new Date(filterYear as number, filterMonth as number, 1);
                            const monthEnd = new Date(filterYear as number, (filterMonth as number) + 1, 0);
                            const overlaps = periodStart <= monthEnd && periodEnd >= monthStart;
                            if (!overlaps) return false;
                          }
                          return true;
                        })
                        .map(({ period, index }) => (
                          <SelectItem key={index} value={index.toString()}>
                            {period.periodName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters Button */}
                {filterMonth !== 'all' && (
                  <Button
                    onClick={() => {
                      setFilterMonth('all');
                      setSelectedPeriodIndex(-1);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Filter Container - Crew View */}
      {(viewMode as any) === 'crew' && (
        <Card className="border-border">
          <CardContent className="pt-6 space-y-4">
            {/* View Toggle */}
            {crews.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground font-medium">View:</span>
                  <div className="flex gap-3 flex-1">
                    <button
                      onClick={() => setViewMode('individual')}
                      className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg border-2 transition-all ${
                        (viewMode as any) === 'individual' 
                          ? 'bg-accent text-accent-foreground border-accent' 
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50 hover:bg-muted/50'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-lg font-semibold">Individual</span>
                    </button>
                    <button
                      onClick={() => setViewMode('crew')}
                      className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg border-2 transition-all ${
                        (viewMode as any) === 'crew' 
                          ? 'bg-accent text-accent-foreground border-accent' 
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50 hover:bg-muted/50'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-lg font-semibold">Crew</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Crew Selector and Filters */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Crew Selector */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">Select Crew:</Label>
                    <Select 
                      value={selectedCrewId}
                      onValueChange={setSelectedCrewId}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Crew" />
                      </SelectTrigger>
                      <SelectContent>
                        {crews.filter(c => c.is_active).map(crew => (
                          <SelectItem key={crew.id} value={crew.id || ''}>
                            {crew.crew_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-border" />

                {/* Year Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter:</Label>
                  <Calendar className="h-4 w-4 text-accent" />
                  <Select 
                    value={crewFilterYear.toString()}
                    onValueChange={(value) => setCrewFilterYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => {
                        const year = new Date().getFullYear() - (5 - i);
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <Select 
                    value={crewFilterMonth === 'ytd' ? 'ytd' : crewFilterMonth.toString()}
                    onValueChange={(value) => {
                      if (value === 'ytd') {
                        setCrewFilterMonth('ytd');
                        setCrewSelectedPayPeriod('all');
                      } else {
                        setCrewFilterMonth(parseInt(value));
                        setCrewSelectedPayPeriod('all');
                      }
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthName = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' });
                        return (
                          <SelectItem key={i} value={i.toString()}>
                            {monthName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pay Period Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Pay Period:</Label>
                  <Select 
                    value={crewSelectedPayPeriod}
                    onValueChange={setCrewSelectedPayPeriod}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Pay Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Pay Periods</SelectItem>
                      {payPeriods
                        .filter(period => {
                          const periodStart = parseLocalDate(period.startDate);
                          const periodEnd = parseLocalDate(period.endDate);
                          const yearMatch = periodStart.getFullYear() === crewFilterYear || periodEnd.getFullYear() === crewFilterYear;
                          if (!yearMatch) return false;
                          
                          if (crewFilterMonth !== 'ytd') {
                            const monthStart = new Date(crewFilterYear, crewFilterMonth as number, 1);
                            const monthEnd = new Date(crewFilterYear, (crewFilterMonth as number) + 1, 0);
                            const overlaps = periodStart <= monthEnd && periodEnd >= monthStart;
                            if (!overlaps) return false;
                          }
                          return true;
                        })
                        .map((period) => (
                          <SelectItem key={period.startDate} value={period.startDate}>
                            {period.periodName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>

                {/* CSV Upload Button for Crew */}
                <Button 
                  onClick={async () => {
                    await refreshServices();
                    setShowCSVUpload(true);
                  }}
                  variant="ghost"
                  className="bg-background/20 border border-border hover:bg-background/20 hover:border-accent text-foreground"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== CREW VIEW ==================== */}
      {(viewMode as any) === 'crew' && (
        <>
          {/* Selected Crew Performance */}
          {selectedCrewId && crewPerformance && (
            <>
              {/* Crew KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-accent/20">
                        <TrendingUp className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Crew LER ({crewKpiPeriodLabel})</p>
                        <div className={`text-2xl font-bold mt-1 ${crewPerformance.avgLER >= 1 ? 'text-green-500' : crewPerformance.avgLER >= 0.7 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {crewPerformance.avgLER.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {crewPerformance.avgLER >= 1 ? 'Excellent efficiency' : crewPerformance.avgLER >= 0.7 ? 'Good performance' : 'Needs improvement'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-accent/20">
                        <DollarSign className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Total Revenue ({crewKpiPeriodLabel})</p>
                        <div className="text-2xl font-bold text-foreground mt-1">
                          ${crewPerformance.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {crewPerformance.totalJobs} jobs completed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-accent/20">
                        <Award className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Avg Revenue/Job ({crewKpiPeriodLabel})</p>
                        <div className="text-2xl font-bold text-foreground mt-1">
                          ${crewPerformance.avgRevenuePerJob.toFixed(0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Crew efficiency metric
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-accent/20">
                        <DollarSign className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Gross Profit % ({crewKpiPeriodLabel})</p>
                        <div className={`text-2xl font-bold mt-1 ${crewPerformance.grossProfitPercent >= 25 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {crewPerformance.grossProfitPercent.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Before bonus distribution
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Member Contributions */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-foreground">Member Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  {crewPerformance.memberContributions.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No crew job data for this period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Member</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Role</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Bonus %</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenue</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Bonus</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Hours</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Jobs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crewPerformance.memberContributions.map((member, index) => (
                            <tr key={member.employeeId} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                              <td className="py-3 px-4 font-medium text-foreground">{member.employeeName}</td>
                              <td className="py-3 px-4 text-muted-foreground">{member.roleName}</td>
                              <td className="py-3 px-4 text-right text-accent">{member.bonusPercentage}%</td>
                              <td className="py-3 px-4 text-right text-foreground">${member.attributedRevenue.toFixed(0)}</td>
                              <td className="py-3 px-4 text-right text-green-500">${member.attributedBonus.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right text-foreground">{member.attributedHours.toFixed(1)}</td>
                              <td className="py-3 px-4 text-right text-foreground">{member.jobCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Crew Work Days Table */}
              <Card className="bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    Crew Work Days
                    <Badge variant="outline" className="ml-2 text-accent border-accent">
                      {crews.find(c => c.id === selectedCrewId)?.crew_name || 'Unknown Crew'}
                    </Badge>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({crewKpiPeriodLabel})
                    </span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpenInCrewMode(true);
                      setShowAddDay(true);
                    }}
                    className="text-accent border-accent hover:bg-accent/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Crew Day
                  </Button>
                </CardHeader>
                <CardContent>
                  {filteredCrewWorkDays.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No crew work days found for this period</p>
                      <p className="text-sm text-muted-foreground mt-2">Add a crew day using the button above or import via CSV</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-card z-10">
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Crew Members</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Jobs</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenue</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Hours</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Net Profit</th>
                            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCrewWorkDays.map((day, index) => {
                            const regularMembers = day.crewMembers.filter(m => !m.isHelper);
                            const helpers = day.crewMembers.filter(m => m.isHelper);
                            
                            return (
                              <tr key={day.date} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                                <td className="py-3 px-4">
                                  <div className="font-medium text-foreground">{day.dayOfWeek}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {regularMembers.map(m => (
                                      <Badge key={m.employeeId} variant="outline" className="text-xs">
                                        {m.employeeName}
                                      </Badge>
                                    ))}
                                    {helpers.map(m => (
                                      <Badge key={m.employeeId} variant="secondary" className="text-xs bg-accent/20 text-accent">
                                        {m.employeeName} (Helper)
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-foreground">{day.totalJobs}</td>
                                <td className="py-3 px-4 text-right text-foreground font-medium">${day.totalRevenue.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right text-foreground">{day.totalHours}</td>
                                <td className="py-3 px-4 text-right">
                                  <div className={`font-medium ${day.netProfit >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                                    ${day.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  <div className={`text-sm ${day.grossProfitPercent >= 25 ? 'text-green-500' : day.grossProfitPercent >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {day.grossProfitPercent.toFixed(1)}%
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingCrewWorkDay(day);
                                        setShowMasterCrewEdit(true);
                                      }}
                                      className="text-accent hover:text-accent hover:bg-accent/20"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        if (!confirm(`Delete crew day for ${day.dayOfWeek}, ${new Date(day.date + 'T00:00:00').toLocaleDateString()}?\n\nThis will delete records for all ${day.crewMembers.length} crew members.`)) {
                                          return;
                                        }
                                        
                                        try {
                                          // Delete all crew member records for this day
                                          const recordIds = day.crewMembers.map(m => m.recordId);
                                          const result = await employeeLERService.bulkDeleteDailyRecords(recordIds);
                                          
                                          if (result.errors.length > 0) {
                                            alert(`Deleted ${result.success} records.\n\nErrors:\n${result.errors.join('\n')}`);
                                          }
                                          
                                          // Reload crew work days
                                          await loadCrewWorkDays(selectedCrewId);
                                        } catch (error) {
                                          console.error('Error deleting crew day:', error);
                                          alert('Error deleting crew day. Please try again.');
                                        }
                                      }}
                                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* No Crew Selected State */}
          {!selectedCrewId && (
            <Card className="bg-muted/30">
              <CardContent className="py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Select a Crew</h3>
                  <p className="text-muted-foreground">Choose a crew from the dropdown above to view detailed performance metrics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ==================== INDIVIDUAL VIEW ==================== */}
      {(viewMode as any) === 'individual' && (
        <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                {kpis.avgLER >= 1.0 ? (
                  <TrendingUp className="h-5 w-5 text-accent" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Average LER ({kpiPeriodLabel})</p>
                <div className={`text-2xl font-bold mt-1 ${getLERColor(kpis.avgLER)}`}>
                  {kpis.avgLER.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.avgLER >= 1.0 ? 'Excellent efficiency' : kpis.avgLER >= 0.7 ? 'Good performance' : 'Needs improvement'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Bonus Earned ({kpiPeriodLabel})</p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ${kpis.totalBonusEarned.toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total bonus compensation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Avg Hourly Rate ({kpiPeriodLabel})</p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ${kpis.avgHourlyRate.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Including base pay & bonuses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Profit Margin ({kpiPeriodLabel})</p>
                <div className={`text-2xl font-bold mt-1 ${kpis.profitMargin >= 25 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.profitMargin.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Company net profit after bonus
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LER Trend Chart */}
          <Card className="bg-muted/30 border-accent/50">
            <CardHeader>
              <CardTitle className="text-foreground">
                {filterMonth !== 'all' 
                  ? `LER Trend - ${lerTrendData.length} days` 
                  : `LER Trend (${filterYear}) - ${lerTrendData.reduce((sum, m) => sum + m.days, 0)} days across ${lerTrendData.length} months`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lerTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'ler') return [value.toFixed(2), 'Avg LER'];
                      return [value, name];
                    }}
                    labelFormatter={(label: string) => {
                      const monthData = lerTrendData.find(m => m.month === label);
                      return `${label} (${monthData?.days || 0} days)`;
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ler" stroke="#3b82f6" strokeWidth={2} name="Avg LER" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Job Type Distribution */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-foreground">
                {filterMonth !== 'all'
                  ? 'Job Type Distribution'
                  : `Job Type Distribution (${filterYear}) - ${jobTypeData.reduce((sum, item) => sum + item.value, 0)} total jobs`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={jobTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {jobTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Records Table */}
        <Card className="bg-muted/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Daily Performance Records</CardTitle>
            <div className="flex gap-3 items-center">
              {/* Sort Order Toggle */}
              <Button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                variant="outline"
                size="sm"
                title={`Currently: ${sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}`}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </Button>

              {/* CSV Upload Button */}
              <Button 
                onClick={async () => {
                  // Refresh services before opening dialog to ensure we have real IDs
                  await refreshServices();
                  setShowCSVUpload(true);
                }}
                variant="outline"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>

              {/* Calculate All Days Button */}
              <Button 
                onClick={() => handleCalculateAllDays()}
                variant={needsCalculation ? "primary" : "outline"}
                size="sm"
                disabled={filteredDailyRecords.length === 0 || bulkRecalculating}
                className={needsCalculation ? 'animate-pulse bg-accent hover:bg-accent/90 text-background border-accent border-2' : ''}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Recalculate All
              </Button>

              {/* Bulk Recalculate All Employees Button */}
              <Button 
                onClick={handleBulkRecalculateAllEmployees}
                variant="outline"
                size="sm"
                disabled={bulkRecalculating || allEmployees.length === 0}
                className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
              >
                {bulkRecalculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {bulkProgress.current}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalc All Employees
                  </>
                )}
              </Button>

              {/* Add Day Button */}
              <Button 
                onClick={() => {
                  // Auto-refresh services when opening Add Day dialog
                  refreshServices();
                  setShowAddDay(true);
                }} 
                className="bg-accent hover:bg-accent/90 text-background"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Day
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-20">
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium w-10 sticky left-0 bg-card z-30">
                      <Checkbox
                        checked={selectedRecordIds.length === filteredDailyRecords.length && filteredDailyRecords.length > 0}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedRecordIds(filteredDailyRecords.map(r => r.id).filter((id): id is string => id !== undefined));
                          } else {
                            setSelectedRecordIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Jobs</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Revenue</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Hours</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">OT Hrs</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Base Rate</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">LER</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">LER Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Appt Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Net Profit</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedRecords.map((record, index) => {
                    const isSelected = record.id ? selectedRecordIds.includes(record.id) : false;
                    return (
                    <tr key={record.id || index} className={`border-b border-gray-800 hover:bg-[rgb(17,24,39)] ${isSelected ? 'bg-accent/20' : ''}`}>
                      <td className={`py-3 px-2 sticky left-0 z-10 ${isSelected ? 'bg-accent/20' : 'bg-card'}`}>
                        {record.id && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked: boolean) => {
                              if (checked && record.id) {
                                setSelectedRecordIds([...selectedRecordIds, record.id]);
                              } else if (record.id) {
                                setSelectedRecordIds(selectedRecordIds.filter(id => id !== record.id));
                              }
                            }}
                          />
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{record.workDay || ''}</div>
                          {record.isCrewJob ? (
                            <Badge variant="outline" className="text-accent border-accent/50 text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Crew
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-400 border-blue-400/50 text-xs">
                              <User className="h-3 w-3 mr-1" />
                              Solo
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {parseLocalDate(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {record.calledOut ? (
                          <Badge variant="outline">Called Out</Badge>
                        ) : record.numberOfJobs === 0 ? (
                          <Badge variant="outline">No Appt</Badge>
                        ) : (
                          <div>
                            <div className="font-medium">{record.numberOfJobs}</div>
                            <div className="text-xs text-gray-500">
                              {Object.entries(record.jobTypes)
                                .filter(([_, count]) => count > 0)
                                .map(([service, count]) => `${service.substring(0, 1).toUpperCase()}: ${count}`)
                                .join(' ')}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">
                        ${record.totalJobRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {record.totalHoursWorked.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        {record.overtimeHours > 0 ? (
                          <span className="text-amber-500 font-medium">
                            {record.overtimeHours.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">
                        ${record.baseRate?.toFixed(2) || '0.00'}/hr
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getLERBadgeColor(record.ler)}>
                          {record.ler.toFixed(2)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {record.qualifyForBonus ? (
                          <span className="text-green-500 font-medium">
                            ${record.bonusQualifiedForPercent.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {record.appointmentBasedBonus > 0 ? (
                          <span className="text-green-500 font-medium">
                            ${record.appointmentBasedBonus.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium">
                        {(record.bonusQualifiedForPercent + record.appointmentBasedBonus) > 0 ? (
                          <span className="text-green-500">
                            ${(record.bonusQualifiedForPercent + record.appointmentBasedBonus).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground font-medium">
                          ${record.dailyNetProfitAfterBonus.toFixed(2)}
                        </div>
                        <div className={`text-xs font-medium ${
                          record.dailyNetProfitAfterBonusPercent >= 25 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {record.dailyNetProfitAfterBonusPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRecord({ record, index });
                              setShowAddDay(true);
                            }}
                            className="text-accent hover:text-accent/80"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this record?')) {
                                if (!record.id) {
                                  alert('Error: Record ID not found');
                                  return;
                                }
                                
                                const success = await employeeLERService.deleteDailyRecord(record.id);
                                
                                if (success) {
                                  await loadEmployeeData(selectedEmployeeId);
                                } else {
                                  alert('Error deleting record. Please try again.');
                                }
                              }
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                  
                  {/* Totals Row - Always show when there are records */}
                  {filteredDailyRecords.length > 0 && (
                    <tr className="border-t-2 border-accent bg-accent/10 font-bold">
                      {/* Checkbox column - empty */}
                      <td className="py-3 px-2 sticky left-0 z-10 bg-accent/10"></td>
                      {/* Date column - TOTALS label */}
                      <td className="py-3 px-4 text-foreground">TOTALS</td>
                      {/* Jobs */}
                      <td className="py-3 px-4 text-foreground">{filteredTotals.totalJobs}</td>
                      {/* Revenue */}
                      <td className="py-3 px-4 text-foreground">${filteredTotals.totalRevenue.toFixed(2)}</td>
                      {/* Hours */}
                      <td className="py-3 px-4 text-foreground">{filteredTotals.totalHours.toFixed(2)}</td>
                      {/* OT Hours */}
                      <td className="py-3 px-4">
                        {filteredTotals.totalOTHours > 0 ? (
                          <span className="text-amber-500">{filteredTotals.totalOTHours.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {/* Base Rate - N/A for totals */}
                      <td className="py-3 px-4 text-muted-foreground">-</td>
                      {/* LER (Average) */}
                      <td className="py-3 px-4">
                        <Badge variant={getLERBadgeColor(filteredTotals.avgLER)}>
                          {filteredTotals.avgLER.toFixed(2)}
                        </Badge>
                      </td>
                      {/* LER Bonus */}
                      <td className="py-3 px-4 text-green-500">${filteredTotals.totalLERBonus.toFixed(2)}</td>
                      {/* Appt Bonus */}
                      <td className="py-3 px-4 text-green-500">${filteredTotals.totalApptBonus.toFixed(2)}</td>
                      {/* Total Bonus */}
                      <td className="py-3 px-4 text-green-500">${filteredTotals.totalBonuses.toFixed(2)}</td>
                      {/* Net Profit */}
                      <td className="py-3 px-4">
                        <div className="text-foreground">${filteredTotals.totalNetProfit.toFixed(2)}</div>
                        <div className={`text-xs ${filteredTotals.avgNetProfitPercent >= 25 ? 'text-green-500' : 'text-red-500'}`}>
                          {filteredTotals.avgNetProfitPercent.toFixed(1)}%
                        </div>
                      </td>
                      {/* Actions - empty */}
                      <td className="py-3 px-4 text-right text-muted-foreground">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {/* Bulk Actions Bar */}
              {selectedRecordIds.length > 0 && (
                <div className="sticky bottom-0 bg-background border-t border-border p-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedRecordIds.length} record{selectedRecordIds.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRecordIds([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 border-red-500/50"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Period Summary - Uses filtered data when filters are active */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-foreground">
              {filterMonth !== 'all' ? 'Filtered Summary' : `${filterYear} Summary`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Jobs</div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredTotals.totalJobs}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-foreground">
                  ${filteredTotals.totalRevenue.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredTotals.totalHours.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Average LER</div>
                <div className={`text-2xl font-bold ${getLERColor(filteredTotals.avgLER)}`}>
                  {filteredTotals.avgLER.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">LER Bonuses</div>
                <div className="text-2xl font-bold text-green-500">
                  ${filteredTotals.totalLERBonus.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Appt Bonuses</div>
                <div className="text-2xl font-bold text-green-500">
                  ${filteredTotals.totalApptBonus.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Bonuses</div>
                <div className="text-2xl font-bold text-green-600">
                  ${filteredTotals.totalBonuses.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Profit Margin</div>
                <div className="text-2xl font-bold text-foreground">
                  {filteredTotals.avgNetProfitPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crew Earnings Summary - Only show if employee has crew attributions */}
        {crewEarningsSummary.crewJobCount > 0 && (
          <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-foreground">Crew Earnings (Attributed)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Crew Jobs</div>
                  <div className="text-2xl font-bold text-accent">
                    {crewEarningsSummary.crewJobCount}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Attributed Revenue</div>
                  <div className="text-2xl font-bold text-foreground">
                    ${crewEarningsSummary.totalAttributedRevenue.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Attributed Bonus</div>
                  <div className="text-2xl font-bold text-green-500">
                    ${crewEarningsSummary.totalAttributedBonus.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Attributed Hours</div>
                  <div className="text-2xl font-bold text-foreground">
                    {crewEarningsSummary.totalAttributedHours.toFixed(2)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                These earnings are from crew jobs where this employee participated. Bonus is calculated based on their role percentage.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Employee Insights Panel */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-foreground">LER Insights - {employeeInfo.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-muted/50 rounded-md p-1">
                  <button
                    onClick={() => setInsightsViewMode('period')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      insightsViewMode === 'period'
                        ? 'bg-accent text-white'
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    Pay Period
                  </button>
                  <button
                    onClick={() => setInsightsViewMode('ytd')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      insightsViewMode === 'ytd'
                        ? 'bg-accent text-white'
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    YTD
                  </button>
                </div>
                <button
                  onClick={() => setInsightsExpanded(!insightsExpanded)}
                  className="p-1 hover:bg-muted/20 rounded transition-colors"
                >
                  {insightsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          
          {insightsExpanded && (
            <CardContent>
              <div className="space-y-3">
                {employeeInsights.map((insight, index) => {
                  const getIconBg = (type: string) => {
                    switch (type) {
                      case 'success': return 'bg-green-500/20';
                      case 'warning': return 'bg-yellow-500/20';
                      case 'info': return 'bg-accent/20';
                      case 'tip': return 'bg-accent/10';
                      default: return 'bg-muted/30';
                    }
                  };

                  const getIconColor = (type: string) => {
                    switch (type) {
                      case 'success': return 'text-green-500';
                      case 'warning': return 'text-yellow-500';
                      case 'info': return 'text-accent';
                      case 'tip': return 'text-accent';
                      default: return 'text-muted-foreground';
                    }
                  };

                  const getBadgeStyle = (type: string) => {
                    switch (type) {
                      case 'success': return 'bg-green-500/20 text-green-500 border-green-500/30';
                      case 'warning': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
                      case 'info': return 'bg-accent/20 text-accent border-accent/30';
                      case 'tip': return 'bg-accent/10 text-accent border-accent/20';
                      default: return 'bg-muted/30 text-muted-foreground border-border';
                    }
                  };

                  const getIcon = (type: string) => {
                    switch (type) {
                      case 'success': return <CheckCircle className="h-4 w-4" />;
                      case 'warning': return <AlertCircle className="h-4 w-4" />;
                      case 'info': return <TrendingUp className="h-4 w-4" />;
                      case 'tip': return <Lightbulb className="h-4 w-4" />;
                      default: return <AlertCircle className="h-4 w-4" />;
                    }
                  };

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getIconBg(insight.type)}`}>
                        <div className={getIconColor(insight.type)}>
                          {getIcon(insight.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-md border ${getBadgeStyle(insight.type)}`}>
                            {insight.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-3 border-t border-accent/50">
                <p className="text-xs text-muted-foreground text-center">
                  Viewing {insightsViewMode === 'period' ? 'current pay period' : 'year-to-date'} data • {employeeInsights.length} insights generated
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* LER Explanation Card */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-foreground">Understanding LER (Labor Efficiency Ratio)</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-3">
            <p>
              <strong className="text-white">LER</strong> measures how efficiently an employee's labor generates profit for the company.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="text-green-500 font-bold mb-2">Excellent: ≥ 1.0</div>
                <div className="text-sm">Employee generates $1+ profit for every $1 of pay</div>
              </div>
              <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <div className="text-yellow-500 font-bold mb-2">Good: 0.7 - 0.99</div>
                <div className="text-sm">Solid performance, approaching break-even</div>
              </div>
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                <div className="text-red-500 font-bold mb-2">Needs Improvement: &lt; 0.7</div>
                <div className="text-sm">Employee cost exceeds profit generated</div>
              </div>
            </div>
            <p className="text-sm mt-4">
              <strong>Formula:</strong> LER = Gross Profit Before Bonus ÷ Employee Base Pay
            </p>
          </CardContent>
        </Card>
        </>
      )}
    </div>
    );
  }

  // Return content with dialogs (dialogs render regardless of content state)
  return (
    <>
      {content}
      
      {/* Dialogs - Always rendered so they can show even in empty states */}

      <AddDailyRecordWithServices
        open={showAddDay}
        onClose={() => {
          setShowAddDay(false);
          setEditingRecord(null);
          setOpenInCrewMode(false); // Reset crew mode when closing
        }}
        baseRate={selectedPeriod?.baseRate || employeeInfo.currentBaseRate}
        servicesWithCOGS={servicesWithCOGS}
        editingRecord={editingRecord?.record || null}
        crews={crews}
        crewRoles={crewRoles}
        crewMembers={crewMembersMap}
        allEmployees={allEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          position: emp.position,
          base_rate: emp.current_base_rate || 0 // Map from current_base_rate to base_rate
        } as EmployeeForCrewEntry))}
        defaultCrewMode={openInCrewMode}
        defaultCrewId={(viewMode as any) === 'crew' ? selectedCrewId : ''}
        overheadPercent={companySettings.overheadPercent}
        crewBonusThresholdMin={companySettings.crewBonusThresholdMin || 15}
        crewBonusThresholdMax={companySettings.crewBonusThresholdMax || 100}
        crewRecordsReadOnly={(viewMode as any) === 'individual'}
        onUpdate={async (record, serviceBreakdown: ServiceBreakdownItem[]) => {
          if (editingRecord) {
            const currentPeriod = payPeriodsData[selectedPeriodIndex];
            const recordToUpdate = currentPeriod.dailyRecords[editingRecord.index];
            
            if (!recordToUpdate.id || !currentPeriod.periodId || !employeeInfo.id || !dbUserId) {
              alert('Error: Missing required data');
              return;
            }
            
            // Check if date was changed and if the new date already exists (excluding current record)
            if (record.date !== recordToUpdate.date) {
              const dateExists = currentPeriod.dailyRecords.some((r, idx) => 
                idx !== editingRecord.index && r.date === record.date
              );
              if (dateExists) {
                alert(`A record for ${new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} already exists in this pay period. Please choose a different date.`);
                return;
              }
            }
            
            try {
              // ========== CREW RECORD EDITING ==========
              // If this is a crew record, find and update ALL linked crew member records
              if (recordToUpdate.isCrewJob && recordToUpdate.crewId) {
                console.log('👥 Editing crew record - finding all linked records...');
                
                const linkedRecords = await employeeLERService.findLinkedCrewRecords(
                  dbUserId,
                  recordToUpdate.date,
                  recordToUpdate.crewId
                );
                
                console.log(`📋 Found ${linkedRecords.length} linked crew records`);
                
                if (linkedRecords.length > 1) {
                  // Store the pending edit and show confirmation modal
                  setPendingCrewEdit({
                    record,
                    serviceBreakdown,
                    linkedRecords
                  });
                  setShowCrewEditConfirm(true);
                  return; // Don't proceed with update until confirmed
                }
                
                // If only one linked record (the current employee), proceed with individual update
                // Create new crew attributions for all members
                if (record.isCrewJob && record.crewId) {
                  const crewMembers = crewMembersMap[record.crewId] || [];
                  if (crewMembers.length > 0) {
                    const totalBonus = record.bonusQualifiedForPercent + record.appointmentBasedBonus;
                    // Create attributions for the first record (they're linked)
                    await crewService.createCrewAttributions(
                      dbUserId,
                      recordToUpdate.id,
                      record.crewId,
                      record.totalJobRevenue,
                      totalBonus,
                      record.totalHoursWorked,
                      crewMembers,
                      crewRoles
                    );
                  }
                }
                
                console.log(`✅ Updated 1 of ${linkedRecords.length} linked crew records`);
                alert(`Updated 1 crew member record for this day.`);
                
                setShowAddDay(false);
                setEditingRecord(null);
                await loadEmployeeData(selectedEmployeeId);
                return;
              }
              // ========== END CREW RECORD EDITING ==========
              
              // Solo record update (original logic)
              const supabaseRecord = convertToSupabaseFormat(record);
              const success = await employeeLERService.updateDailyRecord(recordToUpdate.id, supabaseRecord);
              
              if (!success) {
                alert('Error updating record. Please try again.');
                return;
              }
              
              // Update service labor records
              const laborCosts = {
                basePay: record.employeeBasePay,
                overtimePay: record.overtimePay,
                bonuses: record.bonusQualifiedForPercent + record.appointmentBasedBonus,
                tips: record.tipAmount
              };
              
              await serviceLaborService.updateServiceLaborRecords(
                dbUserId,
                employeeInfo.id,
                currentPeriod.periodId,
                record.date,
                serviceBreakdown,
                laborCosts
              );
              
              // Handle crew attributions on update
              // First delete existing attributions for this record
              await crewService.deleteCrewAttributions(recordToUpdate.id);
              
              // If this is now a crew job, create new attributions
              if (record.isCrewJob && record.crewId) {
                const crewMembers = crewMembersMap[record.crewId] || [];
                if (crewMembers.length > 0) {
                  const totalBonus = record.bonusQualifiedForPercent + record.appointmentBasedBonus;
                  await crewService.createCrewAttributions(
                    dbUserId,
                    recordToUpdate.id,
                    record.crewId,
                    record.totalJobRevenue,
                    totalBonus,
                    record.totalHoursWorked,
                    crewMembers,
                    crewRoles
                  );
                  console.log(`✅ Updated crew attributions for ${crewMembers.length} members`);
                }
              }
              
              setShowAddDay(false);
              setEditingRecord(null);
              await loadEmployeeData(selectedEmployeeId);
            } catch (error) {
              console.error('Error updating record with service breakdown:', error);
              alert('Error updating record. Please try again.');
            }
          }
        }}
        onAdd={async (record, serviceBreakdown: ServiceBreakdownItem[]) => {
          if (!employeeInfo.id || !dbUserId) {
            alert('Error: Missing employee data');
            return;
          }
          
          // Auto-find the correct pay period based on the date
          console.log('🔍 Finding pay period for date:', record.date);
          const correctPeriod = await employeeLERService.getOrCreatePayPeriod(
            dbUserId,
            employeeInfo.id,
            record.date,
            companySettings.paySchedule,
            companySettings.payDayOfWeek,
            companySettings.payReferenceDate,
            companySettings.paySemiMonthlyDates
          );
          
          if (!correctPeriod) {
            alert('Error: Could not determine pay period for this date');
            return;
          }
          
          console.log('✅ Found pay period:', correctPeriod.period_name);
          
          // Check if date already exists in this pay period
          console.log('🔍 Checking if date exists in period:', correctPeriod.id);
          const existingRecords = await employeeLERService.getDailyRecordsForEmployee(employeeInfo.id, correctPeriod.id!);
          const dateExists = existingRecords.some(r => r.date === record.date);
          
          if (dateExists) {
            alert(`A record for ${new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} already exists. Please edit the existing record or choose a different date.`);
            return;
          }
          
          try {
            // Save daily record with the correct pay period
            const supabaseRecord = convertToSupabaseFormat(record);
            const savedRecord = await employeeLERService.createDailyRecord(correctPeriod.id!, supabaseRecord, employeeInfo.id);
            
            if (!savedRecord) {
              alert('Error saving record. Please try again.');
              return;
            }
            
            // Save service labor records
            const laborCosts = {
              basePay: record.employeeBasePay,
              overtimePay: record.overtimePay,
              bonuses: record.bonusQualifiedForPercent + record.appointmentBasedBonus,
              tips: record.tipAmount
            };
            
            await serviceLaborService.createServiceLaborRecords(
              dbUserId,
              employeeInfo.id,
              correctPeriod.id || '',
              record.date || '',
              serviceBreakdown,
              laborCosts
            );
            
            // If this is a crew job, create attributions for all crew members
            if (record.isCrewJob && record.crewId && savedRecord.id) {
              const crewMembers = crewMembersMap[record.crewId] || [];
              if (crewMembers.length > 0) {
                const totalBonus = record.bonusQualifiedForPercent + record.appointmentBasedBonus;
                await crewService.createCrewAttributions(
                  dbUserId,
                  savedRecord.id,
                  record.crewId,
                  record.totalJobRevenue,
                  totalBonus,
                  record.totalHoursWorked,
                  crewMembers,
                  crewRoles
                );
                console.log(`✅ Created crew attributions for ${crewMembers.length} members`);
              }
            }
            
            setShowAddDay(false);
            await loadEmployeeData(selectedEmployeeId);
          } catch (error) {
            console.error('Error saving record with service breakdown:', error);
            alert('Error saving record. Please try again.');
          }
        }}
        onAddCrewRecords={async (records, serviceBreakdown, employeeIds, baseRates, employeeData) => {
          // Crew mode - create records for all selected employees
          if (!dbUserId) {
            alert('Error: User not authenticated');
            return;
          }
          
          const baseRecord = records[0]; // Use first record as template
          if (!baseRecord) {
            alert('Error: No record data');
            return;
          }
          
          try {
            console.log('🚀 Creating crew records for employees:', employeeIds);
            console.log('📋 Base rates map:', baseRates);
            console.log('📋 Employee data:', employeeData);
            
            // ========== PRE-SAVE VALIDATION ==========
            // Check ALL crew members for existing records BEFORE saving any
            const conflictingEmployees: string[] = [];
            const payPeriodCache: { [empId: string]: { id: string; period_name: string } | null } = {};
            
            console.log('🔍 Pre-save validation: Checking all employees for conflicts...');
            
            for (const empId of employeeIds) {
              const employee = allEmployees.find(e => e.id === empId);
              if (!employee) {
                conflictingEmployees.push(`Unknown employee (${empId})`);
                continue;
              }
              
              // Get pay period for this employee
              console.log(`🔍 Finding pay period for employee ${employee.name} (${empId}) for date ${baseRecord.date}`);
              const payPeriod = await employeeLERService.getOrCreatePayPeriod(
                dbUserId,
                empId,
                baseRecord.date,
                companySettings.paySchedule || 'bi-weekly',
                companySettings.payDayOfWeek ?? 5,
                companySettings.payReferenceDate,
                companySettings.paySemiMonthlyDates
              );
              
              console.log(`📅 Pay period result for ${employee.name}:`, payPeriod);
              
              if (!payPeriod?.id) {
                console.error(`❌ No pay period found for ${employee.name}`);
                conflictingEmployees.push(`${employee.name} (no pay period)`);
                continue;
              }
              
              // Cache the pay period for later use (with type assertion since we checked id exists)
              payPeriodCache[empId] = { id: payPeriod.id, period_name: payPeriod.period_name };
              
              // Check for existing records
              console.log(`🔍 Checking existing records for ${employee.name} in period ${payPeriod.id}`);
              const existingRecords = await employeeLERService.getDailyRecordsForPeriod(payPeriod.id, empId);
              console.log(`📊 Found ${existingRecords.length} existing records for ${employee.name}`);
              
              const duplicateExists = existingRecords.some(r => 
                r.date === baseRecord.date && r.is_crew_job === baseRecord.isCrewJob
              );
              
              console.log(`❌ Duplicate exists for ${employee.name}: ${duplicateExists}`);
              
              if (duplicateExists) {
                conflictingEmployees.push(employee.name);
              }
            }
            
            // If ANY employee has a conflict, show error and abort ALL saves
            if (conflictingEmployees.length > 0) {
              const dateStr = new Date(baseRecord.date).toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
              });
              alert(
                `❌ Cannot save crew record!\n\n` +
                `The following crew members already have a ${baseRecord.isCrewJob ? 'crew' : 'solo'} record for ${dateStr}:\n\n` +
                `• ${conflictingEmployees.join('\n• ')}\n\n` +
                `Please edit the existing records or choose a different date.\n\n` +
                `No records were saved.`
              );
              return;
            }
            
            console.log('✅ Pre-save validation passed - no conflicts found');
            // ========== END PRE-SAVE VALIDATION ==========
            
            let successCount = 0;
            let errorCount = 0;
            
            // Create a record for each selected employee
            for (const empId of employeeIds) {
              console.log(`\n📝 Processing employee: ${empId}`);
              const employee = allEmployees.find(e => e.id === empId);
              if (!employee) {
                console.warn(`❌ Employee ${empId} not found in allEmployees, skipping`);
                errorCount++;
                continue;
              }
              
              // Get pay period from cache
              const payPeriod = payPeriodCache[empId];
              if (!payPeriod || !payPeriod.id) {
                console.error(`❌ No valid pay period found for ${employee.name}, skipping`);
                errorCount++;
                continue;
              }
              
              console.log(`✅ Using pay period ${payPeriod.period_name} (${payPeriod.id}) for ${employee.name}`);
              
              const empData = employeeData[empId];
              const isHelper = empData?.isHelper || false;
              console.log(`✓ Found employee: ${employee.name}, base_rate: ${employee.current_base_rate}, isHelper: ${isHelper}`);
              
              // Recalculate with this employee's base rate
              const empBaseRate = baseRates[empId] || employee.current_base_rate || 0;
              
              // For helpers, use their specific hours/jobs/revenue if provided
              // Otherwise fall back to the full crew values
              const dailyHours = isHelper && empData?.helperHours 
                ? empData.helperHours 
                : baseRecord.totalHoursWorked;
              const dailyJobs = isHelper && empData?.helperJobs !== undefined
                ? empData.helperJobs
                : baseRecord.numberOfJobs;
              const dailyRevenue = isHelper && empData?.helperRevenue !== undefined
                ? empData.helperRevenue
                : baseRecord.totalJobRevenue;
              
              console.log(`📊 Using values - Hours: ${dailyHours}, Jobs: ${dailyJobs}, Revenue: ${dailyRevenue}`);
              
              // Calculate labor costs for this employee
              let regularHours = dailyHours;
              let overtimeHours = 0;
              let employeeBasePay = 0;
              let overtimePay = 0;
              
              if (dailyHours > (companySettings.overtimeHoursDaily || 12)) {
                regularHours = companySettings.overtimeHoursDaily || 12;
                overtimeHours = dailyHours - regularHours;
                employeeBasePay = regularHours * empBaseRate;
                overtimePay = overtimeHours * (empBaseRate * (companySettings.overtimeMultiplier || 1.5));
              } else {
                employeeBasePay = dailyHours * empBaseRate;
              }
              
              const totalBasePay = employeeBasePay + overtimePay;
              
              // Calculate COGS - for helpers, scale based on their revenue portion
              // Calculate COGS - servicesWithCOGS contains $ cost per job, NOT percentage
              let cogsNoLabor = 0;
              if (isHelper && empData?.helperRevenue !== undefined && baseRecord.totalJobRevenue > 0) {
                // Scale COGS proportionally to helper's revenue portion
                const revenuePortion = empData.helperRevenue / baseRecord.totalJobRevenue;
                serviceBreakdown.forEach(item => {
                  const costPerJob = servicesWithCOGS[item.serviceName] || 0;
                  cogsNoLabor += costPerJob * revenuePortion; // Proportional share of COGS
                });
              } else {
                serviceBreakdown.forEach(item => {
                  const costPerJob = servicesWithCOGS[item.serviceName] || 0;
                  cogsNoLabor += costPerJob; // Each service entry = 1 job
                });
              }
              
              // Calculate overhead and profit using the employee's actual revenue
              const overheadAllocation = dailyRevenue * ((companySettings.overheadPercent || 32) / 100);
              const totalCostOfJob = totalBasePay + cogsNoLabor + overheadAllocation;
              const grossProfitBeforeBonus = dailyRevenue - totalCostOfJob;
              const grossProfitBeforeBonusPercent = dailyRevenue > 0 
                ? (grossProfitBeforeBonus / dailyRevenue) * 100 
                : 0;
              
              // Calculate LER
              const ler = totalBasePay > 0 ? grossProfitBeforeBonus / totalBasePay : 0;
              
              // Use pre-calculated bonus from the modal if available
              // This ensures the bonus matches what was shown in the crew calculator
              let bonusQualifiedForPercent = 0;
              let appointmentBasedBonus = 0;
              const qualifyForBonus = baseRecord.qualifyForBonus;
              
              if (empData?.calculatedBonus !== undefined && empData.calculatedBonus > 0) {
                // Use the pre-calculated bonus from the modal
                // This is the total bonus (LER bonus + appointment bonus combined)
                const totalPreCalculatedBonus = empData.calculatedBonus;
                
                // Split between bonusQualifiedForPercent and appointmentBasedBonus
                // The modal calculated the total, so we'll put it all in bonusQualifiedForPercent
                // since that's what gets saved and displayed
                bonusQualifiedForPercent = totalPreCalculatedBonus;
                appointmentBasedBonus = 0; // Already included in calculatedBonus
                
                console.log(`💰 Using pre-calculated bonus for ${employee.name}: $${totalPreCalculatedBonus.toFixed(2)}`);
              } else {
                // Fallback to old calculation if no pre-calculated bonus
                const thresholdMin = baseRecord.isCrewJob 
                  ? (companySettings.crewBonusThresholdMin || 15)
                  : (companySettings.bonusThresholdMin || 25);
                const thresholdMax = baseRecord.isCrewJob
                  ? (companySettings.crewBonusThresholdMax || 100)
                  : (companySettings.bonusThresholdMax || 100);
                
                if (qualifyForBonus && grossProfitBeforeBonusPercent >= thresholdMax) {
                  bonusQualifiedForPercent = grossProfitBeforeBonus * 0.10;
                } else if (qualifyForBonus) {
                  const bonusRange = thresholdMax - thresholdMin;
                  const profitInRange = grossProfitBeforeBonusPercent - thresholdMin;
                  const bonusPercent = (profitInRange / bonusRange) * 10;
                  bonusQualifiedForPercent = grossProfitBeforeBonus * (bonusPercent / 100);
                }
                
                // Calculate appointment bonus
                if (companySettings.enableAppointmentBonus !== false) {
                  const totalJobs = baseRecord.numberOfJobs;
                  if (totalJobs >= 6) appointmentBasedBonus = companySettings.appointmentBonus6PlusJobs || 20;
                  else if (totalJobs >= 5) appointmentBasedBonus = companySettings.appointmentBonus5Jobs || 15;
                  else if (totalJobs >= 4) appointmentBasedBonus = companySettings.appointmentBonus4Jobs || 10;
                  else if (totalJobs >= 3) appointmentBasedBonus = companySettings.appointmentBonus3Jobs || 7;
                }
                
                console.log(`⚠️ No pre-calculated bonus for ${employee.name}, using fallback calculation: $${(bonusQualifiedForPercent + appointmentBasedBonus).toFixed(2)}`);
              }
              
              // For helpers, scale tips proportionally to their hours
              const tipAmount = isHelper && empData?.helperHours && baseRecord.totalHoursWorked > 0
                ? baseRecord.tipAmount * (empData.helperHours / baseRecord.totalHoursWorked)
                : baseRecord.tipAmount;
              
              const totalEmployeePay = totalBasePay + bonusQualifiedForPercent + appointmentBasedBonus + tipAmount;
              const dailyNetProfitAfterBonus = grossProfitBeforeBonus - bonusQualifiedForPercent - appointmentBasedBonus;
              const dailyNetProfitAfterBonusPercent = dailyRevenue > 0
                ? (dailyNetProfitAfterBonus / dailyRevenue) * 100
                : 0;
              
              // Build the record for this employee using their actual values
              const employeeRecord = {
                ...baseRecord,
                // Override with helper-specific values if applicable
                totalHoursWorked: dailyHours,
                numberOfJobs: dailyJobs,
                totalJobRevenue: dailyRevenue,
                tipAmount: tipAmount,
                baseRate: empBaseRate,
                employeeBasePay: totalBasePay,
                overtimeHours,
                overtimePay,
                cogsNoLabor,
                cogsNoLaborPercent: dailyRevenue > 0 ? (cogsNoLabor / dailyRevenue) * 100 : 0,
                overheadCostsPercent: companySettings.overheadPercent || 32,
                grossProfitBeforeBonus,
                grossProfitBeforeBonusPercent,
                ler,
                qualifyForBonus,
                bonusQualifiedForPercent,
                appointmentBasedBonus,
                totalEmployeePay,
                dailyHourlyWithTipsAndBonus: dailyHours > 0 ? totalEmployeePay / dailyHours : 0,
                dailyNetProfitAfterBonus,
                dailyNetProfitAfterBonusPercent,
                // Include service breakdown for saving
                serviceBreakdown: serviceBreakdown,
                // Build jobTypes from service breakdown for consistency
                jobTypes: serviceBreakdown.reduce((acc, item) => {
                  if (item.serviceName && item.jobs > 0) {
                    acc[item.serviceName] = item.jobs;
                  }
                  return acc;
                }, {} as { [key: string]: number })
              };
              
              // Save the record
              console.log('💾 Saving employee record with serviceBreakdown:', serviceBreakdown);
              console.log('💾 employeeRecord before conversion:', {
                ...employeeRecord,
                serviceBreakdown: employeeRecord.serviceBreakdown,
                jobTypes: employeeRecord.jobTypes
              });
              const supabaseRecord = convertToSupabaseFormat(employeeRecord);
              console.log('💾 supabaseRecord after conversion:', {
                ...supabaseRecord,
                service_breakdown: supabaseRecord.service_breakdown,
                job_types: supabaseRecord.job_types
              });
              const savedRecord = await employeeLERService.createDailyRecord(payPeriod.id, supabaseRecord, empId);
              
              if (!savedRecord) {
                console.error(`Failed to save record for ${employee.name}`);
                errorCount++;
                continue;
              }
              
              // Save service labor records for this employee
              const laborCosts = {
                basePay: totalBasePay,
                overtimePay,
                bonuses: bonusQualifiedForPercent + appointmentBasedBonus,
                tips: baseRecord.tipAmount
              };
              
              await serviceLaborService.createServiceLaborRecords(
                dbUserId,
                empId,
                payPeriod.id,
                baseRecord.date,
                serviceBreakdown,
                laborCosts
              );
              
              // Create crew attribution if this is a crew job
              if (baseRecord.isCrewJob && baseRecord.crewId && savedRecord.id) {
                const crewMembersList = crewMembersMap[baseRecord.crewId] || [];
                if (crewMembersList.length > 0) {
                  const totalBonus = bonusQualifiedForPercent + appointmentBasedBonus;
                  await crewService.createCrewAttributions(
                    dbUserId,
                    savedRecord.id,
                    baseRecord.crewId,
                    baseRecord.totalJobRevenue,
                    totalBonus,
                    baseRecord.totalHoursWorked,
                    crewMembersList,
                    crewRoles
                  );
                  
                  // Save crew composition to daily_record_crew_members
                  console.log('💾 Saving crew composition to daily_record_crew_members');
                  for (const member of crewMembersList) {
                    const employeeData = employeeIds.find(id => id === member.employee_id);
                    if (employeeData) {
                      const hoursPerEmployee = baseRecord.totalHoursWorked / crewMembersList.length;
                      const revenuePerEmployee = baseRecord.totalJobRevenue / crewMembersList.length;
                      
                      await crewService.addDailyRecordCrewMember({
                        daily_record_id: savedRecord.id,
                        employee_id: member.employee_id,
                        role_id: member.role_id,
                        hours_worked: hoursPerEmployee,
                        bonus_percentage: member.bonus_percentage || 0,
                        attributed_revenue: revenuePerEmployee,
                        attributed_bonus: member.bonus_percentage ? (member.bonus_percentage / 100) * totalBonus : 0
                      });
                    }
                  }
                  console.log('✅ Saved crew composition to daily_record_crew_members');
                }
              }
              
              successCount++;
              console.log(`✅ Created record for ${employee.name}`);
            }
            
            // Show summary
            if (errorCount > 0) {
              alert(`Created ${successCount} records. ${errorCount} employees were skipped (may already have records for this date).`);
            } else {
              alert(`Successfully created records for ${successCount} crew members!`);
            }
            
            setShowAddDay(false);
            await loadEmployeeData(selectedEmployeeId);
          } catch (error) {
            console.error('Error creating crew records:', error);
            alert('Error creating crew records. Please try again.');
          }
        }}
      />

      {/* COGS Settings Dialog - DEPRECATED: Now using Service Mix for COGS costs */}
      {showCOGSSettings && (
        <Dialog open={showCOGSSettings} onOpenChange={() => setShowCOGSSettings(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>COGS Settings Moved</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="mb-4">COGS costs are now managed in the Service Mix page.</p>
              <p className="text-sm text-muted-foreground mb-4">
                Go to Service Mix → Manage Services to set COGS costs for each service.
              </p>
              <Button onClick={() => setShowCOGSSettings(false)}>Got it</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}


      <CompanySettingsDialog
        open={showCompanySettings}
        onClose={() => setShowCompanySettings(false)}
        currentSettings={companySettings}
        onSave={async (settings) => {
          if (!dbUserId) {
            alert('Error: User not authenticated');
            return;
          }
          
          // Ensure paySchedule has a default value to match expected type
          const settingsWithDefaults = {
            ...COMPANY_SETTINGS,
            ...settings,
            paySchedule: settings.paySchedule || 'bi-weekly'
          } as typeof COMPANY_SETTINGS;
          setCompanySettings(settingsWithDefaults);
          Object.assign(COMPANY_SETTINGS, settingsWithDefaults);
          
          // Save settings to database
          const success = await employeeLERService.saveCompanySettings(dbUserId, settingsWithDefaults);
          if (success) {
            console.log('✅ Company settings saved successfully');
          } else {
            alert('Error saving company settings. Please try again.');
          }
        }}
      />

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={showCSVUpload}
        onClose={() => setShowCSVUpload(false)}
        onImport={handleCSVImport}
        employees={allEmployees}
        services={services}
      />
      
      {/* Crew Edit Confirmation Modal */}
      {showCrewEditConfirm && pendingCrewEdit && (
        <CrewEditConfirmationModal
          open={showCrewEditConfirm}
          onClose={() => {
            setShowCrewEditConfirm(false);
            setPendingCrewEdit(null);
          }}
          onConfirm={handleConfirmCrewEdit}
          crewRecord={editingRecord?.record || pendingCrewEdit.record}
          affectedCrewMembers={pendingCrewEdit.linkedRecords.map(record => {
            const employee = allEmployees.find(e => e.id === record.employee_id);
            return {
              employeeId: record.employee_id,
              employeeName: employee?.name || 'Unknown',
              baseRate: employee?.current_base_rate || 0,
              totalHours: pendingCrewEdit.record.totalHoursWorked,
              totalRevenue: pendingCrewEdit.record.totalJobRevenue,
              ler: pendingCrewEdit.record.ler,
              bonus: pendingCrewEdit.record.bonusQualifiedForPercent + pendingCrewEdit.record.appointmentBasedBonus
            };
          })}
          newValues={{
            totalHours: pendingCrewEdit.record.totalHoursWorked,
            totalRevenue: pendingCrewEdit.record.totalJobRevenue,
            notes: pendingCrewEdit.record.notes
          }}
        />
      )}

      {/* Master Crew Edit Modal */}
      <MasterCrewEditModal
        open={showMasterCrewEdit}
        onClose={() => {
          setShowMasterCrewEdit(false);
          setEditingCrewWorkDay(null);
        }}
        crewWorkDay={editingCrewWorkDay}
        crewName={crews.find(c => c.id === selectedCrewId)?.name || 'Crew'}
        services={services}
        allEmployees={allEmployees.filter(emp => emp.id).map(emp => ({
          id: emp.id!,
          name: emp.name,
          position: emp.position,
          base_rate: emp.current_base_rate || 0
        }))}
        crewMemberIds={(crewMembersMap[selectedCrewId] || []).map(m => m.employee_id)}
        crewMembers={(crewMembersMap[selectedCrewId] || []).map(m => ({
          employee_id: m.employee_id,
          role_id: m.role_id,
          bonus_percentage: m.bonus_percentage
        }))}
        onSave={async (data) => {
          if (!dbUserId || !editingCrewWorkDay || !selectedCrewId) {
            throw new Error('Missing required data');
          }
          
          console.log('💾 Saving master crew edit:', data);
          
          // Calculate totals from service breakdown
          const totalRevenue = data.serviceBreakdown.reduce((sum, s) => sum + (s.revenue || 0), 0);
          const totalJobTime = data.serviceBreakdown.reduce((sum, s) => sum + (s.hours || 0), 0);
          const totalJobs = data.serviceBreakdown.filter(s => s.serviceId).length;
          console.log(`🔧 Crew save - Services: ${data.serviceBreakdown.length}, TotalRevenue=$${totalRevenue}, TotalHours=${data.totalHours}, CrewMembers=${data.crewMembers.length}`);
          
          // Build job types from service breakdown
          const jobTypes = data.serviceBreakdown.reduce((acc, item) => {
            if (item.serviceName && item.serviceId) {
              acc[item.serviceName] = 1;
            }
            return acc;
          }, {} as { [key: string]: number });
          
          // Calculate total hours for helpers (for their bonus percentage)
          const totalCrewHours = data.totalHours * data.crewMembers.length;
          
          // First pass: Calculate gross profit before bonus (needed for bonus calculation)
          // Use equal revenue split for regular members
          const memberCount = data.crewMembers.length;
          const memberRevenue = totalRevenue / memberCount;
          
          // Calculate total COGS - servicesWithCOGS contains $ cost per job, NOT percentage
          let totalCOGS = 0;
          for (const svc of data.serviceBreakdown) {
            const costPerJob = servicesWithCOGS[svc.serviceName] || 0;
            // Each service entry in serviceBreakdown represents 1 job
            const svcCOGS = costPerJob;
            totalCOGS += svcCOGS;
            console.log(`  📦 ${svc.serviceName}: costPerJob=$${costPerJob}, COGS=$${svcCOGS.toFixed(2)}`);
          }
          
          // Calculate total labor cost and gross profit for bonus pool
          let totalLaborCost = 0;
          for (const member of data.crewMembers) {
            const empBaseRate = member.baseRate || 0;
            // Helpers use their specific hours, regular crew uses total daily hours
            const memberHours = member.isHelper ? (member.helperHours || 0) : data.totalHours;
            const regularHours = Math.min(memberHours, 8);
            const overtimeHours = Math.max(0, memberHours - 8);
            const memberPay = regularHours * empBaseRate + overtimeHours * empBaseRate * 1.5;
            totalLaborCost += memberPay;
            console.log(`  👤 ${member.employeeName}: rate=$${empBaseRate}/hr, hours=${memberHours}, pay=$${memberPay.toFixed(2)}`);
          }
          
          const overheadPercent = companySettings.overheadPercent || 32;
          const totalOverhead = totalRevenue * (overheadPercent / 100);
          const totalCostOfJob = totalLaborCost + totalCOGS + totalOverhead;
          const grossProfitBeforeBonus = totalRevenue - totalCostOfJob;
          const ler = totalLaborCost > 0 ? grossProfitBeforeBonus / totalLaborCost : 0;
          
          // Determine if crew qualifies for bonus
          const qualifyForBonus = ler >= (companySettings.crewBonusThresholdMin || 15) / 100;
          const totalBonusPool = qualifyForBonus ? grossProfitBeforeBonus * Math.min(ler, (companySettings.crewBonusThresholdMax || 100) / 100) : 0;
          
          console.log(`📊 Crew totals: Revenue=$${totalRevenue}, LaborCost=$${totalLaborCost}, COGS=$${totalCOGS}, Overhead=$${totalOverhead} (${overheadPercent}%), TotalCost=$${totalCostOfJob}, GrossProfit=$${grossProfitBeforeBonus}, LER=${(ler * 100).toFixed(1)}%, BonusPool=$${totalBonusPool}`);
          
          // Find the pay period ID for this date (needed for creating new helper records)
          // First try to get it from an existing crew member's record (most reliable)
          let payPeriodId: string | null = null;
          
          const existingMember = data.crewMembers.find(m => m.recordId);
          if (existingMember?.recordId) {
            const existingRecord = await employeeLERService.getDailyRecordById(existingMember.recordId);
            if (existingRecord?.pay_period_id) {
              payPeriodId = existingRecord.pay_period_id;
              console.log(`📅 Using pay period ID from existing crew member record: ${payPeriodId}`);
            }
          }
          
          // Fallback: Find by date range in local payPeriods array
          if (!payPeriodId) {
            const payPeriod = payPeriods.find(p => {
              return data.date >= p.startDate && data.date <= p.endDate;
            });
            if (payPeriod) {
              payPeriodId = payPeriod.periodId || null;
              console.log(`📅 Using pay period from date range: ${payPeriod.periodName}`);
            }
          }
          
          // Last resort: Use the most recent pay period
          if (!payPeriodId && payPeriods.length > 0) {
            const sortedPeriods = [...payPeriods].sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
            payPeriodId = sortedPeriods[0]?.periodId || null;
            console.log(`📅 Last resort: Using most recent pay period: ${sortedPeriods[0]?.periodName}`);
          }
          
          console.log(`📅 Final pay period ID: ${payPeriodId || 'NONE'}`);
          
          
          // Also get the day of week from the date string
          const [year, month, day] = data.date.split('-').map(Number);
          const recordDate = new Date(year, month - 1, day); // month is 0-indexed
          
          // Update each crew member's record
          for (const member of data.crewMembers) {
            const empBaseRate = member.baseRate || 0;
            // For helpers, use their configured hours; for regular crew, use total daily hours
            const memberHours = member.isHelper && member.helperHours ? member.helperHours : data.totalHours;
            
            // Calculate pay
            const regularHours = Math.min(memberHours, 8);
            const overtimeHours = Math.max(0, memberHours - 8);
            const basePay = regularHours * empBaseRate;
            const overtimePay = overtimeHours * empBaseRate * 1.5;
            const totalBasePay = basePay + overtimePay;
            
            // COGS split equally
            const memberCOGS = totalCOGS / memberCount;
            
            // Calculate member's bonus based on role percentage OR hours worked (for helpers)
            let memberBonus = 0;
            if (qualifyForBonus) {
              if (member.isHelper) {
                // Helpers get bonus based on % of hours worked
                const helperHoursPercent = memberHours / totalCrewHours;
                memberBonus = totalBonusPool * helperHoursPercent;
                console.log(`  👷 Helper ${member.employeeName}: ${(helperHoursPercent * 100).toFixed(1)}% of hours = $${memberBonus.toFixed(2)} bonus`);
              } else {
                // Regular crew members get bonus based on role percentage (60/40)
                const roleBonusPercent = member.bonusPercentage || 0;
                memberBonus = totalBonusPool * (roleBonusPercent / 100);
                console.log(`  👤 ${member.employeeName}: ${roleBonusPercent}% role = $${memberBonus.toFixed(2)} bonus`);
              }
            }
            
            // Calculate member-specific metrics
            // For helpers, calculate revenue based on their hours proportion (not equal split)
            let actualMemberRevenue = memberRevenue; // Default to equal split for regular crew
            console.log(`  🔍 ${member.employeeName}: isHelper=${member.isHelper}, helperHours=${member.helperHours}, helperAppointments=${JSON.stringify(member.helperAppointments)}`);
            if (member.isHelper) {
              // Helper revenue is based on their hours proportion of the jobs they worked on
              const helperHrs = member.helperHours || 0;
              const regularCrewCount = data.crewMembers.filter(m => !m.isHelper).length;
              
              if (member.helperAppointments && member.helperAppointments.length > 0) {
                // Helper worked on specific appointments - calculate their proportional share
                // For each appointment, helper gets (helper hours on that job / total hours on that job) × job revenue
                actualMemberRevenue = member.helperAppointments.reduce((sum, ha) => {
                  const appt = data.serviceBreakdown[ha.appointmentIndex];
                  const apptRevenue = appt?.revenue || 0;
                  const helperHoursOnJob = ha.hours || 0;
                  // Total hours on this job = crew members × daily hours + helper hours on this job
                  const crewHoursOnJob = regularCrewCount * data.totalHours;
                  const totalHoursOnJob = crewHoursOnJob + helperHoursOnJob;
                  const helperPortion = totalHoursOnJob > 0 ? helperHoursOnJob / totalHoursOnJob : 0;
                  return sum + (apptRevenue * helperPortion);
                }, 0);
                console.log(`  📊 Helper ${member.employeeName}: ${helperHrs}hrs on appointments = $${actualMemberRevenue.toFixed(2)} revenue (proportional)`);
              } else {
                // No specific appointments - calculate based on total hours proportion
                const regularCrewHours = regularCrewCount * data.totalHours;
                const totalAllHours = regularCrewHours + helperHrs;
                const helperHoursPortion = totalAllHours > 0 ? helperHrs / totalAllHours : 0;
                actualMemberRevenue = totalRevenue * helperHoursPortion;
                console.log(`  📊 Helper ${member.employeeName}: ${helperHrs}hrs / ${totalAllHours}hrs = ${(helperHoursPortion * 100).toFixed(1)}% = $${actualMemberRevenue.toFixed(2)} revenue`);
              }
            }
            
            // For crew jobs, use the CREW's LER and proportional gross profit
            // This prevents the issue where split revenue vs full individual pay creates nonsensical metrics
            const regularCrewCount = data.crewMembers.filter(m => !m.isHelper).length;
            
            let memberGrossProfit: number;
            let memberGrossProfitPercent: number;
            let memberLER: number;
            
            if (member.isHelper) {
              // Helper: calculate from their proportional revenue
              memberGrossProfit = actualMemberRevenue - totalBasePay - (totalCOGS / memberCount) - (actualMemberRevenue * overheadPercent / 100);
              memberGrossProfitPercent = actualMemberRevenue > 0 ? (memberGrossProfit / actualMemberRevenue) * 100 : 0;
              memberLER = totalBasePay > 0 ? memberGrossProfit / totalBasePay : 0;
            } else {
              // Regular crew member: use CREW's LER and proportional share of crew gross profit
              // This ensures the individual record reflects the crew's actual performance
              memberGrossProfit = grossProfitBeforeBonus / regularCrewCount; // Split among regular crew only
              memberGrossProfitPercent = actualMemberRevenue > 0 ? (memberGrossProfit / actualMemberRevenue) * 100 : 0;
              memberLER = ler; // Use the CREW's LER, not individual calculation
              console.log(`  📈 ${member.employeeName}: Using crew LER=${(ler * 100).toFixed(1)}%, grossProfit=$${memberGrossProfit.toFixed(2)}`);
            }
            
            const recordData = {
              total_hours_worked: memberHours,
              total_job_time: totalJobTime,
              total_job_revenue: actualMemberRevenue,
              number_of_jobs: member.isHelper ? (member.helperAppointments?.length || 0) : totalJobs,
              job_types: jobTypes,
              service_breakdown: { services: data.serviceBreakdown },
              employee_base_pay: totalBasePay,
              overtime_hours: overtimeHours,
              overtime_pay: overtimePay,
              cogs_no_labor: memberCOGS,
              cogs_no_labor_percent: actualMemberRevenue > 0 ? (memberCOGS / actualMemberRevenue) * 100 : 0,
              gross_profit_before_bonus: memberGrossProfit,
              gross_profit_before_bonus_percent: memberGrossProfitPercent,
              ler: memberLER,
              qualify_for_bonus: qualifyForBonus,
              bonus_qualified_for_percent: memberBonus,
              daily_net_profit_after_bonus: memberGrossProfit - memberBonus,
              daily_net_profit_after_bonus_percent: actualMemberRevenue > 0 ? ((memberGrossProfit - memberBonus) / actualMemberRevenue) * 100 : 0,
              notes: member.isHelper ? `${data.notes || ''} [Helper on crew job]`.trim() : (data.notes || ''),
              // CRITICAL: Preserve crew tracking fields
              is_crew_job: true,
              crew_id: selectedCrewId,
              record_type: 'crew' as const
            };
            
            if (!member.recordId) {
              // CREATE new record for helper
              if (!payPeriodId) {
                console.error(`❌ Cannot create helper record: No pay period found for date ${data.date}`);
                continue;
              }
              
              console.log(`➕ Creating new helper record for ${member.employeeName}`);
              
              const dayOfWeek = recordDate.toLocaleDateString('en-US', { weekday: 'long' });
              
              const newRecord: employeeLERService.DailyRecord = {
                work_day: dayOfWeek,
                date: data.date,
                called_out: false,
                base_rate: empBaseRate,
                tip_amount: 0,
                total_employee_pay: totalBasePay + memberBonus,
                daily_hourly_with_tips_and_bonus: memberHours > 0 ? (totalBasePay + memberBonus) / memberHours : 0,
                appointment_based_bonus: 0,
                overhead_costs_percent: overheadPercent,
                ...recordData
              };
              
              const createdRecord = await employeeLERService.createDailyRecord(payPeriodId, newRecord, member.employeeId);
              
              if (createdRecord?.id) {
                console.log(`✅ Created helper record ${createdRecord.id} for ${member.employeeName}`);
                
                // Also add to daily_record_crew_members table
                await crewService.addDailyRecordCrewMember({
                  daily_record_id: createdRecord.id,
                  employee_id: member.employeeId,
                  role_id: undefined,
                  hours_worked: memberHours,
                  bonus_percentage: 0,
                  attributed_revenue: actualMemberRevenue,
                  attributed_bonus: memberBonus,
                  is_helper: true,
                  helper_appointments: member.helperAppointments || []
                });
              } else {
                console.error(`❌ Failed to create helper record for ${member.employeeName}`);
              }
            } else {
              // UPDATE existing record
              console.log(`📝 Updating record ${member.recordId} for ${member.employeeName}`, {
                ler: recordData.ler,
                grossProfit: recordData.gross_profit_before_bonus,
                bonus: recordData.bonus_qualified_for_percent,
                netProfit: recordData.daily_net_profit_after_bonus
              });
              await employeeLERService.updateDailyRecord(member.recordId, recordData);
              
              // Also update the daily_record_crew_members entry with correct attribution
              await crewService.upsertDailyRecordCrewMember({
                daily_record_id: member.recordId,
                employee_id: member.employeeId,
                role_id: member.roleId || undefined,
                hours_worked: memberHours,
                bonus_percentage: member.bonusPercentage || 0,
                attributed_revenue: memberRevenue, // Equal split for all crew members
                attributed_bonus: memberBonus, // Based on role percentage (60/40)
                is_helper: member.isHelper || false
              });
            }
          }
          
          // Reload crew work days
          await loadCrewWorkDays(selectedCrewId);
          
          // Reload employee data if in individual view
          if (selectedEmployeeId) {
            await loadEmployeeData(selectedEmployeeId);
          }
          
          console.log('✅ Master crew edit saved successfully');
        }}
      />
    </>
  );
};

export default EmployeeLERPage;
