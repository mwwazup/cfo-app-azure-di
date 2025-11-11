import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Target, CheckCircle, Filter, Briefcase } from 'lucide-react';
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
  avgRevenuePerDay: number;
  avgJobsPerDay: number;
  avgProfitMargin: number;
  avgLER: number;
  
  // Bonus Effectiveness
  avgBonusAmount: number;
  qualificationRate: number;
  bonusDaysCount: number;
  totalWorkDays: number;
  
  // Trends
  trends: TrendData[];
  
  // Service-Level Bonus Impact
  serviceProfitability: ServiceProfitability[];
}

export function BonusROIAnalysisPage() {
  const { dbUserId } = useAuthContext();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ytd' | 'all'>('ytd');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<BonusMetrics | null>(null);

  // Fetch bonus metrics from API
  useEffect(() => {
    if (!dbUserId) return;
    
    const fetchBonusMetrics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          userId: dbUserId,
          year: selectedYear.toString(),
          ...(selectedMonth !== 'ytd' && selectedMonth !== 'all' && { month: selectedMonth.toString() })
        });

        const response = await fetch(`http://localhost:8000/api/bonus-roi-analysis?${params}`);
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

    // Qualification rate
    if (metrics.qualificationRate > 80) {
      insights.push(`${metrics.qualificationRate.toFixed(0)}% qualification rate suggests the threshold may be too easy.`);
    } else if (metrics.qualificationRate < 30) {
      insights.push(`${metrics.qualificationRate.toFixed(0)}% qualification rate suggests the threshold may be too difficult.`);
    } else {
      insights.push(`${metrics.qualificationRate.toFixed(0)}% qualification rate is in a healthy range.`);
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
              {selectedMonth === 'ytd' ? 'Year to Date' : selectedMonth === 'all' ? 'All Time' : new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long' })}
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
                  if (value === 'ytd' || value === 'all') {
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
                  <SelectItem value="all">All Time</SelectItem>
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
          {/* Bonus Cost Analysis */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Bonus Cost Analysis</h2>
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
                        Total bonus cost
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-orange-500/20">
                      <TrendingDown className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-orange-600 dark:text-orange-400">% of Revenue</p>
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
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">% of Gross Profit</p>
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
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Avg LER</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {metrics.avgLER.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Labor efficiency
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
                      <p className="text-sm text-green-600 dark:text-green-400">Revenue/Day</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${Math.round(metrics.avgRevenuePerDay).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Per work day
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
                    <div className="flex-1">
                      <p className="text-sm text-purple-600 dark:text-purple-400">Jobs/Day</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {metrics.avgJobsPerDay.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Per work day
                      </p>
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
            <h2 className="text-xl font-semibold text-foreground mb-4">Bonus Effectiveness</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-indigo-500/20">
                      <DollarSign className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">Avg Bonus Amount</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        ${Math.round(metrics.avgBonusAmount).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        Per qualifying day - is this motivating?
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg bg-pink-500/20">
                      <Target className="h-5 w-5 text-pink-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-pink-600 dark:text-pink-400">Qualification Rate</p>
                      <div className="text-2xl font-bold text-foreground mt-1">
                        {metrics.qualificationRate.toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {metrics.bonusDaysCount} of {metrics.totalWorkDays} days - is threshold right?
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        <th className="text-right py-3 px-4 font-semibold text-red-600 dark:text-red-400">Total Bonuses</th>
                        <th className="text-right py-3 px-4 font-semibold text-red-600 dark:text-red-400">Bonus % of Revenue</th>
                        <th className="text-right py-3 px-4 font-semibold text-accent">Net Margin After Bonus</th>
                        <th className="text-right py-3 px-4 font-semibold text-foreground">Avg Profit/Job</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Action Needed?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.serviceProfitability.map((service, index) => {
                        // Determine health status
                        let healthColor = 'text-green-600 dark:text-green-400';
                        let recommendation = 'Profitable - maintain';
                        
                        if (service.netMarginAfterBonus < 0) {
                          healthColor = 'text-red-600 dark:text-red-400';
                          recommendation = 'LOSING MONEY - raise prices or adjust bonus';
                        } else if (service.netMarginAfterBonus < 15) {
                          healthColor = 'text-orange-600 dark:text-orange-400';
                          recommendation = 'Thin margins - consider price increase';
                        } else if (service.bonusAsPercentOfRevenue > 10) {
                          healthColor = 'text-yellow-600 dark:text-yellow-400';
                          recommendation = 'High bonus cost - review threshold';
                        }
                        
                        return (
                          <tr key={index} className="border-b border-border hover:bg-muted/20">
                            <td className="py-3 px-4 font-medium text-foreground">{service.serviceName}</td>
                            <td className="py-3 px-4 text-right text-muted">{service.jobs}</td>
                            <td className="py-3 px-4 text-right text-foreground">
                              ${Math.round(service.revenue).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-foreground">
                              {service.grossMargin.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400 font-medium">
                              ${Math.round(service.totalBonuses).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                              {service.bonusAsPercentOfRevenue.toFixed(1)}%
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${healthColor}`}>
                              {service.netMarginAfterBonus.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-right text-foreground">
                              ${Math.round(service.avgProfitPerJob).toLocaleString()}
                            </td>
                            <td className={`py-3 px-4 text-sm ${healthColor}`}>
                              {recommendation}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

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
        </>
      )}
    </div>
  );
}
