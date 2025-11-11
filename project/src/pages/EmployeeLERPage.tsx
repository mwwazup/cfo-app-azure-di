import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Award,
  Users,
  Calendar,
  Download,
  Plus,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Upload
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AddPayPeriodDialog } from '../components/employee/AddPayPeriodDialog';
import { EditPayPeriodDialog } from '../components/employee/EditPayPeriodDialog';
import { EditEmployeeDialog } from '../components/employee/EditEmployeeDialog';
import { AddDailyRecordWithServices } from '../components/employee/AddDailyRecordWithServices';
import { CompanySettingsDialog } from '../components/employee/CompanySettingsDialog';
import { EmployeeSetupDialog } from '../components/employee/EmployeeSetupDialog';
import { CSVUploadDialog } from '../components/employee/CSVUploadDialog';
import { COMPANY_SETTINGS } from '../components/employee/AddDailyRecordWithServices';
import { Settings } from 'lucide-react';
import * as employeeLERService from '../services/employeeLERService';
import * as serviceLaborService from '../services/serviceLaborService';
import type { ServiceBreakdownItem } from '../services/serviceLaborService';
import { useAuthContext } from '../contexts/auth-context';
import { generateYearPayPeriods, getPayScheduleDescription } from '../utils/payPeriodGenerator';

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
  const [showEmployeeSetup, setShowEmployeeSetup] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [showCOGSSettings, setShowCOGSSettings] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [selectedGenerateYear, setSelectedGenerateYear] = useState(new Date().getFullYear());
  const [servicesWithCOGS, setServicesWithCOGS] = useState<{ [key: string]: number }>({});
  const [services, setServices] = useState<Array<{ id: string; serviceName: string }>>([]);
  const [companySettings, setCompanySettings] = useState(COMPANY_SETTINGS);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{record: DailyRecord, index: number} | null>(null);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [needsCalculation, setNeedsCalculation] = useState(false);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');

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
      service_breakdown: record.serviceBreakdown ? { services: record.serviceBreakdown } : { services: [] }
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
      
      // If no employees exist, show setup dialog
      if (employees.length === 0) {
        setNeedsSetup(true);
        setShowEmployeeSetup(true);
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
  
  // Alias for compatibility
  const loadServices = refreshServices;

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
                  serviceBreakdown: r.service_breakdown?.services || []
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
                baseRate: period.base_rate,  // Include base rate from pay period
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
        } else {
          console.log('⚠️ No pay periods found for employee');
          setSelectedPeriodIndex(0);
        }
      }
      
      // Load services with COGS costs
      await refreshServices();
      
      const companySettings = await employeeLERService.getCompanySettings(dbUserId!);
      setCompanySettings(companySettings);
      Object.assign(COMPANY_SETTINGS, companySettings);
      
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
          let bonusQualified = 0;
          let appointmentBonus = 0;
          const qualifyForBonus = grossProfitPercent >= companySettings.bonusThresholdMin && 
                                  grossProfitPercent <= companySettings.bonusThresholdMax;

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

  // Filter records by year and month
  const filteredDailyRecords = useMemo(() => {
    if (!selectedPeriod) return [];
    
    const filtered = selectedPeriod.dailyRecords.filter(record => {
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
    
    // Debug: Log first filtered record's bonus values
    if (filtered.length > 0) {
      console.log('🎯 First filtered record for display:', {
        date: filtered[0].date,
        ler: filtered[0].ler,
        bonusQualifiedForPercent: filtered[0].bonusQualifiedForPercent,
        appointmentBasedBonus: filtered[0].appointmentBasedBonus,
        qualifyForBonus: filtered[0].qualifyForBonus,
        numberOfJobs: filtered[0].numberOfJobs,
        netProfitPercent: filtered[0].dailyNetProfitAfterBonusPercent,
        totalRevenue: filtered[0].totalJobRevenue,
        basePay: filtered[0].employeeBasePay
      });
    }
    
    return filtered;
  }, [selectedPeriod, filterYear, filterMonth]);

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
    const totalBasePay = workingRecords.reduce((sum, r) => sum + r.employeeBasePay, 0);
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

  // Chart data - YTD LER Trend (current year only, aggregated by month)
  const lerTrendData = useMemo(() => {
    const monthlyData: { [key: string]: { totalLER: number; count: number; revenue: number } } = {};
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Collect all daily records from all pay periods in current year, up to today
    payPeriodsData.forEach(period => {
      period.dailyRecords.forEach(record => {
        if (!record.calledOut && record.numberOfJobs > 0) {
          const recordDate = parseLocalDate(record.date);
          if (recordDate.getFullYear() === currentYear && recordDate <= today) {
            const monthKey = recordDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { totalLER: 0, count: 0, revenue: 0 };
            }
            
            monthlyData[monthKey].totalLER += record.ler;
            monthlyData[monthKey].count += 1;
            monthlyData[monthKey].revenue += record.totalJobRevenue;
          }
        }
      });
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
        const monthA = new Date(a.month + ' 1, ' + currentYear);
        const monthB = new Date(b.month + ' 1, ' + currentYear);
        return monthA.getTime() - monthB.getTime();
      });
  }, [payPeriodsData]);

  // Job Type Distribution - YTD (current year only, dynamic services)
  const jobTypeData = useMemo(() => {
    const totals: { [key: string]: number } = {};
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    // Collect all job types from all pay periods in current year, up to today
    payPeriodsData.forEach(period => {
      period.dailyRecords.forEach(record => {
        const recordDate = parseLocalDate(record.date);
        if (recordDate.getFullYear() === currentYear && recordDate <= today) {
          Object.entries(record.jobTypes).forEach(([serviceName, count]) => {
            totals[serviceName] = (totals[serviceName] || 0) + count;
          });
        }
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
  }, [payPeriodsData]);

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
              : 'Auto-generate pay periods based on your pay schedule, or create them manually.'}
          </div>
          {!needsSetup && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => setShowAutoGenerate(true)} 
                className="bg-accent hover:bg-accent/90"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Auto-Generate Pay Periods
              </Button>
              <Button 
                onClick={() => setShowAddPeriod(true)} 
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Manually
              </Button>
            </div>
          )}
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
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track employee labor efficiency and performance-based compensation
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCompanySettings(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Company Settings
          </Button>
        </div>
      </div>

      {/* Employee Selector */}
      {allEmployees.length > 1 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="employee-select" className="text-sm font-medium whitespace-nowrap">
                Select Employee:
              </Label>
              <select
                id="employee-select"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background text-foreground"
              >
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => setShowEmployeeSetup(true)}
                className="bg-accent hover:bg-accent/90 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Info & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{employeeInfo.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span>{employeeInfo.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span>Base Rate: ${employeeInfo.currentBaseRate}/hr</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowEditEmployee(true)}
              >
                <Users className="h-4 w-4" />
                Edit Employee
              </Button>
              <Button 
                onClick={() => setShowEmployeeSetup(true)}
                className="bg-accent hover:bg-accent/90 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pay Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted" />
              <select
                value={selectedPeriodIndex}
                onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background text-foreground"
              >
                {payPeriods.map((period, index) => (
                  <option key={index} value={index}>
                    {period.periodName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowEditPeriod(true)}
                disabled={payPeriods.length === 0}
              >
                Edit Period
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!selectedPeriod?.periodId) return;
                  
                  if (selectedPeriod.dailyRecords && selectedPeriod.dailyRecords.length > 0) {
                    alert('Cannot delete a pay period that has daily records. Please delete all records first.');
                    return;
                  }
                  
                  if (confirm(`Are you sure you want to delete "${selectedPeriod.periodName}"?`)) {
                    const success = await employeeLERService.deletePayPeriod(selectedPeriod.periodId);
                    if (success) {
                      await loadEmployeeData(selectedEmployeeId);
                      setSelectedPeriodIndex(0);
                    } else {
                      alert('Error deleting pay period. Please try again.');
                    }
                  }
                }}
                disabled={payPeriods.length === 0}
                className="text-red-600 hover:text-red-700"
              >
                Delete Period
              </Button>
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!employeeInfo.id) return;
                  
                  const totalRecords = payPeriodsData.reduce((sum, period) => 
                    sum + (period.dailyRecords?.length || 0), 0
                  );
                  
                  if (totalRecords > 0) {
                    alert(`Cannot delete pay periods that have daily records (${totalRecords} records found). Please delete all daily records first.`);
                    return;
                  }
                  
                  if (confirm(`Are you sure you want to delete ALL ${payPeriods.length} pay periods for ${employeeInfo.name}? This cannot be undone.`)) {
                    const result = await employeeLERService.deleteAllPayPeriodsForEmployee(employeeInfo.id);
                    if (result.success) {
                      alert(`Successfully deleted ${result.deletedCount} pay periods.`);
                      await loadEmployeeData(selectedEmployeeId);
                      setSelectedPeriodIndex(0);
                    } else {
                      alert(result.message || 'Error deleting pay periods. Please try again.');
                    }
                  }
                }}
                disabled={payPeriods.length === 0}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Delete All Periods
              </Button>
              <Button 
                onClick={() => setShowAddPeriod(true)}
                className="bg-accent text-white hover:bg-accent/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pay Period
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                LER Trend (YTD) - {lerTrendData.reduce((sum, m) => sum + m.days, 0)} days across {lerTrendData.length} months
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
                Job Type Distribution (YTD) - {jobTypeData.reduce((sum, item) => sum + item.value, 0)} total jobs
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
            <div className="flex items-center gap-3">
              <CardTitle className="text-foreground">Daily Performance Records</CardTitle>
              {selectedPeriod && (
                <Badge variant="outline" className="text-xs">
                  {filteredDailyRecords.length} of {selectedPeriod.dailyRecords.length} records
                </Badge>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {/* Year Filter */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-1 rounded-md border border-gray-700 bg-gray-800 text-sm"
              >
                <option value="all">All Years</option>
                {Array.from(new Set(payPeriodsData.flatMap(p => 
                  p.dailyRecords.map(r => new Date(r.date).getFullYear())
                ))).sort((a, b) => b - a).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              {/* Month Filter */}
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-1 rounded-md border border-gray-700 bg-gray-800 text-sm"
              >
                <option value="all">All Months</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>

              {/* Clear Filters Button - only show when filters are active */}
              {(filterYear !== 'all' || filterMonth !== 'all') && (
                <Button
                  onClick={() => {
                    setFilterYear('all');
                    setFilterMonth('all');
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}

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
                variant={needsCalculation ? "default" : "outline"}
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
                  {filteredDailyRecords.map((record, index) => (
                    <tr key={record.id || index} className="border-b border-gray-800 hover:bg-[rgb(17,24,39)]">
                      <td className="py-3 px-4 text-foreground">
                        <div className="font-medium">{record.workDay}</div>
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
                            className="text-blue-500 hover:text-blue-400"
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
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Period Summary */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-foreground">Pay Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Jobs</div>
                <div className="text-2xl font-bold text-foreground">{selectedPeriod.periodTotals.totalJobs}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-foreground">${selectedPeriod.periodTotals.totalRevenue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Hours</div>
                <div className="text-2xl font-bold text-foreground">{selectedPeriod.periodTotals.totalHoursWorked.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Average LER</div>
                <div className={`text-2xl font-bold ${getLERColor(selectedPeriod.periodTotals.avgLER)}`}>
                  {selectedPeriod.periodTotals.avgLER.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">LER Bonuses</div>
                <div className="text-2xl font-bold text-green-500">${selectedPeriod.periodTotals.totalLERBonuses.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Appt Bonuses</div>
                <div className="text-2xl font-bold text-green-500">${selectedPeriod.periodTotals.totalApptBonuses.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Bonuses</div>
                <div className="text-2xl font-bold text-green-600">${selectedPeriod.periodTotals.totalBonuses.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Profit Margin</div>
                <div className="text-2xl font-bold text-foreground">{selectedPeriod.periodTotals.netProfitAfterBonusPercent.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

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
    </div>
    );
  }

  // Return content with dialogs (dialogs render regardless of content state)
  return (
    <>
      {content}
      
      {/* Dialogs - Always rendered so they can show even in empty states */}
      <EmployeeSetupDialog
        open={showEmployeeSetup}
        onComplete={async (employee) => {
          if (!dbUserId) {
            alert('Error: User not authenticated');
            return;
          }
          
          const created = await employeeLERService.createEmployeeInfo(dbUserId, {
            name: employee.name,
            position: employee.position,
            current_base_rate: employee.baseRate
          });
          
          if (created && created.id) {
            setShowEmployeeSetup(false);
            setNeedsSetup(false);
            
            // Reload all employees and select the new one
            await loadAllEmployees();
            setSelectedEmployeeId(created.id);
            
            // Show add pay period dialog next
            setShowAddPeriod(true);
          } else {
            alert('Error creating employee profile. Please try again.');
          }
        }}
      />

      <EditEmployeeDialog
        open={showEditEmployee}
        onClose={() => setShowEditEmployee(false)}
        employee={employeeInfo}
        onSave={async (updated) => {
          if (!selectedEmployeeId) {
            alert('Error: No employee selected');
            return;
          }
          
          const success = await employeeLERService.updateEmployeeById(selectedEmployeeId, {
            name: updated.name,
            position: updated.position,
            current_base_rate: updated.currentBaseRate
          });
          
          if (success) {
            setEmployeeInfo(updated);
            setShowEditEmployee(false);
            // Reload all employees to update the dropdown
            await loadAllEmployees();
          } else {
            alert('Error updating employee info. Please try again.');
          }
        }}
      />

      <AddPayPeriodDialog
        open={showAddPeriod}
        onClose={() => setShowAddPeriod(false)}
        currentBaseRate={employeeInfo.currentBaseRate}
        hasMultipleEmployees={allEmployees.length > 1}
        onAdd={async (period) => {
          console.log('📅 Creating company-wide pay period');
          
          if (!dbUserId) {
            alert('Error: User not authenticated');
            return;
          }
          
          // Extract year from start_date (use local date to avoid timezone issues)
          const [year] = period.startDate.split('-').map(Number);
          
          const created = await employeeLERService.createPayPeriod(dbUserId, {
            period_name: period.periodName,
            start_date: period.startDate,
            end_date: period.endDate,
            year: year
          });
          
          console.log('✅ Pay period created:', created);
          
          if (created) {
            setShowAddPeriod(false);
            await loadEmployeeData(selectedEmployeeId);
          } else {
            alert('Error creating pay period. Please try again.');
          }
        }}
        onAddForAllEmployees={async (period) => {
          console.log('📅 Creating company-wide pay period (same as single employee - pay periods are company-wide)');
          
          try {
            if (!dbUserId) {
              alert('Error: User not authenticated');
              return;
            }
            
            // Extract year from start_date (use local date to avoid timezone issues)
            const [year] = period.startDate.split('-').map(Number);
            
            // Create ONE company-wide pay period (not one per employee)
            const created = await employeeLERService.createPayPeriod(dbUserId, {
              period_name: period.periodName,
              start_date: period.startDate,
              end_date: period.endDate,
              year: year
            });
            
            setShowAddPeriod(false);
            
            if (created) {
              alert(`✅ Pay period "${period.periodName}" created for all employees!`);
            } else {
              alert('Error creating pay period. Please try again.');
            }
            
            // Reload current employee's data
            await loadEmployeeData(selectedEmployeeId);
          } catch (error) {
            console.error('Error creating bulk pay period:', error);
            alert('Error creating pay periods. Please try again.');
          }
        }}
      />

      <EditPayPeriodDialog
        open={showEditPeriod}
        onClose={() => setShowEditPeriod(false)}
        currentPeriod={selectedPeriod ? {
          periodName: selectedPeriod.periodName,
          startDate: selectedPeriod.startDate,
          endDate: selectedPeriod.endDate,
          baseRate: selectedPeriod.baseRate || employeeInfo.currentBaseRate
        } : null}
        onUpdate={async (period) => {
          if (!selectedPeriod?.periodId) {
            alert('Error: No pay period selected');
            return;
          }
          
          try {
            // Extract year from start_date for database constraint
            const year = new Date(period.startDate).getFullYear();
            
            // Update the company-wide pay period (affects all employees)
            const success = await employeeLERService.updatePayPeriod(selectedPeriod.periodId, {
              period_name: period.periodName,
              start_date: period.startDate,
              end_date: period.endDate,
              year: year
            });
            
            if (success) {
              setShowEditPeriod(false);
              // Reload current employee's data to show updated pay period
              await loadEmployeeData(selectedEmployeeId);
              alert('Pay period updated successfully for all employees!');
            } else {
              alert('Error updating pay period. Please try again.');
            }
          } catch (error) {
            console.error('Error in onUpdate:', error);
            alert('Error updating pay period. Please check console for details.');
          }
        }}
      />

      <AddDailyRecordWithServices
        open={showAddDay}
        onClose={() => {
          setShowAddDay(false);
          setEditingRecord(null);
        }}
        baseRate={selectedPeriod?.baseRate || employeeInfo.currentBaseRate}
        servicesWithCOGS={servicesWithCOGS}
        editingRecord={editingRecord?.record || null}
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
              // Update daily record
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
            
            setShowAddDay(false);
            await loadEmployeeData(selectedEmployeeId);
          } catch (error) {
            console.error('Error saving record with service breakdown:', error);
            alert('Error saving record. Please try again.');
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

      {/* Auto-Generate Pay Periods Dialog */}
      {showAutoGenerate && (
        <Dialog open={showAutoGenerate} onOpenChange={() => setShowAutoGenerate(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Auto-Generate Pay Periods</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Current Pay Schedule:</strong>
                </p>
                <p className="text-sm text-foreground">
                  {getPayScheduleDescription({
                    schedule: companySettings.paySchedule || 'bi-weekly',
                    weeklyDayOfWeek: companySettings.payDayOfWeek || 5
                  })}
                </p>
                <button
                  onClick={() => {
                    setShowAutoGenerate(false);
                    setShowCompanySettings(true);
                  }}
                  className="text-xs text-accent hover:underline mt-2"
                >
                  Change pay schedule settings →
                </button>
              </div>

              <div>
                <Label htmlFor="generate-year" className="text-sm font-medium">
                  Select Year to Generate
                </Label>
                <select
                  id="generate-year"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-foreground"
                  value={selectedGenerateYear}
                  onChange={(e) => setSelectedGenerateYear(parseInt(e.target.value))}
                >
                  <option value={2021}>2021</option>
                  <option value={2022}>2022</option>
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Select a year to auto-generate all pay periods based on your pay schedule.
                  You can generate historical years (2021-2024) or future years.
                </p>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                <p className="text-sm text-yellow-300">
                  <strong>Note:</strong> This will create pay periods in the database. You can still edit or delete them individually if needed.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAutoGenerate(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (!employeeInfo.id || !dbUserId) {
                      alert('Error: Employee not selected');
                      return;
                    }

                    const year = selectedGenerateYear;
                    const periodCount = 
                      companySettings.paySchedule === 'weekly' ? 52 :
                      companySettings.paySchedule === 'bi-weekly' ? 26 :
                      companySettings.paySchedule === 'semi-monthly' ? 24 : 12;

                    if (confirm(`Generate all pay periods for ${year}? This will create ${periodCount} pay periods.`)) {
                      try {
                        // Generate pay periods
                        const periods = generateYearPayPeriods(year, {
                          schedule: companySettings.paySchedule || 'bi-weekly',
                          weeklyDayOfWeek: companySettings.payDayOfWeek || 5,
                          startDate: companySettings.payReferenceDate
                        });

                        console.log(`🔄 Generating ${periods.length} pay periods for ${year}...`);

                        // Save each period to database
                        let successCount = 0;
                        for (const period of periods) {
                          const newPeriod: employeeLERService.PayPeriod = {
                            period_name: period.periodName,
                            start_date: period.startDate,
                            end_date: period.endDate,
                            year: year
                          };

                          const saved = await employeeLERService.createPayPeriod(
                            dbUserId!,
                            newPeriod
                          );
                          if (saved) successCount++;
                        }

                        console.log(`✅ Successfully created ${successCount} of ${periods.length} pay periods`);
                        alert(`Successfully created ${successCount} of ${periods.length} pay periods for ${year}!`);
                        setShowAutoGenerate(false);
                        await loadEmployeeData(selectedEmployeeId);
                      } catch (error) {
                        console.error('❌ Error generating pay periods:', error);
                        alert('Error generating pay periods. Please try again.');
                      }
                    }
                  }}
                  className="bg-accent hover:bg-accent/90"
                >
                  Generate Pay Periods
                </Button>
              </div>
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
          
          setCompanySettings(settings);
          Object.assign(COMPANY_SETTINGS, settings);
          
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
