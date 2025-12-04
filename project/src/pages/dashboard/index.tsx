import { useProfile } from '../../hooks/useProfile';
import { useUser } from '@clerk/clerk-react';
import { useRevenue } from '../../contexts/revenue-context';
import { useCashflowSync } from '../../contexts/cashflow-sync-context';
import { useCelebration } from '../../hooks/useCelebration';
import KPIDashboard from '../../components/dashboard/KPIDashboard';
import ManualPLFormSimplified from '../../components/financial/ManualPLFormSimplified';
import { Card, CardContent } from '../../components/ui/card';
import { TooltipTrigger } from '../../components/ui/tooltip';
import { useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Calendar,
  Loader2,
  Info,
  History,
  Lightbulb,
  Check
} from 'lucide-react';

// Theme arrays for Lighthouse (matches your-big-fig.tsx)
const EARLY_THEMES = [
  { title: 'Find the Lighthouse', description: 'Getting clear on what you really want your business and life to look like.' },
  { title: 'Learn the Waves', description: 'Learning when your busy and slow seasons hit so they do not surprise you anymore.' },
  { title: 'Steady the Boat', description: 'Making your months feel less up and down so money feels more steady.' },
  { title: 'Know Your Numbers', description: 'Knowing what you make, what you keep, and what has to change.' },
  { title: 'Fix the Leaks', description: 'Stopping money from slipping away on things that do not really help your business.' },
  { title: 'Fill the Calendar', description: 'Getting enough jobs each month so you do not feel scared when it gets quiet.' }
];
const GROWTH_THEMES = [
  { title: 'Ride Bigger Waves', description: 'Growing your revenue on purpose, not by accident.' },
  { title: 'Make Each Job Worth More', description: 'Earning more from each visit, not just doing more visits.' },
  { title: 'Keep Good Customers Close', description: 'Getting happy customers to come back again and again.' },
  { title: 'Build a Strong Crew', description: 'Building a team you trust so you are not doing it all yourself.' },
  { title: 'Smooth the Seasons', description: 'Using slow months for smart offers so you do not feel dead in the winter or summer.' },
  { title: 'Follow the WAVE', description: 'Using what is happening, the gap, the next move, and simple action every month.' }
];
const FREEDOM_THEMES = [
  { title: 'Work Less, Lead More', description: 'Working fewer hours while your business still grows.' },
  { title: 'Buy Back Your Time', description: 'Creating room in your week so you are not working all day, every day.' },
  { title: 'Pay Yourself First', description: 'Making sure your business takes care of your family, not just your bills.' },
  { title: 'Protect the Lighthouse', description: 'Guarding what you have built so you do not slide backwards.' },
  { title: 'Live the Story You Wrote', description: 'Your business finally matching the Lighthouse story you wrote at the start.' }
];
const ALL_THEMES = [...EARLY_THEMES, ...GROWTH_THEMES, ...FREEDOM_THEMES];

export function DashboardPage() {
  const { profile, loading: profileLoading } = useProfile();
  const { user } = useUser();
  const { currentYear, selectedYear, getYearData, isLoading, currentYearKpis, lighthouse } = useRevenue();
  const { syncFromManualPL, isManualPLOpen, setIsManualPLOpen } = useCashflowSync();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const { celebrate } = useCelebration();
  const hasCelebrated = useRef(false);
  
  // Calculate values needed for celebration (safe even during loading)
  const currentMonth = new Date().getMonth();
  const monthsCompleted = currentMonth + 1;
  
  // Celebration effect - must be before early return
  useEffect(() => {
    if (isLoading || profileLoading) return;
    if (hasCelebrated.current || currentYear.isHistorical || currentYear.isSample) return;
    hasCelebrated.current = true;
    
    const actualYTD = currentYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
    const previousYear = getYearData(selectedYear - 1);
    const previousYearYTD = previousYear.data.slice(0, monthsCompleted).reduce((sum, item) => sum + item.revenue, 0);
    
    const hitMonthlyTarget = monthsCompleted > 0 && 
      currentYear.data[monthsCompleted - 1]?.revenue >= (currentYear.targetRevenue / 12);
    const beatLastMonth = monthsCompleted > 1 && 
      currentYear.data[monthsCompleted - 1]?.revenue > currentYear.data[monthsCompleted - 2]?.revenue;
    const ytdBeatsLastYear = actualYTD > previousYearYTD && previousYearYTD > 0;
    
    const currentYearNum = new Date().getFullYear();
    
    // Celebrate in priority order (only one celebration per visit)
    if (hitMonthlyTarget) {
      celebrate('monthly-target-hit', `monthly-target-${currentYearNum}-${monthsCompleted}`);
    } else if (beatLastMonth) {
      celebrate('beat-last-month', `beat-last-month-${currentYearNum}-${monthsCompleted}`);
    } else if (ytdBeatsLastYear) {
      celebrate('ytd-beats-last-year', `ytd-beats-${currentYearNum}`);
    }
  }, [isLoading, profileLoading, currentYear, selectedYear, getYearData, celebrate, monthsCompleted]);

  // Early return for loading state - AFTER all hooks
  if (isLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
        <span className="ml-3 text-muted">Loading revenue data...</span>
      </div>
    );
  }

  const totalRevenue = currentYearKpis?.total_revenue ?? currentYear.data.reduce((sum, item) => sum + item.revenue, 0);
  
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

  // Lighthouse integration
  const hasLighthouse = !!lighthouse.goal && lighthouse.planStatus === 'committed';
  const lighthouseStepYear = lighthouse.currentStepYear;
  const lighthouseYearsToGoal = lighthouse.plan?.yearsToGoal || 0;
  
  // Get current theme based on step year
  const getPhaseInfo = (index: number, total: number): { phase: 'early' | 'growth' | 'freedom'; indexWithinPhase: number } => {
    if (total <= 0) return { phase: 'growth', indexWithinPhase: 0 };
    
    let earlyCount = 1;
    let freedomCount = 1;
    
    if (total >= 4 && total <= 5) {
      earlyCount = 2;
      freedomCount = 1;
    } else if (total >= 6) {
      earlyCount = 2;
      freedomCount = 2;
    }
    
    if (index < earlyCount) return { phase: 'early', indexWithinPhase: index };
    if (index >= total - freedomCount) return { phase: 'freedom', indexWithinPhase: index - (total - freedomCount) };
    return { phase: 'growth', indexWithinPhase: index - earlyCount };
  };
  
  // Get theme for current step
  const currentStepOverride = lighthouse.stepOverrides?.find(s => s.yearIndex === lighthouseStepYear - 1);
  const { phase, indexWithinPhase } = getPhaseInfo(lighthouseStepYear - 1, lighthouseYearsToGoal);
  const themeSource = phase === 'early' ? EARLY_THEMES : phase === 'freedom' ? FREEDOM_THEMES : GROWTH_THEMES;
  const currentTheme = themeSource[currentStepOverride?.themeIndex ?? indexWithinPhase % themeSource.length] || ALL_THEMES[0];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-background rounded-lg p-8 border border-accent/20">
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

      {/* Lighthouse Progress Card - Inspiring visual design */}
      {hasLighthouse && !currentYear.isHistorical && (
        <Card className="w-full overflow-hidden">
          <CardContent className="p-0">
            {/* Video background container */}
            <div className="relative w-full min-h-[200px] overflow-hidden bg-slate-900">
              {/* Video Background */}
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src="/waverider-bg.mp4" type="video/mp4" />
              </video>
              
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/75 via-background/0 to-background/0" />
              
              {/* Animated glow keyframes */}
              <style>{`
                @keyframes glow-pulse {
                  0%, 100% { 
                    text-shadow: 0 0 20px rgba(234, 179, 8, 0.6), 0 0 40px rgba(234, 179, 8, 0.4), 0 0 60px rgba(234, 179, 8, 0.2);
                    filter: brightness(1);
                  }
                  50% { 
                    text-shadow: 0 0 30px rgba(234, 179, 8, 0.9), 0 0 60px rgba(234, 179, 8, 0.6), 0 0 90px rgba(234, 179, 8, 0.4);
                    filter: brightness(1.1);
                  }
                }
                @keyframes beacon-glow {
                  0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4), 0 0 40px rgba(234, 179, 8, 0.2); }
                  50% { box-shadow: 0 0 30px rgba(234, 179, 8, 0.6), 0 0 60px rgba(234, 179, 8, 0.4), 0 0 80px rgba(234, 179, 8, 0.2); }
                }
                @keyframes subtle-glow {
                  0%, 100% { text-shadow: 0 0 10px rgba(234, 179, 8, 0.3); }
                  50% { text-shadow: 0 0 20px rgba(234, 179, 8, 0.5), 0 0 30px rgba(234, 179, 8, 0.3); }
                }
              `}</style>
              
              {/* Content */}
              <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Left: Bold LIGHTHOUSE title + Theme */}
                <div className="flex-1 space-y-4">
                  {/* Big bold LIGHTHOUSE with glow */}
                  <div className="flex items-center gap-4">
                    {/* Glowing lighthouse beacon icon */}
                    <div 
                      className="relative p-3 rounded-full bg-accent/20 border border-accent/40"
                      style={{ animation: 'beacon-glow 3s ease-in-out infinite' }}
                    >
                      <Lightbulb className="h-8 w-8 text-accent" />
                    </div>
                    <h2 
                      className="text-4xl md:text-5xl font-black tracking-tight text-accent uppercase"
                      style={{ 
                        animation: 'glow-pulse 3s ease-in-out infinite',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                    >
                      Wave Rider
                    </h2>
                  </div>
                  
                  {/* This Year's Focus - Theme */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">This Year's Focus</p>
                    <p 
                      className="text-2xl font-bold text-foreground"
                      style={{ animation: 'subtle-glow 4s ease-in-out infinite' }}
                    >
                      {currentTheme.title}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-lg">
                      {currentTheme.description}
                    </p>
                  </div>
                </div>
                
                {/* Right: Year Progress Visualization */}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Journey</span>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: lighthouseYearsToGoal }, (_, i) => {
                      const stepNum = i + 1;
                      const isCompleted = stepNum < lighthouseStepYear;
                      const isCurrent = stepNum === lighthouseStepYear;
                      return (
                        <div key={stepNum} className="flex flex-col items-center">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                              isCompleted 
                                ? 'bg-accent text-background shadow-lg shadow-accent/30' 
                                : isCurrent 
                                  ? 'bg-accent/30 text-accent ring-2 ring-accent ring-offset-2 ring-offset-background shadow-lg shadow-accent/20' 
                                  : 'bg-muted/30 text-muted-foreground border border-muted-foreground/20'
                            }`}
                            style={isCurrent ? { animation: 'beacon-glow 2s ease-in-out infinite' } : {}}
                          >
                            {isCompleted ? <Check className="h-5 w-5" /> : stepNum}
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] text-accent mt-1 font-bold uppercase tracking-wide">Now</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Lighthouse Goal Icon */}
                    <div className="flex flex-col items-center ml-2">
                      <div 
                        className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent/50 flex items-center justify-center"
                        style={{ animation: 'beacon-glow 3s ease-in-out infinite' }}
                      >
                        <Lightbulb className="h-6 w-6 text-accent" />
                      </div>
                      <span className="text-[10px] text-accent mt-1 font-bold uppercase tracking-wide">Goal</span>
                    </div>
                  </div>
                  
                  {/* Progress indicator - Focus on current year progress */}
                  <div className="text-center mt-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs text-muted-foreground">
                      {lighthouseStepYear === 1 
                        ? "You've begun your journey!" 
                        : `${lighthouseStepYear - 1} year${lighthouseStepYear > 2 ? 's' : ''} completed`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid - Wrapped in outer Card container */}
      <Card className="w-full">
        <CardContent className="py-4">
          {currentYear.isHistorical ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
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
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted">
                      Average Monthly
                    </p>
                    <div className="text-2xl font-bold text-foreground">
                      ${Math.round(averageMonthly).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted">
                      Monthly average
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
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
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
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
              </div>

              <div className="bg-muted/30 rounded-lg p-4 relative">
                <div className="absolute top-2 right-2">
                  <TooltipTrigger 
                    content={`Calculation: YTD Revenue ($${Math.round(actualYTD).toLocaleString()}) ÷ ${monthsCompleted} months = $${Math.round(averageMonthly).toLocaleString()} avg monthly × 12 months = $${Math.round(projectedAnnual).toLocaleString()} projected annual`}
                    position="left"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted">
                      Projected Annual
                    </p>
                    <div className="text-2xl font-bold text-foreground">
                      ${Math.round(projectedAnnual).toLocaleString()}
                    </div>
                    <p className={`text-xs ${completionRate >= 100 ? 'text-green-400' : 'text-orange-400'}`}>
                      {completionRate.toFixed(1)}% of target
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 relative">
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
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted">
                      Gap to Target
                    </p>
                    <div className={`text-2xl font-bold ${gapToTarget < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${Math.round(Math.abs(gapToTarget)).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted">
                      {gapToTarget < 0 ? 'Above target' : 'Below target'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Target className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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