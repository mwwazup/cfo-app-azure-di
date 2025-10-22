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
  Plus
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AddPayPeriodDialog } from '../components/employee/AddPayPeriodDialog';
import { EditPayPeriodDialog } from '../components/employee/EditPayPeriodDialog';
import { EditEmployeeDialog } from '../components/employee/EditEmployeeDialog';
import { AddDailyRecordDialogDynamic } from '../components/employee/AddDailyRecordDialogDynamic';
import { CompanySettingsDialog } from '../components/employee/CompanySettingsDialog';
import { EmployeeSetupDialog } from '../components/employee/EmployeeSetupDialog';
import { COMPANY_SETTINGS } from '../components/employee/AddDailyRecordDialogDynamic';
import { Settings } from 'lucide-react';
import * as employeeLERService from '../services/employeeLERService';
import { useAuthContext } from '../contexts/auth-context';

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
    totalBonuses: number;
    totalTips: number;
    totalEmployeePay: number;
    avgGrossProfitPercent: number;
    netProfitAfterBonusPercent: number;
  };
}

interface EmployeeInfo {
  id?: string;
  name: string;
  position: string;
  currentBaseRate: number;
}

// Utility function to parse date strings locally (timezone-safe)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const EmployeeLERPage: React.FC = () => {
  // Get Clerk user ID
  const { dbUserId } = useAuthContext();
  
  // Multi-employee state
  const [allEmployees, setAllEmployees] = useState<EmployeeInfo[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Employee and period state
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    name: 'Jared',
    position: 'Senior Tech',
    currentBaseRate: 32.46
  });

  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [payPeriodsData, setPayPeriodsData] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [showEmployeeSetup, setShowEmployeeSetup] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [showCOGSSettings, setShowCOGSSettings] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [servicesWithCOGS, setServicesWithCOGS] = useState<{ [key: string]: number }>({});
  const [companySettings, setCompanySettings] = useState(COMPANY_SETTINGS);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{record: DailyRecord, index: number} | null>(null);

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
      notes: record.notes
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

  async function loadEmployeeData(employeeId: string) {
    setLoading(true);
    
    try {
      console.log('🔍 Loading data for employee:', employeeId);
      
      // Load employee info by ID
      const empInfo = await employeeLERService.getEmployeeById(employeeId);
      console.log('👤 Employee info loaded:', empInfo);
      
      if (!empInfo) {
        console.error('Employee not found');
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
        
        // Load pay periods
        const periods = await employeeLERService.getPayPeriods(empInfo.id);
        console.log('📅 Pay periods loaded:', periods.length, 'periods');
        
        if (periods.length > 0) {
          // Load daily records for each period
          const periodsWithRecords = await Promise.all(
            periods.map(async (period) => {
              const records = await employeeLERService.getDailyRecords(period.id!);
              console.log(`📊 Period "${period.period_name}":`, records.length, 'daily records');
              
              // Calculate totals
              const workingRecords = records.filter(r => !r.called_out && r.number_of_jobs > 0);
              console.log(`   └─ Working records:`, workingRecords.length);
              
              return {
                periodName: period.period_name,
                startDate: period.start_date,
                endDate: period.end_date,
                periodId: period.id,
                baseRate: period.base_rate,  // Include base rate from pay period
                dailyRecords: records.map(r => ({
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
                  notes: r.notes
                })),
                periodTotals: {
                  totalJobs: workingRecords.reduce((sum, r) => sum + r.number_of_jobs, 0),
                  totalRevenue: workingRecords.reduce((sum, r) => sum + r.total_job_revenue, 0),
                  totalHoursWorked: workingRecords.reduce((sum, r) => sum + r.total_hours_worked, 0),
                  avgLER: workingRecords.length > 0 ? workingRecords.reduce((sum, r) => sum + r.ler, 0) / workingRecords.length : 0,
                  totalBonuses: workingRecords.reduce((sum, r) => sum + r.appointment_based_bonus, 0),
                  totalTips: workingRecords.reduce((sum, r) => sum + r.tip_amount, 0),
                  totalEmployeePay: workingRecords.reduce((sum, r) => sum + r.total_employee_pay, 0),
                  avgGrossProfitPercent: workingRecords.length > 0 ? workingRecords.reduce((sum, r) => sum + r.gross_profit_before_bonus_percent, 0) / workingRecords.length : 0,
                  netProfitAfterBonusPercent: workingRecords.length > 0 ? workingRecords.reduce((sum, r) => sum + r.daily_net_profit_after_bonus_percent, 0) / workingRecords.length : 0
                }
              };
            })
          );
          
          console.log('✅ Setting pay periods data:', periodsWithRecords.length, 'periods with records');
          setPayPeriodsData(periodsWithRecords);
        } else {
          console.log('⚠️ No pay periods found for employee');
        }
      }
      
      // Load services with COGS costs
      const services = await employeeLERService.getServicesWithCOGS(dbUserId);
      console.log('📦 Services with COGS loaded:', services);
      setServicesWithCOGS(services);
      
      const companySettings = await employeeLERService.getCompanySettings(dbUserId);
      setCompanySettings(companySettings);
      Object.assign(COMPANY_SETTINGS, companySettings);
      
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  }

  const payPeriods = payPeriodsData;

  const selectedPeriod = payPeriods[selectedPeriodIndex];

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
    const totalBonusEarned = workingRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0);
    const totalEmployeePay = workingRecords.reduce((sum, r) => sum + r.totalEmployeePay, 0);
    
    // Calculate averages
    const avgLER = totalBasePay > 0 ? totalGrossProfit / totalBasePay : 0;
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
        ler: data.totalLER / data.count, // Average LER for the month
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
        <div className="text-center max-w-md">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <div className="text-foreground text-xl mb-2">No Pay Periods Found</div>
          <div className="text-muted-foreground mb-6">
            {needsSetup 
              ? 'Complete your employee setup to get started with LER tracking.'
              : 'Create your first pay period to start tracking employee performance and bonuses.'}
          </div>
          {!needsSetup && (
            <Button onClick={() => setShowAddPeriod(true)} className="bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" />
              Create First Pay Period
            </Button>
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
            onClick={() => setShowCOGSSettings(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            COGS Settings
          </Button>
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
                      await loadEmployeeData();
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
                  Including base pay, bonus & tips
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
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
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
            <Button 
              onClick={() => setShowAddDay(true)} 
              className="bg-accent hover:bg-accent/90 text-background"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Day
            </Button>
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
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Bonus</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Tips</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Total Pay</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Net Profit</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Notes</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPeriod.dailyRecords.map((record, index) => (
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
                        ${selectedPeriod.baseRate?.toFixed(2) || '0.00'}/hr
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getLERBadgeColor(record.ler)}>
                          {record.ler.toFixed(2)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {record.qualifyForBonus ? (
                          <div>
                            <div className="text-green-500 font-medium">
                              ${record.appointmentBasedBonus.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              LER Bonus: ${record.bonusQualifiedForPercent.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {record.tipAmount > 0 ? `$${record.tipAmount.toFixed(2)}` : '-'}
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
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {record.notes || '-'}
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
                                  await loadEmployeeData();
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
                <div className="text-sm text-muted-foreground mb-1">Total Bonuses</div>
                <div className="text-2xl font-bold text-foreground">${selectedPeriod.periodTotals.totalBonuses.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Tips</div>
                <div className="text-2xl font-bold text-blue-500">${selectedPeriod.periodTotals.totalTips.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Employee Pay</div>
                <div className="text-2xl font-bold text-foreground">${selectedPeriod.periodTotals.totalEmployeePay.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Net Profit Margin</div>
                <div className="text-2xl font-bold text-foreground">{selectedPeriod.periodTotals.netProfitAfterBonusPercent.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
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
          if (!dbUserId) {
            alert('Error: User not authenticated');
            return;
          }
          
          setEmployeeInfo(updated);
          const success = await employeeLERService.updateEmployeeInfo(dbUserId, {
            name: updated.name,
            position: updated.position,
            current_base_rate: updated.currentBaseRate
          });
          
          if (success) {
            setShowEditEmployee(false);
          } else {
            alert('Error updating employee info. Please try again.');
          }
        }}
      />

      <AddPayPeriodDialog
        open={showAddPeriod}
        onClose={() => setShowAddPeriod(false)}
        currentBaseRate={employeeInfo.currentBaseRate}
        onAdd={async (period) => {
          if (!dbUserId) {
            alert('Error: User not authenticated');
            return;
          }
          
          const empInfo = await employeeLERService.getEmployeeInfo(dbUserId);
          if (!empInfo || !empInfo.id) {
            alert('Error: Employee not found');
            return;
          }
          
          const created = await employeeLERService.createPayPeriod(empInfo.id, {
            period_name: period.periodName,
            start_date: period.startDate,
            end_date: period.endDate
          }, period.baseRate);
          
          if (created) {
            setShowAddPeriod(false);
            await loadEmployeeData();
          } else {
            alert('Error creating pay period. Please try again.');
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
          
          const success = await employeeLERService.updatePayPeriod(selectedPeriod.periodId, {
            period_name: period.periodName,
            start_date: period.startDate,
            end_date: period.endDate,
            base_rate: period.baseRate
          });
          
          if (success) {
            setShowEditPeriod(false);
            await loadEmployeeData();
          } else {
            alert('Error updating pay period. Please try again.');
          }
        }}
      />

      <AddDailyRecordDialogDynamic
        open={showAddDay}
        onClose={() => {
          setShowAddDay(false);
          setEditingRecord(null);
        }}
        baseRate={selectedPeriod?.baseRate || employeeInfo.currentBaseRate}
        servicesWithCOGS={servicesWithCOGS}
        editingRecord={editingRecord?.record || null}
        onUpdate={async (record) => {
          if (editingRecord) {
            const currentPeriod = payPeriodsData[selectedPeriodIndex];
            const recordToUpdate = currentPeriod.dailyRecords[editingRecord.index];
            
            if (!recordToUpdate.id) {
              alert('Error: Record ID not found');
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
            
            const supabaseRecord = convertToSupabaseFormat(record);
            const success = await employeeLERService.updateDailyRecord(recordToUpdate.id, supabaseRecord);
            
            if (success) {
              setShowAddDay(false);
              setEditingRecord(null);
              await loadEmployeeData();
            } else {
              alert('Error updating record. Please try again.');
            }
          }
        }}
        onAdd={async (record) => {
          const currentPeriod = payPeriodsData[selectedPeriodIndex];
          if (!currentPeriod.periodId) {
            alert('Error: No pay period selected');
            return;
          }
          
          // Check if date already exists in this pay period
          const dateExists = currentPeriod.dailyRecords.some(r => r.date === record.date);
          if (dateExists) {
            alert(`A record for ${new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} already exists in this pay period. Please edit the existing record or choose a different date.`);
            return;
          }
          
          const supabaseRecord = convertToSupabaseFormat(record);
          const savedRecord = await employeeLERService.createDailyRecord(currentPeriod.periodId, supabaseRecord);
          
          if (savedRecord) {
            setShowAddDay(false);
            await loadEmployeeData();
          } else {
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
    </>
  );
};

export default EmployeeLERPage;
