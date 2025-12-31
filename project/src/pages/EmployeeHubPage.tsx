import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Users, 
  Lightbulb, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Award,
  Check,
  AlertCircle,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Info
} from 'lucide-react';
import { useAuthContext } from '../contexts/auth-context';
import { useRevenue } from '../contexts/revenue-context';
import * as employeeLERService from '../services/employeeLERService';
import * as crewService from '../services/crewService';
import type { Crew, CrewRole, CrewMember } from '../services/crewService';
import { generateYearPayPeriods } from '../utils/payPeriodGenerator';
import { Tooltip } from '../components/ui/tooltip';
import { EmployeeSetupDialog } from '../components/employee/EmployeeSetupDialog';
import { EditEmployeeDialog } from '../components/employee/EditEmployeeDialog';
import { AddPayPeriodDialog } from '../components/employee/AddPayPeriodDialog';
import { EditPayPeriodDialog } from '../components/employee/EditPayPeriodDialog';
import { PayrollSummary } from '../components/employee/PayrollSummary';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend
);

const EmployeeHubPage: React.FC = () => {
  const { dbUserId } = useAuthContext();
  const { lighthouse, currentYear: revenueCurrentYear } = useRevenue();
  
  // Employee settings state
  const [employeeSettings, setEmployeeSettings] = useState({
    // Pay schedule
    paySchedule: 'bi-weekly' as 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'custom',
    payDayOfWeek: 5,
    // Crew capacity
    numberOfCrews: 0,
    employeesPerCrew: 0,
    monthlyCrewCapacity: 0,
    // Appointment bonuses
    enableAppointmentBonus: true,
    appointmentBonus3Jobs: 7,
    appointmentBonus4Jobs: 10,
    appointmentBonus5Jobs: 15,
    appointmentBonus6PlusJobs: 20
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; position: string; current_base_rate?: number }>>([]);
  const [payPeriods, setPayPeriods] = useState<Array<{ id: string; period_name: string; start_date: string; end_date: string; year: number }>>([]);
  
  // Pay period filter state
  const [periodFilterYear, setPeriodFilterYear] = useState<number>(new Date().getFullYear());
  const [periodFilterMonth, setPeriodFilterMonth] = useState<number | 'all'>('all');
  
  // Dialog state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; position: string; currentBaseRate: number } | null>(null);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showEditPeriod, setShowEditPeriod] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<{ id: string; periodName: string; startDate: string; endDate: string } | null>(null);
  
  // Crew management state
  const [crews, setCrews] = useState<Crew[]>([]);
  const [crewRoles, setCrewRoles] = useState<CrewRole[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [showEditCrew, setShowEditCrew] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CrewRole | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleBonusPercent, setNewRoleBonusPercent] = useState(0);
  const [newRoleIsEligible, setNewRoleIsEligible] = useState(true);
  const [newMemberEmployeeId, setNewMemberEmployeeId] = useState('');
  const [newMemberRoleId, setNewMemberRoleId] = useState('');
  
  // Lighthouse state
  const hasLighthouse = !!lighthouse.goal && lighthouse.planStatus === 'committed';
  const lighthouseStepTarget = lighthouse.currentStepTarget;
  const lighthouseStepYear = lighthouse.currentStepYear;
  const lighthouseYearsToGoal = lighthouse.plan?.yearsToGoal || 0;
  
  // Theme titles
  const EARLY_THEMES = [
    'Find the Lighthouse', 'Learn the Waves', 'Steady the Boat', 
    'Know Your Numbers', 'Fix the Leaks', 'Fill the Calendar'
  ];
  const GROWTH_THEMES = [
    'Ride Bigger Waves', 'Make Each Job Worth More', 'Keep Good Customers Close',
    'Build a Strong Crew', 'Smooth the Seasons', 'Follow the WAVE'
  ];
  const FREEDOM_THEMES = [
    'Work Less, Lead More', 'Buy Back Your Time', 'Pay Yourself First',
    'Protect the Lighthouse', 'Live the Story You Wrote'
  ];
  const ALL_THEMES = [...EARLY_THEMES, ...GROWTH_THEMES, ...FREEDOM_THEMES];
  
  const currentStepOverride = lighthouse.stepOverrides?.find(
    (s: any) => s.yearIndex === lighthouseStepYear - 1
  );
  const currentThemeIndex = currentStepOverride?.themeIndex ?? (lighthouseStepYear - 1);
  const currentThemeTitle = ALL_THEMES[currentThemeIndex % ALL_THEMES.length] || 'Find the Lighthouse';
  
  const isFIRSyncedWithLighthouse = hasLighthouse && lighthouseStepTarget 
    ? Math.abs(revenueCurrentYear.targetRevenue - lighthouseStepTarget) / lighthouseStepTarget < 0.01
    : true;

  // Load settings on mount
  useEffect(() => {
    async function loadData() {
      if (!dbUserId) return;
      
      setLoading(true);
      try {
        // Load company settings (which includes employee settings)
        const settings = await employeeLERService.getCompanySettings(dbUserId);
        setEmployeeSettings({
          paySchedule: settings.paySchedule || 'bi-weekly',
          payDayOfWeek: settings.payDayOfWeek ?? 5,
          numberOfCrews: settings.numberOfCrews || 0,
          employeesPerCrew: settings.employeesPerCrew || 0,
          monthlyCrewCapacity: settings.monthlyCrewCapacity || 0,
          enableAppointmentBonus: settings.enableAppointmentBonus ?? true,
          appointmentBonus3Jobs: settings.appointmentBonus3Jobs ?? 7,
          appointmentBonus4Jobs: settings.appointmentBonus4Jobs ?? 10,
          appointmentBonus5Jobs: settings.appointmentBonus5Jobs ?? 15,
          appointmentBonus6PlusJobs: settings.appointmentBonus6PlusJobs ?? 20
        });
        
        // Load employees
        const employeeList = await employeeLERService.getAllEmployees(dbUserId);
        setEmployees(employeeList.filter(e => e.id).map(e => ({
          id: e.id!,
          name: e.name,
          position: e.position,
          current_base_rate: e.current_base_rate
        })));
        
        // Load pay periods
        const periods = await employeeLERService.getPayPeriods(dbUserId);
        setPayPeriods(periods.filter(p => p.id).map(p => ({
          id: p.id!,
          period_name: p.period_name,
          start_date: p.start_date,
          end_date: p.end_date,
          year: p.year
        })));
        
        // Load crews and roles
        const [crewList, roleList] = await Promise.all([
          crewService.getCrews(dbUserId),
          crewService.getCrewRoles(dbUserId)
        ]);
        setCrews(crewList);
        setCrewRoles(roleList);
        
        // Initialize default roles if none exist
        if (roleList.length === 0) {
          await crewService.initializeDefaultRoles(dbUserId);
          const newRoles = await crewService.getCrewRoles(dbUserId);
          setCrewRoles(newRoles);
        }
      } catch (error) {
        console.error('Error loading employee hub data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [dbUserId]);

  // Load crew members when selected crew changes
  useEffect(() => {
    async function loadCrewMembers() {
      if (selectedCrew?.id) {
        const members = await crewService.getCrewMembers(selectedCrew.id);
        setCrewMembers(members);
      } else {
        setCrewMembers([]);
      }
    }
    loadCrewMembers();
  }, [selectedCrew]);

  // Calculate crew capacity metrics
  const crewCapacityMetrics = useMemo(() => {
    const { numberOfCrews, employeesPerCrew } = employeeSettings;
    const currentEmployeeCount = employees.length;
    
    const currentMonth = new Date().getMonth();
    const monthlyFIRTarget = revenueCurrentYear.monthlyFIRTargets?.[currentMonth] || 0;
    const annualFIRTarget = revenueCurrentYear.targetRevenue || 0;
    
    let employeesNeeded = 0;
    let capacityCoverage = 0;
    let employeeGap = 0;
    
    if (employeesPerCrew > 0 && monthlyFIRTarget > 0) {
      employeesNeeded = Math.ceil(monthlyFIRTarget / employeesPerCrew);
      capacityCoverage = (numberOfCrews * employeesPerCrew) / employeesNeeded;
      employeeGap = employeesNeeded - numberOfCrews;
    }
    
    let annualEmployeesNeeded = 0;
    if (employeesPerCrew > 0 && annualFIRTarget > 0) {
      const avgMonthlyTarget = annualFIRTarget / 12;
      annualEmployeesNeeded = Math.ceil(avgMonthlyTarget / employeesPerCrew);
    }
    
    return {
      numberOfCrews,
      employeesPerCrew,
      currentEmployeeCount,
      monthlyFIRTarget,
      annualFIRTarget,
      crewsNeeded: employeesNeeded,
      employeesNeeded,
      capacityCoverage,
      crewGap: employeeGap,
      employeeGap,
      annualCrewsNeeded: annualEmployeesNeeded,
      annualEmployeesNeeded,
      hasCrewSettings: numberOfCrews > 0 && employeesPerCrew > 0
    };
  }, [employeeSettings, employees.length, revenueCurrentYear]);

  // Get unique years from pay periods for filter dropdown
  const availableYears = useMemo(() => {
    const years = [...new Set(payPeriods.map(p => p.year))].sort((a, b) => b - a);
    if (years.length === 0) {
      years.push(new Date().getFullYear());
    }
    return years;
  }, [payPeriods]);

  // Filter pay periods based on selected year and month
  const filteredPayPeriods = useMemo(() => {
    return payPeriods.filter(period => {
      // Filter by year - check if period overlaps with selected year
      const periodStart = new Date(period.start_date);
      const periodEnd = new Date(period.end_date);
      
      // Check if period is in the selected year (any part of it)
      if (periodStart.getFullYear() !== periodFilterYear && 
          periodEnd.getFullYear() !== periodFilterYear &&
          !(periodStart.getFullYear() < periodFilterYear && periodEnd.getFullYear() > periodFilterYear)) {
        return false;
      }
      
      // Filter by month if not 'all'
      if (periodFilterMonth !== 'all') {
        // Check if the pay period overlaps with the selected month
        // A period should show if ANY part of it falls within the selected month
        
        // Create date objects for the first and last day of the selected month
        const monthStart = new Date(periodFilterYear, periodFilterMonth, 1);
        const monthEnd = new Date(periodFilterYear, periodFilterMonth + 1, 0); // Last day of month
        
        // Check if period overlaps with the month
        // Period overlaps if: period starts before or during month AND ends after or during month
        const overlaps = periodStart <= monthEnd && periodEnd >= monthStart;
        
        return overlaps;
      }
      
      return true;
    }).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [payPeriods, periodFilterYear, periodFilterMonth]);

  // Calculate monthly crew needs for chart
  const monthlyCrewChartData = useMemo(() => {
    const { employeesPerCrew, numberOfCrews } = employeeSettings;
    const monthlyFIRTargets = revenueCurrentYear.monthlyFIRTargets || [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (!employeesPerCrew || employeesPerCrew <= 0) {
      return null;
    }
    
    // Calculate employees needed each month based on revenue targets
    const employeesNeededPerMonth = monthlyFIRTargets.map(target => 
      target > 0 ? Math.ceil(target / employeesPerCrew) : 0
    );
    
    const currentEmployees = numberOfCrews || 0;
    
    // Calculate employee variance per month (positive = need to hire, negative = over capacity)
    const employeeVariancePerMonth = employeesNeededPerMonth.map(needed => needed - currentEmployees);
    
    // Split bars: base (covered by current employees) and overflow (need more) or excess (have too many)
    const coveredEmployees = employeesNeededPerMonth.map(needed => Math.min(needed, currentEmployees));
    const additionalEmployeesNeeded = employeesNeededPerMonth.map(needed => Math.max(0, needed - currentEmployees));
    const excessCapacity = employeesNeededPerMonth.map(needed => Math.max(0, currentEmployees - needed));
    
    return {
      labels: months,
      datasets: [
        {
          label: 'Current Capacity',
          data: coveredEmployees,
          backgroundColor: 'rgba(213, 178, 116, 0.7)',
          borderColor: 'rgba(213, 178, 116, 1)',
          borderWidth: 1,
          borderRadius: 0,
          stack: 'employees',
        },
        {
          label: 'Additional Capacity Needed',
          data: additionalEmployeesNeeded,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 4,
          stack: 'employees',
        }
      ],
      monthlyFIRTargets,
      employeesNeededPerMonth,
      employeeVariancePerMonth,
      excessCapacity,
      currentEmployees,
      employeesPerCrew: employeesPerCrew || 1
    };
  }, [employeeSettings, revenueCurrentYear.monthlyFIRTargets]);

  // Save employee settings
  const handleSaveSettings = async () => {
    if (!dbUserId) return;
    
    setSaving(true);
    try {
      // Get current full settings first
      const currentSettings = await employeeLERService.getCompanySettings(dbUserId);
      
      // Merge with employee settings
      const updatedSettings = {
        ...currentSettings,
        paySchedule: employeeSettings.paySchedule,
        payDayOfWeek: employeeSettings.payDayOfWeek,
        numberOfCrews: employeeSettings.numberOfCrews > 0 ? employeeSettings.numberOfCrews : undefined,
        employeesPerCrew: employeeSettings.employeesPerCrew > 0 ? employeeSettings.employeesPerCrew : undefined,
        monthlyCrewCapacity: employeeSettings.monthlyCrewCapacity > 0 ? employeeSettings.monthlyCrewCapacity : undefined,
        enableAppointmentBonus: employeeSettings.enableAppointmentBonus,
        appointmentBonus3Jobs: employeeSettings.appointmentBonus3Jobs,
        appointmentBonus4Jobs: employeeSettings.appointmentBonus4Jobs,
        appointmentBonus5Jobs: employeeSettings.appointmentBonus5Jobs,
        appointmentBonus6PlusJobs: employeeSettings.appointmentBonus6PlusJobs
      };
      
      const success = await employeeLERService.saveCompanySettings(dbUserId, updatedSettings);
      if (success) {
        alert('Employee settings saved successfully!');
      } else {
        alert('Error saving settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Employee Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Hub</h1>
          <p className="text-muted-foreground mt-1">Manage your team, track performance, and optimize labor efficiency</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">

          {/* Monthly Crew Needs Chart */}
          {monthlyCrewChartData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Monthly Capacity Requirements
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monthly capacity needed to meet your FIR targets. This capacity chart is for planning to achieve your Lighthouse Goal only and does not reflect your actual employee generated revenue.
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Chart
                    type="bar"
                    data={monthlyCrewChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        datalabels: {
                          display: false
                        },
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          titleColor: 'rgba(213, 178, 116, 1)',
                          bodyColor: 'rgba(255, 255, 255, 0.9)',
                          borderColor: 'rgba(213, 178, 116, 0.3)',
                          borderWidth: 1,
                          padding: 12,
                          callbacks: {
                            afterBody: (context: any) => {
                              const monthIndex = context[0]?.dataIndex;
                              if (monthIndex === undefined) return [];
                              const firTarget = monthlyCrewChartData.monthlyFIRTargets[monthIndex] || 0;
                              const employeesNeeded = monthlyCrewChartData.employeesNeededPerMonth[monthIndex] || 0;
                              const variance = monthlyCrewChartData.employeeVariancePerMonth[monthIndex] || 0;
                              return [
                                '',
                                `FIR Target: $${Math.round(firTarget).toLocaleString()}`,
                                `Employees Needed: ${employeesNeeded}`,
                                `Current Employees: ${monthlyCrewChartData.currentEmployees || 0}`,
                                variance > 0 
                                  ? `Need ${variance} more employee${variance > 1 ? 's' : ''}`
                                  : variance < 0 
                                    ? `${Math.abs(variance)} employee${Math.abs(variance) > 1 ? 's' : ''} over capacity`
                                    : 'Right-sized'
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          stacked: true,
                          grid: {
                            color: 'rgba(75, 85, 99, 0.3)'
                          },
                          ticks: {
                            color: 'rgba(156, 163, 175, 1)'
                          }
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(75, 85, 99, 0.3)'
                          },
                          ticks: {
                            color: 'rgba(156, 163, 175, 1)',
                            stepSize: 1
                          },
                          title: {
                            display: true,
                            text: 'Number of Crews',
                            color: 'rgba(156, 163, 175, 1)'
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[rgba(213,178,116,0.7)]"></div>
                    <span className="text-muted-foreground">Current Capacity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[rgba(239,68,68,0.7)]"></div>
                    <span className="text-muted-foreground">Additional Capacity Needed</span>
                  </div>
                </div>

                {/* Monthly Capacity Table */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium"></th>
                        {monthlyCrewChartData.labels.map((month: string) => (
                          <th key={month} className="text-center py-2 px-2 text-muted-foreground font-medium min-w-[48px]">
                            {month}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2 px-2 text-muted-foreground">Employees Needed</td>
                        {monthlyCrewChartData.employeesNeededPerMonth.map((employees: number, i: number) => (
                          <td key={i} className="text-center py-2 px-2 font-medium">
                            {employees}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-muted-foreground">Employee Variance</td>
                        {monthlyCrewChartData.employeeVariancePerMonth.map((variance: number, i: number) => (
                          <td key={i} className={`text-center py-2 px-2 font-medium ${
                            variance > 0 
                              ? 'text-red-400' 
                              : variance < 0 
                                ? 'text-green-400' 
                                : 'text-muted-foreground'
                          }`}>
                            {variance > 0 ? `+${variance}` : variance}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capacity Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold">{employees.length}</p>
                    <p className="text-xs text-muted-foreground">From employee records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Planned Crews</p>
                    <p className="text-2xl font-bold">{employeeSettings.numberOfCrews || 0}</p>
                    {/* Validation warning */}
                    {employeeSettings.numberOfCrews > 0 && employeeSettings.employeesPerCrew > 0 && (
                      employees.length !== employeeSettings.numberOfCrews ? (
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Planning: {employeeSettings.numberOfCrews} employees
                        </p>
                      ) : (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Matches employee count
                        </p>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <DollarSign className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Planned Monthly Capacity</p>
                    <p className="text-2xl font-bold">
                      ${((employeeSettings.numberOfCrews || 0) * (employeeSettings.employeesPerCrew || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employeeSettings.numberOfCrews || 0} employees × ${(employeeSettings.employeesPerCrew || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Staffing Guidance Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {crewCapacityMetrics.hasCrewSettings ? (
                    <>
                      <div className={`p-3 rounded-lg ${
                        crewCapacityMetrics.crewsNeeded === employeeSettings.numberOfCrews
                          ? 'bg-green-500/20'
                          : crewCapacityMetrics.crewsNeeded > employeeSettings.numberOfCrews
                            ? 'bg-amber-500/20'
                            : 'bg-blue-500/20'
                      }`}>
                        <Users className={`h-6 w-6 ${
                          crewCapacityMetrics.crewsNeeded === employeeSettings.numberOfCrews
                            ? 'text-green-400'
                            : crewCapacityMetrics.crewsNeeded > employeeSettings.numberOfCrews
                              ? 'text-amber-400'
                              : 'text-blue-400'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Capacity Analysis</p>
                        {crewCapacityMetrics.crewsNeeded === employeeSettings.numberOfCrews ? (
                          <>
                            <p className="text-lg font-bold text-green-400">Right-sized</p>
                            <p className="text-xs text-muted-foreground">
                              {employeeSettings.numberOfCrews} crews matches your FIR target
                            </p>
                          </>
                        ) : crewCapacityMetrics.crewsNeeded > employeeSettings.numberOfCrews ? (
                          <>
                            <p className="text-lg font-bold text-amber-400">
                              Need {crewCapacityMetrics.crewsNeeded - employeeSettings.numberOfCrews} more crew{crewCapacityMetrics.crewsNeeded - employeeSettings.numberOfCrews > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {crewCapacityMetrics.crewsNeeded} crews needed for ${Math.round(crewCapacityMetrics.monthlyFIRTarget).toLocaleString()} FIR
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-blue-400">
                              {employeeSettings.numberOfCrews - crewCapacityMetrics.crewsNeeded} crew{employeeSettings.numberOfCrews - crewCapacityMetrics.crewsNeeded > 1 ? 's' : ''} over capacity
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Only {crewCapacityMetrics.crewsNeeded} crew{crewCapacityMetrics.crewsNeeded > 1 ? 's' : ''} needed for ${Math.round(crewCapacityMetrics.monthlyFIRTarget).toLocaleString()} FIR
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-lg bg-muted/20">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Staffing Guidance</p>
                        <p className="text-lg font-bold text-muted-foreground">--</p>
                        <p className="text-xs text-muted-foreground">Configure crew settings</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inspirational Quote */}
          <div className="py-8 text-center">
            <p 
              className="text-xl md:text-2xl text-foreground/90 leading-relaxed max-w-3xl mx-auto mb-12 mt-12"
              style={{ fontFamily: "'Lora', normal" }}
            >
              "If the grind has taken over, it's time to take it back.<br />
              Step out of survival mode and start creating the future you imagined when you first started."
            </p>
          </div>

          {/* Employee & Pay Period Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Employee Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    Employees
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setShowAddEmployee(true)}
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Employee
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No employees added yet</p>
                    <p className="text-sm">Click "Add Employee" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {employees.map((emp) => (
                      <div 
                        key={emp.id} 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {emp.position} • ${emp.current_base_rate || 0}/hr
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee({
                              id: emp.id,
                              name: emp.name,
                              position: emp.position,
                              currentBaseRate: emp.current_base_rate || 0
                            });
                            setShowEditEmployee(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pay Period Management - Merged with Schedule Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    Pay Periods
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip 
                      content={
                        <div className="space-y-2">
                          <p className="font-normal">Pay Frequency Options:</p>
                          <ul className="space-y-1 text-sm font-normal">
                            <li>Weekly: 52 periods/year - best for hourly workers</li>
                            <li>Bi-weekly: 26 periods/year - most common</li>
                            <li>Semi-monthly: 24 periods/year - 1st & 15th</li>
                            <li>Monthly: 12 periods/year</li>
                            <li>Custom: Create periods manually</li>
                          </ul>
                        </div>
                      }
                      position="left"
                    >
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Tooltip>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddPeriod(true)}
                      className="bg-accent hover:bg-accent/90"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Period
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Generate Section */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select 
                      value={employeeSettings.paySchedule} 
                      onValueChange={(value: any) => setEmployeeSettings(prev => ({
                        ...prev,
                        paySchedule: value
                      }))}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly (52/yr)</SelectItem>
                        <SelectItem value="bi-weekly">Bi-weekly (26/yr)</SelectItem>
                        <SelectItem value="semi-monthly">Semi-monthly (24/yr)</SelectItem>
                        <SelectItem value="monthly">Monthly (12/yr)</SelectItem>
                        <SelectItem value="custom">Custom (manual)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {(employeeSettings.paySchedule === 'weekly' || employeeSettings.paySchedule === 'bi-weekly') && (
                      <Select 
                        value={employeeSettings.payDayOfWeek.toString()} 
                        onValueChange={(value) => setEmployeeSettings(prev => ({
                          ...prev,
                          payDayOfWeek: parseInt(value)
                        }))}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {employeeSettings.paySchedule !== 'custom' && (
                      <>
                        <select 
                          className="h-8 px-2 text-sm rounded-md border border-input bg-background"
                          id="generateYear"
                          defaultValue={new Date().getFullYear()}
                        >
                          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                          <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                        </select>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-8 gap-1"
                          onClick={async () => {
                            const yearSelect = document.getElementById('generateYear') as HTMLSelectElement;
                            const year = parseInt(yearSelect.value);
                            const periodCount = 
                              employeeSettings.paySchedule === 'weekly' ? 52 :
                              employeeSettings.paySchedule === 'bi-weekly' ? 26 :
                              employeeSettings.paySchedule === 'semi-monthly' ? 24 : 12;

                            // Check for existing periods in that year
                            const existingForYear = payPeriods.filter(p => p.year === year);
                            if (existingForYear.length > 0) {
                              if (!confirm(`Warning: ${existingForYear.length} pay periods already exist for ${year}. This may create duplicates. Continue anyway?`)) {
                                return;
                              }
                            } else if (!confirm(`Generate ${periodCount} pay periods for ${year}?`)) {
                              return;
                            }

                            try {
                              const periods = generateYearPayPeriods(year, {
                                schedule: employeeSettings.paySchedule,
                                weeklyDayOfWeek: employeeSettings.payDayOfWeek
                              });
                              
                              const newPeriods: typeof payPeriods = [];
                              for (const period of periods) {
                                const created = await employeeLERService.createPayPeriod(dbUserId!, {
                                  period_name: period.periodName,
                                  start_date: period.startDate,
                                  end_date: period.endDate,
                                  year: year
                                });
                                if (created) {
                                  newPeriods.push({
                                    id: created.id!,
                                    period_name: created.period_name,
                                    start_date: created.start_date,
                                    end_date: created.end_date,
                                    year: created.year
                                  });
                                }
                              }
                              setPayPeriods(prev => [...prev, ...newPeriods]);
                              setPeriodFilterYear(year);
                              alert(`Successfully created ${newPeriods.length} pay periods for ${year}`);
                            } catch (error) {
                              console.error('Error generating pay periods:', error);
                              alert('Error generating pay periods. Some may already exist.');
                            }
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Generate
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Filters & Period List */}
                {payPeriods.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pay periods yet</p>
                    <p className="text-xs">Select a schedule above and click Generate</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={periodFilterYear.toString()}
                        onValueChange={(value) => setPeriodFilterYear(parseInt(value))}
                      >
                        <SelectTrigger className="h-8 w-[80px] text-sm bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={periodFilterMonth === 'all' ? 'all' : periodFilterMonth.toString()}
                        onValueChange={(value) => setPeriodFilterMonth(value === 'all' ? 'all' : parseInt(value))}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-sm bg-muted/30">
                          <SelectValue />
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
                      <span className="text-xs text-muted-foreground ml-auto">
                        {filteredPayPeriods.length} of {payPeriods.length} periods
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-8"
                        onClick={async () => {
                          if (confirm(`Delete all ${payPeriods.length} pay periods? This cannot be undone.`)) {
                            const result = await employeeLERService.deleteAllPayPeriodsForUser(dbUserId!);
                            if (result.success) {
                              setPayPeriods([]);
                              alert('All pay periods deleted');
                            } else {
                              alert('Error deleting pay periods');
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete All
                      </Button>
                    </div>

                    {/* Period List */}
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredPayPeriods.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No pay periods for this filter
                        </p>
                      ) : (
                        filteredPayPeriods.map((period) => (
                          <div 
                            key={period.id} 
                            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                          >
                            <div>
                              <p className="font-medium">{period.period_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {period.start_date} - {period.end_date}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPeriod({
                                    id: period.id,
                                    periodName: period.period_name,
                                    startDate: period.start_date,
                                    endDate: period.end_date
                                  });
                                  setShowEditPeriod(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={async () => {
                                  if (confirm(`Delete pay period "${period.period_name}"?`)) {
                                    const success = await employeeLERService.deletePayPeriod(period.id);
                                    if (success) {
                                      setPayPeriods(prev => prev.filter(p => p.id !== period.id));
                                    } else {
                                      alert('Error deleting pay period');
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payroll Summary */}
          {dbUserId && payPeriods.length > 0 && (
            <PayrollSummary
              dbUserId={dbUserId}
              payPeriods={payPeriods.map(p => ({
                id: p.id,
                name: p.period_name,
                startDate: p.start_date,
                endDate: p.end_date
              }))}
              allEmployees={employees.map(e => ({
                id: e.id,
                name: e.name,
                position: e.position
              }))}
            />
          )}

          {/* Employee Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crew Capacity Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Capacity Planning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="numberOfCrews">Revenue-Producing Employees</Label>
                  <Input
                    id="numberOfCrews"
                    type="number"
                    min="0"
                    value={employeeSettings.numberOfCrews || ''}
                    onChange={(e) => setEmployeeSettings(prev => ({
                      ...prev,
                      numberOfCrews: parseInt(e.target.value) || 0
                    }))}
                    placeholder="e.g., 4"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="employeesPerCrew">Average Monthly Revenue Per Employee</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="employeesPerCrew"
                      type="number"
                      min="0"
                      step="1000"
                      value={employeeSettings.employeesPerCrew || ''}
                      onChange={(e) => setEmployeeSettings(prev => ({
                        ...prev,
                        employeesPerCrew: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="e.g., 10000"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mt-4">
                  <p className="text-md text-accent font-medium mb-1">How to Use Revenue Capacity Planning Calculator</p>
                  <p className="text-sm text-muted-foreground">
                    Plan your revenue-producing headcount to achieve your targets and know when to hire or fire.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Counting employees:</strong> Include all revenue-producing employees. For crews, count each member. 
                    Example: A 2-person crew + 1 solo employee = 3 total employees.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Revenue per employee:</strong> If a crew generates $20,000/month with 2 members, 
                    each employee produces $10,000/month ($20,000 ÷ 2).
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is for planning purposes only and doesn't reflect your actual crew assignments.
                  </p>
                </div>
                
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
                
                              </CardContent>
            </Card>

            {/* Appointment Bonus Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  Appointment-Based Bonus Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    id="enableAppointmentBonus"
                    checked={employeeSettings.enableAppointmentBonus}
                    onCheckedChange={(checked) => setEmployeeSettings(prev => ({
                      ...prev,
                      enableAppointmentBonus: !!checked
                    }))}
                  />
                  <Label htmlFor="enableAppointmentBonus">Enable appointment-based bonuses</Label>
                </div>
                
                {employeeSettings.enableAppointmentBonus && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bonus3">3 Jobs/Day</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="bonus3"
                          type="number"
                          min="0"
                          value={employeeSettings.appointmentBonus3Jobs}
                          onChange={(e) => setEmployeeSettings(prev => ({
                            ...prev,
                            appointmentBonus3Jobs: parseFloat(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bonus4">4 Jobs/Day</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="bonus4"
                          type="number"
                          min="0"
                          value={employeeSettings.appointmentBonus4Jobs}
                          onChange={(e) => setEmployeeSettings(prev => ({
                            ...prev,
                            appointmentBonus4Jobs: parseFloat(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bonus5">5 Jobs/Day</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="bonus5"
                          type="number"
                          min="0"
                          value={employeeSettings.appointmentBonus5Jobs}
                          onChange={(e) => setEmployeeSettings(prev => ({
                            ...prev,
                            appointmentBonus5Jobs: parseFloat(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bonus6">6+ Jobs/Day</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          id="bonus6"
                          type="number"
                          min="0"
                          value={employeeSettings.appointmentBonus6PlusJobs}
                          onChange={(e) => setEmployeeSettings(prev => ({
                            ...prev,
                            appointmentBonus6PlusJobs: parseFloat(e.target.value) || 0
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mt-4">
                  <p className="text-md text-accent font-medium mb-1">About Appointment-Based Bonus Settings</p>
                  <p className="text-sm text-muted-foreground">
                    Appointment-Based Bonus Settings is an additional incentive on top of any LER bonus earned. This is a supplemental bonus based on additional jobs not normally worked. Can be applied even if LER bonus is not achieved.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Crew Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Crew Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define crews, assign roles with bonus percentages, and set default crew members.
                When adding daily records, you can choose between solo (employee) or crew tracking.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Crews Column */}
                <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Crews</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewCrewName('');
                        setShowAddCrew(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {showAddCrew && (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <Input
                        placeholder="Crew name (e.g., Crew Alpha)"
                        value={newCrewName}
                        onChange={(e) => setNewCrewName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90"
                          onClick={async () => {
                            if (!dbUserId || !newCrewName.trim()) return;
                            const created = await crewService.createCrew(dbUserId, {
                              crew_name: newCrewName.trim(),
                              is_active: true
                            });
                            if (created) {
                              setCrews(prev => [...prev, created]);
                              setNewCrewName('');
                              setShowAddCrew(false);
                            }
                          }}
                          disabled={!newCrewName.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNewCrewName('');
                            setShowAddCrew(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {crews.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No crews defined yet
                      </p>
                    ) : (
                      crews.map((crew) => (
                        <div
                          key={crew.id}
                          className={`p-2 rounded-lg cursor-pointer flex items-center justify-between ${
                            selectedCrew?.id === crew.id
                              ? 'bg-accent/20 border border-accent/50'
                              : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedCrew(crew)}
                        >
                          <span className="text-sm font-medium">{crew.crew_name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-accent/20 text-muted-foreground hover:text-accent transition-colors"
                              title="Rename crew"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCrew(crew);
                                setNewCrewName(crew.crew_name);
                                setShowEditCrew(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                              title="Delete crew"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`Delete crew "${crew.crew_name}"?`)) {
                                  const success = await crewService.deleteCrew(crew.id!);
                                  if (success) {
                                    setCrews(prev => prev.filter(c => c.id !== crew.id));
                                    if (selectedCrew?.id === crew.id) {
                                      setSelectedCrew(null);
                                    }
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Edit Crew Inline */}
                  {showEditCrew && selectedCrew && (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-accent/30">
                      <Label className="text-sm">Edit Crew Name</Label>
                      <Input
                        value={newCrewName}
                        onChange={(e) => setNewCrewName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90"
                          onClick={async () => {
                            if (!selectedCrew?.id || !newCrewName.trim()) return;
                            const success = await crewService.updateCrew(selectedCrew.id, {
                              crew_name: newCrewName.trim()
                            });
                            if (success) {
                              setCrews(prev => prev.map(c =>
                                c.id === selectedCrew.id ? { ...c, crew_name: newCrewName.trim() } : c
                              ));
                              setSelectedCrew({ ...selectedCrew, crew_name: newCrewName.trim() });
                              setShowEditCrew(false);
                            }
                          }}
                        >
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowEditCrew(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Roles Column */}
                <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Roles & Bonus %</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewRoleName('');
                        setNewRoleBonusPercent(0);
                        setNewRoleIsEligible(true);
                        setShowAddRole(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Bonus Percentage Validation */}
                  {crewRoles.length > 0 && (() => {
                    const validation = crewService.validateBonusPercentages(crewRoles);
                    return (
                      <div className={`text-sm p-2 rounded ${
                        validation.valid 
                          ? 'bg-green-500/10 text-green-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {validation.valid ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            {validation.message}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {validation.message}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  
                  {showAddRole && (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <Input
                        placeholder="Role name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Bonus %"
                          value={newRoleBonusPercent}
                          onChange={(e) => setNewRoleBonusPercent(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="newRoleEligible"
                          checked={newRoleIsEligible}
                          onCheckedChange={(checked) => setNewRoleIsEligible(!!checked)}
                        />
                        <Label htmlFor="newRoleEligible" className="text-sm">Bonus eligible</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90"
                          onClick={async () => {
                            if (!dbUserId || !newRoleName.trim()) return;
                            const created = await crewService.createCrewRole(dbUserId, {
                              role_name: newRoleName.trim(),
                              bonus_percentage: newRoleBonusPercent,
                              is_bonus_eligible: newRoleIsEligible,
                              display_order: crewRoles.length
                            });
                            if (created) {
                              setCrewRoles(prev => [...prev, created]);
                              setNewRoleName('');
                              setNewRoleBonusPercent(0);
                              setShowAddRole(false);
                            }
                          }}
                          disabled={!newRoleName.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddRole(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {crewRoles.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No roles defined yet
                      </p>
                    ) : (
                      crewRoles.map((role) => (
                        <div
                          key={role.id}
                          className="p-2 bg-muted/30 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <span className="text-sm font-medium">{role.role_name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className={role.is_bonus_eligible ? 'text-accent' : 'text-muted-foreground'}>
                                {role.bonus_percentage}%
                              </span>
                              {!role.is_bonus_eligible && (
                                <span className="text-amber-400">(no bonus)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-accent/20 text-muted-foreground hover:text-accent transition-colors"
                              title="Edit role"
                              onClick={() => {
                                setSelectedRole(role);
                                setNewRoleName(role.role_name);
                                setNewRoleBonusPercent(role.bonus_percentage);
                                setNewRoleIsEligible(role.is_bonus_eligible);
                                setShowEditRole(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                              title="Delete role"
                              onClick={async () => {
                                if (confirm(`Delete role "${role.role_name}"?`)) {
                                  const success = await crewService.deleteCrewRole(role.id!);
                                  if (success) {
                                    setCrewRoles(prev => prev.filter(r => r.id !== role.id));
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Edit Role Inline */}
                  {showEditRole && selectedRole && (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2 border border-accent/30">
                      <Label className="text-sm">Edit Role</Label>
                      <Input
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={newRoleBonusPercent}
                          onChange={(e) => setNewRoleBonusPercent(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="editRoleEligible"
                          checked={newRoleIsEligible}
                          onCheckedChange={(checked) => setNewRoleIsEligible(!!checked)}
                        />
                        <Label htmlFor="editRoleEligible" className="text-sm">Bonus eligible</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-accent hover:bg-accent/90"
                          onClick={async () => {
                            if (!selectedRole?.id) return;
                            const success = await crewService.updateCrewRole(selectedRole.id, {
                              role_name: newRoleName.trim(),
                              bonus_percentage: newRoleBonusPercent,
                              is_bonus_eligible: newRoleIsEligible
                            });
                            if (success) {
                              setCrewRoles(prev => prev.map(r =>
                                r.id === selectedRole.id
                                  ? { ...r, role_name: newRoleName.trim(), bonus_percentage: newRoleBonusPercent, is_bonus_eligible: newRoleIsEligible }
                                  : r
                              ));
                              setShowEditRole(false);
                              setSelectedRole(null);
                            }
                          }}
                        >
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowEditRole(false);
                            setSelectedRole(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Crew Members Column */}
                <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      {selectedCrew ? `${selectedCrew.crew_name} Members` : 'Crew Members'}
                    </h4>
                    {selectedCrew && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewMemberEmployeeId('');
                          setNewMemberRoleId('');
                          setShowAddMember(true);
                        }}
                        disabled={employees.length === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                  
                  {!selectedCrew ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      {crews.length === 0 ? (
                        <>
                          <div className="p-3 rounded-full bg-muted/50 mb-3">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Create a crew first to add members
                          </p>
                        </>
                      ) : (
                        <>
                          {/* Animated arrow pointing left toward Crews list */}
                          <div className="flex items-center gap-2 mb-2">
                            <svg 
                              className="h-5 w-5 text-accent animate-bounce-x" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="text-sm font-medium text-accent">Click a crew</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            to manage its members
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Auto-show add form when crew has no members, or when Add button clicked */}
                      {(showAddMember || crewMembers.length === 0) && (
                        <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                          {crewMembers.length === 0 && (
                            <p className="text-sm text-accent font-medium mb-2">
                              Add your first crew member:
                            </p>
                          )}
                          <Select
                            value={newMemberEmployeeId}
                            onValueChange={setNewMemberEmployeeId}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees
                                .filter(emp => !crewMembers.some(m => m.employee_id === emp.id))
                                .map(emp => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={newMemberRoleId}
                            onValueChange={setNewMemberRoleId}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {crewRoles.map(role => (
                                <SelectItem key={role.id} value={role.id!}>
                                  {role.role_name} ({role.bonus_percentage}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-accent hover:bg-accent/90"
                              onClick={async () => {
                                if (!selectedCrew?.id || !newMemberEmployeeId) return;
                                const created = await crewService.addCrewMember({
                                  crew_id: selectedCrew.id,
                                  employee_id: newMemberEmployeeId,
                                  role_id: newMemberRoleId || undefined,
                                  is_default: true
                                });
                                if (created) {
                                  // Reload crew members to get joined data
                                  const members = await crewService.getCrewMembers(selectedCrew.id);
                                  setCrewMembers(members);
                                  setShowAddMember(false);
                                  setNewMemberEmployeeId('');
                                  setNewMemberRoleId('');
                                }
                              }}
                              disabled={!newMemberEmployeeId}
                            >
                              Add Member
                            </Button>
                            {/* Only show Cancel if there are existing members */}
                            {crewMembers.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowAddMember(false)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {crewMembers.length === 0 ? null : (
                          crewMembers.map((member) => (
                            <div
                              key={member.id}
                              className="p-2 bg-muted/30 rounded-lg flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium">{member.employee_name}</span>
                                <div className="text-sm text-muted-foreground">
                                  {member.role_name || 'No role'} 
                                  {member.bonus_percentage !== undefined && (
                                    <span className="text-accent ml-1">({member.bonus_percentage}%)</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Select
                                  value={member.role_id || ''}
                                  onValueChange={async (roleId) => {
                                    const success = await crewService.updateCrewMember(member.id!, {
                                      role_id: roleId || undefined
                                    });
                                    if (success && selectedCrew?.id) {
                                      const members = await crewService.getCrewMembers(selectedCrew.id);
                                      setCrewMembers(members);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-28 text-sm">
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {crewRoles.map(role => (
                                      <SelectItem key={role.id} value={role.id!}>
                                        {role.role_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <button
                                  type="button"
                                  className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                                  title="Remove from crew"
                                  onClick={async () => {
                                    if (window.confirm(`Remove ${member.employee_name} from this crew?`)) {
                                      const success = await crewService.removeCrewMember(member.id!);
                                      if (success) {
                                        setCrewMembers(prev => prev.filter(m => m.id !== member.id));
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-accent hover:bg-accent/90"
            >
              {saving ? 'Saving...' : 'Save Employee Settings'}
            </Button>
          </div>
        </div>

      {/* Dialogs */}
      <EmployeeSetupDialog
        open={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onSave={async (employee) => {
          if (!dbUserId) return;
          const created = await employeeLERService.createEmployeeInfo(dbUserId, {
            name: employee.name,
            position: employee.position,
            current_base_rate: employee.currentBaseRate
          });
          if (created && created.id) {
            setEmployees(prev => [...prev, {
              id: created.id!,
              name: created.name,
              position: created.position,
              current_base_rate: created.current_base_rate
            }]);
            setShowAddEmployee(false);
          } else {
            alert('Error creating employee');
          }
        }}
      />

      <EditEmployeeDialog
        open={showEditEmployee}
        onClose={() => {
          setShowEditEmployee(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee || { id: '', name: '', position: '', currentBaseRate: 0 }}
        onSave={async (updated) => {
          if (!selectedEmployee) return;
          const success = await employeeLERService.updateEmployeeById(selectedEmployee.id, {
            name: updated.name,
            position: updated.position,
            current_base_rate: updated.currentBaseRate
          });
          if (success) {
            setEmployees(prev => prev.map(e => 
              e.id === selectedEmployee.id 
                ? { ...e, name: updated.name, position: updated.position, current_base_rate: updated.currentBaseRate }
                : e
            ));
            setShowEditEmployee(false);
            setSelectedEmployee(null);
          } else {
            alert('Error updating employee');
          }
        }}
      />

      <AddPayPeriodDialog
        open={showAddPeriod}
        onClose={() => setShowAddPeriod(false)}
        currentBaseRate={0}
        hasMultipleEmployees={employees.length > 1}
        onAdd={async (period) => {
          if (!dbUserId) return;
          const [year] = period.startDate.split('-').map(Number);
          const created = await employeeLERService.createPayPeriod(dbUserId, {
            period_name: period.periodName,
            start_date: period.startDate,
            end_date: period.endDate,
            year: year
          });
          if (created && created.id) {
            setPayPeriods(prev => [...prev, {
              id: created.id!,
              period_name: created.period_name,
              start_date: created.start_date,
              end_date: created.end_date,
              year: created.year
            }]);
            setShowAddPeriod(false);
          } else {
            alert('Error creating pay period');
          }
        }}
        onAddForAllEmployees={async (period) => {
          if (!dbUserId) return;
          const [year] = period.startDate.split('-').map(Number);
          const created = await employeeLERService.createPayPeriod(dbUserId, {
            period_name: period.periodName,
            start_date: period.startDate,
            end_date: period.endDate,
            year: year
          });
          if (created && created.id) {
            setPayPeriods(prev => [...prev, {
              id: created.id!,
              period_name: created.period_name,
              start_date: created.start_date,
              end_date: created.end_date,
              year: created.year
            }]);
            setShowAddPeriod(false);
          } else {
            alert('Error creating pay period');
          }
        }}
      />

      <EditPayPeriodDialog
        open={showEditPeriod}
        onClose={() => {
          setShowEditPeriod(false);
          setSelectedPeriod(null);
        }}
        currentPeriod={selectedPeriod ? { ...selectedPeriod, baseRate: 0 } : null}
        onUpdate={async (updated: { periodName: string; startDate: string; endDate: string }) => {
          if (!selectedPeriod) return;
          const success = await employeeLERService.updatePayPeriod(selectedPeriod.id, {
            period_name: updated.periodName,
            start_date: updated.startDate,
            end_date: updated.endDate
          });
          if (success) {
            setPayPeriods(prev => prev.map(p => 
              p.id === selectedPeriod.id 
                ? { ...p, period_name: updated.periodName, start_date: updated.startDate, end_date: updated.endDate }
                : p
            ));
            setShowEditPeriod(false);
            setSelectedPeriod(null);
          } else {
            alert('Error updating pay period');
          }
        }}
      />
    </div>
  );
};

export default EmployeeHubPage;
