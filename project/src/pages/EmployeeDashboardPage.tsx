import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Users,
  User,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Award,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as employeeLERService from '../services/employeeLERService';
import { useAuthContext } from '../contexts/auth-context';

// Helper function to parse dates without timezone issues
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Get week start date for a given date (Sunday-based weeks)
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday is 0
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

// Company settings for overtime calculation
const COMPANY_SETTINGS = {
  overtimeHoursDaily: 12,
  overtimeMultiplier: 1.5
};

// Recalculate overtime considering both daily (>12 hrs) and weekly (>40 hrs) limits
function recalculateOvertimeForRecords(records: DailyRecord[]): DailyRecord[] {
  if (records.length === 0) return records;
  
  // Group records by week
  const weekGroups: { [weekStart: string]: DailyRecord[] } = {};
  
  records.forEach(record => {
    const recordDate = parseLocalDate(record.date);
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
      // For SOLO records, recalculate based on overtime adjustments
      const isCrewRecord = record.isCrewJob;
      
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
      
      // Update record with recalculated values
      updatedRecords.push({
        ...record,
        overtimeHours: totalOTHours,
        overtimePay,
        employeeBasePay: basePay,
        grossProfitBeforeBonus,
        grossProfitBeforeBonusPercent,
        ler,
        dailyNetProfitAfterBonus,
        dailyNetProfitAfterBonusPercent
      });
      
      // Accumulate weekly hours
      weeklyHoursAccumulated += dailyHours;
    });
  });
  
  return updatedRecords;
}

// Types
interface PayPeriodOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  year: number;
}

interface DailyRecord {
  id: string;
  date: string;
  employeeId: string;
  numberOfJobs: number;
  totalJobRevenue: number;
  totalHoursWorked: number;
  ler: number;
  appointmentBasedBonus: number;
  tipAmount: number;
  calledOut: boolean;
  isCrewJob?: boolean;
  crewId?: string;
  // Fields needed for overtime recalculation
  baseRate: number;
  employeeBasePay: number;
  cogsNoLabor: number;
  overheadCostsPercent: number;
  grossProfitBeforeBonus: number;
  grossProfitBeforeBonusPercent: number;
  bonusQualifiedForPercent: number;
  qualifyForBonus: boolean;
  overtimeHours: number;
  overtimePay: number;
  dailyNetProfitAfterBonus: number;
  dailyNetProfitAfterBonusPercent: number;
}

interface EmployeeMetrics {
  solo: {
    daysWorked: number;
    totalHours: number;
    totalRevenue: number;
    totalBonus: number;
    avgLER: number;
    totalJobs: number;
  };
  crew: {
    daysWorked: number;
    totalHours: number;
    totalRevenue: number;
    totalBonus: number;
    avgLER: number;
    totalJobs: number;
  };
  combined: {
    daysWorked: number;
    totalHours: number;
    totalRevenue: number;
    totalBonus: number;
    avgLER: number;
    totalJobs: number;
  };
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  message: string;
}

const EmployeeDashboardPage: React.FC = () => {
  const { dbUserId } = useAuthContext();
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; position: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [payPeriods, setPayPeriods] = useState<PayPeriodOption[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  
  // Filter state
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  
  // UI state
  const [insightsExpanded, setInsightsExpanded] = useState(true);

  // Load initial data
  useEffect(() => {
    if (dbUserId) {
      loadInitialData();
    }
  }, [dbUserId]);

  // Load records when employee or filters change
  useEffect(() => {
    if (selectedEmployeeId && dbUserId && payPeriods.length > 0) {
      loadEmployeeRecords();
    }
  }, [selectedEmployeeId, dbUserId, filterYear, payPeriods]);

  const loadInitialData = async () => {
    if (!dbUserId) return;
    
    setLoading(true);
    try {
      // Load employees
      const emps = await employeeLERService.getAllEmployees(dbUserId);
      const mappedEmps = emps.filter(e => e.id).map(e => ({
        id: e.id!,
        name: e.name,
        position: e.position
      }));
      setEmployees(mappedEmps);
      
      // Auto-select first employee
      if (mappedEmps.length > 0) {
        setSelectedEmployeeId(mappedEmps[0].id);
      }
      
      // Load pay periods
      const periods = await employeeLERService.getPayPeriods(dbUserId);
      const mappedPeriods = periods.filter(p => p.id).map(p => ({
        id: p.id!,
        name: p.period_name,
        startDate: p.start_date,
        endDate: p.end_date,
        year: p.year
      }));
      setPayPeriods(mappedPeriods);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeRecords = async () => {
    if (!dbUserId || !selectedEmployeeId) return;
    
    try {
      // Load all daily records for this employee across all pay periods for the selected year
      const yearPeriods = payPeriods.filter(p => p.year === filterYear);
      console.log(`📊 Dashboard: Loading records for employee ${selectedEmployeeId}, year ${filterYear}`);
      console.log(`📅 Found ${yearPeriods.length} pay periods for year ${filterYear}`);
      
      const allRecords: DailyRecord[] = [];
      
      for (const period of yearPeriods) {
        const records = await employeeLERService.getDailyRecords(period.id, selectedEmployeeId);
        console.log(`   Period ${period.name}: ${records.length} records`);
        
        if (records.length > 0) {
          console.log(`   Sample record:`, {
            date: records[0].date,
            is_crew_job: records[0].is_crew_job,
            ler: records[0].ler,
            total_job_revenue: records[0].total_job_revenue
          });
        }
      
        // Map to our interface with all fields needed for overtime recalculation
        const mappedRecords: DailyRecord[] = records.map(r => ({
          id: r.id || '',
          date: r.date,
          employeeId: selectedEmployeeId,
          numberOfJobs: r.number_of_jobs,
          totalJobRevenue: r.total_job_revenue,
          totalHoursWorked: r.total_hours_worked,
          ler: r.ler,
          appointmentBasedBonus: r.appointment_based_bonus,
          tipAmount: r.tip_amount,
          calledOut: r.called_out,
          isCrewJob: r.is_crew_job,
          crewId: r.crew_id,
          // Fields for overtime recalculation
          baseRate: r.base_rate || 0,
          employeeBasePay: r.employee_base_pay || 0,
          cogsNoLabor: r.cogs_no_labor || 0,
          overheadCostsPercent: r.overhead_costs_percent || 32,
          grossProfitBeforeBonus: r.gross_profit_before_bonus || 0,
          grossProfitBeforeBonusPercent: r.gross_profit_before_bonus_percent || 0,
          bonusQualifiedForPercent: r.bonus_qualified_for_percent || 0,
          qualifyForBonus: r.qualify_for_bonus || false,
          overtimeHours: r.overtime_hours || 0,
          overtimePay: r.overtime_pay || 0,
          dailyNetProfitAfterBonus: r.daily_net_profit_after_bonus || 0,
          dailyNetProfitAfterBonusPercent: r.daily_net_profit_after_bonus_percent || 0
        }));
        allRecords.push(...mappedRecords);
      }
      
      console.log(`📊 Dashboard: Total records loaded: ${allRecords.length}`);
      console.log(`   Solo records: ${allRecords.filter(r => !r.isCrewJob).length}`);
      console.log(`   Crew records: ${allRecords.filter(r => r.isCrewJob).length}`);
      
      // Apply overtime recalculation to get accurate LER values
      const recalculatedRecords = recalculateOvertimeForRecords(allRecords);
      console.log(`   ⚡ Overtime recalculated for ${recalculatedRecords.length} records`);
      
      setDailyRecords(recalculatedRecords);
    } catch (error) {
      console.error('Error loading employee records:', error);
    }
  };

  // Get selected employee info
  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  // Filter records based on year/month/period
  const filteredRecords = useMemo(() => {
    let records = dailyRecords;
    
    // Filter by year
    if (filterYear !== new Date().getFullYear() || filterYear) {
      records = records.filter(r => {
        const recordDate = parseLocalDate(r.date);
        return recordDate.getFullYear() === filterYear;
      });
    }
    
    // Filter by month (filterMonth is 1-indexed: January=1, December=12)
    if (filterMonth !== 'all') {
      records = records.filter(r => {
        const recordDate = parseLocalDate(r.date);
        return recordDate.getMonth() + 1 === filterMonth;
      });
    }
    
    // Filter by pay period
    if (selectedPeriodId !== 'all') {
      const period = payPeriods.find(p => p.id === selectedPeriodId);
      if (period) {
        records = records.filter(r => 
          r.date >= period.startDate && r.date <= period.endDate
        );
      }
    }
    
    return records;
  }, [dailyRecords, filterYear, filterMonth, selectedPeriodId, payPeriods]);

  // Calculate metrics
  // The stored LER values in the database should already be crew-level LER (fixed by migration)
  // We use the stored values directly and average them
  const metrics: EmployeeMetrics = useMemo(() => {
    const soloRecords = filteredRecords.filter(r => !r.isCrewJob && !r.calledOut);
    const crewRecords = filteredRecords.filter(r => r.isCrewJob && !r.calledOut);
    const allRecords = filteredRecords.filter(r => !r.calledOut);
    
    // Solo metrics - use stored LER values (filter out negative LER and days with no jobs)
    const validSoloRecords = soloRecords.filter(r => r.ler >= 0 && r.numberOfJobs > 0);
    const soloMetrics = {
      daysWorked: soloRecords.length,
      totalHours: soloRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
      totalRevenue: soloRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
      totalBonus: soloRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0),
      avgLER: validSoloRecords.length > 0 
        ? validSoloRecords.reduce((sum, r) => sum + r.ler, 0) / validSoloRecords.length 
        : 0,
      totalJobs: soloRecords.reduce((sum, r) => sum + r.numberOfJobs, 0)
    };
    
    // Crew metrics - use stored LER values (should be crew-level LER from migration)
    // Filter out negative values and days with no jobs
    const validCrewRecords = crewRecords.filter(r => r.ler >= 0 && r.numberOfJobs > 0);
    const crewMetrics = {
      daysWorked: crewRecords.length,
      totalHours: crewRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
      totalRevenue: crewRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
      totalBonus: crewRecords.reduce((sum, r) => sum + r.appointmentBasedBonus, 0),
      avgLER: validCrewRecords.length > 0 
        ? validCrewRecords.reduce((sum, r) => sum + r.ler, 0) / validCrewRecords.length 
        : 0,
      totalJobs: crewRecords.reduce((sum, r) => sum + r.numberOfJobs, 0)
    };
    
    console.log('📊 Dashboard metrics:', {
      filterYear,
      filterMonth,
      soloRecords: soloRecords.length,
      validSoloRecords: validSoloRecords.length,
      soloAvgLER: soloMetrics.avgLER.toFixed(2),
      soloRecordDates: validSoloRecords.map(r => ({ date: r.date, ler: r.ler.toFixed(2) })),
      crewRecords: crewRecords.length,
      validCrewRecords: validCrewRecords.length,
      crewAvgLER: crewMetrics.avgLER.toFixed(2)
    });
    
    // Combined metrics - weighted average of solo and crew LER
    const totalValidRecords = validSoloRecords.length + validCrewRecords.length;
    const combinedAvgLER = totalValidRecords > 0
      ? (validSoloRecords.reduce((sum, r) => sum + r.ler, 0) + validCrewRecords.reduce((sum, r) => sum + r.ler, 0)) / totalValidRecords
      : 0;
    
    const combinedMetrics = {
      daysWorked: allRecords.length,
      totalHours: soloMetrics.totalHours + crewMetrics.totalHours,
      totalRevenue: soloMetrics.totalRevenue + crewMetrics.totalRevenue,
      totalBonus: soloMetrics.totalBonus + crewMetrics.totalBonus,
      avgLER: combinedAvgLER,
      totalJobs: soloMetrics.totalJobs + crewMetrics.totalJobs
    };
    
    return {
      solo: soloMetrics,
      crew: crewMetrics,
      combined: combinedMetrics
    };
  }, [filteredRecords]);

  // LER Trend data - use all records with valid (positive) LER values
  const lerTrendData = useMemo(() => {
    // Use all records with positive LER (filters out broken negative values)
    const validRecords = filteredRecords.filter(r => !r.calledOut && r.numberOfJobs > 0 && r.ler >= 0);
    
    if (filterMonth !== 'all') {
      // Daily view for specific month
      return validRecords
        .map(r => ({
          month: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ler: r.ler,
          days: 1,
          date: r.date
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    
    // Monthly aggregation
    const monthlyData: { [key: string]: { total: number; count: number } } = {};
    
    validRecords.forEach(r => {
      const monthKey = new Date(r.date).toLocaleDateString('en-US', { month: 'short' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0 };
      }
      monthlyData[monthKey].total += r.ler;
      monthlyData[monthKey].count += 1;
    });
    
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ler: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : null,
        days: data.count,
        date: month
      }))
      .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
  }, [filteredRecords, filterMonth]);

  // Generate holistic job performance insights
  // This section focuses on overall work contribution, not LER-specific metrics
  const insights: Insight[] = useMemo(() => {
    const result: Insight[] = [];
    const { solo, crew, combined } = metrics;
    
    if (combined.daysWorked === 0) {
      result.push({
        type: 'info',
        title: 'No Data Yet',
        message: 'No working days recorded for the selected period.'
      });
      return result;
    }
    
    // Work Volume & Attendance
    result.push({
      type: 'info',
      title: 'Work Summary',
      message: `${combined.daysWorked} days worked, ${combined.totalJobs} jobs completed, ${combined.totalHours.toFixed(1)} total hours.`
    });
    
    // Work type distribution
    if (solo.daysWorked > 0 && crew.daysWorked > 0) {
      const totalDays = solo.daysWorked + crew.daysWorked;
      const soloPercent = Math.round((solo.daysWorked / totalDays) * 100);
      const crewPercent = 100 - soloPercent;
      result.push({
        type: 'info',
        title: 'Work Distribution',
        message: `${soloPercent}% solo (${solo.daysWorked} days) and ${crewPercent}% crew (${crew.daysWorked} days).`
      });
    } else if (solo.daysWorked === 0 && crew.daysWorked > 0) {
      result.push({
        type: 'info',
        title: 'Crew Specialist',
        message: `Works exclusively on crew jobs (${crew.daysWorked} days). Team-focused role.`
      });
    } else if (crew.daysWorked === 0 && solo.daysWorked > 0) {
      result.push({
        type: 'info',
        title: 'Solo Specialist',
        message: `Works independently (${solo.daysWorked} days). Self-sufficient performer.`
      });
    }
    
    // Revenue Generation
    if (combined.totalRevenue > 0) {
      const avgRevenuePerDay = combined.totalRevenue / combined.daysWorked;
      const avgRevenuePerJob = combined.totalRevenue / combined.totalJobs;
      result.push({
        type: combined.totalRevenue >= 10000 ? 'success' : 'info',
        title: 'Revenue Generated',
        message: `$${combined.totalRevenue.toLocaleString()} total revenue ($${avgRevenuePerDay.toFixed(0)}/day, $${avgRevenuePerJob.toFixed(0)}/job).`
      });
    }
    
    // Productivity - Jobs per day
    if (combined.daysWorked > 0) {
      const avgJobsPerDay = combined.totalJobs / combined.daysWorked;
      if (avgJobsPerDay >= 5) {
        result.push({
          type: 'success',
          title: 'High Volume',
          message: `Averaging ${avgJobsPerDay.toFixed(1)} jobs per day. Excellent throughput!`
        });
      } else if (avgJobsPerDay >= 3) {
        result.push({
          type: 'info',
          title: 'Steady Pace',
          message: `Averaging ${avgJobsPerDay.toFixed(1)} jobs per day. Consistent workload.`
        });
      } else {
        result.push({
          type: 'tip',
          title: 'Volume Opportunity',
          message: `Averaging ${avgJobsPerDay.toFixed(1)} jobs per day. Room to increase job count.`
        });
      }
    }
    
    // Hours per day
    if (combined.daysWorked > 0) {
      const avgHoursPerDay = combined.totalHours / combined.daysWorked;
      if (avgHoursPerDay >= 8) {
        result.push({
          type: 'info',
          title: 'Full Days',
          message: `Averaging ${avgHoursPerDay.toFixed(1)} hours per day. Full workday utilization.`
        });
      } else if (avgHoursPerDay < 6) {
        result.push({
          type: 'tip',
          title: 'Hours Available',
          message: `Averaging ${avgHoursPerDay.toFixed(1)} hours per day. Capacity for additional work.`
        });
      }
    }
    
    // Bonus Earnings
    if (combined.totalBonus > 0) {
      const avgBonusPerDay = combined.totalBonus / combined.daysWorked;
      result.push({
        type: 'success',
        title: 'Bonus Earned',
        message: `$${combined.totalBonus.toFixed(2)} total bonuses ($${avgBonusPerDay.toFixed(2)} avg/day).`
      });
    } else if (combined.daysWorked >= 5) {
      result.push({
        type: 'tip',
        title: 'Bonus Opportunity',
        message: 'No bonuses earned yet. Check LER Tracking for efficiency tips to qualify.'
      });
    }
    
    return result;
  }, [metrics]);

  // Available years
  const availableYears = useMemo(() => {
    const years = [...new Set(payPeriods.map(p => p.year))].sort((a, b) => b - a);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [payPeriods]);

  // Filtered pay periods by year
  const filteredPayPeriods = useMemo(() => 
    payPeriods.filter(p => p.year === filterYear),
    [payPeriods, filterYear]
  );

  // Format helpers
  const formatCurrency = (value: number) => 
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // LER Gauge component - pure SVG with gradient outer arc and solid inner progress arc
  const LERSpeedometer = ({ value, label }: { value: number; label: string }) => {
    const maxLER = 2.0;
    const clampedValue = Math.min(Math.max(value, 0), maxLER);
    
    const getLabel = (ler: number) => {
      if (ler >= 1.0) return 'Excellent';
      if (ler >= 0.5) return 'Good';
      if (ler > 0) return 'Needs Work';
      return 'No Data';
    };
    
    const getStatusColor = (ler: number) => {
      if (ler >= 1.0) return '#22c55e';
      if (ler >= 0.6) return '#eab308';
      if (ler > 0) return '#ef4444';
      return '#6b7280';
    };
    
    // SVG parameters
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = 92;
    const innerRadius = 68;
    const outerStrokeWidth = 8;
    const innerStrokeWidth = 20;
    
    // Arc angles (270 degree arc, gap at bottom)
    // Start at bottom-left (225°), end at bottom-right (-45° or 315°)
    const startAngle = 225;
    const endAngle = -45;
    const totalAngle = 270;
    
    // Convert angle to radians (SVG uses different coordinate system)
    const toRadians = (angle: number) => (angle * Math.PI) / 180;
    
    // Calculate point on circle
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = toRadians(angleInDegrees);
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY - radius * Math.sin(angleInRadians)
      };
    };
    
    // Create arc path
    const describeArc = (x: number, y: number, radius: number, startAng: number, endAng: number) => {
      const start = polarToCartesian(x, y, radius, startAng);
      const end = polarToCartesian(x, y, radius, endAng);
      const largeArcFlag = Math.abs(startAng - endAng) <= 180 ? 0 : 1;
      const sweepFlag = startAng > endAng ? 1 : 0;
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
    };
    
    // Progress arc end angle
    const progressAngle = startAngle - (clampedValue / maxLER) * totalAngle;
    
    // Tick positions - show 0, 1, 2 only
    const ticks = [
      { value: 0, angle: startAngle },
      { value: 1, angle: startAngle - (1.0 / maxLER) * totalAngle },
      { value: 2, angle: endAngle }
    ];
    
    // Zone boundaries for outer arc segments
    // Red: 0 to 0.5 (25% of arc)
    // Yellow: 0.5 to 1.0 (25% of arc) 
    // Green: 1.0 to 2.0 (50% of arc)
    const redEndAngle = startAngle - (0.5 / maxLER) * totalAngle;
    const yellowEndAngle = startAngle - (1.0 / maxLER) * totalAngle;
    
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Outer arc - three separate colored segments */}
          {/* Red zone: 0 to 0.5 */}
          <path
            d={describeArc(cx, cy, outerRadius, startAngle, redEndAngle)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={outerStrokeWidth}
            strokeLinecap="round"
          />
          {/* Yellow zone: 0.5 to 1.0 */}
          <path
            d={describeArc(cx, cy, outerRadius, redEndAngle, yellowEndAngle)}
            fill="none"
            stroke="#eab308"
            strokeWidth={outerStrokeWidth}
            strokeLinecap="butt"
          />
          {/* Green zone: 1.0 to 2.0 */}
          <path
            d={describeArc(cx, cy, outerRadius, yellowEndAngle, endAngle)}
            fill="none"
            stroke="#22c55e"
            strokeWidth={outerStrokeWidth}
            strokeLinecap="round"
          />
          
          {/* Inner arc - gray background */}
          <path
            d={describeArc(cx, cy, innerRadius, startAngle, endAngle)}
            fill="none"
            stroke="#374151"
            strokeWidth={innerStrokeWidth}
            strokeLinecap="round"
          />
          
          {/* Inner arc - progress fill */}
          {clampedValue > 0 && (
            <path
              d={describeArc(cx, cy, innerRadius, startAngle, progressAngle)}
              fill="none"
              stroke={getStatusColor(value)}
              strokeWidth={innerStrokeWidth}
              strokeLinecap="round"
            />
          )}
          
          {/* Tick labels */}
          {ticks.map((tick, i) => {
            const pos = polarToCartesian(cx, cy, outerRadius + 18, tick.angle);
            return (
              <text
                key={i}
                x={pos.x}
                y={pos.y}
                fill="#9ca3af"
                fontSize="14"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {tick.value}
              </text>
            );
          })}
          
          {/* Center value */}
          <text
            x={cx}
            y={cy - 8}
            fill="#f3f4f6"
            fontSize="32"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {value.toFixed(2)}
          </text>
          
          {/* Status label */}
          <text
            x={cx}
            y={cy + 20}
            fill={getStatusColor(value)}
            fontSize="14"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {getLabel(value)}
          </text>
        </svg>
        <div className="text-base text-muted-foreground font-medium mt-1">{label}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="bg-muted/30 p-8 text-center max-w-md">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Employees Found</h2>
          <p className="text-muted-foreground">Add employees in the Employee Hub to view their dashboard.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Dashboard</h1>
          <p className="text-muted-foreground">Performance Dashboard for {selectedEmployee?.name || 'Select Employee'}</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Employee Selector */}
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-[180px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select Employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Year Selector */}
          <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Month Selector */}
          <Select value={filterMonth.toString()} onValueChange={(v) => {
            setFilterMonth(v === 'all' ? 'all' : parseInt(v));
            setSelectedPeriodId('all'); // Reset pay period when month changes
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Year to Date</SelectItem>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <SelectItem key={m} value={m.toString()}>
                  {new Date(2025, m-1).toLocaleDateString('en-US', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Pay Period Selector - Only show periods within selected month */}
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Pay Periods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pay Periods</SelectItem>
              {filteredPayPeriods
                .filter(p => {
                  if (filterMonth === 'all') return true;
                  // Check if pay period overlaps with selected month
                  const periodStart = new Date(p.startDate);
                  const periodEnd = new Date(p.endDate);
                  const monthStart = new Date(filterYear, (filterMonth as number) - 1, 1);
                  const monthEnd = new Date(filterYear, filterMonth as number, 0);
                  return periodStart <= monthEnd && periodEnd >= monthStart;
                })
                .map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          
        </div>
      </div>

      {/* LER Speedometers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              Solo Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <LERSpeedometer value={metrics.solo.avgLER} label="Solo LER" />
          </CardContent>
          <div className="px-6 pb-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="text-muted-foreground">Days</div>
              <div className="font-semibold text-foreground">{metrics.solo.daysWorked}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Jobs</div>
              <div className="font-semibold text-foreground">{metrics.solo.totalJobs}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Revenue</div>
              <div className="font-semibold text-foreground">{formatCurrency(metrics.solo.totalRevenue)}</div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Crew Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <LERSpeedometer value={metrics.crew.avgLER} label="Crew LER" />
          </CardContent>
          <div className="px-6 pb-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="text-muted-foreground">Days</div>
              <div className="font-semibold text-foreground">{metrics.crew.daysWorked}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Jobs</div>
              <div className="font-semibold text-foreground">{metrics.crew.totalJobs}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Revenue</div>
              <div className="font-semibold text-foreground">{formatCurrency(metrics.crew.totalRevenue)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Days Worked</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.combined.daysWorked}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Total Hours</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.combined.totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(metrics.combined.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Avg LER</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{metrics.combined.avgLER.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Total Bonus</span>
            </div>
            <div className="text-2xl font-bold text-accent">{formatCurrency(metrics.combined.totalBonus)}</div>
          </CardContent>
        </Card>
      </div>

      {/* LER Trend Chart */}
      <Card className="bg-muted/30 border-accent/50">
        <CardHeader>
          <CardTitle className="text-foreground">
            {filterMonth !== 'all' 
              ? `LER Trend - ${lerTrendData.length} days` 
              : lerTrendData.length > 0
                ? `LER Trend - ${lerTrendData.reduce((sum, m) => sum + m.days, 0)} days across ${lerTrendData.length} months`
                : 'LER Trend'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lerTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lerTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'ler') return [value.toFixed(2), 'Avg LER'];
                    return [value, name];
                  }}
                  labelFormatter={(label: string) => {
                    const monthData = lerTrendData.find(m => m.month === label);
                    return `${label} (${monthData?.days || 0} days)`;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ler" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Avg LER"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/20">
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-foreground">Performance Insights</CardTitle>
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
        </CardHeader>
        
        {insightsExpanded && (
          <CardContent>
            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, index) => {
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No insights available. Add more daily records to generate insights.
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default EmployeeDashboardPage;
