import { useProfile } from '../../hooks/useProfile';
import { useUser } from '@clerk/clerk-react';
import { useRevenue } from '../../contexts/revenue-context';
import { useCashflowSync } from '../../contexts/cashflow-sync-context';
import { WhereDidTheMoneyGo } from '../../components/financial/WhereDidTheMoneyGo';
import KPIDashboard from '../../components/dashboard/KPIDashboard';
import ManualPLFormSimplified from '../../components/financial/ManualPLFormSimplified';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { TooltipTrigger } from '../../components/ui/tooltip';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  BarChart3, 
  Calendar,
  Loader2,
  Info,
  History
} from 'lucide-react';

export function DashboardPage() {
  const { profile, loading: profileLoading } = useProfile();
  const { user } = useUser();
  const { currentYear, selectedYear, getYearData, isLoading, currentYearKpis } = useRevenue();
  const { syncFromManualPL, isManualPLOpen, setIsManualPLOpen } = useCashflowSync();

  if (isLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
        <span className="ml-3 text-muted">Loading revenue data...</span>
      </div>
    );
  }

  const totalRevenue = currentYearKpis?.total_revenue ?? currentYear.data.reduce((sum, item) => sum + item.revenue, 0);
  
  // Calculate actual months completed (not just current month index)
  const currentMonth = new Date().getMonth();
  const monthsCompleted = currentMonth + 1;
  const actualYTD = currentYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
  
  // Calculate projected annual based on actual YTD performance
  const averageMonthly = currentYearKpis?.avg_monthly_revenue ?? (monthsCompleted > 0 ? Math.round(actualYTD / monthsCompleted) : 0);
  const projectedAnnual = Math.round(averageMonthly * 12);
  
  // Only show gap and completion for non-historical years
  const gapToTarget = currentYearKpis?.gap_to_target ?? (currentYear.isHistorical ? 0 : Math.round(currentYear.targetRevenue - actualYTD));
  const completionRate = currentYear.isHistorical ? 0 : (projectedAnnual / currentYear.targetRevenue) * 100;

  // Only calculate YTD performance for non-historical years
  const targetYTD = currentYear.isHistorical ? 0 : (currentYear.targetRevenue / 12) * monthsCompleted;
  const ytdPerformance = currentYear.isHistorical ? 0 : (actualYTD / targetYTD) * 100;

  // Calculate year-over-year growth (same time period comparison)
  const previousYear = getYearData(selectedYear - 1);
  // Compare same time period: YTD current year vs YTD previous year
  const previousYearYTD = previousYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
  const yoyGrowth = previousYearYTD > 0 ? ((actualYTD - previousYearYTD) / previousYearYTD) * 100 : 0;


  // Get current year data for MiniChart display - TEMPORARILY HIDDEN
  // const currentYearNum = new Date().getFullYear();
  // const currentYearData = getYearData(currentYearNum);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-lg p-8 border border-accent/20">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {user?.firstName || profile?.first_name || 'there'}!
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <CardContent className="pt-6 relative">
              <div className="absolute top-2 right-2">
                <TooltipTrigger 
                  content={`Calculation: YTD Revenue ($${actualYTD.toLocaleString()}) ÷ ${monthsCompleted} months = $${averageMonthly.toLocaleString()} avg monthly × 12 months = $${projectedAnnual.toLocaleString()} projected annual`}
                  position="left"
                />
              </div>
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
            <CardContent className="pt-6 relative">
              <div className="absolute top-2 right-2">
                <TooltipTrigger 
                  content={`Calculation: ${selectedYear} YTD ($${Math.round(actualYTD).toLocaleString()}) vs ${selectedYear - 1} YTD ($${Math.round(previousYearYTD).toLocaleString()}) for same ${monthsCompleted}-month period`}
                  position="left"
                />
              </div>
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
        </div>
      )}

      {/* Revenue Curve Preview and Cashflow Calculator */}
      {/* TEMPORARILY HIDDEN - Revenue Curve Preview
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              Revenue Curve Preview
            </CardTitle>
            <Link to="/revenue/master">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
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
      */}


      {/* Financial Analysis - Radial Charts - Now Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WhereDidTheMoneyGo />
        </CardContent>
      </Card>

      <KPIDashboard className="w-full" />

      {/* Manual P&L Entry Modal */}
      {isManualPLOpen && (
        <ManualPLFormSimplified
          onClose={() => setIsManualPLOpen(false)}
          onSave={() => {
            // Refresh financial data after save
            window.location.reload();
          }}
          onCashflowSync={syncFromManualPL}
        />
      )}
    </div>
  );
}