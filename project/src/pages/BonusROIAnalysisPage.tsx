import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Target, CheckCircle, Filter, Briefcase, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuthContext } from '../contexts/auth-context';

interface TrendData {
  date: string;
  avgLER: number;
  totalRevenue: number;
  totalJobs: number;
  avgRevenuePerTech: number;
  avgJobsPerTech: number;
  profitMargin: number;
  totalBonuses: number;
}

interface ServiceProfitability {
  serviceName: string;
  revenue: number;
  jobs: number;
  grossProfit: number;
  grossMargin: number;
  totalBonuses: number;
  netProfitAfterBonus: number;
  netMarginAfterBonus: number;
  bonusAsPercentOfRevenue: number;
  bonusAsPercentOfProfit: number;
  avgRevenuePerJob: number;
  avgBonusPerJob: number;
  avgProfitPerJob: number;
}

interface BonusMetrics {
  // Bonus Cost Analysis
  totalBonusesPaid: number;
  bonusAsPercentOfRevenue: number;
  bonusAsPercentOfGrossProfit: number;
  
  // Performance Metrics
  totalRevenue: number;
  totalGrossProfit: number;
  netProfitAfterBonuses: number;
  profitMarginAfterBonuses: number;
  totalEmployeeDays: number;
  uniqueWorkDates: number;
  avgRevenuePerEmployeeDay: number;
  avgJobsPerEmployeeDay: number;
  avgProfitMargin: number;
  avgLER: number;
  
  // Compensation Metrics
  totalHours: number;
  avgHourlyRateWithBonuses: number;
  avgBonusAmount: number;
  bonusDaysCount: number;
  
  // Trends
  trends: TrendData[];
  
  // Service-Level Bonus Impact
  serviceProfitability: ServiceProfitability[];
}

export function BonusROIAnalysisPage() {
  const { dbUserId } = useAuthContext();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ytd'>('ytd');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<BonusMetrics | null>(null);
  
  // UI State
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);
  
  // What-If Simulator State
  const [selectedService, setSelectedService] = useState<string>('');
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(25);

  // Fetch bonus metrics from API
  useEffect(() => {
    if (!dbUserId) return;
    
    const fetchBonusMetrics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          userId: dbUserId,
          year: selectedYear.toString(),
          ...(selectedMonth !== 'ytd' && { month: selectedMonth.toString() })
        });

        const response = await fetch(`http://localhost:8000/api/bonus-roi-analysis?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          throw new Error(`API Error: ${JSON.stringify(errorData)}`);
        }
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching bonus metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBonusMetrics();
  }, [dbUserId, selectedYear, selectedMonth]);

  // Calculate health check verdict
  const healthCheck = useMemo(() => {
    if (!metrics) return null;

    const profitMargin = metrics.profitMarginAfterBonuses;
    const bonusQualifyRate = metrics.bonusDaysCount > 0 ? (metrics.bonusDaysCount / metrics.totalEmployeeDays * 100) : 0;
    const avgBonusAmount = metrics.avgBonusAmount;

    let verdict: 'good' | 'needs-attention' | 'urgent' = 'good';
    let message = '';
    let action = '';

    if (profitMargin < 15) {
      verdict = 'urgent';
      message = 'Your bonus program is eating too much profit';
      action = 'Review pricing immediately - you need healthier margins';
    } else if (profitMargin < 20) {
      verdict = 'needs-attention';
      message = 'Profit margins are thin after bonuses';
      action = 'Consider small price increases on key services';
    } else if (bonusQualifyRate < 30 && avgBonusAmount < 50) {
      verdict = 'needs-attention';
      message = 'Techs rarely qualify for bonuses';
      action = 'Review if your 25% threshold is too difficult to hit';
    } else if (metrics.bonusAsPercentOfRevenue > 12) {
      verdict = 'needs-attention';
      message = 'Bonus costs are high';
      action = 'Consider if techs are qualifying too easily';
    } else {
      verdict = 'good';
      message = 'Your bonus program is working well';
      action = 'Keep monitoring service-level profitability';
    }

    return { verdict, message, action };
  }, [metrics]);

  // Calculate priority actions
  const priorityActions = useMemo(() => {
    if (!metrics || !metrics.serviceProfitability || metrics.serviceProfitability.length === 0) return [];

    const actions = metrics.serviceProfitability.map(service => {
      const targetMargin = 25;
      const currentMargin = service.netMarginAfterBonus;
      
      if (currentMargin >= targetMargin) return null;

      const currentRevenue = service.revenue;
      const currentGrossProfit = service.grossProfit;
      const currentBonuses = service.totalBonuses;
      const jobs = service.jobs;

      const targetNetProfit = (currentRevenue * targetMargin / 100);
      const neededGrossProfit = targetNetProfit + currentBonuses;
      const neededRevenue = (neededGrossProfit / currentGrossProfit) * currentRevenue;
      const priceIncreaseNeeded = (neededRevenue - currentRevenue) / jobs;
      const monthlyImpact = targetNetProfit - (service.netProfitAfterBonus);

      const revenueImpact = currentRevenue;
      const dollarImprovement = monthlyImpact;
      const urgencyScore = currentMargin < 15 ? 40 : currentMargin < 25 ? 20 : 0;

      const priorityScore = (revenueImpact / 1000 * 0.4) + (dollarImprovement * 0.4) + urgencyScore;

      return {
        service: service.serviceName,
        currentMargin,
        priceIncrease: priceIncreaseNeeded,
        targetMargin,
        monthlyImpact,
        jobs,
        priorityScore,
        isUrgent: currentMargin < 25
      };
    }).filter(a => a !== null) as Array<{
      service: string;
      currentMargin: number;
      priceIncrease: number;
      targetMargin: number;
      monthlyImpact: number;
      jobs: number;
      priorityScore: number;
      isUrgent: boolean;
    }>;

    return actions.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3);
  }, [metrics]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!metrics) return [];

    const insights: string[] = [];

    // Bonus cost as % of revenue
    if (metrics.bonusAsPercentOfRevenue > 10) {
      insights.push(`Bonuses are ${metrics.bonusAsPercentOfRevenue.toFixed(1)}% of revenue - this is high. Consider if the threshold is too easy.`);
    } else if (metrics.bonusAsPercentOfRevenue > 5) {
      insights.push(`Bonuses are ${metrics.bonusAsPercentOfRevenue.toFixed(1)}% of revenue - healthy incentive level.`);
    } else {
      insights.push(`Bonuses are ${metrics.bonusAsPercentOfRevenue.toFixed(1)}% of revenue - consider if this is enough motivation.`);
    }

    // Bonus cost as % of gross profit
    if (metrics.bonusAsPercentOfGrossProfit > 20) {
      insights.push(`Bonuses consume ${metrics.bonusAsPercentOfGrossProfit.toFixed(1)}% of gross profit - significant impact on profitability.`);
    } else if (metrics.bonusAsPercentOfGrossProfit > 10) {
      insights.push(`Bonuses are ${metrics.bonusAsPercentOfGrossProfit.toFixed(1)}% of gross profit - moderate impact.`);
    } else {
      insights.push(`Bonuses are ${metrics.bonusAsPercentOfGrossProfit.toFixed(1)}% of gross profit - low impact on profitability.`);
    }

    // LER efficiency
    if (metrics.avgLER < 25) {
      insights.push(`Average LER of ${metrics.avgLER.toFixed(1)}% shows excellent efficiency.`);
    } else if (metrics.avgLER < 35) {
      insights.push(`Average LER of ${metrics.avgLER.toFixed(1)}% is within target range.`);
    } else {
      insights.push(`Average LER of ${metrics.avgLER.toFixed(1)}% indicates room for efficiency improvement.`);
    }

    // Average bonus amount
    if (metrics.avgBonusAmount > 100) {
      insights.push(`Average bonus of $${metrics.avgBonusAmount.toFixed(0)} per qualifying day is meaningful and motivating.`);
    } else if (metrics.avgBonusAmount > 50) {
      insights.push(`Average bonus of $${metrics.avgBonusAmount.toFixed(0)} per qualifying day provides moderate motivation.`);
    } else if (metrics.avgBonusAmount > 0) {
      insights.push(`Average bonus of $${metrics.avgBonusAmount.toFixed(0)} per qualifying day may not be motivating enough.`);
    }

    // Profit margin after bonuses
    if (metrics.profitMarginAfterBonuses > 30) {
      insights.push(`${metrics.profitMarginAfterBonuses.toFixed(1)}% profit margin after bonuses - excellent profitability maintained.`);
    } else if (metrics.profitMarginAfterBonuses > 20) {
      insights.push(`${metrics.profitMarginAfterBonuses.toFixed(1)}% profit margin after bonuses - healthy profitability.`);
    } else if (metrics.profitMarginAfterBonuses > 10) {
      insights.push(`${metrics.profitMarginAfterBonuses.toFixed(1)}% profit margin after bonuses - consider price increases or bonus structure adjustments.`);
    } else {
      insights.push(`${metrics.profitMarginAfterBonuses.toFixed(1)}% profit margin after bonuses - urgent: review pricing and bonus structure.`);
    }
    
    // Hourly rate with bonuses
    if (metrics.avgHourlyRateWithBonuses > 25) {
      insights.push(`$${metrics.avgHourlyRateWithBonuses.toFixed(2)}/hr with bonuses - competitive compensation.`);
    } else if (metrics.avgHourlyRateWithBonuses > 20) {
      insights.push(`$${metrics.avgHourlyRateWithBonuses.toFixed(2)}/hr with bonuses - moderate compensation level.`);
    } else {
      insights.push(`$${metrics.avgHourlyRateWithBonuses.toFixed(2)}/hr with bonuses - may need to increase to retain talent.`);
    }

    return insights;
  }, [metrics]);

  if (!dbUserId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">Please sign in to view bonus analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bonus Program Analysis</h1>
          <p className="text-muted mt-2">
            Evaluate bonus costs, performance trends, and program effectiveness
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <span>Analyzing:</span>
            <span className="font-medium text-foreground">
              {selectedMonth === 'ytd' ? 'Year to Date' : new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long' })}
            </span>
            <span className="font-medium text-foreground">{selectedYear}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(Number(value))}
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

            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-accent" />
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => {
                  if (value === 'ytd') {
                    setSelectedMonth(value);
                  } else {
                    setSelectedMonth(Number(value));
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(2024, i).toLocaleDateString('en-US', { month: 'long' });
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
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted">Loading bonus analysis...</p>
        </div>
      ) : !metrics ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted">No bonus data available for this period.</p>
        </div>
      ) : (
        <>
          {/* Bonus Program Health Check */}
          {healthCheck && (
            <Card className={`border-2 ${
              healthCheck.verdict === 'urgent' ? 'border-red-600 bg-red-600/10' :
              healthCheck.verdict === 'needs-attention' ? 'border-yellow-600 bg-yellow-600/10' :
              'border-green-600 bg-green-600/10'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    healthCheck.verdict === 'urgent' ? 'bg-red-600/20' :
                    healthCheck.verdict === 'needs-attention' ? 'bg-yellow-600/20' :
                    'bg-green-600/20'
                  }`}>
                    {healthCheck.verdict === 'urgent' ? (
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    ) : healthCheck.verdict === 'needs-attention' ? (
                      <AlertCircle className="h-6 w-6 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold ${
                      healthCheck.verdict === 'urgent' ? 'text-red-600' :
                      healthCheck.verdict === 'needs-attention' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {healthCheck.verdict === 'urgent' ? 'URGENT' :
                       healthCheck.verdict === 'needs-attention' ? 'NEEDS ATTENTION' :
                       'PROGRAM HEALTHY'}
                    </h3>
                    <p className="text-foreground text-base font-medium mt-1">
                      {healthCheck.message}
                    </p>
                    <p className="text-muted text-sm mt-2">
                      {healthCheck.action}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* The Big Picture */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">The Big Picture</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-red-500/20">
                      <DollarSign className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-red-600 dark:text-red-400">Total Bonuses Paid</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${Math.round(metrics.totalBonusesPaid).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        What you paid out in bonuses
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-green-600 dark:text-green-400">Total Profit You Kept</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${Math.round(metrics.netProfitAfterBonuses).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Your profit after all bonuses
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex-1">
                    <p className="text-sm text-accent font-semibold mb-3">Revenue Breakdown</p>
                    <p className="text-xs text-muted mb-2">For every $100 of revenue:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted">Techs earn in bonuses</span>
                        <span className="font-bold text-foreground">
                          ${((metrics.totalBonusesPaid / metrics.totalRevenue) * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Company keeps in profit</span>
                        <span className="font-bold text-green-600">
                          ${((metrics.netProfitAfterBonuses / metrics.totalRevenue) * 100).toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted mt-3">
                      {metrics.profitMarginAfterBonuses >= 20 ? 
                        'Healthy profit per dollar' :
                        metrics.profitMarginAfterBonuses >= 15 ?
                        'Acceptable profit margin' :
                        'Thin profit margin - consider price increases'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Is It Fair To You And Your Techs? */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Is It Fair To You And Your Techs?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-600 dark:text-blue-400">How Often Techs Earn Bonuses</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {metrics.bonusDaysCount > 0 ? ((metrics.bonusDaysCount / metrics.totalEmployeeDays) * 100).toFixed(0) : 0}%
                      </div>
                      <p className="text-xs text-muted mt-1">
                        of working days qualify for bonuses
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-green-600 dark:text-green-400">Avg Bonus Per Qualifying Day</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${Math.round(metrics.avgBonusAmount).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        when they do qualify - is this motivating?
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-purple-500/20">
                      <TrendingUp className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-purple-600 dark:text-purple-400">Avg Hourly Pay With Bonuses</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${metrics.avgHourlyRateWithBonuses.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        total compensation per hour worked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Metrics - Collapsible */}
          <div>
            <button
              onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
              className="flex items-center gap-2 text-foreground hover:text-accent transition-colors mb-4"
            >
              <h2 className="text-xl font-semibold">Detailed Metrics</h2>
              {showDetailedMetrics ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {showDetailedMetrics && (
              <>
                {/* Performance Metrics */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-blue-500/20">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-blue-600 dark:text-blue-400">Revenue/Employee-Day</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              ${metrics.avgRevenuePerEmployeeDay.toFixed(0)}
                            </div>
                            <p className="text-xs text-muted mt-1">avg per employee working day</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-green-500/20">
                            <DollarSign className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-green-600 dark:text-green-400">Avg LER</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              {metrics.avgLER.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted mt-1">
                              Labor Efficiency Ratio
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-purple-500/20">
                            <Briefcase className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-purple-600 dark:text-purple-400">Jobs/Employee-Day</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              {metrics.avgJobsPerEmployeeDay.toFixed(1)}
                            </div>
                            <p className="text-xs text-muted mt-1">avg per employee working day</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-teal-500/20">
                            <TrendingUp className="h-5 w-5 text-teal-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-teal-600 dark:text-teal-400">Profit Margin</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              {metrics.avgProfitMargin.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted mt-1">
                              Before bonuses
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Bonus Effectiveness */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Bonus Effectiveness</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-orange-500/20">
                            <DollarSign className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-orange-600 dark:text-orange-400">Bonus % of Revenue</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              {metrics.bonusAsPercentOfRevenue.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted mt-1">
                              Bonus cost vs revenue
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-yellow-500/20">
                            <Target className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">Bonus % of Gross Profit</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              {metrics.bonusAsPercentOfGrossProfit.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted mt-1">
                              Impact on profitability
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-pink-500/20">
                            <TrendingUp className="h-5 w-5 text-pink-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-pink-600 dark:text-pink-400">Profit Margin After Bonuses</p>
                            <div className="text-2xl font-bold text-foreground mt-1">
                              {metrics.profitMarginAfterBonuses.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted mt-1">
                              Net profit margin after all bonus costs
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* LER Trend */}
          <Card>
            <CardHeader>
              <CardTitle>LER Trend - Are Techs Getting More Efficient?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      label={{ value: 'LER %', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'LER']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgLER" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      name="Average LER"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Service Profitability Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Service Profitability with Bonus Impact
              </CardTitle>
              <p className="text-sm text-muted mt-1">
                How do bonuses affect profitability per service? Should you adjust pricing or bonus structure by service?
              </p>
            </CardHeader>
            <CardContent>
              {metrics.serviceProfitability.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <p>No service breakdown data available.</p>
                  <p className="text-sm mt-2">Service data is tracked in daily records starting from recent pay periods.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Service</th>
                        <th className="text-right py-3 px-4 font-semibold text-foreground">Jobs</th>
                        <th className="text-right py-3 px-4 font-semibold text-foreground">Revenue</th>
                        <th className="text-right py-3 px-4 font-semibold text-foreground">Gross Margin</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground">Bonus Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-red-600 dark:text-red-400">Total Bonuses</th>
                        <th className="text-right py-3 px-4 font-semibold text-accent">Net Margin After Bonus</th>
                        <th className="text-right py-3 px-4 font-semibold text-foreground">Avg Profit/Job</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.serviceProfitability.map((service, index) => {
                        const isExpanded = expandedServices.has(service.serviceName);
                        const qualifiesForBonus = service.grossMargin >= 25;
                        
                        const targetMargin = 25;
                        const currentRevenue = service.revenue;
                        const currentGrossProfit = service.grossProfit;
                        const currentBonuses = service.totalBonuses;
                        const jobs = service.jobs;
                        const currentPricePerJob = currentRevenue / jobs;
                        
                        const targetNetProfit = (currentRevenue * targetMargin / 100);
                        const neededGrossProfit = targetNetProfit + currentBonuses;
                        const neededRevenue = (neededGrossProfit / currentGrossProfit) * currentRevenue;
                        const priceIncreaseNeeded = (neededRevenue - currentRevenue) / jobs;
                        const profitIncrease = priceIncreaseNeeded * (currentGrossProfit / currentRevenue);
                        const monthlyImpact = profitIncrease * jobs;
                        
                        return (
                          <React.Fragment key={service.serviceName}>
                            <tr 
                              key={index} 
                              className="border-b border-border hover:bg-muted/20 cursor-pointer"
                              onClick={() => {
                                const newSet = new Set(expandedServices);
                                if (isExpanded) {
                                  newSet.delete(service.serviceName);
                                } else {
                                  newSet.add(service.serviceName);
                                }
                                setExpandedServices(newSet);
                              }}
                            >
                              <td className="py-3 px-4 font-medium text-foreground">{service.serviceName}</td>
                              <td className="py-3 px-4 text-right text-muted">{service.jobs}</td>
                              <td className="py-3 px-4 text-right text-foreground">
                                ${Math.round(service.revenue).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-foreground">
                                {service.grossMargin.toFixed(1)}%
                              </td>
                              <td className="py-3 px-4 text-center">
                                {qualifiesForBonus ? (
                                  <span className="text-green-600 font-medium flex items-center justify-center gap-1">
                                    Qualifies <CheckCircle className="h-4 w-4" />
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-medium">Below Threshold</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">
                                ${Math.round(service.totalBonuses).toLocaleString()}
                              </td>
                              <td className={`py-3 px-4 text-right font-bold ${
                                service.netMarginAfterBonus >= 25 ? 'text-green-600 dark:text-green-400' :
                                service.netMarginAfterBonus >= 15 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {service.netMarginAfterBonus.toFixed(1)}%
                              </td>
                              <td className="py-3 px-4 text-right text-foreground">
                                ${Math.round(service.avgProfitPerJob).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isExpanded ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${index}-expanded`}>
                                <td colSpan={9} className="bg-muted/10 p-6 border-b border-border">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-accent" />
                                        What's Happening
                                      </h4>
                                      <p className="text-sm text-muted leading-relaxed">
                                        {qualifiesForBonus ? (
                                          <>
                                            Techs are earning bonuses with {service.serviceName}. The gross margin is {service.grossMargin.toFixed(1)}%, 
                                            which meets the 25% threshold required for bonus qualification.
                                            {service.netMarginAfterBonus < 15 && (
                                              <> However, after paying bonuses, your net margin is only {service.netMarginAfterBonus.toFixed(1)}%, 
                                              which is thin. Consider if the pricing allows for both fair tech bonuses and healthy company profit.</>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            Techs are not earning bonuses with {service.serviceName}. The gross margin is {service.grossMargin.toFixed(1)}%, 
                                            below the 25% threshold needed for bonuses. This might be due to the average ticket price being lower 
                                            (${currentPricePerJob.toFixed(0)}/job) or it could be a service techs don't enjoy doing. 
                                            Evaluate if it's a pricing issue or a motivation issue.
                                          </>
                                        )}
                                      </p>
                                    </div>
                                    
                                    {!qualifiesForBonus && priceIncreaseNeeded > 0 && (
                                      <div>
                                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                          <Target className="h-4 w-4 text-accent" />
                                          What To Do
                                        </h4>
                                        <ul className="text-sm text-foreground space-y-1 leading-relaxed">
                                          <li>• Raise prices by ${Math.round(priceIncreaseNeeded)}/job to get to {targetMargin}% margin</li>
                                          <li>• Techs would qualify for bonuses (happier team)</li>
                                          <li>• You'd make ${Math.round(profitIncrease)} more per job</li>
                                          <li>• Total monthly impact: +${Math.round(monthlyImpact).toLocaleString()} profit (based on {jobs} jobs)</li>
                                        </ul>
                                      </div>
                                    )}

                                    {qualifiesForBonus && service.netMarginAfterBonus < 20 && (
                                      <div>
                                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                          <Target className="h-4 w-4 text-accent" />
                                          What To Do
                                        </h4>
                                        <ul className="text-sm text-foreground space-y-1 leading-relaxed">
                                          <li>• Consider a small price increase to improve your net margin</li>
                                          <li>• Current net margin ({service.netMarginAfterBonus.toFixed(1)}%) is acceptable but could be healthier</li>
                                          <li>• Target: 20-25% net margin for sustainable growth</li>
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What To Do This Week */}
          {priorityActions.length > 0 && (
            <Card className="border-2 border-accent/50 bg-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-accent" />
                  What To Do This Week
                </CardTitle>
                <p className="text-sm text-muted mt-1">
                  Based on your numbers, here are your top priorities to improve profitability
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priorityActions.map((action, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border ${
                        action.isUrgent ? 'border-red-600 bg-red-600/10' : 'border-accent/30 bg-muted/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          action.isUrgent ? 'bg-red-600 text-white' : 'bg-accent text-background'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold text-base mb-2 ${
                            action.isUrgent ? 'text-red-600' : 'text-foreground'
                          }`}>
                            {action.isUrgent && 'URGENT: '}
                            Raise {action.service} prices by ${Math.round(action.priceIncrease)}/job
                          </h4>
                          <div className="space-y-1 text-sm text-foreground">
                            <p>
                              <span className="text-muted">Currently:</span> {action.currentMargin < 25 ? 
                                `No bonuses earned (${action.currentMargin.toFixed(1)}% margin)` :
                                `Barely profitable (${action.currentMargin.toFixed(1)}% margin after bonuses)`
                              }
                            </p>
                            <p>
                              <span className="text-muted">After increase:</span> {action.currentMargin < 25 ?
                                `Techs qualify for bonuses (${action.targetMargin}% margin)` :
                                `Healthier ${action.targetMargin}% margin`
                              }
                            </p>
                            <p className="font-semibold text-green-600">
                              Monthly impact: +${Math.round(action.monthlyImpact).toLocaleString()} profit ({action.jobs} jobs)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-accent" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg">
                    <div className="text-sm text-foreground">{insight}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What-If Bonus Structure Simulator */}
          {metrics.serviceProfitability.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Target className="h-5 w-5 text-accent" />
                  What-If Bonus Structure Simulator
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Model price adjustments to maintain profitability with your bonus structure
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Service Selector */}
                  <div className="bg-card/50 rounded-lg p-4 border border-border">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Service to Analyze
                    </label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {metrics.serviceProfitability.map((service) => (
                          <SelectItem key={service.serviceName} value={service.serviceName}>
                            {service.serviceName} (Current: {service.netMarginAfterBonus.toFixed(1)}% margin)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedService && (() => {
                    const service = metrics.serviceProfitability.find(s => s.serviceName === selectedService);
                    if (!service) return null;

                    // Calculate what-if scenarios
                    const currentRevenue = service.revenue;
                    const currentBonuses = service.totalBonuses;
                    const currentGrossProfit = service.grossProfit;
                    const currentNetMargin = service.netMarginAfterBonus;
                    const jobs = service.jobs;
                    const currentPricePerJob = currentRevenue / jobs;

                    // Scenario with price adjustment (now in dollars)
                    const adjustedPricePerJob = currentPricePerJob + priceAdjustment;
                    const adjustedRevenue = adjustedPricePerJob * jobs;
                    const adjustedGrossProfit = currentGrossProfit * (adjustedRevenue / currentRevenue); // Assumes COGS stays same
                    const adjustedNetProfit = adjustedGrossProfit - currentBonuses;
                    const adjustedNetMargin = (adjustedNetProfit / adjustedRevenue * 100);
                    const percentageChange = ((adjustedPricePerJob - currentPricePerJob) / currentPricePerJob * 100);

                    // Calculate price increase needed to hit target margin
                    const targetNetProfit = (currentRevenue * targetMargin / 100) + currentBonuses;
                    const neededGrossProfit = targetNetProfit + currentBonuses;
                    const neededRevenue = (neededGrossProfit / currentGrossProfit) * currentRevenue;
                    const priceIncreaseNeeded = ((neededRevenue - currentRevenue) / currentRevenue * 100);
                    const dollarIncreaseNeeded = (neededRevenue - currentRevenue) / jobs;

                    // Calculate slider range based on current price
                    const minDollarChange = Math.round(-currentPricePerJob * 0.3); // -30% max decrease
                    const maxDollarChange = Math.round(currentPricePerJob * 0.5); // +50% max increase
                    const step = Math.max(1, Math.round(currentPricePerJob / 100)); // 1% increments

                    return (
                      <>
                        {/* Price Adjustment Slider */}
                        <div className="bg-card/50 rounded-lg p-4 border border-border">
                          <label className="block text-sm font-medium text-foreground mb-3">
                            <div className="flex items-center justify-between">
                              <span>Price Adjustment per Job</span>
                              <span className="text-accent font-bold">
                                {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                              </span>
                            </div>
                          </label>
                          <input
                            type="range"
                            min={minDollarChange}
                            max={maxDollarChange}
                            step={step}
                            value={priceAdjustment}
                            onChange={(e) => setPriceAdjustment(parseFloat(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg cursor-pointer accent-accent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span className="font-medium">${minDollarChange}</span>
                            <span className="font-medium">$0</span>
                            <span className="font-medium">+${maxDollarChange}</span>
                          </div>
                          <div className="text-center mt-2">
                            <span className="text-sm font-bold text-foreground">
                              {priceAdjustment > 0 ? '+' : ''}{priceAdjustment < 0 ? priceAdjustment : `$${priceAdjustment}`} per job
                            </span>
                          </div>
                        </div>

                        {/* Target Margin Selector */}
                        <div className="bg-card/50 rounded-lg p-4 border border-border">
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Target Profit Margin: {targetMargin}%
                          </label>
                          <div className="flex gap-2">
                            {[15, 20, 25, 30, 35].map(margin => (
                              <button
                                key={margin}
                                onClick={() => setTargetMargin(margin)}
                                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                                  targetMargin === margin
                                    ? 'bg-accent text-background'
                                    : 'bg-muted text-foreground hover:bg-muted/80'
                                }`}
                              >
                                {margin}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Results */}
                        <div className="bg-card/50 rounded-lg p-6 border border-border">
                          <h3 className="text-lg font-semibold text-foreground mb-4">Scenario Results</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Current State */}
                            <div className="bg-muted/50 rounded-lg p-4 border border-border">
                              <p className="text-xs text-muted-foreground mb-2">Current State</p>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-foreground">Avg Price/Job:</span>
                                  <span className="text-sm font-bold text-foreground">${(currentRevenue / jobs).toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-foreground">Net Margin:</span>
                                  <span className={`text-sm font-bold ${currentNetMargin >= 25 ? 'text-green-500' : currentNetMargin >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {currentNetMargin.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-foreground">Profit/Job:</span>
                                  <span className="text-sm font-bold text-foreground">${service.avgProfitPerJob.toFixed(0)}</span>
                                </div>
                              </div>
                            </div>

                            {/* With Adjustment */}
                            <div className="bg-muted/50 rounded-lg p-4 border border-accent/50">
                              <p className="text-xs text-muted-foreground mb-2">
                                With {priceAdjustment > 0 ? '+$' : priceAdjustment < 0 ? '-$' : '$'}{Math.abs(priceAdjustment)} per job ({percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                              </p>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-foreground">New Price/Job:</span>
                                  <span className="text-sm font-bold text-accent">${adjustedPricePerJob.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-foreground">New Margin:</span>
                                  <span className={`text-sm font-bold ${adjustedNetMargin >= 25 ? 'text-green-500' : adjustedNetMargin >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {adjustedNetMargin.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-foreground">New Profit/Job:</span>
                                  <span className="text-sm font-bold text-accent">${(adjustedNetProfit / jobs).toFixed(0)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Recommendation */}
                          <div className="bg-accent/10 border border-accent/50 rounded-lg p-4">
                            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                              <Target className="h-4 w-4 text-accent" />
                              To Hit {targetMargin}% Target Margin:
                            </h4>
                            <div className="space-y-2">
                              {priceIncreaseNeeded > 0 ? (
                                <>
                                  <p className="text-sm text-foreground">
                                    • Add <span className="font-bold text-accent">${dollarIncreaseNeeded.toFixed(0)}</span> per job ({priceIncreaseNeeded.toFixed(1)}% increase)
                                  </p>
                                  <p className="text-sm text-foreground">
                                    • New price per job: <span className="font-bold text-accent">${(neededRevenue / jobs).toFixed(0)}</span> (currently ${currentPricePerJob.toFixed(0)})
                                  </p>
                                  <p className="text-sm text-foreground">
                                    • Total additional revenue: <span className="font-bold text-accent">${(neededRevenue - currentRevenue).toFixed(0)}</span> across {jobs} jobs
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-green-500 font-medium">
                                  ✓ Already exceeding target margin! Current: {currentNetMargin.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
