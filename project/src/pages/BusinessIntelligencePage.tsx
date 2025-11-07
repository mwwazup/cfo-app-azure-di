import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, DollarSign, Calendar, BarChart3, ArrowUpRight, ArrowDownRight, Minus, X } from 'lucide-react';
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

export function BusinessIntelligencePage() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Primary filter state
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | 'ytd'>(currentMonth);
  
  // Comparison filter state (optional)
  const [comparisonYear, setComparisonYear] = useState<number | null>(null);
  const [comparisonMonth, setComparisonMonth] = useState<number | 'ytd' | null>(null);
  
  // Fetch data for primary and comparison periods
  const { revenueData: primaryData } = useServiceRevenueData(filterYear);
  const { services } = useServices(); // Get actual service data with COGS
  const { revenueData: comparisonData } = useServiceRevenueData(comparisonYear || filterYear - 1);
  const { revenueData: previousYearData } = useServiceRevenueData(filterYear - 1);
  
  // Fetch service labor data for true profitability
  const { data: serviceLaborData, loading: laborLoading } = useServiceLaborData(
    filterYear,
    filterMonth === 'ytd' ? null : filterMonth
  );
  const { hasData: hasLaborData } = useHasServiceLaborData(
    filterYear,
    filterMonth === 'ytd' ? null : filterMonth
  );

  // Calculate primary period metrics
  const primaryMetrics = useMemo(() => {
    if (filterMonth === 'ytd') {
      // YTD calculation
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
      // Single month calculation
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

  // Calculate comparison period metrics
  const comparisonMetrics = useMemo(() => {
    if (!comparisonYear || !comparisonMonth) return null;

    const dataToUse = comparisonData;

    if (comparisonMonth === 'ytd') {
      const revenue = dataToUse.reduce((total, service) => {
        const ytdRevenue = service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
        return total + ytdRevenue;
      }, 0);

      const appointments = dataToUse.reduce((total, service) => {
        const ytdAppointments = service.monthlyRevenue.reduce((sum, m) => sum + (m.appointments || 0), 0);
        return total + ytdAppointments;
      }, 0);

      return { revenue, appointments };
    } else {
      const revenue = dataToUse.reduce((total, service) => {
        const monthData = service.monthlyRevenue.find(m => m.month === comparisonMonth);
        return total + (monthData?.revenue || 0);
      }, 0);

      const appointments = dataToUse.reduce((total, service) => {
        const monthData = service.monthlyRevenue.find(m => m.month === comparisonMonth);
        return total + (monthData?.appointments || 0);
      }, 0);

      return { revenue, appointments };
    }
  }, [comparisonData, comparisonYear, comparisonMonth]);

  // Calculate percentage changes
  const revenueChange = comparisonMetrics 
    ? ((primaryMetrics.revenue - comparisonMetrics.revenue) / comparisonMetrics.revenue) * 100 
    : 0;
  const appointmentsChange = comparisonMetrics 
    ? ((primaryMetrics.appointments - comparisonMetrics.appointments) / comparisonMetrics.appointments) * 100 
    : 0;
  const avgTicketChange = comparisonMetrics && comparisonMetrics.appointments > 0
    ? (((primaryMetrics.revenue / primaryMetrics.appointments) - (comparisonMetrics.revenue / comparisonMetrics.appointments)) / (comparisonMetrics.revenue / comparisonMetrics.appointments)) * 100
    : 0;

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

      let comparisonRevenue = 0;
      let comparisonAppointments = 0;

      if (comparisonYear && comparisonMonth) {
        const compService = comparisonData.find(s => s.serviceName === service.serviceName);
        if (compService) {
          if (comparisonMonth === 'ytd') {
            comparisonRevenue = compService.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
            comparisonAppointments = compService.monthlyRevenue.reduce((sum, m) => sum + (m.appointments || 0), 0);
          } else {
            const monthData = compService.monthlyRevenue.find(m => m.month === comparisonMonth);
            comparisonRevenue = monthData?.revenue || 0;
            comparisonAppointments = monthData?.appointments || 0;
          }
        }
      }

      const revenueGrowth = comparisonRevenue > 0 
        ? ((currentRevenue - comparisonRevenue) / comparisonRevenue) * 100 
        : 0;
      const appointmentGrowth = comparisonAppointments > 0
        ? ((currentAppointments - comparisonAppointments) / comparisonAppointments) * 100
        : 0;

      return {
        serviceName: service.serviceName,
        currentRevenue,
        currentAppointments,
        revenueGrowth,
        appointmentGrowth,
        avgTicket: currentAppointments > 0 ? currentRevenue / currentAppointments : 0
      };
    }).sort((a, b) => b.currentRevenue - a.currentRevenue);
  }, [primaryData, comparisonData, filterMonth, comparisonYear, comparisonMonth]);

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

  // Job Volume & Projections
  const jobMetrics = useMemo(() => {
    // Calculate YTD jobs
    const ytdJobs = primaryData.reduce((total, service) => {
      return total + service.monthlyRevenue.reduce((sum, m) => sum + (m.appointments || 0), 0);
    }, 0);

    // Calculate average monthly jobs
    const monthsWithData = primaryData[0]?.monthlyRevenue.filter(m => m.revenue > 0).length || 0;
    const avgMonthlyJobs = monthsWithData > 0 ? Math.round(ytdJobs / monthsWithData) : 0;

    // Project annual jobs (simple: avg * 12)
    const projectedAnnualJobs = avgMonthlyJobs * 12;

    // Calculate current average ticket
    const ytdRevenue = primaryData.reduce((total, service) => {
      return total + service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
    }, 0);
    const currentAvgTicket = ytdJobs > 0 ? ytdRevenue / ytdJobs : 0;

    // Previous year comparison
    const prevYearJobs = previousYearData.reduce((total, service) => {
      return total + service.monthlyRevenue.reduce((sum, m) => sum + (m.appointments || 0), 0);
    }, 0);
    const prevYearRevenue = previousYearData.reduce((total, service) => {
      return total + service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
    }, 0);
    const prevAvgTicket = prevYearJobs > 0 ? prevYearRevenue / prevYearJobs : 0;

    return {
      ytdJobs,
      avgMonthlyJobs,
      projectedAnnualJobs,
      currentAvgTicket,
      prevYearJobs,
      prevAvgTicket,
      ticketGrowth: prevAvgTicket > 0 ? ((currentAvgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0
    };
  }, [primaryData, previousYearData]);

  // Scenario Builder State
  const [scenarioLevers, setScenarioLevers] = useState({
    priceIncrease: 0,
    upsellRate: 0,
    additionalCrews: 0,
  });

  // Service Profitability Analysis (with Labor Costs)
  const serviceProfitability = useMemo(() => {
    return serviceMixComparison.map(service => {
      // Find the actual service definition to get COGS
      const serviceDefinition = services.find(s => s.serviceName === service.serviceName);
      const cogsCostPerJob = serviceDefinition?.cogsCost ? Number(serviceDefinition.cogsCost) : 0;
      
      // Calculate total COGS based on actual appointments
      const totalCOGS = cogsCostPerJob * service.currentAppointments;
      
      // Find labor data for this service
      const laborData = serviceLaborData.find(s => s.serviceName === service.serviceName);
      const totalLaborCost = laborData?.totalLaborCost || 0;
      const totalHours = laborData?.totalHours || 0;
      
      const revenue = service.currentRevenue;
      const cogs = totalCOGS;
      const laborCost = totalLaborCost;
      
      // Gross profit (before labor)
      const grossProfit = revenue - cogs;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      
      // Net profit (after labor)
      const netProfit = revenue - cogs - laborCost;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      
      // Calculate per-job metrics
      const avgRevPerJob = service.avgTicket;
      const avgCOGSPerJob = cogsCostPerJob;
      const avgLaborPerJob = service.currentAppointments > 0 ? laborCost / service.currentAppointments : 0;
      const avgNetProfitPerJob = avgRevPerJob - avgCOGSPerJob - avgLaborPerJob;
      
      // Calculate efficiency metrics
      const laborCostPercent = revenue > 0 ? (laborCost / revenue) * 100 : 0;
      const hoursPerJob = service.currentAppointments > 0 ? totalHours / service.currentAppointments : 0;
      
      // Flags
      const hasCOGSData = cogsCostPerJob > 0;
      const hasLaborData = totalLaborCost > 0;
      
      // Determine health status based on NET margin (after labor)
      let healthStatus: 'excellent' | 'good' | 'warning' | 'danger';
      let recommendation: string;
      
      if (!hasLaborData) {
        healthStatus = 'warning';
        recommendation = 'No labor data available. Add daily records in Employee LER to see true profitability.';
      } else if (netMargin >= 40) {
        healthStatus = 'excellent';
        recommendation = 'Highly profitable after labor costs. Consider expanding this service.';
      } else if (netMargin >= 25) {
        healthStatus = 'good';
        recommendation = 'Solid net margins. Maintain quality and look for efficiency gains.';
      } else if (netMargin >= 15) {
        healthStatus = 'warning';
        recommendation = 'Acceptable but thin margins. Review labor efficiency and pricing strategy.';
      } else if (netMargin >= 0) {
        healthStatus = 'danger';
        recommendation = 'Low margins after labor. Raise prices, improve efficiency, or reduce labor costs.';
      } else {
        healthStatus = 'danger';
        recommendation = 'LOSING MONEY on this service. Immediate action required: raise prices significantly or discontinue.';
      }
      
      return {
        serviceName: service.serviceName,
        revenue,
        cogs,
        laborCost,
        grossProfit,
        grossMargin,
        netProfit,
        netMargin,
        appointments: service.currentAppointments,
        avgRevPerJob,
        avgCOGSPerJob,
        avgLaborPerJob,
        avgNetProfitPerJob,
        laborCostPercent,
        hoursPerJob,
        totalHours,
        healthStatus,
        recommendation,
        revenueShare: (revenue / primaryMetrics.revenue) * 100,
        hasCOGSData,
        hasLaborData
      };
    }).sort((a, b) => b.netMargin - a.netMargin); // Sort by NET margin descending
  }, [serviceMixComparison, services, serviceLaborData, primaryMetrics]);

  // Calculate scenario projections
  const scenarioProjections = useMemo(() => {
    const baseRevenue = ytdMetrics.currentYTD;
    const baseJobs = jobMetrics.ytdJobs;
    const baseAvgTicket = jobMetrics.currentAvgTicket;

    // Price increase impact
    const customerLossRate = scenarioLevers.priceIncrease <= 0.05 ? 0.02 
      : scenarioLevers.priceIncrease <= 0.10 ? 0.08 
      : scenarioLevers.priceIncrease <= 0.15 ? 0.15 : 0.25;
    
    const newAvgTicket = baseAvgTicket * (1 + scenarioLevers.priceIncrease);
    const remainingJobs = baseJobs * (1 - customerLossRate);
    const priceImpactRevenue = remainingJobs * newAvgTicket;
    const priceDelta = priceImpactRevenue - baseRevenue;

    // Upsell impact (gutters + pressure washing)
    const residentialJobs = baseJobs * 0.60; // Assume 60% residential
    const gutterUpsells = Math.round(residentialJobs * scenarioLevers.upsellRate);
    const pressureUpsells = Math.round(residentialJobs * scenarioLevers.upsellRate * 0.5);
    const upsellRevenue = (gutterUpsells * 240) + (pressureUpsells * 475);

    // Crew impact
    const revenuePerCrew = 260000;
    const costPerCrew = 180000;
    const jobsPerCrew = 225;
    const crewRevenue = scenarioLevers.additionalCrews * revenuePerCrew;
    const crewCosts = scenarioLevers.additionalCrews * costPerCrew;
    const crewJobs = scenarioLevers.additionalCrews * jobsPerCrew;

    // Total projections
    const totalRevenue = baseRevenue + priceDelta + upsellRevenue + crewRevenue;
    const totalJobs = remainingJobs + gutterUpsells + pressureUpsells + crewJobs;
    const totalCosts = (baseRevenue * 0.34) + crewCosts; // 34% base cost ratio
    const totalProfit = totalRevenue - totalCosts;
    const baseProfit = baseRevenue * 0.66;

    return {
      baseRevenue,
      totalRevenue,
      revenueDelta: totalRevenue - baseRevenue,
      totalJobs: Math.round(totalJobs),
      totalProfit,
      profitDelta: totalProfit - baseProfit,
      newAvgTicket,
      customerLossRate,
      upsellRevenue,
      crewRevenue,
      risks: [
        ...(customerLossRate > 0.10 ? [{
          level: 'high' as const,
          message: `${(customerLossRate * 100).toFixed(0)}% customer loss risk. Consider gradual price increases.`
        }] : []),
        ...(scenarioLevers.additionalCrews > 0 ? [{
          level: 'medium' as const,
          message: `Need $${(crewCosts / 1000).toFixed(0)}k for ${scenarioLevers.additionalCrews} crew(s). Start recruiting 3-6 months ahead.`
        }] : []),
      ]
    };
  }, [ytdMetrics, jobMetrics, scenarioLevers]);

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getPeriodLabel = (year: number, month: number | 'ytd') => {
    if (month === 'ytd') return `YTD ${year}`;
    return `${fullMonths[(month as number) - 1]} ${year}`;
  };

  const clearComparison = () => {
    setComparisonYear(null);
    setComparisonMonth(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Cross-analysis of service performance and revenue trends
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Active Viewing Display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Viewing:</span>
              <span className="font-medium text-foreground">
                {getPeriodLabel(filterYear, filterMonth)}
              </span>
              {comparisonYear && comparisonMonth && (
                <>
                  <span>vs</span>
                  <span className="font-medium text-foreground">
                    {getPeriodLabel(comparisonYear, comparisonMonth)}
                  </span>
                </>
              )}
            </div>

            {/* Primary Period Filter */}
            <div className="flex flex-wrap items-center gap-4">
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
                <Calendar className="h-4 w-4 text-accent" />
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
            </div>

            {/* Comparison Period Filter (Optional) */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Compare To (Optional)</span>
                {comparisonYear && comparisonMonth && (
                  <button
                    onClick={clearComparison}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  <Select 
                    value={comparisonYear?.toString() || 'none'} 
                    onValueChange={(value) => {
                      if (value === 'none') {
                        setComparisonYear(null);
                        setComparisonMonth(null);
                      } else {
                        setComparisonYear(Number(value));
                        if (!comparisonMonth) {
                          setComparisonMonth(filterMonth);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
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

                {comparisonYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <Select 
                      value={comparisonMonth?.toString() || 'ytd'} 
                      onValueChange={(value) => {
                        if (value === 'ytd') {
                          setComparisonMonth('ytd');
                        } else {
                          setComparisonMonth(Number(value));
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
                )}
              </div>
            </div>
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
                  {comparisonMetrics && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${getTrendColor(revenueChange)}`}>
                      {getTrendIcon(revenueChange)}
                      <span className="font-medium">{Math.abs(revenueChange).toFixed(1)}%</span>
                    </div>
                  )}
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
                  <p className="text-sm text-muted-foreground">Appointments</p>
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {primaryMetrics.appointments}
                  </div>
                  {comparisonMetrics && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${getTrendColor(appointmentsChange)}`}>
                      {getTrendIcon(appointmentsChange)}
                      <span className="font-medium">{Math.abs(appointmentsChange).toFixed(1)}%</span>
                    </div>
                  )}
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
                  {comparisonMetrics && comparisonMetrics.appointments > 0 && (
                    <div className={`flex items-center gap-1 text-sm mt-1 ${getTrendColor(avgTicketChange)}`}>
                      {getTrendIcon(avgTicketChange)}
                      <span className="font-medium">{Math.abs(avgTicketChange).toFixed(1)}%</span>
                    </div>
                  )}
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

      {/* Revenue Trend Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            How your service mix is impacting overall revenue trajectory
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line
              data={{
                labels: fullMonths,
                datasets: [
                  // Primary Year Total Revenue
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
                    pointRadius: 5,
                    pointHoverRadius: 7,
                  },
                  // Comparison Year (if selected)
                  ...(comparisonYear ? [{
                    label: `${comparisonYear} Total Revenue`,
                    data: Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      return comparisonData.reduce((total, service) => {
                        const monthData = service.monthlyRevenue.find(m => m.month === month);
                        return total + (monthData?.revenue || 0);
                      }, 0);
                    }),
                    borderColor: 'rgb(100, 116, 139)',
                    backgroundColor: 'rgba(100, 116, 139, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                  }] : []),
                  // Top Service Overlay
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
                    pointRadius: 3,
                    pointHoverRadius: 5,
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
                  legend: {
                    display: true,
                    position: 'top',
                    labels: {
                      color: 'rgb(156, 163, 175)',
                      usePointStyle: true,
                      padding: 15,
                    },
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
          
          {/* Chart Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Peak Month</p>
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
              <p className="text-xs text-muted-foreground mb-1">Average Monthly</p>
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
              <p className="text-xs text-muted-foreground mb-1">Trend Direction</p>
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

          {/* What the Chart Shows */}
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">📊 Reading This Chart</h4>
            <ul className="text-sm text-foreground space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span><span className="font-semibold text-accent">Gold line</span> shows your total monthly revenue for {filterYear}</span>
              </li>
              {comparisonYear && (
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold">Dashed gray line</span> shows {comparisonYear} for comparison</span>
                </li>
              )}
              {serviceMixComparison.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold text-green-500">Green line</span> shows your top service ({serviceMixComparison[0].serviceName}) - see how it drives overall revenue</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>The gap between lines shows how much other services contribute to your total revenue</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Service Mix Trends */}
      {serviceMixComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Service Performance
              {comparisonYear && comparisonMonth && (
                <span className="text-sm font-normal text-muted-foreground">
                  vs {getPeriodLabel(comparisonYear, comparisonMonth)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Service</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Revenue</th>
                    {comparisonMetrics && <th className="text-right py-3 px-4 font-semibold text-foreground">Growth</th>}
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Appointments</th>
                    {comparisonMetrics && <th className="text-right py-3 px-4 font-semibold text-foreground">Appt Growth</th>}
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Avg Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceMixComparison.map((service, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-accent" />
                          <span className="text-sm font-medium text-foreground">{service.serviceName}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-sm font-semibold text-foreground">
                        ${Math.round(service.currentRevenue).toLocaleString()}
                      </td>
                      {comparisonMetrics && (
                        <td className="text-right py-3 px-4">
                          <div className={`flex items-center justify-end gap-1 text-sm ${getTrendColor(service.revenueGrowth)}`}>
                            {getTrendIcon(service.revenueGrowth)}
                            <span className="font-medium">{service.revenueGrowth > 0 ? '+' : ''}{service.revenueGrowth.toFixed(1)}%</span>
                          </div>
                        </td>
                      )}
                      <td className="text-right py-3 px-4 text-sm text-foreground">
                        {service.currentAppointments}
                      </td>
                      {comparisonMetrics && (
                        <td className="text-right py-3 px-4">
                          <div className={`flex items-center justify-end gap-1 text-sm ${getTrendColor(service.appointmentGrowth)}`}>
                            {getTrendIcon(service.appointmentGrowth)}
                            <span className="font-medium">{service.appointmentGrowth > 0 ? '+' : ''}{service.appointmentGrowth.toFixed(1)}%</span>
                          </div>
                        </td>
                      )}
                      <td className="text-right py-3 px-4 text-sm font-medium text-accent">
                        ${Math.round(service.avgTicket).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Business Story */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5 text-accent" />
            Your Business Story ({filterYear})
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            What the numbers are telling you
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Job Volume & Projections */}
            <div className="bg-card/50 rounded-lg p-4 border border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                Job Volume & Trajectory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">YTD Jobs</p>
                  <p className="text-2xl font-bold text-foreground">{jobMetrics.ytdJobs.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg: {jobMetrics.avgMonthlyJobs}/month</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projected Annual</p>
                  <p className="text-2xl font-bold text-accent">{jobMetrics.projectedAnnualJobs.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">On pace for</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Ticket</p>
                  <p className="text-2xl font-bold text-foreground">${Math.round(jobMetrics.currentAvgTicket).toLocaleString()}</p>
                  {jobMetrics.ticketGrowth !== 0 && (
                    <p className={`text-xs mt-1 ${jobMetrics.ticketGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {jobMetrics.ticketGrowth > 0 ? '+' : ''}{jobMetrics.ticketGrowth.toFixed(1)}% vs {filterYear - 1}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm space-y-2">
                {jobMetrics.ticketGrowth > 10 && (
                  <p className="text-foreground">
                    <span className="font-semibold text-green-500">Pricing Power!</span> Your average job is worth ${Math.round(jobMetrics.currentAvgTicket - jobMetrics.prevAvgTicket).toLocaleString()} more than last year. 
                    You're raising prices without losing customers - that's an extra ${Math.round((jobMetrics.currentAvgTicket - jobMetrics.prevAvgTicket) * jobMetrics.ytdJobs).toLocaleString()} just for showing up.
                  </p>
                )}
                {jobMetrics.avgMonthlyJobs > 100 && (
                  <p className="text-foreground">
                    <span className="font-semibold text-yellow-500">Capacity Watch:</span> You're doing {jobMetrics.avgMonthlyJobs} jobs/month. 
                    That's {Math.round(jobMetrics.avgMonthlyJobs / 4.3)} jobs/week. If you have 2-3 crews, you're near capacity. 
                    Consider hiring for peak season or you'll turn away revenue.
                  </p>
                )}
                <p className="text-foreground">
                  <span className="font-semibold">Projection:</span> At current pace, you'll complete <span className="text-accent font-semibold">{jobMetrics.projectedAnnualJobs} jobs</span> this year 
                  generating approximately <span className="text-accent font-semibold">${Math.round((jobMetrics.projectedAnnualJobs * jobMetrics.currentAvgTicket) / 1000).toLocaleString()}k</span> in revenue.
                </p>
              </div>
            </div>

            {/* Service Mix Dependency */}
            {serviceMixComparison.length > 0 && serviceMixComparison[0].currentRevenue / primaryMetrics.revenue > 0.5 && (
              <div className="bg-muted/50 border border-accent/50 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">Revenue Concentration Risk</h3>
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-accent">{serviceMixComparison[0].serviceName}</span> is {((serviceMixComparison[0].currentRevenue / primaryMetrics.revenue) * 100).toFixed(0)}% of your revenue. 
                  That's risky. If that market slows down, you'll feel it hard. 
                  {serviceMixComparison.length > 1 && (
                    <span> Grow <span className="font-semibold">{serviceMixComparison[1].serviceName}</span> and other services to diversify.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Builder */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="h-5 w-5 text-accent" />
            What If Scenario Builder
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Model your growth - adjust the levers to see potential outcomes
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Levers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Price Increase */}
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Price Increase: {(scenarioLevers.priceIncrease * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.20"
                  step="0.05"
                  value={scenarioLevers.priceIncrease}
                  onChange={(e) => setScenarioLevers({...scenarioLevers, priceIncrease: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-muted rounded-lg cursor-pointer accent-accent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
                {scenarioLevers.priceIncrease > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    New avg ticket: ${Math.round(scenarioProjections.newAvgTicket).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Upsell Rate */}
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upsell Rate: {(scenarioLevers.upsellRate * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.50"
                  step="0.10"
                  value={scenarioLevers.upsellRate}
                  onChange={(e) => setScenarioLevers({...scenarioLevers, upsellRate: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-muted rounded-lg cursor-pointer accent-accent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Bundle gutters + pressure washing
                </p>
              </div>

              {/* Additional Crews */}
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Additional Crews: {scenarioLevers.additionalCrews}
                </label>
                <div className="flex gap-2 mt-2">
                  {[0, 1, 2, 3].map(num => (
                    <button
                      key={num}
                      onClick={() => setScenarioLevers({...scenarioLevers, additionalCrews: num})}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        scenarioLevers.additionalCrews === num
                          ? 'bg-accent text-background'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ~225 jobs/crew, $260k revenue/crew
                </p>
              </div>
            </div>

            {/* Projections */}
            <div className="bg-card/50 rounded-lg p-6 border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Custom {filterYear + 1} Projection</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground">Projected Revenue</p>
                  <p className="text-3xl font-bold text-accent">
                    ${(scenarioProjections.totalRevenue / 1000).toFixed(0)}k
                  </p>
                  {scenarioProjections.revenueDelta !== 0 && (
                    <p className={`text-sm mt-1 ${scenarioProjections.revenueDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {scenarioProjections.revenueDelta > 0 ? '+' : ''}${(scenarioProjections.revenueDelta / 1000).toFixed(0)}k from baseline
                    </p>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground">Projected Profit</p>
                  <p className="text-3xl font-bold text-green-500">
                    ${(scenarioProjections.totalProfit / 1000).toFixed(0)}k
                  </p>
                  {scenarioProjections.profitDelta !== 0 && (
                    <p className={`text-sm mt-1 ${scenarioProjections.profitDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {scenarioProjections.profitDelta > 0 ? '+' : ''}${(scenarioProjections.profitDelta / 1000).toFixed(0)}k extra take-home
                    </p>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground">Total Jobs</p>
                  <p className="text-3xl font-bold text-foreground">
                    {scenarioProjections.totalJobs.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(scenarioProjections.totalJobs / 12)} jobs/month
                  </p>
                </div>
              </div>

              {/* Risks */}
              {scenarioProjections.risks.length > 0 && (
                <div className="bg-muted/50 border border-accent/50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <span className="text-accent">⚠️</span>
                    Watch Out For:
                  </h4>
                  <ul className="space-y-1">
                    {scenarioProjections.risks.map((risk, i) => (
                      <li key={i} className="text-sm text-foreground">• {risk.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-muted/50 border border-accent/50 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="text-accent">💡</span>
                  Smart Moves:
                </h4>
                <ul className="space-y-1 text-sm text-foreground">
                  {scenarioLevers.priceIncrease > 0.10 && (
                    <li>• Test price increase with new customers first before rolling out to existing base</li>
                  )}
                  {scenarioLevers.upsellRate > 0 && (
                    <li>• Train team on bundling: "While we're here, want us to clean your gutters too?"</li>
                  )}
                  {scenarioLevers.additionalCrews > 0 && (
                    <li>• Start recruiting 3-6 months before peak season (hire in Jan/Feb for Apr/May start)</li>
                  )}
                  {scenarioProjections.revenueDelta > 50000 && (
                    <li>• Growing fast? Ensure systems, equipment, and quality control can scale with you</li>
                  )}
                  <li>• Review these projections monthly and adjust strategy based on actual results</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Profitability Analysis */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <DollarSign className="h-5 w-5 text-accent" />
            Service Profitability Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Which services are actually making you money?
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Profitability Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gross Profit</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${Math.round(serviceProfitability.reduce((sum, s) => sum + s.grossProfit, 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <BarChart3 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Net Margin</p>
                    <p className="text-2xl font-bold text-foreground">
                      {serviceProfitability.length > 0 
                        ? (serviceProfitability.reduce((sum, s) => sum + s.netMargin, 0) / serviceProfitability.length).toFixed(1)
                        : '0'}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Most Profitable</p>
                    <p className="text-lg font-bold text-accent">
                      {serviceProfitability[0]?.serviceName.split(' ')[0] || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {serviceProfitability[0]?.netMargin.toFixed(0)}% net margin
                    </p>
                  </div>
                </div>
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
                    <th className="text-center p-3 text-sm font-medium text-foreground bg-accent/20">Net Margin %</th>
                    <th className="text-right p-3 text-sm font-medium text-foreground">Net/Job</th>
                    <th className="text-center p-3 text-sm font-medium text-foreground">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceProfitability.map((service, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{service.serviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.appointments} jobs • {service.revenueShare.toFixed(0)}% of revenue
                          </p>
                        </div>
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
                          <>
                            ${Math.round(service.laborCost).toLocaleString()}
                            <span className="block text-xs text-muted-foreground">
                              {service.totalHours.toFixed(1)}h
                            </span>
                          </>
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
                      <td className="text-right p-3 text-sm text-foreground">
                        ${Math.round(service.avgNetProfitPerJob).toLocaleString()}
                      </td>
                      <td className="text-center p-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          service.healthStatus === 'excellent' ? 'bg-green-500/20 text-green-500' :
                          service.healthStatus === 'good' ? 'bg-accent/20 text-accent' :
                          service.healthStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {service.healthStatus === 'excellent' ? '🎯 Excellent' :
                           service.healthStatus === 'good' ? '✓ Good' :
                           service.healthStatus === 'warning' ? '⚠ Warning' : '⛔ Danger'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-muted/50 border border-accent/50 rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="text-accent">💡</span>
                Action Items Based on Profitability:
              </h4>
              <div className="space-y-3">
                {serviceProfitability.map((service, idx) => {
                  if (service.healthStatus === 'danger' || service.healthStatus === 'warning') {
                    return (
                      <div key={idx} className="bg-card/50 rounded-lg p-3 border border-border">
                        <p className="text-sm font-semibold text-foreground mb-1">
                          {service.serviceName} ({service.netMargin.toFixed(0)}% net margin)
                        </p>
                        <p className="text-sm text-foreground">{service.recommendation}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {service.netMargin < 25 && (
                            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                              💰 Raise prices by 10-15%
                            </span>
                          )}
                          {service.avgNetProfitPerJob < 50 && (
                            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                              ⚡ Reduce job time/labor costs
                            </span>
                          )}
                          {service.revenueShare < 10 && service.netMargin < 20 && (
                            <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded">
                              🗑️ Consider discontinuing
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }).filter(Boolean)}
                
                {serviceProfitability.every(s => s.healthStatus === 'excellent' || s.healthStatus === 'good') && (
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-green-500">All services are profitable!</span> Focus on scaling your most profitable services and maintaining quality.
                  </p>
                )}
              </div>
            </div>

            {/* Profitability Insights */}
            <div className="bg-card/50 rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2">Understanding These Numbers</h4>
              <ul className="text-sm text-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold">COGS</span> = materials and supplies per job (does NOT include labor)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold">Labor</span> = employee wages, overtime, bonuses, and tips allocated per service</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold">Net Profit</span> = Revenue - COGS - Labor (before overhead like rent, insurance, marketing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold">Target: 25%+ net margin</span> to cover overhead and generate true profit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span><span className="font-semibold">Below 15% net margin?</span> Service is barely profitable - raise prices or improve efficiency</span>
                </li>
                {serviceProfitability.some(s => !s.hasCOGSData) && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    <span className="text-yellow-500"><span className="font-semibold">Missing COGS data?</span> Set COGS per job in Service Mix settings</span>
                  </li>
                )}
                {serviceProfitability.some(s => !s.hasLaborData) && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    <span className="text-yellow-500"><span className="font-semibold">Missing labor data?</span> Add daily records in Employee LER page to see true profitability</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What This Means - Strategic Context */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            What This Means For Your Business
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Strategic interpretation of your data
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue Health */}
            <div className="bg-card/50 rounded-lg p-4 border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Revenue Health
              </h3>
              <div className="space-y-2 text-sm text-foreground">
                {comparisonMetrics ? (
                  <>
                    {revenueChange > 10 ? (
                      <p>
                        <span className="font-semibold text-green-500">Strong growth!</span> Your revenue is up {Math.abs(revenueChange).toFixed(1)}%. 
                        This indicates healthy demand and effective operations. Focus on maintaining quality while scaling capacity.
                      </p>
                    ) : revenueChange > 0 ? (
                      <p>
                        <span className="font-semibold text-green-500">Positive momentum.</span> Revenue is up {Math.abs(revenueChange).toFixed(1)}%. 
                        You're growing steadily. Look for opportunities to accelerate by identifying what's working and doing more of it.
                      </p>
                    ) : revenueChange > -10 ? (
                      <p>
                        <span className="font-semibold text-yellow-500">Slight decline.</span> Revenue is down {Math.abs(revenueChange).toFixed(1)}%. 
                        This could be seasonal or temporary. Review your service mix and marketing efforts to identify opportunities.
                      </p>
                    ) : (
                      <p>
                        <span className="font-semibold text-red-500">Significant decline.</span> Revenue is down {Math.abs(revenueChange).toFixed(1)}%. 
                        This requires immediate attention. Analyze which services are underperforming and why. Consider market conditions, pricing, and customer feedback.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    You generated ${Math.round(primaryMetrics.revenue).toLocaleString()} in revenue. 
                    Select a comparison period to see if this is growing, declining, or stable.
                  </p>
                )}
              </div>
            </div>

            {/* Service Mix Strategy */}
            {serviceMixComparison.length > 0 && (
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  Service Mix Strategy
                </h3>
                <div className="space-y-2 text-sm text-foreground">
                  <p>
                    <span className="font-semibold text-accent">{serviceMixComparison[0].serviceName}</span> drives {((serviceMixComparison[0].currentRevenue / primaryMetrics.revenue) * 100).toFixed(0)}% of your revenue. 
                    This is your <span className="font-semibold">core business</span> - protect it, optimize it, and ensure consistent delivery.
                  </p>
                  
                  {serviceMixComparison.length > 1 && (
                    <>
                      {serviceMixComparison.slice(1, 3).map((service, idx) => {
                        const percentage = (service.currentRevenue / primaryMetrics.revenue) * 100;
                        if (percentage > 15) {
                          return (
                            <p key={idx}>
                              <span className="font-semibold text-accent">{service.serviceName}</span> ({percentage.toFixed(0)}%) is a strong secondary revenue stream. 
                              {comparisonMetrics && service.revenueGrowth > 0 
                                ? ` It's growing ${service.revenueGrowth.toFixed(0)}% - consider investing more resources here.`
                                : ' Maintain focus on this service to diversify your revenue base.'}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </>
                  )}

                  {serviceMixComparison.some(s => (s.currentRevenue / primaryMetrics.revenue) * 100 < 5) && (
                    <p className="text-muted-foreground">
                      Some services contribute less than 5% of revenue. Evaluate if they're worth the operational complexity or if you should phase them out.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Efficiency & Pricing Power */}
            {primaryMetrics.appointments > 0 && (
              <div className="bg-card/50 rounded-lg p-4 border border-border">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Efficiency & Pricing Power
                </h3>
                <div className="space-y-2 text-sm text-foreground">
                  <p>
                    Your average ticket is <span className="font-semibold text-accent">${Math.round(primaryMetrics.revenue / primaryMetrics.appointments).toLocaleString()}</span> across {primaryMetrics.appointments} appointments.
                    {comparisonMetrics && comparisonMetrics.appointments > 0 ? (
                      <>
                        {avgTicketChange > 5 ? (
                          <span> This is up {avgTicketChange.toFixed(1)}% - <span className="font-semibold text-green-500">excellent!</span> You're either raising prices successfully or selling higher-value services. Keep this momentum.</span>
                        ) : avgTicketChange > 0 ? (
                          <span> This is up {avgTicketChange.toFixed(1)}% - you're moving in the right direction. Look for more upsell opportunities.</span>
                        ) : avgTicketChange > -5 ? (
                          <span> This is down {Math.abs(avgTicketChange).toFixed(1)}%. You may be selling more lower-priced services or discounting too much. Review your pricing strategy.</span>
                        ) : (
                          <span> This is down {Math.abs(avgTicketChange).toFixed(1)}% - <span className="font-semibold text-red-500">concerning.</span> Your revenue per job is declining. This could indicate price pressure, service mix shift, or excessive discounting.</span>
                        )}
                      </>
                    ) : (
                      <span> Compare to another period to see if your pricing power is improving or declining.</span>
                    )}
                  </p>

                  {comparisonMetrics && (
                    <p>
                      {appointmentsChange > 0 && revenueChange > appointmentsChange ? (
                        <span>You're growing both volume ({appointmentsChange.toFixed(0)}% more appointments) <span className="font-semibold">and</span> value per job. This is ideal growth - you're scaling efficiently.</span>
                      ) : appointmentsChange > 0 && revenueChange < appointmentsChange ? (
                        <span>Appointments are up {appointmentsChange.toFixed(0)}% but revenue isn't keeping pace. You're working harder but not earning proportionally more. Focus on increasing ticket size through upsells or premium services.</span>
                      ) : appointmentsChange < 0 && revenueChange > appointmentsChange ? (
                        <span>Fewer appointments ({Math.abs(appointmentsChange).toFixed(0)}% down) but revenue is holding better. You're becoming more efficient - focusing on higher-value work. This can be a smart strategy if intentional.</span>
                      ) : (
                        <span>Both appointments and revenue are moving together. Your pricing is stable, but focus on growing volume to scale the business.</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Year-to-Date Trajectory */}
            <div className="bg-card/50 rounded-lg p-4 border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                Year-to-Date Trajectory
              </h3>
              <div className="space-y-2 text-sm text-foreground">
                {ytdMetrics.ytdGrowth > 0 ? (
                  <p>
                    You're up <span className="font-semibold text-green-500">{ytdMetrics.ytdGrowth.toFixed(1)}%</span> year-over-year (${Math.round(ytdMetrics.currentYTD).toLocaleString()} vs ${Math.round(ytdMetrics.previousYTD).toLocaleString()}).
                    {ytdMetrics.ytdGrowth > 20 ? (
                      <span> This is exceptional growth! You're scaling rapidly. Ensure your operations, team, and systems can support this pace.</span>
                    ) : ytdMetrics.ytdGrowth > 10 ? (
                      <span> This is strong, sustainable growth. You're building a healthy business. Focus on maintaining quality as you scale.</span>
                    ) : (
                      <span> You're growing steadily. Look for opportunities to accelerate by optimizing your best-performing services.</span>
                    )}
                  </p>
                ) : ytdMetrics.ytdGrowth < 0 ? (
                  <p>
                    You're down <span className="font-semibold text-red-500">{Math.abs(ytdMetrics.ytdGrowth).toFixed(1)}%</span> year-over-year.
                    This indicates a structural issue that needs addressing. Review market conditions, competitive pressures, service quality, and customer retention.
                  </p>
                ) : (
                  <p>
                    Revenue is flat year-over-year. While stability is good, growth is better. Identify new opportunities to expand your market or increase customer value.
                  </p>
                )}
              </div>
            </div>

            {/* Action Items */}
            {comparisonMetrics && (
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
                <h3 className="font-semibold text-foreground mb-2">🎯 Recommended Actions</h3>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {revenueChange < 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span><span className="font-semibold">Investigate decline:</span> Review which services are down and why. Talk to customers, check market conditions.</span>
                    </li>
                  )}
                  {avgTicketChange < -5 && (
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span><span className="font-semibold">Boost ticket size:</span> Train team on upselling, bundle services, or review pricing strategy.</span>
                    </li>
                  )}
                  {serviceMixComparison[0] && (serviceMixComparison[0].currentRevenue / primaryMetrics.revenue) > 0.5 && (
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span><span className="font-semibold">Diversify revenue:</span> One service is over 50% of revenue. Develop other services to reduce risk.</span>
                    </li>
                  )}
                  {revenueChange > 10 && (
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span><span className="font-semibold">Scale operations:</span> You're growing fast. Ensure you have capacity, team, and systems to maintain quality.</span>
                    </li>
                  )}
                  {appointmentsChange > 10 && avgTicketChange < 0 && (
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      <span><span className="font-semibold">Focus on value:</span> You're busy but revenue per job is declining. Prioritize higher-value work.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span><span className="font-semibold">Track weekly:</span> Review these metrics regularly to catch trends early and adjust quickly.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
