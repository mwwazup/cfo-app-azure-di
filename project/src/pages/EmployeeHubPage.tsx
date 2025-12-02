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
import { generateYearPayPeriods } from '../utils/payPeriodGenerator';
import { Tooltip } from '../components/ui/tooltip';
import { EmployeeSetupDialog } from '../components/employee/EmployeeSetupDialog';
import { EditEmployeeDialog } from '../components/employee/EditEmployeeDialog';
import { AddPayPeriodDialog } from '../components/employee/AddPayPeriodDialog';
import { EditPayPeriodDialog } from '../components/employee/EditPayPeriodDialog';
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
      } catch (error) {
        console.error('Error loading employee hub data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [dbUserId]);

  // Calculate crew capacity metrics
  const crewCapacityMetrics = useMemo(() => {
    const { numberOfCrews, employeesPerCrew, monthlyCrewCapacity } = employeeSettings;
    const currentEmployeeCount = employees.length;
    
    const currentMonth = new Date().getMonth();
    const monthlyFIRTarget = revenueCurrentYear.monthlyFIRTargets?.[currentMonth] || 0;
    const annualFIRTarget = revenueCurrentYear.targetRevenue || 0;
    
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
    
    let annualCrewsNeeded = 0;
    let annualEmployeesNeeded = 0;
    if (monthlyCrewCapacity > 0 && annualFIRTarget > 0) {
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
      // Filter by year
      if (period.year !== periodFilterYear) return false;
      
      // Filter by month if not 'all'
      if (periodFilterMonth !== 'all') {
        const startMonth = new Date(period.start_date).getMonth();
        if (startMonth !== periodFilterMonth) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [payPeriods, periodFilterYear, periodFilterMonth]);

  // Calculate monthly crew needs for chart
  const monthlyCrewChartData = useMemo(() => {
    const { monthlyCrewCapacity, numberOfCrews, employeesPerCrew } = employeeSettings;
    const monthlyFIRTargets = revenueCurrentYear.monthlyFIRTargets || [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (!monthlyCrewCapacity || monthlyCrewCapacity <= 0) {
      return null;
    }
    
    const crewsNeededPerMonth = monthlyFIRTargets.map(target => 
      target > 0 ? Math.ceil(target / monthlyCrewCapacity) : 0
    );
    
    const employeesNeededPerMonth = crewsNeededPerMonth.map(crews => 
      crews * (employeesPerCrew || 1)
    );
    
    const currentCrews = numberOfCrews || 0;
    const currentEmployees = currentCrews * (employeesPerCrew || 1);
    
    // Calculate crew variance per month (positive = need to hire, negative = over capacity)
    const crewVariancePerMonth = crewsNeededPerMonth.map(needed => needed - currentCrews);
    const employeeVariancePerMonth = employeesNeededPerMonth.map(needed => needed - currentEmployees);
    
    // Split bars: base (covered by current crews) and overflow (need more) or excess (have too many)
    const coveredCrews = crewsNeededPerMonth.map(needed => Math.min(needed, currentCrews));
    const additionalCrewsNeeded = crewsNeededPerMonth.map(needed => Math.max(0, needed - currentCrews));
    const excessCapacity = crewsNeededPerMonth.map(needed => Math.max(0, currentCrews - needed));
    
    const currentCrewsLine = months.map(() => currentCrews);
    
    return {
      labels: months,
      datasets: [
        {
          label: 'Covered by Current Crews',
          data: coveredCrews,
          backgroundColor: 'rgba(213, 178, 116, 0.7)',
          borderColor: 'rgba(213, 178, 116, 1)',
          borderWidth: 1,
          borderRadius: 0,
          stack: 'crews',
        },
        {
          label: 'Additional Crews Needed',
          data: additionalCrewsNeeded,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 4,
          stack: 'crews',
        },
        {
          label: 'Current Capacity',
          data: currentCrewsLine,
          type: 'line' as const,
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }
      ],
      monthlyFIRTargets,
      employeesNeededPerMonth,
      crewsNeededPerMonth,
      crewVariancePerMonth,
      employeeVariancePerMonth,
      excessCapacity,
      currentCrews,
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
        numberOfCrews: employeeSettings.numberOfCrews || undefined,
        employeesPerCrew: employeeSettings.employeesPerCrew || undefined,
        monthlyCrewCapacity: employeeSettings.monthlyCrewCapacity || undefined,
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
          {/* Lighthouse Journey Card */}
          {hasLighthouse && (
            <Card>
              <CardContent className="py-4">
                <div className={`w-full bg-muted/30 rounded-lg p-6 ${!isFIRSyncedWithLighthouse ? 'border border-amber-500/50' : 'border border-accent/30'}`}>
                  <div className="flex flex-col gap-6">
                    {/* Top row: Journey visualization */}
                    <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                      {/* Title with Theme */}
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/20">
                          <Lightbulb className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-accent">Lighthouse Journey</span>
                          <span className="text-sm font-medium text-accent">{currentThemeTitle}</span>
                        </div>
                      </div>
                      
                      {/* Year Progress */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Year</span>
                        <div className="flex items-center gap-3">
                          {Array.from({ length: lighthouseYearsToGoal }, (_, i) => {
                            const stepNum = i + 1;
                            const isCompleted = stepNum < lighthouseStepYear;
                            const isCurrent = stepNum === lighthouseStepYear;
                            return (
                              <div key={stepNum} className="flex flex-col items-center">
                                <div 
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                    isCompleted 
                                      ? 'bg-accent text-background' 
                                      : isCurrent 
                                        ? 'bg-accent/30 text-accent ring-2 ring-accent ring-offset-2 ring-offset-background' 
                                        : 'bg-muted/50 text-muted-foreground'
                                  }`}
                                >
                                  {isCompleted ? <Check className="h-5 w-5" /> : stepNum}
                                </div>
                                {isCurrent && (
                                  <span className="text-[10px] text-accent mt-1 font-medium">NOW</span>
                                )}
                              </div>
                            );
                          })}
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                              <Lightbulb className="h-5 w-5 text-accent" />
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1">GOAL</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status */}
                      {!isFIRSyncedWithLighthouse && (
                        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 rounded-lg px-4 py-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>FIR differs from Lighthouse</span>
                        </div>
                      )}
                      {isFIRSyncedWithLighthouse && (
                        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 rounded-lg px-4 py-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>FIR synced with Year {lighthouseStepYear} target</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Crew Capacity Guidance */}
                    {crewCapacityMetrics.hasCrewSettings ? (
                      <div className="border-t border-border pt-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          To hit your Lighthouse goal of <span className="font-semibold text-foreground">${Math.round(crewCapacityMetrics.annualFIRTarget).toLocaleString()}/year</span>, 
                          you need <span className="font-semibold text-foreground">~{crewCapacityMetrics.annualCrewsNeeded} crews</span> 
                          ({crewCapacityMetrics.annualEmployeesNeeded} employees). 
                          You currently have <span className="font-semibold text-foreground">{crewCapacityMetrics.numberOfCrews} crews</span> ({crewCapacityMetrics.currentEmployeeCount} employees).
                        </p>
                        {crewCapacityMetrics.crewGap > 0 && (
                          <p className="text-sm text-amber-400 mt-2">
                            Consider adding {crewCapacityMetrics.crewGap} more crew{crewCapacityMetrics.crewGap > 1 ? 's' : ''} to meet your targets.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-border pt-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Configure crew capacity settings below to see staffing guidance.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Crew Needs Chart */}
          {monthlyCrewChartData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Monthly Crew Requirements
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Crews needed each month to meet your FIR targets. This capacity chart is for planning to achieve your Lighthouse Goal only and does not reflect your actual employee generated revenue.
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
                              const crewsNeeded = monthlyCrewChartData.crewsNeededPerMonth[monthIndex] || 0;
                              const employeesNeeded = monthlyCrewChartData.employeesNeededPerMonth[monthIndex] || 0;
                              const variance = monthlyCrewChartData.crewVariancePerMonth[monthIndex] || 0;
                              return [
                                '',
                                `FIR Target: $${Math.round(firTarget).toLocaleString()}`,
                                `Crews Needed: ${crewsNeeded}`,
                                `Employees Needed: ${employeesNeeded}`,
                                variance > 0 
                                  ? `Need ${variance} more crew${variance > 1 ? 's' : ''}`
                                  : variance < 0 
                                    ? `${Math.abs(variance)} crew${Math.abs(variance) > 1 ? 's' : ''} over capacity`
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
                    <span className="text-muted-foreground">Covered by Current Crews</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[rgba(239,68,68,0.7)]"></div>
                    <span className="text-muted-foreground">Additional Crews Needed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 border-t-2 border-dashed border-green-500"></div>
                    <span className="text-muted-foreground">Current Capacity ({employeeSettings.numberOfCrews || 0} crews)</span>
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
                        <td className="py-2 px-2 text-muted-foreground">Crews Needed</td>
                        {monthlyCrewChartData.crewsNeededPerMonth.map((crews: number, i: number) => (
                          <td key={i} className="text-center py-2 px-2 font-medium">
                            {crews}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 px-2 text-muted-foreground">Employees Needed</td>
                        {monthlyCrewChartData.employeesNeededPerMonth.map((emps: number, i: number) => (
                          <td key={i} className="text-center py-2 px-2 font-medium">
                            {emps}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-muted-foreground">Crew Variance</td>
                        {monthlyCrewChartData.crewVariancePerMonth.map((variance: number, i: number) => (
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
                    <p className="text-sm text-muted-foreground">Active Crews</p>
                    <p className="text-2xl font-bold">{employeeSettings.numberOfCrews || 0}</p>
                    {/* Validation warning */}
                    {employeeSettings.numberOfCrews > 0 && employeeSettings.employeesPerCrew > 0 && (
                      employees.length !== (employeeSettings.numberOfCrews * employeeSettings.employeesPerCrew) ? (
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Expected {employeeSettings.numberOfCrews * employeeSettings.employeesPerCrew} employees
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
                    <p className="text-sm text-muted-foreground">Monthly Capacity</p>
                    <p className="text-2xl font-bold">
                      ${((employeeSettings.numberOfCrews || 0) * (employeeSettings.monthlyCrewCapacity || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employeeSettings.numberOfCrews || 0} crews × ${(employeeSettings.monthlyCrewCapacity || 0).toLocaleString()}
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
                        <p className="text-sm text-muted-foreground">Staffing Guidance</p>
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

          {/* Employee Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crew Capacity Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Crew Capacity Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-400 font-medium mb-1">Capacity Planning</p>
                  <p className="text-xs text-muted-foreground">
                    These settings help calculate how many crews/employees you need to hit your revenue targets.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="numberOfCrews">Number of Crews</Label>
                  <Input
                    id="numberOfCrews"
                    type="number"
                    min="0"
                    value={employeeSettings.numberOfCrews || ''}
                    onChange={(e) => setEmployeeSettings(prev => ({
                      ...prev,
                      numberOfCrews: parseInt(e.target.value) || 0
                    }))}
                    placeholder="e.g., 2"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="employeesPerCrew">Employees Per Crew</Label>
                  <Input
                    id="employeesPerCrew"
                    type="number"
                    min="1"
                    value={employeeSettings.employeesPerCrew || ''}
                    onChange={(e) => setEmployeeSettings(prev => ({
                      ...prev,
                      employeesPerCrew: parseInt(e.target.value) || 0
                    }))}
                    placeholder="e.g., 2"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="monthlyCrewCapacity">Monthly Revenue Capacity Per Crew</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      id="monthlyCrewCapacity"
                      type="number"
                      min="0"
                      step="1000"
                      value={employeeSettings.monthlyCrewCapacity || ''}
                      onChange={(e) => setEmployeeSettings(prev => ({
                        ...prev,
                        monthlyCrewCapacity: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="e.g., 25000"
                    />
                  </div>
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
              </CardContent>
            </Card>
          </div>

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
