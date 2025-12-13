import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
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
  X
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AddDailyRecordWithServices, EmployeeForCrewEntry } from '../components/employee/AddDailyRecordWithServices';
import { CompanySettingsDialog } from '../components/employee/CompanySettingsDialog';
import { CSVUploadDialog } from '../components/employee/CSVUploadDialog';
import { COMPANY_SETTINGS } from '../components/employee/AddDailyRecordWithServices';
import * as employeeLERService from '../services/employeeLERService';
import * as serviceLaborService from '../services/serviceLaborService';
import * as crewService from '../services/crewService';
import type { Crew, CrewRole, CrewMember, CrewPerformanceMetrics, CrewVsSoloComparison } from '../services/crewService';
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
  const { currentYear: revenueCurrentYear } = useRevenue();
  
  // Multi-employee state (uses DB type with snake_case)
  const [allEmployees, setAllEmployees] = useState<EmployeeInfoDB[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Employee and period state
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    name: 'Jared',
    position: 'Senior Tech',
    currentBaseRate: 32.46
  });

  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
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
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  
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
  const [crewVsSolo, setCrewVsSolo] = useState<CrewVsSoloComparison | null>(null);
  const [crewFilterYear, setCrewFilterYear] = useState<number>(new Date().getFullYear());
  const [crewFilterMonth, setCrewFilterMonth] = useState<number | 'ytd'>('ytd');

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
      const month = crewFilterMonth === 'ytd' ? undefined : crewFilterMonth;
      const metrics = await crewService.getCrewPerformanceMetrics(dbUserId, crewId, crewFilterYear, month);
      setCrewPerformance(metrics);
    } catch (error) {
      console.error('Error loading crew performance:', error);
    }
  }

  // Load crew vs solo comparison
  async function loadCrewVsSoloComparison() {
    if (!dbUserId) return;
    
    try {
      const month = crewFilterMonth === 'ytd' ? undefined : crewFilterMonth;
      const comparison = await crewService.getCrewVsSoloComparison(dbUserId, crewFilterYear, month);
      setCrewVsSolo(comparison);
    } catch (error) {
      console.error('Error loading crew vs solo comparison:', error);
    }
  }

  // Load crew data when switching to crew view or changing filters
  useEffect(() => {
    if (viewMode === 'crew' && dbUserId) {
      loadCrewVsSoloComparison();
      if (selectedCrewId) {
        loadCrewPerformance(selectedCrewId);
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
        
        // Recalculate all dependent values
        const totalCostOfJob = basePay + record.cogsNoLabor + (record.totalJobRevenue * (record.overheadCostsPercent / 100));
        const grossProfitBeforeBonus = record.totalJobRevenue - totalCostOfJob;
        const grossProfitBeforeBonusPercent = record.totalJobRevenue > 0 
          ? (grossProfitBeforeBonus / record.totalJobRevenue) * 100 
          : 0;
        const ler = basePay > 0 ? grossProfitBeforeBonus / basePay : 0;
        
        // PRESERVE bonus qualification and amounts from database - don't recalculate them here
        // This function is only for recalculating overtime, not bonuses
        // Recalculating qualifyForBonus would be wrong because overtime changes affect the percentage
        const qualifyForBonus = record.qualifyForBonus;
        const bonusQualifiedForPercent = record.bonusQualifiedForPercent;
        const appointmentBasedBonus = record.appointmentBasedBonus;
        const totalEmployeePay = basePay + bonusQualifiedForPercent + appointmentBasedBonus + record.tipAmount;
        const dailyHourlyWithTipsAndBonus = dailyHours > 0 ? totalEmployeePay / dailyHours : 0;
        const dailyNetProfitAfterBonus = record.totalJobRevenue - totalCostOfJob - bonusQualifiedForPercent - appointmentBasedBonus;
        const dailyNetProfitAfterBonusPercent = record.totalJobRevenue > 0 
          ? (dailyNetProfitAfterBonus / record.totalJobRevenue) * 100 
          : 0;
        
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
    
    console.log('🔄 Switching to employee:', employeeId);
    setLoading(true);
    
    // Clear previous employee's data immediately to prevent stale data
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
              
              // Calculate totals from recalculated records
              const workingRecords = recalculatedRecords.filter(r => !r.calledOut && r.numberOfJobs > 0);
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
    serviceName: string;
    jobs: number;
    hours: number;
    revenue: number;
    totalDailyHours?: number;
    tips?: number;
    notes?: string;
  }>) => {
    if (!dbUserId) {
      alert('Error: User not authenticated');
      return;
    }

    try {
      // Group rows by employee and date
      const groupedByEmployeeAndDate: { [key: string]: typeof csvRows } = {};
      
      csvRows.forEach(row => {
        const key = `${row.employeeName}|${row.date}`;
        if (!groupedByEmployeeAndDate[key]) {
          groupedByEmployeeAndDate[key] = [];
        }
        groupedByEmployeeAndDate[key].push(row);
      });

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
            existingDailyRecords.map(r => ({ date: r.date, employee_id: r.employee_id || 'NULL' })));

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
          
          // Calculate COGS
          const totalCOGS = serviceBreakdown.reduce((sum, s) => {
            const cogsPercent = servicesWithCOGS[s.serviceName] || 0;
            return sum + (s.revenue * (cogsPercent / 100));
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
          const grossProfit = totalRevenue - totalCOGS - totalEmployeeBasePay;
          const grossProfitPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
          const ler = totalEmployeeBasePay > 0 ? grossProfit / totalEmployeeBasePay : 0;

          // Calculate bonuses
          console.log('💰 Bonus calculation:', {
            ler,
            totalJobs,
            bonusThresholdMin: companySettings.bonusThresholdMin,
            bonusThresholdMax: companySettings.bonusThresholdMax,
            enableAppointmentBonus: companySettings.enableAppointmentBonus
          });
          
          let bonusQualified = 0;
          let appointmentBonus = 0;
          const qualifyForBonus = ler >= companySettings.bonusThresholdMin && ler <= companySettings.bonusThresholdMax;

          if (qualifyForBonus) {
            bonusQualified = grossProfit * 0.10;
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

      // Show results
      if (successCount > 0) {
        alert(`Successfully imported ${successCount} record(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setNeedsCalculation(true); // Trigger pulsating Calculate All button
        await loadEmployeeData(selectedEmployeeId);
      } else {
        alert(`Import failed. ${errors.slice(0, 5).join('\n')}`);
      }
    } catch (error) {
      console.error('CSV import error:', error);
      alert('Error importing CSV. Please check the console for details.');
    }
  };

  // Calculate All Days in Pay Period
  const handleCalculateAllDays = async () => {
    if (!selectedPeriod || !dbUserId) {
      alert('Please select a pay period first');
      return;
    }
    
    // Clear the pulsating state when Calculate All is clicked
    setNeedsCalculation(false);

    const confirmCalc = window.confirm(
      `This will recalculate all ${selectedPeriod.dailyRecords.length} days in "${selectedPeriod.periodName}".\n\nThis will update LER, bonuses, and profits based on current company settings and COGS values.\n\nContinue?`
    );

    if (!confirmCalc) return;

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each daily record
      for (const record of selectedPeriod.dailyRecords) {
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

  const payPeriods = payPeriodsData;

  const selectedPeriod = payPeriods[selectedPeriodIndex];

  // Filter records: If filters are "all", show selected pay period. If filters are active, show across all pay periods.
  const filteredDailyRecords = useMemo(() => {
    // If both filters are "all", show only the selected pay period's records
    if (filterYear === 'all' && filterMonth === 'all') {
      if (!selectedPeriod) return [];
      return selectedPeriod.dailyRecords;
    }
    
    // If any filter is active, search across ALL pay periods
    const allRecords = payPeriodsData.flatMap(period => period.dailyRecords);
    
    const filtered = allRecords.filter(record => {
      const recordDate = parseLocalDate(record.date);
      
      // Year filter
      if (filterYear !== 'all' && recordDate.getFullYear() !== filterYear) {
        return false;
      }
      
      // Month filter (0-indexed)
      if (filterMonth !== 'all' && recordDate.getMonth() !== filterMonth) {
        return false;
      }
      
      return true;
    });
    
    // Sort by date descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = parseLocalDate(a.date);
      const dateB = parseLocalDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [payPeriodsData, selectedPeriod, filterYear, filterMonth]);

  // Calculate totals for filtered records (when month/year filter is active)
  const filteredTotals = useMemo(() => {
    if (filteredDailyRecords.length === 0) {
      return {
        totalJobs: 0,
        totalRevenue: 0,
        totalHours: 0,
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
    const totalLERBonus = filteredDailyRecords.reduce((sum, r) => sum + (r.qualifyForBonus ? r.bonusQualifiedForPercent : 0), 0);
    const totalApptBonus = filteredDailyRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0);
    const totalBonuses = totalLERBonus + totalApptBonus;
    const totalPay = filteredDailyRecords.reduce((sum, r) => sum + r.totalEmployeePay, 0);
    const totalNetProfit = filteredDailyRecords.reduce((sum, r) => sum + r.dailyNetProfitAfterBonus, 0);
    
    // Calculate average LER (weighted by gross profit)
    const totalGrossProfit = filteredDailyRecords.reduce((sum, r) => sum + r.grossProfitBeforeBonus, 0);
    const totalBasePay = filteredDailyRecords.reduce((sum, r) => sum + r.employeeBasePay, 0);
    const avgLER = totalBasePay > 0 ? totalGrossProfit / totalBasePay : 0;
    
    // Calculate average net profit percent
    const avgNetProfitPercent = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return {
      totalJobs,
      totalRevenue,
      totalHours,
      avgLER,
      totalLERBonus,
      totalApptBonus,
      totalBonuses,
      totalPay,
      totalNetProfit,
      avgNetProfitPercent
    };
  }, [filteredDailyRecords]);

  // Calculate YTD KPIs (across all pay periods in current year)
  const kpis = useMemo(() => {
    if (payPeriods.length === 0) {
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

    // Get current year
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // Aggregate all daily records from all pay periods in current year, up to today
    const ytdRecords = payPeriods.flatMap(period => 
      period.dailyRecords.filter(record => {
        const recordDate = parseLocalDate(record.date);
        return recordDate.getFullYear() === currentYear && recordDate <= today;
      })
    );

    // Filter out called out days and days with no jobs
    const workingRecords = ytdRecords.filter(r => !r.calledOut && r.numberOfJobs > 0);
    
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
  }, [payPeriods]);

  // Calculate crew capacity metrics for Lighthouse guidance
  const _crewCapacityMetrics = useMemo(() => {
    // Get crew settings from company settings
    const numberOfCrews = companySettings.numberOfCrews || 0;
    const employeesPerCrew = companySettings.employeesPerCrew || 0;
    const monthlyCrewCapacity = companySettings.monthlyCrewCapacity || 0;
    
    // Current employee count
    const currentEmployeeCount = allEmployees.length;
    
    // Get current month's FIR target (monthly budgeted revenue)
    const currentMonth = new Date().getMonth(); // 0-indexed
    const monthlyFIRTarget = revenueCurrentYear.monthlyFIRTargets?.[currentMonth] || 0;
    const annualFIRTarget = revenueCurrentYear.targetRevenue || 0;
    
    // Calculate crews needed based on capacity
    let crewsNeeded = 0;
    let employeesNeeded = 0;
    let capacityCoverage = 0;
    let crewGap = 0;
    let employeeGap = 0;
    
    if (monthlyCrewCapacity > 0 && monthlyFIRTarget > 0) {
      crewsNeeded = Math.ceil(monthlyFIRTarget / monthlyCrewCapacity);
      employeesNeeded = crewsNeeded * (employeesPerCrew || 1);
      capacityCoverage = (numberOfCrews * monthlyCrewCapacity) / monthlyFIRTarget;
      crewGap = crewsNeeded - numberOfCrews;
      employeeGap = employeesNeeded - currentEmployeeCount;
    }
    
    // Annual calculations for YTD view
    let annualCrewsNeeded = 0;
    let annualEmployeesNeeded = 0;
    if (monthlyCrewCapacity > 0 && annualFIRTarget > 0) {
      // Average monthly target
      const avgMonthlyTarget = annualFIRTarget / 12;
      annualCrewsNeeded = Math.ceil(avgMonthlyTarget / monthlyCrewCapacity);
      annualEmployeesNeeded = annualCrewsNeeded * (employeesPerCrew || 1);
    }
    
    return {
      numberOfCrews,
      employeesPerCrew,
      monthlyCrewCapacity,
      currentEmployeeCount,
      monthlyFIRTarget,
      annualFIRTarget,
      crewsNeeded,
      employeesNeeded,
      capacityCoverage,
      crewGap,
      employeeGap,
      annualCrewsNeeded,
      annualEmployeesNeeded,
      hasCrewSettings: numberOfCrews > 0 && monthlyCrewCapacity > 0
    };
  }, [companySettings, allEmployees.length, revenueCurrentYear]);

  // Calculate employee insights based on view mode
  const employeeInsights = useMemo(() => {
    const insights: Array<{ type: 'success' | 'warning' | 'info' | 'tip'; title: string; message: string; }> = [];
    
    const records = insightsViewMode === 'period' 
      ? payPeriods[selectedPeriodIndex]?.dailyRecords || []
      : payPeriods.flatMap(p => p.dailyRecords);
    
    const workingRecords = records.filter(r => !r.calledOut && r.numberOfJobs > 0);
    
    if (workingRecords.length === 0) {
      insights.push({ type: 'info', title: 'No Data Yet', message: `No working days recorded for ${insightsViewMode === 'period' ? 'this pay period' : 'this year'}.` });
      return insights;
    }

    const avgLER = workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length;
    const avgProfit = workingRecords.reduce((sum, r) => sum + r.grossProfitBeforeBonusPercent, 0) / workingRecords.length;
    const totalRevenue = workingRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0);
    const totalJobs = workingRecords.reduce((sum, r) => sum + r.numberOfJobs, 0);
    const totalBonuses = workingRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0);
    const avgJobsPerDay = totalJobs / workingRecords.length;
    const avgRevenuePerJob = totalRevenue / totalJobs;
    const lerVariance = workingRecords.reduce((sum, r) => sum + Math.pow(r.ler - avgLER, 2), 0) / workingRecords.length;
    const lerStdDev = Math.sqrt(lerVariance);
    const sortedByLER = [...workingRecords].sort((a, b) => b.ler - a.ler);
    const bestDay = sortedByLER[0];
    
    const serviceCount: { [key: string]: number } = {};
    workingRecords.forEach(record => {
      Object.entries(record.jobTypes).forEach(([service, count]) => {
        serviceCount[service] = (serviceCount[service] || 0) + count;
      });
    });
    const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];

    // Generate insights - Performance Level + Consistency Combined
    if (avgLER >= 1.5) {
      if (lerStdDev < 0.3) {
        insights.push({ type: 'success', title: 'Excellent & Consistent', message: `${employeeInfo.name} is performing exceptionally with an average LER of ${avgLER.toFixed(2)} and excellent day-to-day consistency. Keep up the great work!` });
      } else if (lerStdDev > 0.6) {
        insights.push({ type: 'success', title: 'High Performance, Variable Execution', message: `${employeeInfo.name} averages ${avgLER.toFixed(2)} LER (excellent), but performance varies significantly between days. Best: ${bestDay.ler.toFixed(2)}, focus on consistency.` });
      } else {
        insights.push({ type: 'success', title: 'Excellent Performance', message: `${employeeInfo.name} is performing exceptionally with an average LER of ${avgLER.toFixed(2)}. Keep up the great work!` });
      }
    } else if (avgLER >= 1.0) {
      if (lerStdDev < 0.3) {
        insights.push({ type: 'success', title: 'Solid & Reliable', message: `${employeeInfo.name} consistently meets targets with ${avgLER.toFixed(2)} LER. Reliable day-to-day execution.` });
      } else if (lerStdDev > 0.6) {
        insights.push({ type: 'info', title: 'Inconsistent Performance', message: `Average LER of ${avgLER.toFixed(2)} meets target, but varies significantly day-to-day. Best: ${bestDay.ler.toFixed(2)}. Focus on maintaining peak performance.` });
      } else {
        insights.push({ type: 'success', title: 'Strong Performance', message: `${employeeInfo.name} is meeting targets with an average LER of ${avgLER.toFixed(2)}. Solid contribution to profitability.` });
      }
    } else if (avgLER >= 0.7) {
      if (lerStdDev > 0.6) {
        insights.push({ type: 'warning', title: 'Inconsistent Execution', message: `LER of ${avgLER.toFixed(2)} is below target with high day-to-day variation. Best day: ${bestDay.ler.toFixed(2)}. Identify what works on good days and replicate it.` });
      } else {
        insights.push({ type: 'warning', title: 'Approaching Target', message: `${employeeInfo.name}'s LER of ${avgLER.toFixed(2)} is approaching the 1.0 target. Focus on efficiency to reach profitability goals.` });
      }
    } else {
      insights.push({ type: 'warning', title: 'Below Target', message: `${employeeInfo.name}'s LER of ${avgLER.toFixed(2)} is below target. Consider reviewing job efficiency and time management.` });
    }

    if (avgProfit >= 40) {
      insights.push({ type: 'success', title: 'High Profit Margin', message: `Excellent ${avgProfit.toFixed(1)}% average profit margin. ${employeeInfo.name} is maximizing profitability per job.` });
    } else if (avgProfit < 30) {
      insights.push({ type: 'warning', title: 'Low Profit Margin', message: `Profit margin of ${avgProfit.toFixed(1)}% is below optimal. Review pricing or reduce job time to improve margins.` });
    }

    // Time Efficiency Analysis - Revenue per hour worked
    const totalHours = workingRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0);
    const revenuePerHour = totalRevenue / totalHours;
    const avgHoursPerJob = totalHours / totalJobs;
    
    if (revenuePerHour >= 150) {
      insights.push({ type: 'success', title: 'Excellent Time Efficiency', message: `Generating $${revenuePerHour.toFixed(0)}/hour with ${avgHoursPerJob.toFixed(1)} hours per job. ${employeeInfo.name} works efficiently and maximizes billable time.` });
    } else if (revenuePerHour >= 100) {
      insights.push({ type: 'info', title: 'Good Time Usage', message: `Producing $${revenuePerHour.toFixed(0)}/hour at ${avgHoursPerJob.toFixed(1)} hours per job. Solid efficiency, room to improve speed on complex jobs.` });
    } else if (revenuePerHour >= 75) {
      insights.push({ type: 'warning', title: 'Time Efficiency Concern', message: `Only $${revenuePerHour.toFixed(0)}/hour with ${avgHoursPerJob.toFixed(1)} hours per job. Jobs taking too long - review processes or reduce non-billable time.` });
    } else {
      insights.push({ type: 'warning', title: 'Low Time Efficiency', message: `$${revenuePerHour.toFixed(0)}/hour is below target. At ${avgHoursPerJob.toFixed(1)} hours per job, ${employeeInfo.name} may be working slowly or spending too much time on low-value tasks.` });
    }

    if (avgJobsPerDay >= 5) {
      insights.push({ type: 'success', title: 'High Productivity', message: `Averaging ${avgJobsPerDay.toFixed(1)} jobs per day. ${employeeInfo.name} is maintaining excellent throughput.` });
    } else if (avgJobsPerDay < 3) {
      insights.push({ type: 'tip', title: 'Opportunity for Growth', message: `Currently averaging ${avgJobsPerDay.toFixed(1)} jobs per day. Consider scheduling optimization to increase volume.` });
    }

    if (avgRevenuePerJob >= 250) {
      insights.push({ type: 'success', title: 'Strong Revenue Per Job', message: `Average of $${avgRevenuePerJob.toFixed(0)} per job. ${employeeInfo.name} is securing high-value work.` });
    }

    if (totalBonuses > 0) {
      const bonusPercentOfRevenue = (totalBonuses / totalRevenue) * 100;
      insights.push({ type: 'info', title: 'Bonus Earnings', message: `Earned $${totalBonuses.toFixed(2)} in bonuses (${bonusPercentOfRevenue.toFixed(1)}% of revenue). Great performance-based compensation!` });
    }

    if (topService) {
      const topServicePercent = (topService[1] / totalJobs) * 100;
      if (topServicePercent > 60) {
        insights.push({ type: 'info', title: 'Service Specialization', message: `${topService[0]} represents ${topServicePercent.toFixed(0)}% of jobs. ${employeeInfo.name} has strong specialization in this service.` });
      }
    }

    // Identify weakest service - always show if multiple services exist
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

    // Calculate average LER per service and find the weakest one (with at least 3 jobs)
    const serviceAverages = Object.entries(serviceLERData)
      .filter(([_, data]) => data.jobs >= 3) // Only consider services with at least 3 jobs
      .map(([service, data]) => ({
        service,
        avgLER: data.totalLER / data.count,
        jobs: data.jobs
      }))
      .sort((a, b) => a.avgLER - b.avgLER);

    // Always show weakest service if multiple services exist
    if (serviceAverages.length > 1) {
      const weakestService = serviceAverages[0];
      const strongestService = serviceAverages[serviceAverages.length - 1];
      
      insights.push({ 
        type: 'warning', 
        title: 'Weakest Service', 
        message: `${weakestService.service} shows lowest efficiency at ${weakestService.avgLER.toFixed(2)} LER (${weakestService.jobs} jobs) vs ${strongestService.service} at ${strongestService.avgLER.toFixed(2)} LER. Focus training here.` 
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
  // Show empty state if no data yet
  else if (!selectedPeriod) {
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
      {viewMode === 'individual' && (
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
                        viewMode === 'individual' 
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
                        viewMode === 'crew' 
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
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {allEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
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

            {/* Pay Period & Date Filters */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Pay Period Selector */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium whitespace-nowrap">Pay Period:</Label>
                  <select
                    value={selectedPeriodIndex}
                    onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                    className="px-3 py-2 border rounded-md bg-background text-foreground min-w-[200px]"
                  >
                    {payPeriods.map((period, index) => (
                      <option key={index} value={index}>
                        {period.periodName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-border" />

                {/* Year Filter */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter Records:</Label>
                  <Calendar className="h-4 w-4 text-accent" />
                  <Select 
                    value={filterYear === 'all' ? 'all' : filterYear.toString()}
                    onValueChange={(value) => setFilterYear(value === 'all' ? 'all' : parseInt(value))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(new Set(payPeriodsData.flatMap(p => 
                        p.dailyRecords.map(r => new Date(r.date).getFullYear())
                      ))).sort((a, b) => b - a).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <Select 
                    value={filterMonth === 'all' ? 'all' : filterMonth.toString()}
                    onValueChange={(value) => setFilterMonth(value === 'all' ? 'all' : parseInt(value))}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
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

                {/* Clear Filters Button */}
                {(filterYear !== 'all' || filterMonth !== 'all') && (
                  <Button
                    onClick={() => {
                      setFilterYear('all');
                      setFilterMonth('all');
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
      {viewMode === 'crew' && (
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
                        viewMode === 'individual' 
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
                        viewMode === 'crew' 
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
                          <SelectItem key={crew.id} value={crew.id!}>
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
                      } else {
                        setCrewFilterMonth(parseInt(value));
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
                </div>

                {/* Add Crew Day Button */}
                <Button 
                  onClick={() => {
                    refreshServices();
                    setOpenInCrewMode(true);
                    setShowAddDay(true);
                  }} 
                  className="bg-accent hover:bg-accent/90 text-background"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Crew Day
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== CREW VIEW ==================== */}
      {viewMode === 'crew' && (
        <>
          {/* Crew vs Solo Comparison */}
          {crewVsSolo && (
            <Card className="bg-muted/30 border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Crew vs Solo Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Crew Jobs */}
                  <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
                    <h4 className="text-lg font-semibold text-accent mb-4">Crew Jobs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Jobs</p>
                        <p className="text-xl font-bold text-foreground">{crewVsSolo.crewJobs.totalJobs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold text-foreground">${crewVsSolo.crewJobs.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Revenue/Job</p>
                        <p className="text-xl font-bold text-foreground">${crewVsSolo.crewJobs.avgRevenuePerJob.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg LER</p>
                        <p className={`text-xl font-bold ${crewVsSolo.crewJobs.avgLER >= 1 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {crewVsSolo.crewJobs.avgLER.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Solo Jobs */}
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <h4 className="text-lg font-semibold text-foreground mb-4">Solo Jobs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Jobs</p>
                        <p className="text-xl font-bold text-foreground">{crewVsSolo.soloJobs.totalJobs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-xl font-bold text-foreground">${crewVsSolo.soloJobs.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Revenue/Job</p>
                        <p className="text-xl font-bold text-foreground">${crewVsSolo.soloJobs.avgRevenuePerJob.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg LER</p>
                        <p className={`text-xl font-bold ${crewVsSolo.soloJobs.avgLER >= 1 ? 'text-green-500' : 'text-yellow-500'}`}>
                          {crewVsSolo.soloJobs.avgLER.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                        <p className="text-sm text-muted-foreground">Crew LER</p>
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
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
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
                        <p className="text-sm text-muted-foreground">Avg Revenue/Job</p>
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
                        <p className="text-sm text-muted-foreground">Gross Profit %</p>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-foreground">Member Contributions</CardTitle>
                  {crewPerformance.memberContributions.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!dbUserId) return;
                        const confirmed = window.confirm(
                          'This will sync crew attribution data for all existing crew jobs.\n\nThis is needed if crew jobs were logged before the attribution system was set up.\n\nContinue?'
                        );
                        if (!confirmed) return;
                        
                        try {
                          const result = await crewService.backfillCrewAttributions(dbUserId);
                          alert(`Sync complete!\n\n${result.success} crew jobs synced\n${result.skipped} already had data\n${result.failed} failed`);
                          // Reload crew performance data
                          if (selectedCrewId) {
                            loadCrewPerformance(selectedCrewId);
                          }
                        } catch (error) {
                          console.error('Error syncing crew data:', error);
                          alert('Error syncing crew data. Check console for details.');
                        }
                      }}
                      className="text-accent border-accent hover:bg-accent/20"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Sync Crew Data
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {crewPerformance.memberContributions.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">No crew job data for this period</p>
                      <p className="text-sm text-muted-foreground">If you have crew jobs logged, click "Sync Crew Data" above to generate attribution data.</p>
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
      {viewMode === 'individual' && (
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
                <p className="text-sm text-muted-foreground">Average LER (YTD)</p>
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
                <p className="text-sm text-muted-foreground">Bonus Earned (YTD)</p>
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
                <p className="text-sm text-muted-foreground">Avg Hourly Rate (YTD)</p>
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
                <p className="text-sm text-muted-foreground">Profit Margin (YTD)</p>
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
                  : (filterYear !== 'all' || filterMonth !== 'all')
                    ? `LER Trend - ${lerTrendData.reduce((sum, m) => sum + m.days, 0)} days across ${lerTrendData.length} months`
                    : `LER Trend (YTD) - ${lerTrendData.reduce((sum, m) => sum + m.days, 0)} days across ${lerTrendData.length} months`
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
                {(filterYear !== 'all' || filterMonth !== 'all')
                  ? 'Job Type Distribution'
                  : `Job Type Distribution (YTD) - ${jobTypeData.reduce((sum, item) => sum + item.value, 0)} total jobs`
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
                onClick={handleCalculateAllDays}
                variant={needsCalculation ? "primary" : "outline"}
                size="sm"
                disabled={!selectedPeriod || selectedPeriod.dailyRecords.length === 0}
                className={needsCalculation ? 'animate-pulse bg-accent hover:bg-accent/90 text-background border-accent border-2' : ''}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Calculate All
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Jobs</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Revenue</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Hours</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Base Rate</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">LER</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">LER Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Appt Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total Pay</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Net Profit</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDailyRecords.map((record, index) => {
                    // Check if this employee has both crew and solo records on the same day
                    const hasBothTypesOnSameDay = filteredDailyRecords.some(
                      r => r.date === record.date && r.isCrewJob !== record.isCrewJob
                    );
                    
                    return (
                    <tr key={record.id || index} className="border-b border-gray-800 hover:bg-[rgb(17,24,39)]">
                      <td className="py-3 px-4 text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{record.workDay}</div>
                          {record.isCrewJob ? (
                            <Badge variant="outline" className="text-accent border-accent/50 text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Crew
                            </Badge>
                          ) : hasBothTypesOnSameDay && (
                            <Badge variant="outline" className="text-amber-400 border-amber-400/50 text-xs">
                              <User className="h-3 w-3 mr-1" />
                              Solo
                            </Badge>
                          )}
                          {hasBothTypesOnSameDay && (
                            <span className="text-xs text-muted-foreground" title="This employee worked both solo and crew jobs on this day">
                              +{record.isCrewJob ? 'Solo' : 'Crew'}
                            </span>
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
                      <td className="py-3 px-4 text-foreground font-medium">
                        ${record.totalEmployeePay.toFixed(2)}
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
                            className="text-amber-500 hover:text-amber-400"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this record?')) {
                                const recordToDelete = selectedPeriod.dailyRecords[index];
                                
                                if (!recordToDelete.id) {
                                  alert('Error: Record ID not found');
                                  return;
                                }
                                
                                const success = await employeeLERService.deleteDailyRecord(recordToDelete.id);
                                
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
                  
                  {/* Totals Row - Show when filters are active */}
                  {(filterYear !== 'all' || filterMonth !== 'all') && filteredDailyRecords.length > 0 && (
                    <tr className="border-t-2 border-accent bg-accent/10">
                      <td className="py-3 px-4 text-foreground font-bold">
                        TOTALS
                      </td>
                      <td className="py-3 px-4 text-foreground font-bold">
                        {filteredTotals.totalJobs}
                      </td>
                      <td className="py-3 px-4 text-foreground font-bold">
                        ${filteredTotals.totalRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-foreground font-bold">
                        {filteredTotals.totalHours.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        -
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getLERBadgeColor(filteredTotals.avgLER)} className="font-bold">
                          {filteredTotals.avgLER.toFixed(2)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-green-500 font-bold">
                        ${filteredTotals.totalLERBonus.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-green-500 font-bold">
                        ${filteredTotals.totalApptBonus.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-green-500 font-bold">
                        ${filteredTotals.totalBonuses.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-foreground font-bold">
                        ${filteredTotals.totalPay.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground font-bold">
                          ${filteredTotals.totalNetProfit.toFixed(2)}
                        </div>
                        <div className={`text-xs font-bold ${
                          filteredTotals.avgNetProfitPercent >= 25 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {filteredTotals.avgNetProfitPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                        -
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Period Summary - Uses filtered data when filters are active */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-foreground">
              {(filterYear !== 'all' || filterMonth !== 'all') ? 'Filtered Summary' : 'Pay Period Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Jobs</div>
                <div className="text-2xl font-bold text-foreground">
                  {(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.totalJobs : selectedPeriod.periodTotals.totalJobs}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-foreground">
                  ${(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.totalRevenue.toFixed(2) : selectedPeriod.periodTotals.totalRevenue.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
                <div className="text-2xl font-bold text-foreground">
                  {(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.totalHours.toFixed(2) : selectedPeriod.periodTotals.totalHoursWorked.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Average LER</div>
                <div className={`text-2xl font-bold ${getLERColor((filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.avgLER : selectedPeriod.periodTotals.avgLER)}`}>
                  {(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.avgLER.toFixed(2) : selectedPeriod.periodTotals.avgLER.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">LER Bonuses</div>
                <div className="text-2xl font-bold text-green-500">
                  ${(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.totalLERBonus.toFixed(2) : selectedPeriod.periodTotals.totalLERBonuses.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Appt Bonuses</div>
                <div className="text-2xl font-bold text-green-500">
                  ${(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.totalApptBonus.toFixed(2) : selectedPeriod.periodTotals.totalApptBonuses.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Bonuses</div>
                <div className="text-2xl font-bold text-green-600">
                  ${(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.totalBonuses.toFixed(2) : selectedPeriod.periodTotals.totalBonuses.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Profit Margin</div>
                <div className="text-2xl font-bold text-foreground">
                  {(filterYear !== 'all' || filterMonth !== 'all') ? filteredTotals.avgNetProfitPercent.toFixed(1) : selectedPeriod.periodTotals.netProfitAfterBonusPercent.toFixed(1)}%
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
                <CardTitle className="text-foreground">Performance Insights - {employeeInfo.name}</CardTitle>
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
        defaultCrewId={viewMode === 'crew' ? selectedCrewId : ''}
        overheadPercent={companySettings.overheadPercent}
        crewBonusThresholdMin={companySettings.crewBonusThresholdMin || 15}
        crewBonusThresholdMax={companySettings.crewBonusThresholdMax || 100}
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
                  // Update all linked records with the same service breakdown and shared data
                  let updateCount = 0;
                  
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
                  
                  console.log(`✅ Updated ${updateCount} of ${linkedRecords.length} linked crew records`);
                  alert(`Updated ${updateCount} crew member records for this day.`);
                  
                  setShowAddDay(false);
                  setEditingRecord(null);
                  await loadEmployeeData(selectedEmployeeId);
                  return;
                }
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
          const currentPeriod = payPeriodsData[selectedPeriodIndex];
          if (!currentPeriod.periodId || !employeeInfo.id || !dbUserId) {
            alert('Error: No pay period selected or missing employee data');
            return;
          }
          
          // Check if date already exists in this pay period
          const dateExists = currentPeriod.dailyRecords.some(r => r.date === record.date);
          if (dateExists) {
            alert(`A record for ${new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} already exists in this pay period. Please edit the existing record or choose a different date.`);
            return;
          }
          
          try {
            // Save daily record (include employee_id)
            const supabaseRecord = convertToSupabaseFormat(record);
            const savedRecord = await employeeLERService.createDailyRecord(currentPeriod.periodId, supabaseRecord, employeeInfo.id);
            
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
              currentPeriod.periodId,
              record.date,
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
              const payPeriod = await employeeLERService.getOrCreatePayPeriod(
                dbUserId,
                empId,
                baseRecord.date,
                companySettings.paySchedule || 'bi-weekly',
                companySettings.payDayOfWeek ?? 5,
                companySettings.payReferenceDate,
                companySettings.paySemiMonthlyDates
              );
              
              if (!payPeriod?.id) {
                conflictingEmployees.push(`${employee.name} (no pay period)`);
                continue;
              }
              
              // Cache the pay period for later use (with type assertion since we checked id exists)
              payPeriodCache[empId] = { id: payPeriod.id, period_name: payPeriod.period_name };
              
              // Check for existing records
              const existingRecords = await employeeLERService.getDailyRecordsForPeriod(payPeriod.id, empId);
              const duplicateExists = existingRecords.some(r => 
                r.date === baseRecord.date && r.is_crew_job === baseRecord.isCrewJob
              );
              
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
              
              const empData = employeeData[empId];
              const isHelper = empData?.isHelper || false;
              console.log(`✓ Found employee: ${employee.name}, base_rate: ${employee.current_base_rate}, isHelper: ${isHelper}`);
              
              // Use cached pay period
              const payPeriod = payPeriodCache[empId];
              if (!payPeriod?.id) {
                console.error(`❌ No cached pay period for employee ${empId}`);
                errorCount++;
                continue;
              }
              console.log(`✓ Using cached pay period: ${payPeriod.period_name} (${payPeriod.id})`);
              
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
              let cogsNoLabor = 0;
              if (isHelper && empData?.helperRevenue !== undefined && baseRecord.totalJobRevenue > 0) {
                // Scale COGS proportionally to helper's revenue
                const revenuePortion = empData.helperRevenue / baseRecord.totalJobRevenue;
                serviceBreakdown.forEach(item => {
                  const cogsPct = servicesWithCOGS[item.serviceName] || 0;
                  cogsNoLabor += (item.revenue * revenuePortion) * (cogsPct / 100);
                });
              } else {
                serviceBreakdown.forEach(item => {
                  const cogsPct = servicesWithCOGS[item.serviceName] || 0;
                  cogsNoLabor += item.revenue * (cogsPct / 100);
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
                serviceBreakdown: serviceBreakdown
              };
              
              // Save the record
              const supabaseRecord = convertToSupabaseFormat(employeeRecord);
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
          
          const success = await employeeLERService.saveCompanySettings(dbUserId, settings);
          if (success) {
            alert('Company settings saved successfully!');
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
    </>
  );
};

export default EmployeeLERPage;
