import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Award,
  Users,
  User,
  Calendar,
  Briefcase
} from 'lucide-react';

interface DailyRecord {
  id?: string;
  date: string;
  calledOut: boolean;
  numberOfJobs: number;
  totalJobRevenue: number;
  totalHoursWorked: number;
  employeeBasePay: number;
  grossProfitBeforeBonus: number;
  ler: number;
  qualifyForBonus: boolean;
  bonusQualifiedForPercent: number;
  appointmentBasedBonus: number;
  totalEmployeePay: number;
  dailyNetProfitAfterBonus: number;
  isCrewJob?: boolean;
  trackingMode?: 'employee' | 'crew';
}

interface PayPeriod {
  periodId?: string;
  periodName: string;
  startDate: string;
  endDate: string;
  dailyRecords: DailyRecord[];
}

interface EmployeeDashboardProps {
  employeeName: string;
  payPeriods: PayPeriod[];
  selectedPeriodIndex: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend, highlight }) => (
  <div className={`p-4 rounded-lg border ${highlight ? 'bg-accent/10 border-accent' : 'bg-muted/30 border-border'}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-muted-foreground">{title}</span>
      <span className={highlight ? 'text-accent' : 'text-muted-foreground'}>{icon}</span>
    </div>
    <div className="flex items-end gap-2">
      <span className={`text-2xl font-bold ${highlight ? 'text-accent' : 'text-foreground'}`}>{value}</span>
      {trend && (
        <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
          {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : trend === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  employeeName,
  payPeriods,
  selectedPeriodIndex
}) => {
  const selectedPeriod = payPeriods[selectedPeriodIndex];
  
  // Calculate metrics for the selected pay period
  const periodMetrics = useMemo(() => {
    if (!selectedPeriod) {
      return {
        solo: { days: 0, hours: 0, revenue: 0, avgLER: 0, bonuses: 0, basePay: 0 },
        crew: { days: 0, hours: 0, revenue: 0, avgLER: 0, bonuses: 0, basePay: 0 },
        combined: { days: 0, hours: 0, totalBonuses: 0, totalBasePay: 0, totalCompensation: 0 }
      };
    }

    const workingRecords = selectedPeriod.dailyRecords.filter(r => !r.calledOut && r.numberOfJobs > 0);
    
    // Separate solo and crew records
    const soloRecords = workingRecords.filter(r => !r.isCrewJob && r.trackingMode !== 'crew');
    const crewRecords = workingRecords.filter(r => r.isCrewJob || r.trackingMode === 'crew');

    // Solo metrics
    const soloMetrics = {
      days: soloRecords.length,
      hours: soloRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
      revenue: soloRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
      avgLER: soloRecords.length > 0 
        ? soloRecords.reduce((sum, r) => sum + r.ler, 0) / soloRecords.length 
        : 0,
      bonuses: soloRecords.reduce((sum, r) => sum + r.bonusQualifiedForPercent + r.appointmentBasedBonus, 0),
      basePay: soloRecords.reduce((sum, r) => sum + r.employeeBasePay, 0)
    };

    // Crew metrics
    const crewMetrics = {
      days: crewRecords.length,
      hours: crewRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
      revenue: crewRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
      avgLER: crewRecords.length > 0 
        ? crewRecords.reduce((sum, r) => sum + r.ler, 0) / crewRecords.length 
        : 0,
      bonuses: crewRecords.reduce((sum, r) => sum + r.bonusQualifiedForPercent + r.appointmentBasedBonus, 0),
      basePay: crewRecords.reduce((sum, r) => sum + r.employeeBasePay, 0)
    };

    // Combined metrics
    const totalBonuses = soloMetrics.bonuses + crewMetrics.bonuses;
    const totalBasePay = soloMetrics.basePay + crewMetrics.basePay;
    const totalCompensation = totalBasePay + totalBonuses;

    return {
      solo: soloMetrics,
      crew: crewMetrics,
      combined: {
        days: soloMetrics.days + crewMetrics.days,
        hours: soloMetrics.hours + crewMetrics.hours,
        totalBonuses,
        totalBasePay,
        totalCompensation
      }
    };
  }, [selectedPeriod]);

  // Calculate YTD metrics across all pay periods
  const ytdMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // Get all records from current year up to today
    const ytdRecords = payPeriods.flatMap(period => 
      period.dailyRecords.filter(record => {
        const recordDate = new Date(record.date + 'T00:00:00');
        return recordDate.getFullYear() === currentYear && recordDate <= today;
      })
    );

    const workingRecords = ytdRecords.filter(r => !r.calledOut && r.numberOfJobs > 0);
    
    // Separate solo and crew records
    const soloRecords = workingRecords.filter(r => !r.isCrewJob && r.trackingMode !== 'crew');
    const crewRecords = workingRecords.filter(r => r.isCrewJob || r.trackingMode === 'crew');

    // Solo metrics
    const soloMetrics = {
      days: soloRecords.length,
      hours: soloRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
      revenue: soloRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
      avgLER: soloRecords.length > 0 
        ? soloRecords.reduce((sum, r) => sum + r.ler, 0) / soloRecords.length 
        : 0,
      bonuses: soloRecords.reduce((sum, r) => sum + r.bonusQualifiedForPercent + r.appointmentBasedBonus, 0),
      basePay: soloRecords.reduce((sum, r) => sum + r.employeeBasePay, 0)
    };

    // Crew metrics
    const crewMetrics = {
      days: crewRecords.length,
      hours: crewRecords.reduce((sum, r) => sum + r.totalHoursWorked, 0),
      revenue: crewRecords.reduce((sum, r) => sum + r.totalJobRevenue, 0),
      avgLER: crewRecords.length > 0 
        ? crewRecords.reduce((sum, r) => sum + r.ler, 0) / crewRecords.length 
        : 0,
      bonuses: crewRecords.reduce((sum, r) => sum + r.bonusQualifiedForPercent + r.appointmentBasedBonus, 0),
      basePay: crewRecords.reduce((sum, r) => sum + r.employeeBasePay, 0)
    };

    // Combined metrics
    const totalBonuses = soloMetrics.bonuses + crewMetrics.bonuses;
    const totalBasePay = soloMetrics.basePay + crewMetrics.basePay;
    const totalCompensation = totalBasePay + totalBonuses;

    return {
      solo: soloMetrics,
      crew: crewMetrics,
      combined: {
        days: soloMetrics.days + crewMetrics.days,
        hours: soloMetrics.hours + crewMetrics.hours,
        totalBonuses,
        totalBasePay,
        totalCompensation
      }
    };
  }, [payPeriods]);

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatLER = (value: number) => value.toFixed(2);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-accent" />
          Employee Report Card: {employeeName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Pay Period Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Current Pay Period: {selectedPeriod?.periodName || 'None Selected'}
          </h3>
          
          {/* Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Metric</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <User className="h-3 w-3" /> Solo
                    </div>
                  </th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-3 w-3" /> Crew
                    </div>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-accent">Combined</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-foreground">Days Worked</td>
                  <td className="py-2 px-3 text-right text-foreground">{periodMetrics.solo.days}</td>
                  <td className="py-2 px-3 text-right text-foreground">{periodMetrics.crew.days}</td>
                  <td className="py-2 px-3 text-right font-medium text-accent">{periodMetrics.combined.days}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-foreground">Hours</td>
                  <td className="py-2 px-3 text-right text-foreground">{periodMetrics.solo.hours.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{periodMetrics.crew.hours.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right font-medium text-accent">{periodMetrics.combined.hours.toFixed(1)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-foreground">Revenue Generated</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatCurrency(periodMetrics.solo.revenue)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatCurrency(periodMetrics.crew.revenue)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">-</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-foreground">Avg LER</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant={periodMetrics.solo.avgLER >= 1 ? 'default' : 'secondary'} className={periodMetrics.solo.avgLER >= 1 ? 'bg-green-500/20 text-green-500' : ''}>
                      {formatLER(periodMetrics.solo.avgLER)}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant={periodMetrics.crew.avgLER >= 1 ? 'default' : 'secondary'} className={periodMetrics.crew.avgLER >= 1 ? 'bg-green-500/20 text-green-500' : ''}>
                      {formatLER(periodMetrics.crew.avgLER)}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">-</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-foreground">Base Pay</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatCurrency(periodMetrics.solo.basePay)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatCurrency(periodMetrics.crew.basePay)}</td>
                  <td className="py-2 px-3 text-right font-medium text-foreground">{formatCurrency(periodMetrics.combined.totalBasePay)}</td>
                </tr>
                <tr className="border-b border-border/50 bg-green-500/5">
                  <td className="py-2 px-3 text-foreground font-medium">Bonuses Earned</td>
                  <td className="py-2 px-3 text-right text-green-500 font-medium">{formatCurrency(periodMetrics.solo.bonuses)}</td>
                  <td className="py-2 px-3 text-right text-green-500 font-medium">{formatCurrency(periodMetrics.crew.bonuses)}</td>
                  <td className="py-2 px-3 text-right text-green-500 font-bold">{formatCurrency(periodMetrics.combined.totalBonuses)}</td>
                </tr>
                <tr className="bg-accent/10">
                  <td className="py-2 px-3 text-foreground font-bold">Total Compensation</td>
                  <td className="py-2 px-3 text-right text-foreground font-medium">{formatCurrency(periodMetrics.solo.basePay + periodMetrics.solo.bonuses)}</td>
                  <td className="py-2 px-3 text-right text-foreground font-medium">{formatCurrency(periodMetrics.crew.basePay + periodMetrics.crew.bonuses)}</td>
                  <td className="py-2 px-3 text-right text-accent font-bold text-lg">{formatCurrency(periodMetrics.combined.totalCompensation)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* YTD Summary */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Year-to-Date ({new Date().getFullYear()})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              title="Total Days"
              value={ytdMetrics.combined.days}
              subtitle={`${ytdMetrics.solo.days} solo, ${ytdMetrics.crew.days} crew`}
              icon={<Calendar className="h-4 w-4" />}
            />
            <MetricCard
              title="Total Hours"
              value={ytdMetrics.combined.hours.toFixed(1)}
              subtitle={`${ytdMetrics.solo.hours.toFixed(0)} solo, ${ytdMetrics.crew.hours.toFixed(0)} crew`}
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              title="Total Bonuses"
              value={formatCurrency(ytdMetrics.combined.totalBonuses)}
              subtitle={`${formatCurrency(ytdMetrics.solo.bonuses)} solo, ${formatCurrency(ytdMetrics.crew.bonuses)} crew`}
              icon={<Award className="h-4 w-4" />}
              highlight
            />
            <MetricCard
              title="Total Compensation"
              value={formatCurrency(ytdMetrics.combined.totalCompensation)}
              subtitle="Base pay + bonuses"
              icon={<DollarSign className="h-4 w-4" />}
              highlight
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeDashboard;
