import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useServiceRevenueData, useServices } from '../hooks/useServices';
import { useServiceLaborData, useHasServiceLaborData } from '../hooks/useServiceLaborData';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ServiceHubPage() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Primary filter state
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | 'ytd'>(currentMonth);
  
  // Fetch data
  const { revenueData: primaryData } = useServiceRevenueData(filterYear);
  const { services } = useServices();
  const { revenueData: previousYearData } = useServiceRevenueData(filterYear - 1);
  
  // Fetch service labor data for true profitability
  const { data: serviceLaborData } = useServiceLaborData(
    filterYear,
    filterMonth === 'ytd' ? null : filterMonth
  );
  useHasServiceLaborData(
    filterYear,
    filterMonth === 'ytd' ? null : filterMonth
  );

  // Calculate primary period metrics
  const primaryMetrics = useMemo(() => {
    if (filterMonth === 'ytd') {
      const revenue = primaryData.reduce((total, service) => {
        const ytdRevenue = service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
        return total + ytdRevenue;
      }, 0);

      const appointments = primaryData.reduce((total, service) => {
        const ytdAppointments = service.monthlyRevenue.reduce((sum, m) => sum + (m.appointments || 0), 0);
        return total + ytdAppointments;
      }, 0);

      return { revenue, appointments };
    } else {
      const revenue = primaryData.reduce((total, service) => {
        const monthData = service.monthlyRevenue.find(m => m.month === filterMonth);
        return total + (monthData?.revenue || 0);
      }, 0);

      const appointments = primaryData.reduce((total, service) => {
        const monthData = service.monthlyRevenue.find(m => m.month === filterMonth);
        return total + (monthData?.appointments || 0);
      }, 0);

      return { revenue, appointments };
    }
  }, [primaryData, filterMonth]);

  // Service Mix Analysis
  const serviceMixComparison = useMemo(() => {
    return primaryData.map(service => {
      let currentRevenue = 0;
      let currentAppointments = 0;

      if (filterMonth === 'ytd') {
        currentRevenue = service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
        currentAppointments = service.monthlyRevenue.reduce((sum, m) => sum + (m.appointments || 0), 0);
      } else {
        const monthData = service.monthlyRevenue.find(m => m.month === filterMonth);
        currentRevenue = monthData?.revenue || 0;
        currentAppointments = monthData?.appointments || 0;
      }

      return {
        serviceName: service.serviceName,
        currentRevenue,
        currentAppointments,
        avgTicket: currentAppointments > 0 ? currentRevenue / currentAppointments : 0
      };
    }).sort((a, b) => b.currentRevenue - a.currentRevenue);
  }, [primaryData, filterMonth]);

  // YTD Performance (always year-over-year)
  const ytdMetrics = useMemo(() => {
    const currentYTD = primaryData.reduce((total, service) => {
      const ytdRevenue = service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
      return total + ytdRevenue;
    }, 0);

    const previousYTD = previousYearData.reduce((total, service) => {
      const ytdRevenue = service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
      return total + ytdRevenue;
    }, 0);

    const ytdGrowth = previousYTD > 0 ? ((currentYTD - previousYTD) / previousYTD) * 100 : 0;

    return { currentYTD, previousYTD, ytdGrowth };
  }, [primaryData, previousYearData]);

  // Top Services Comparison
  const topServicesComparison = useMemo(() => {
    if (serviceMixComparison.length < 2) return null;

    const sortedByRevenue = [...serviceMixComparison]
      .filter(s => s.currentRevenue > 0 && s.currentAppointments > 0)
      .sort((a, b) => b.currentRevenue - a.currentRevenue);

    if (sortedByRevenue.length < 2) return null;

    const topService = sortedByRevenue[0];
    const secondService = sortedByRevenue[1];

    const calculateServiceMetrics = (service: typeof topService) => {
      const labor = serviceLaborData.find(s => s.serviceName === service.serviceName);
      const serviceDef = services.find(s => s.serviceName === service.serviceName);
      
      const cogs = Number(serviceDef?.cogsCost || 0) * service.currentAppointments;
      const laborCost = labor?.totalLaborCost || 0;
      const revenue = service.currentRevenue;
      const profit = revenue - cogs - laborCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const ler = laborCost > 0 ? (revenue - cogs) / laborCost : 0;

      return {
        name: service.serviceName,
        revenue,
        avgRevenue: service.avgTicket,
        margin,
        ler,
        jobs: service.currentAppointments,
        revenueShare: (revenue / primaryMetrics.revenue) * 100
      };
    };

    const top = calculateServiceMetrics(topService);
    const second = calculateServiceMetrics(secondService);

    const revenueMultiplier = second.avgRevenue > 0 ? top.avgRevenue / second.avgRevenue : 0;
    const marginDifference = top.margin - second.margin;
    const lerMultiplier = second.ler > 0 ? top.ler / second.ler : 0;
    const topIsBetter = top.margin > second.margin;

    return {
      top,
      second,
      comparison: {
        revenueMultiplier,
        marginDifference,
        lerMultiplier,
        topIsBetter
      }
    };
  }, [serviceMixComparison, serviceLaborData, services, primaryMetrics]);

  // Service Profitability Analysis
  const serviceProfitability = useMemo(() => {
    return serviceMixComparison.map(service => {
      const serviceDefinition = services.find(s => s.serviceName === service.serviceName);
      const cogsCostPerJob = serviceDefinition?.cogsCost ? Number(serviceDefinition.cogsCost) : 0;
      const totalCOGS = cogsCostPerJob * service.currentAppointments;
      
      const laborData = serviceLaborData.find(s => s.serviceName === service.serviceName);
      const totalLaborCost = laborData?.totalLaborCost || 0;
      const totalHours = laborData?.totalHours || 0;
      
      const revenue = service.currentRevenue;
      const cogs = totalCOGS;
      const laborCost = totalLaborCost;
      
      const grossProfit = revenue - cogs;
      const netProfit = revenue - cogs - laborCost;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      
      const avgRevPerJob = service.avgTicket;
      const avgCOGSPerJob = cogsCostPerJob;
      const avgLaborPerJob = service.currentAppointments > 0 ? laborCost / service.currentAppointments : 0;
      const avgNetProfitPerJob = avgRevPerJob - avgCOGSPerJob - avgLaborPerJob;
      
      const hasCOGSData = cogsCostPerJob > 0;
      const hasLaborData = totalLaborCost > 0;
      
      let healthStatus: 'excellent' | 'good' | 'warning' | 'alert';
      let recommendation: string;
      
      const isMonthlyView = filterMonth !== 'ytd';
      const periodContext = isMonthlyView ? 'this month' : 'year to date';
      
      if (!hasLaborData) {
        healthStatus = 'warning';
        recommendation = 'No labor data available. Add daily records in Employee LER to see true profitability.';
      } else if (netMargin >= 40) {
        healthStatus = 'excellent';
        recommendation = isMonthlyView 
          ? 'Strong performance this month. Keep it up!'
          : 'Highly profitable after labor costs. Consider expanding this service.';
      } else if (netMargin >= 25) {
        healthStatus = 'good';
        recommendation = isMonthlyView
          ? 'Solid margins this month.'
          : 'Solid net margins. Maintain quality and look for efficiency gains.';
      } else if (netMargin >= 15) {
        healthStatus = 'warning';
        recommendation = isMonthlyView
          ? 'Thin margins this month. Check if this is typical or an outlier.'
          : 'Acceptable but thin margins. Review labor efficiency and pricing strategy.';
      } else if (netMargin >= 0) {
        healthStatus = 'alert';
        recommendation = isMonthlyView
          ? 'Low margins this month. Compare to other months before taking action.'
          : 'Low margins after labor. Raise prices, improve efficiency, or reduce labor costs.';
      } else {
        healthStatus = 'alert';
        recommendation = isMonthlyView
          ? 'Negative margins this month. Review YTD data to see if this is a pattern or one-off.'
          : 'Losing money on this service. Review pricing, labor costs, or consider discontinuing.';
      }
      
      return {
        serviceName: service.serviceName,
        revenue,
        cogs,
        laborCost,
        grossProfit,
        netProfit,
        netMargin,
        appointments: service.currentAppointments,
        avgRevPerJob,
        avgCOGSPerJob,
        avgLaborPerJob,
        avgNetProfitPerJob,
        totalHours,
        healthStatus,
        recommendation,
        revenueShare: (revenue / primaryMetrics.revenue) * 100,
        hasCOGSData,
        hasLaborData
      };
    }).sort((a, b) => b.netMargin - a.netMargin);
  }, [serviceMixComparison, services, serviceLaborData, primaryMetrics, filterMonth]);

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getPeriodLabel = (year: number, month: number | 'ytd') => {
    if (month === 'ytd') return `YTD ${year}`;
    return `${fullMonths[(month as number) - 1]} ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Service Hub</h1>
          <p className="text-muted-foreground mt-2">
            Service performance snapshot - how are your services really doing?
          </p>
        </div>
      </div>

      {/* Simple Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-muted-foreground">Viewing:</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Select 
                value={filterYear.toString()} 
                onValueChange={(value) => setFilterYear(Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => {
                    const year = currentDate.getFullYear() - (5 - i);
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select 
                value={filterMonth.toString()} 
                onValueChange={(value) => {
                  if (value === 'ytd') {
                    setFilterMonth('ytd');
                  } else {
                    setFilterMonth(Number(value));
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' });
                    return (
                      <SelectItem key={month} value={month.toString()}>
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <span className="text-sm font-medium text-foreground">
              {getPeriodLabel(filterYear, filterMonth)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Performance Snapshot */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Performance Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-accent/20">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    ${Math.round(primaryMetrics.revenue).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-accent/20">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Jobs</p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {primaryMetrics.appointments}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Ticket */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-accent/20">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Avg Ticket</p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    ${primaryMetrics.appointments > 0 
                      ? Math.round(primaryMetrics.revenue / primaryMetrics.appointments).toLocaleString() 
                      : '0'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* YTD Growth */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-accent/20">
                  <BarChart3 className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">YTD Growth</p>
                  <div className={`text-2xl font-bold mt-1 ${getTrendColor(ytdMetrics.ytdGrowth)}`}>
                    {ytdMetrics.ytdGrowth > 0 ? '+' : ''}{ytdMetrics.ytdGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs {filterYear - 1}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Services Comparison */}
      {topServicesComparison && (
        <Card className="bg-muted/30 border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-accent" />
              Your Top Services Compared
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Service - by total revenue */}
                <div className="bg-card/50 rounded-lg p-4 border-2 border-accent/50">
                  <h2 className="text-3xl font-bold text-accent text-center mb-3">
                    {(() => {
                      const top = topServicesComparison.top;
                      const second = topServicesComparison.second;
                      // Find what this service is best at compared to the other
                      if (top.margin > second.margin && top.avgRevenue > second.avgRevenue) return 'Top Performer';
                      if (top.margin > second.margin) return 'Higher Margins';
                      if (top.avgRevenue > second.avgRevenue) return 'Higher Ticket';
                      if (top.ler > second.ler) return 'More Efficient';
                      return 'Top Revenue';
                    })()}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-foreground">{topServicesComparison.top.name}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="text-lg font-bold text-accent">
                        ${Math.round(topServicesComparison.top.revenue).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Ticket</span>
                      <span className="text-lg font-bold text-accent">
                        ${topServicesComparison.top.avgRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Profit Margin</span>
                      <span className="text-lg font-bold text-accent">
                        {topServicesComparison.top.margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LER</span>
                      <span className="text-lg font-bold text-accent">
                        {topServicesComparison.top.ler.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Total Jobs</span>
                      <span className="text-sm font-medium text-foreground">
                        {topServicesComparison.top.jobs}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Revenue Share</span>
                      <span className="text-sm font-medium text-foreground">
                        {topServicesComparison.top.revenueShare.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Second Service */}
                <div className="bg-card/50 rounded-lg p-4 border border-2 border-accent/50">
                  <h2 className="text-3xl font-bold text-accent text-center mb-3">
                    {(() => {
                      const top = topServicesComparison.top;
                      const second = topServicesComparison.second;
                      // Find what this service is best at compared to the other
                      if (second.margin > top.margin && second.avgRevenue > top.avgRevenue) return 'Top Performer';
                      if (second.margin > top.margin) return 'Higher Margins';
                      if (second.avgRevenue > top.avgRevenue) return 'Higher Ticket';
                      if (second.ler > top.ler) return 'More Efficient';
                      return 'Growth Potential';
                    })()}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">{topServicesComparison.second.name}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="text-lg font-bold text-accent">
                        ${Math.round(topServicesComparison.second.revenue).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Ticket</span>
                      <span className="text-lg font-bold text-accent">
                        ${topServicesComparison.second.avgRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Profit Margin</span>
                      <span className="text-lg font-bold text-accent">
                        {topServicesComparison.second.margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LER</span>
                      <span className="text-lg font-bold text-accent">
                        {topServicesComparison.second.ler.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Total Jobs</span>
                      <span className="text-sm font-medium text-foreground">
                        {topServicesComparison.second.jobs}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Revenue Share</span>
                      <span className="text-sm font-medium text-foreground">
                        {topServicesComparison.second.revenueShare.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Insight */}
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
                <h4 className="font-semibold text-foreground mb-2">Key Insight</h4>
                <p className="text-sm text-foreground">
                  {(() => {
                    const topAvg = topServicesComparison.top.avgRevenue;
                    const secondAvg = topServicesComparison.second.avgRevenue;
                    const topName = topServicesComparison.top.name;
                    const secondName = topServicesComparison.second.name;
                    const marginDiff = topServicesComparison.comparison.marginDifference;
                    const topEarnsMorePerJob = topAvg > secondAvg;
                    const topHasBetterMargin = marginDiff > 0;
                    const perJobDiff = Math.abs(Math.round(topAvg - secondAvg));
                    const marginDiffAbs = Math.abs(marginDiff).toFixed(0);

                    if (topEarnsMorePerJob && topHasBetterMargin) {
                      return (
                        <>
                          <span className="font-semibold text-accent">{topName}</span> earns{' '}
                          <span className="font-semibold text-accent">${perJobDiff.toLocaleString()} more per job</span> than {secondName} and
                          has <span className="font-semibold text-accent">{marginDiffAbs}% higher profit margins</span>. 
                          This is your most valuable service - Let's ride this wave!
                        </>
                      );
                    } else if (topEarnsMorePerJob && !topHasBetterMargin) {
                      return (
                        <>
                          <span className="font-semibold text-accent">{topName}</span> earns{' '}
                          <span className="font-semibold text-accent">${perJobDiff.toLocaleString()} more per job</span>, but{' '}
                          <span className="font-semibold text-accent">{secondName}</span> has{' '}
                          <span className="font-semibold text-accent">{marginDiffAbs}% better profit margins</span>. 
                          Consider whether volume or margin matters more for your goals.
                        </>
                      );
                    } else if (!topEarnsMorePerJob && topHasBetterMargin) {
                      return (
                        <>
                          <span className="font-semibold text-accent">{secondName}</span> has a{' '}
                          <span className="font-semibold text-accent">${perJobDiff.toLocaleString()} higher ticket</span>, but{' '}
                          <span className="font-semibold text-accent">{topName}</span> has{' '}
                          <span className="font-semibold text-accent">{marginDiffAbs}% better margins</span> and brings in more total revenue. 
                          Focus on {topName} for the best overall returns.
                        </>
                      );
                    } else {
                      // Second service wins on both ticket AND margin, but top service has more volume
                      return (
                        <>
                          <span className="font-semibold text-accent">{secondName}</span> has{' '}
                          <span className="font-semibold text-accent">${perJobDiff.toLocaleString()} higher ticket</span> and{' '}
                          <span className="font-semibold text-accent">{marginDiffAbs}% better margins</span>, but{' '}
                          <span className="font-semibold text-accent">{topName}</span> drives more total revenue ({topServicesComparison.top.revenueShare.toFixed(0)}% of business). 
                          Both services are performing well.
                        </>
                      );
                    }
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Custom Legend - matches MasterChart style */}
          <div className="flex justify-center gap-8 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(208, 180, 106, 1)" }}></div>
              <span className="text-sm text-muted-foreground">{filterYear} Total Revenue</span>
            </div>
            {serviceMixComparison.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 1)" }}></div>
                <span className="text-sm text-muted-foreground">{serviceMixComparison[0].serviceName} (Top Service)</span>
              </div>
            )}
          </div>
          <div className="h-80">
            <Line
              data={{
                labels: fullMonths,
                datasets: [
                  {
                    label: `${filterYear} Total Revenue`,
                    data: Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      return primaryData.reduce((total, service) => {
                        const monthData = service.monthlyRevenue.find(m => m.month === month);
                        return total + (monthData?.revenue || 0);
                      }, 0);
                    }),
                    borderColor: 'rgb(208, 180, 106)',
                    backgroundColor: 'rgba(208, 180, 106, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 10,
                  },
                  ...(serviceMixComparison.length > 0 ? [{
                    label: `${serviceMixComparison[0].serviceName} (Top Service)`,
                    data: Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const service = primaryData.find(s => s.serviceName === serviceMixComparison[0].serviceName);
                      const monthData = service?.monthlyRevenue.find(m => m.month === month);
                      return monthData?.revenue || 0;
                    }),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 10,
                  }] : []),
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: {
                  datalabels: {
                    display: false,
                  },
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: 'rgb(209, 213, 219)',
                    bodyColor: 'rgb(209, 213, 219)',
                    borderColor: 'rgb(75, 85, 99)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                      label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.parsed.y !== null) {
                          label += '$' + Math.round(context.parsed.y).toLocaleString();
                        }
                        return label;
                      }
                    }
                  },
                },
                scales: {
                  x: {
                    grid: {
                      color: 'rgba(75, 85, 99, 0.2)',
                    },
                    ticks: {
                      color: 'rgb(156, 163, 175)',
                    },
                  },
                  y: {
                    grid: {
                      color: 'rgba(75, 85, 99, 0.2)',
                    },
                    ticks: {
                      color: 'rgb(156, 163, 175)',
                      callback: function(value) {
                        return '$' + (value as number).toLocaleString();
                      }
                    },
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
          
          {/* Chart Insights - These are for the full year shown in the chart */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Peak Month ({filterYear})</p>
              <p className="text-lg font-semibold text-foreground">
                {(() => {
                  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    return primaryData.reduce((total, service) => {
                      const monthData = service.monthlyRevenue.find(m => m.month === month);
                      return total + (monthData?.revenue || 0);
                    }, 0);
                  });
                  const maxRevenue = Math.max(...monthlyTotals);
                  const peakMonthIndex = monthlyTotals.indexOf(maxRevenue);
                  return `${fullMonths[peakMonthIndex]} - $${Math.round(maxRevenue).toLocaleString()}`;
                })()}
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Avg Monthly ({filterYear})</p>
              <p className="text-lg font-semibold text-foreground">
                {(() => {
                  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    return primaryData.reduce((total, service) => {
                      const monthData = service.monthlyRevenue.find(m => m.month === month);
                      return total + (monthData?.revenue || 0);
                    }, 0);
                  });
                  const nonZeroMonths = monthlyTotals.filter(m => m > 0);
                  const avg = nonZeroMonths.length > 0 
                    ? nonZeroMonths.reduce((a, b) => a + b, 0) / nonZeroMonths.length 
                    : 0;
                  return `$${Math.round(avg).toLocaleString()}`;
                })()}
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">{filterYear} Trend</p>
              <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                {(() => {
                  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    return primaryData.reduce((total, service) => {
                      const monthData = service.monthlyRevenue.find(m => m.month === month);
                      return total + (monthData?.revenue || 0);
                    }, 0);
                  });
                  const nonZeroMonths = monthlyTotals.filter(m => m > 0);
                  if (nonZeroMonths.length < 2) return 'Insufficient Data';
                  
                  const firstHalf = nonZeroMonths.slice(0, Math.floor(nonZeroMonths.length / 2));
                  const secondHalf = nonZeroMonths.slice(Math.floor(nonZeroMonths.length / 2));
                  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                  
                  if (secondAvg > firstAvg * 1.1) {
                    return (
                      <>
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                        <span className="text-green-500">Growing</span>
                      </>
                    );
                  } else if (secondAvg < firstAvg * 0.9) {
                    return (
                      <>
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                        <span className="text-red-500">Declining</span>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <Minus className="h-5 w-5 text-muted-foreground" />
                        <span>Stable</span>
                      </>
                    );
                  }
                })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspirational Quote */}
      <div className="py-8 text-center">
        <p 
          className="text-xl md:text-2xl text-foreground/90 leading-relaxed max-w-3xl mx-auto mb-12 mt-12"
          style={{ fontFamily: "'Lora', normal" }}
        >
          "Winning is not just about money.<br />
          It's about time with your family, peace of mind, and the freedom to live life on your terms."
        </p>
      </div>

      {/* Service Profitability - Simplified */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <DollarSign className="h-5 w-5 text-accent" />
            Service Profitability
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Which services are actually profitable? <span className="text-accent font-medium">({filterMonth === 'ytd' ? `YTD ${filterYear}` : `${fullMonths[(filterMonth as number) - 1]} ${filterYear}`})</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  {filterMonth === 'ytd' ? 'YTD Gross Profit' : `${fullMonths[(filterMonth as number) - 1]} Gross Profit`}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${Math.round(serviceProfitability.reduce((sum, s) => sum + s.grossProfit, 0)).toLocaleString()}
                </p>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  {filterMonth === 'ytd' ? 'YTD Avg Net Margin' : `${fullMonths[(filterMonth as number) - 1]} Avg Net Margin`}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {serviceProfitability.length > 0 
                    ? (serviceProfitability.reduce((sum, s) => sum + s.netMargin, 0) / serviceProfitability.length).toFixed(1)
                    : '0'}%
                </p>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  {filterMonth === 'ytd' ? 'YTD Most Profitable' : `${fullMonths[(filterMonth as number) - 1]} Most Profitable`}
                </p>
                <p className="text-lg font-bold text-accent">
                  {serviceProfitability[0]?.serviceName.split(' ')[0] || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {serviceProfitability[0]?.netMargin.toFixed(0)}% net margin
                </p>
              </div>
            </div>

            {/* Profitability Table */}
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-foreground">Service</th>
                    <th className="text-right p-3 text-sm font-medium text-foreground">Revenue</th>
                    <th className="text-right p-3 text-sm font-medium text-foreground">COGS</th>
                    <th className="text-right p-3 text-sm font-medium text-foreground">Labor</th>
                    <th className="text-right p-3 text-sm font-medium text-foreground bg-accent/20">Net Profit</th>
                    <th className="text-center p-3 text-sm font-medium text-foreground bg-accent/20">Net %</th>
                    <th className="text-center p-3 text-sm font-medium text-foreground">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceProfitability.map((service, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3">
                        <p className="text-sm font-medium text-foreground">{service.serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.appointments} jobs
                        </p>
                      </td>
                      <td className="text-right p-3 text-sm text-foreground">
                        ${Math.round(service.revenue).toLocaleString()}
                      </td>
                      <td className="text-right p-3 text-sm text-muted-foreground">
                        {service.hasCOGSData ? (
                          `$${Math.round(service.cogs).toLocaleString()}`
                        ) : (
                          <span className="text-yellow-500 text-xs">Not set</span>
                        )}
                      </td>
                      <td className="text-right p-3 text-sm text-muted-foreground">
                        {service.hasLaborData ? (
                          `$${Math.round(service.laborCost).toLocaleString()}`
                        ) : (
                          <span className="text-yellow-500 text-xs">No data</span>
                        )}
                      </td>
                      <td className="text-right p-3 bg-accent/10">
                        <span className="text-sm font-bold text-accent">
                          ${Math.round(service.netProfit).toLocaleString()}
                        </span>
                      </td>
                      <td className="text-center p-3 bg-accent/10">
                        <span className={`text-sm font-bold ${
                          service.netMargin >= 40 ? 'text-green-500' :
                          service.netMargin >= 25 ? 'text-accent' :
                          service.netMargin >= 15 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {service.netMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          service.healthStatus === 'excellent' ? 'bg-green-500/20 text-green-500' :
                          service.healthStatus === 'good' ? 'bg-accent/20 text-accent' :
                          service.healthStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {service.healthStatus === 'excellent' ? 'Excellent' :
                           service.healthStatus === 'good' ? 'Good' :
                           service.healthStatus === 'warning' ? 'Warning' : 'Alert'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key Insights - Only show if there are issues */}
            {serviceProfitability.some(s => s.healthStatus === 'alert' || s.healthStatus === 'warning') && (
              <div className="bg-muted/50 border border-accent/50 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-3">Key Insights</h4>
                <div className="space-y-2">
                  {serviceProfitability.map((service, idx) => {
                    if (service.healthStatus === 'alert' || service.healthStatus === 'warning') {
                      return (
                        <div key={idx} className="text-sm text-foreground">
                          <span className="font-semibold text-accent">{service.serviceName}</span>: {service.recommendation}
                        </div>
                      );
                    }
                    return null;
                  }).filter(Boolean)}
                </div>
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground italic">
                    Disclaimer: Based on filtered period only and may not accurately reflect a full YTD picture or the seasonality flow of the service.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
