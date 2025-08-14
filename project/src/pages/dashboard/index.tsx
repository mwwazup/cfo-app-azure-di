import { useAuth } from '../../contexts/auth-context';
import { useProfile } from '../../hooks/useProfile';
import { useRevenue } from '../../contexts/revenue-context';
import { useFinancialData } from '../../hooks/useFinancialData';
import { MiniChart } from '../../components/RevenueChart/MiniChart';
import { RIDRScoringSystem } from '../../components/dashboard/RIDRScoringSystem';
import KPIDashboard from '../../components/dashboard/KPIDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  BarChart3, 
  Calendar,
  ArrowRight,
  History,
  FileText,
  Upload,
  Loader2,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { currentYear, historicalYears, selectedYear, selectYear, getYearData, isLoading, currentYearKpis } = useRevenue();
  const { statements } = useFinancialData();

  if (isLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
        <span className="ml-3 text-muted">Loading revenue data...</span>
      </div>
    );
  }

  const totalRevenue = currentYearKpis?.total_revenue ?? currentYear.data.reduce((sum, item) => sum + item.revenue, 0);
  const averageMonthly = currentYearKpis?.avg_monthly_revenue ?? Math.round(totalRevenue / 12);
  const projectedAnnual = Math.round(averageMonthly * 12);
  
  // Only show gap and completion for non-historical years
  const gapToTarget = currentYearKpis?.gap_to_target ?? (currentYear.isHistorical ? 0 : Math.round(currentYear.targetRevenue - projectedAnnual));
  const completionRate = currentYear.isHistorical ? 0 : (projectedAnnual / currentYear.targetRevenue) * 100;

  const currentMonth = new Date().getMonth();
  const monthsCompleted = currentMonth + 1;
  const actualYTD = currentYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
  
  // Only calculate YTD performance for non-historical years
  const targetYTD = currentYear.isHistorical ? 0 : (currentYear.targetRevenue / 12) * monthsCompleted;
  const ytdPerformance = currentYear.isHistorical ? 0 : (actualYTD / targetYTD) * 100;

  // Calculate year-over-year growth
  const previousYear = getYearData(selectedYear - 1);
  const previousYearTotal = previousYear.data.reduce((sum, item) => sum + item.revenue, 0);
  const yoyGrowth = previousYearTotal > 0 ? ((totalRevenue - previousYearTotal) / previousYearTotal) * 100 : 0;

  // Calculate 5-year trend
  const fiveYearData = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    const yearData = getYearData(year);
    return {
      year,
      total: yearData.data.reduce((sum, item) => sum + item.revenue, 0)
    };
  }).reverse();

  const averageGrowthRate = fiveYearData.length > 1 
    ? fiveYearData.slice(1).reduce((acc, curr, index) => {
        const prev = fiveYearData[index];
        const growth = prev.total > 0 ? ((curr.total - prev.total) / prev.total) * 100 : 0;
        return acc + growth;
      }, 0) / (fiveYearData.length - 1)
    : 0;

  // Financial statements summary
  const statementsByType = {
    profit_loss: statements.filter(s => s.statement_type === 'profit_loss').length,
    cash_flow: statements.filter(s => s.statement_type === 'cash_flow').length,
    balance_sheet: statements.filter(s => s.statement_type === 'balance_sheet').length
  };

  // Get current year data for MiniChart display
  const currentYearNum = new Date().getFullYear();
  const currentYearData = getYearData(currentYearNum);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-lg p-8 border border-accent/20">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          Welcome back, {profile?.first_name || user?.email || 'there'}!
        </h1>
        <p className="text-muted text-lg">
          {currentYear.isHistorical 
            ? `Viewing historical data for ${currentYear.year}` 
            : `Here's your business performance overview for ${currentYear.year}`
          }
        </p>
      </div>

      {/* Sample Data Banner */}
      {currentYear.isSample && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-900">
          <Info className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-medium">Sample Data</p>
            <p className="text-sm leading-snug">
              You’re currently viewing illustrative numbers. Edit a month’s revenue or import your actual data to personalize the dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Grid - Different for historical vs current years */}
      {currentYear.isHistorical ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Total Actual Revenue
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${Math.round(totalRevenue).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted">
                    Historical data for {currentYear.year}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <History className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Average Monthly
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${averageMonthly.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted">
                    Monthly average
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    YoY Growth
                  </p>
                  <div className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted">
                    vs {selectedYear - 1}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    YTD Revenue
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${Math.round(actualYTD).toLocaleString()}
                  </div>
                  <p className={`text-xs ${ytdPerformance >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                    {ytdPerformance.toFixed(1)}% of YTD target
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Projected Annual
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    ${projectedAnnual.toLocaleString()}
                  </div>
                  <p className={`text-xs ${completionRate >= 100 ? 'text-green-400' : 'text-orange-400'}`}>
                    {completionRate.toFixed(1)}% of target
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    Gap to Target
                  </p>
                  <div className={`text-2xl font-bold ${gapToTarget < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(gapToTarget).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted">
                    {gapToTarget < 0 ? 'Above target' : 'Below target'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    YoY Growth
                  </p>
                  <div className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted">
                    vs {selectedYear - 1}
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">
                    5-Year Avg Growth
                  </p>
                  <div className={`text-2xl font-bold ${averageGrowthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {averageGrowthRate >= 0 ? '+' : ''}{averageGrowthRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted">
                    Historical trend
                  </p>
                </div>
                <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                  <History className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Curve Preview and RIDR Scoring System */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Revenue Curve Preview
            </CardTitle>
            <Link to="/revenue/master">
              <Button variant="ghost" size="sm">
                View Full Chart
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <MiniChart />
            <div className="flex items-center justify-between mt-4 text-sm text-muted">
              <span>
                Current Year: {currentYearNum}
              </span>
              <span>Target: ${currentYearData.targetRevenue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <RIDRScoringSystem />
      </div>

      {/* Financial Statements Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Financial Statements Overview
            </CardTitle>
            <Link to="/financial-statements">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {statements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-accent">
                      Profit & Loss
                    </p>
                    <div className="text-2xl font-bold text-foreground">
                      {statementsByType.profit_loss}
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent" />
                </div>
              </div>

              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-accent">
                      Cash Flow
                    </p>
                    <div className="text-2xl font-bold text-foreground">
                      {statementsByType.cash_flow}
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
              </div>

              <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-accent">
                      Balance Sheet
                    </p>
                    <div className="text-2xl font-bold text-foreground">
                      {statementsByType.balance_sheet}
                    </div>
                  </div>
                  <BarChart3 className="h-8 w-8 text-accent" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Financial Statements
              </h3>
              <p className="text-muted mb-4">
                Upload your financial statements to get AI-powered insights and analysis.
              </p>
              <Link to="/financial-statements">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Statements
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Dashboard */}
      <KPIDashboard className="w-full" />

      {/* 5-Year Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            5-Year Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {fiveYearData.map((yearData, index) => {
              const isCurrentYear = yearData.year === new Date().getFullYear();
              const isSelectedYear = yearData.year === selectedYear;
              const previousYearData = index > 0 ? fiveYearData[index - 1] : null;
              const growth = previousYearData && previousYearData.total > 0 
                ? ((yearData.total - previousYearData.total) / previousYearData.total) * 100 
                : 0;
              
              return (
                <div 
                  key={yearData.year}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-border ${
                    isSelectedYear
                      ? 'bg-accent/20 border-accent' 
                      : 'bg-card border-border'
                  }`}
                  onClick={() => selectYear(yearData.year)}
                >
                  <div className="text-center">
                    <h4 className="font-medium text-foreground mb-1">
                      {yearData.year}
                      {isCurrentYear && (
                        <span className="block text-xs text-accent">Current</span>
                      )}
                      {isSelectedYear && !isCurrentYear && (
                        <span className="block text-xs text-accent">Viewing</span>
                      )}
                    </h4>
                    <div className="text-lg font-bold text-foreground">
                      ${(yearData.total / 1000).toFixed(0)}K
                    </div>
                    {index > 0 && (
                      <div className={`text-xs ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historical Performance Details - Only show actual revenue data */}
      {historicalYears.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Revenue Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicalYears.slice(-3).map((year) => {
                const yearTotal = year.data.reduce((sum, item) => sum + item.revenue, 0);
                
                return (
                  <div 
                    key={year.year} 
                    className="flex items-center justify-between p-4 bg-card rounded-lg border border-border transition-colors cursor-pointer hover:bg-border"
                    onClick={() => selectYear(year.year)}
                  >
                    <div>
                      <h4 className="font-medium text-foreground">
                        {year.year}
                      </h4>
                      <p className="text-sm text-muted">
                        Actual Revenue (Historical)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        ${Math.round(yearTotal).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted">
                        Click to view details
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}