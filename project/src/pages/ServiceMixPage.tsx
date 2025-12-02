import { ServiceMixBarChart } from '../components/services/ServiceMixBarChart';
import { ServiceTrackerModal } from '../components/services/ServiceTrackerModalRedesigned';
import { TrackActivitiesCard } from '../components/services/TrackActivitiesCard';
import { ServiceAnalyticsSection } from '../components/services/ServiceAnalyticsSection';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Plus, CheckCircle2, Circle, Calendar, X, Lightbulb, Check, AlertCircle, CheckCircle } from 'lucide-react';
import { useServices, useServiceRevenueData } from '../hooks/useServices';
import { useRevenue } from '../contexts/revenue-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function ServiceMixPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'services' | 'activities'>('services');
  const [trackActivitiesExpanded, setTrackActivitiesExpanded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | 'ytd'>(currentMonth);
  const { services } = useServices();
  const { revenueData } = useServiceRevenueData(filterYear);
  
  // Lighthouse integration
  const { lighthouse, currentYear: revenueCurrentYear } = useRevenue();
  const hasLighthouse = !!lighthouse.goal && lighthouse.planStatus === 'committed';
  const lighthouseStepTarget = lighthouse.currentStepTarget;
  const lighthouseStepYear = lighthouse.currentStepYear;
  const lighthouseYearsToGoal = lighthouse.plan?.yearsToGoal || 0;
  
  // Theme titles for each year (matches your-big-fig.tsx)
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
  
  // Get current step's theme
  const currentStepOverride = lighthouse.stepOverrides?.find(
    (s: any) => s.yearIndex === lighthouseStepYear - 1
  );
  const currentThemeIndex = currentStepOverride?.themeIndex ?? (lighthouseStepYear - 1);
  const currentThemeTitle = ALL_THEMES[currentThemeIndex % ALL_THEMES.length] || 'Find the Lighthouse';
  
  // Check if FIR differs from Lighthouse (only show warning if they differ by more than 1%)
  const isFIRSyncedWithLighthouse = hasLighthouse && lighthouseStepTarget 
    ? Math.abs(revenueCurrentYear.targetRevenue - lighthouseStepTarget) / lighthouseStepTarget < 0.01
    : true;
  
  // Calculate actual job metrics from service data
  const ytdJobs = revenueData.reduce((total, service) => 
    total + service.monthlyRevenue.reduce((sum, m) => sum + m.appointments, 0), 0);
  const ytdRevenue = revenueData.reduce((total, service) => 
    total + service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0), 0);
  const actualAvgTicket = ytdJobs > 0 ? ytdRevenue / ytdJobs : 0;
  
  // Calculate jobs needed for Lighthouse
  const jobsNeededForLighthouse = actualAvgTicket > 0 && lighthouseStepTarget 
    ? Math.round(lighthouseStepTarget / actualAvgTicket) 
    : 0;
  const jobsNeededPerWeek = Math.round(jobsNeededForLighthouse / 52);
  
  // Current pace (based on elapsed weeks in year)
  const weeksElapsed = Math.ceil((currentDate.getTime() - new Date(filterYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const currentJobsPerWeek = weeksElapsed > 0 ? Math.round(ytdJobs / weeksElapsed) : 0;
  const jobsGap = jobsNeededPerWeek - currentJobsPerWeek;

  // Auto-expand Track Activities when services exist
  useEffect(() => {
    if (services.length > 0 && !trackActivitiesExpanded) {
      setTrackActivitiesExpanded(true);
    }
  }, [services.length]);

  const handleAddService = () => {
    setModalTab('services');
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Show success message if services exist
    if (services.length > 0) {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Service Mix Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track and analyze revenue by service to understand how each of your services affects your revenue
          </p>
        </div>
        <Button
          onClick={handleAddService}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Period Filter - Matching Financial Documents Pattern */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="space-y-4">
          {/* Active Viewing Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Viewing:</span>
            <span className="font-medium text-foreground">
              {filterMonth === 'ytd' ? 'Year to Date' : new Date(filterYear, (filterMonth as number) - 1).toLocaleDateString('en-US', { month: 'long' })}
            </span>
            <span className="font-medium text-foreground">{filterYear}</span>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Year Filter */}
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

            {/* Month Filter */}
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
            
            {/* Clear Filter Button */}
            {(filterYear !== currentDate.getFullYear() || filterMonth !== currentDate.getMonth() + 1) && (
              <button
                onClick={() => {
                  setFilterYear(currentDate.getFullYear());
                  setFilterMonth(currentDate.getMonth() + 1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {services.length > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">Step 1: Add Services</p>
              <p className="text-xs text-muted-foreground">
                {services.length === 0 
                  ? 'Click "Add Service" button above to get started'
                  : `${services.length} service${services.length === 1 ? '' : 's'} added`
                }
              </p>
            </div>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-3">
            {services.length > 0 ? (
              <Circle className="h-5 w-5 text-accent" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">Step 2: Track Activities</p>
              <p className="text-xs text-muted-foreground">
                {services.length === 0
                  ? 'Add services first to unlock'
                  : 'Record weekly appointments and revenue below'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lighthouse Journey Card with Jobs Guidance (wrapped in outer card to match Master Revenue styling) */}
      {hasLighthouse && (
        <Card className="w-full">
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
                  
                  {/* Year Progress with Label */}
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
                      {/* Lighthouse Icon at the end */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <Lightbulb className="h-5 w-5 text-accent" />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">GOAL</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status - Only show if FIR differs from Lighthouse */}
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
                
                {/* Jobs Guidance - Based on actual data */}
                {actualAvgTicket > 0 && jobsNeededPerWeek > 0 && (
                  <div className="border-t border-border pt-4 text-center">
                    {filterMonth === 'ytd' ? (
                      // YTD view - show annual summary
                      <p className="text-sm text-muted-foreground">
                        At your avg ticket of <span className="font-semibold text-foreground">${Math.round(actualAvgTicket).toLocaleString()}</span>, 
                        you need <span className="font-semibold text-foreground">~{jobsNeededForLighthouse.toLocaleString()} jobs/year</span> 
                        {' '}(<span className="font-semibold text-foreground">~{jobsNeededPerWeek}/week</span>) to hit Lighthouse
                      </p>
                    ) : (
                      // Monthly view - show actionable guidance
                      <>
                        <p className="text-sm text-muted-foreground">
                          To stay on course, book <span className="font-semibold text-foreground">~{jobsNeededPerWeek} jobs/week</span> to hit your Lighthouse goal.
                        </p>
                        {ytdJobs > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            You're currently on pace for <span className="font-semibold text-foreground">{currentJobsPerWeek} jobs/week</span>
                            {jobsGap > 0 && (
                              <> — to stay on course, book <span className="font-semibold text-foreground">{jobsGap} more/week</span></>
                            )}
                            {jobsGap <= 0 && (
                              <> — you're on track!</>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {showSuccessMessage && services.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-green-400">
            Services saved successfully! Now scroll down to the "Track Activities" section to record your weekly data.
          </p>
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
              <Plus className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">No Services Yet</h3>
            <p className="text-muted-foreground">
              Get started by adding your first service. Once you add services, you'll be able to track weekly activities and see revenue breakdowns.
            </p>
            <Button onClick={handleAddService} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </div>
        </div>
      ) : (
        <ServiceMixBarChart year={filterYear} month={filterMonth} />
      )}

      <TrackActivitiesCard 
        year={filterYear}
        month={filterMonth}
        initiallyExpanded={trackActivitiesExpanded}
      />

      <ServiceAnalyticsSection year={filterYear} month={filterMonth} />

      <ServiceTrackerModal
        open={modalOpen}
        onClose={handleModalClose}
        defaultTab={modalTab}
      />
    </div>
  );
}
