import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useWeeklyBudget, useYTDBudget } from '../hooks/useWeeklyBudget';
import { Calendar, TrendingUp, TrendingDown, DollarSign, CheckCircle, AlertCircle, RefreshCw, Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function BudgetVsActualPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ytd'>(currentDate.getMonth() + 1);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localWeekData, setLocalWeekData] = useState<Record<string, { revenue: number; jobs: number; target: number }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [monthlyFirTotal, setMonthlyFirTotal] = useState<number>(0);
  const [isWeeklyBreakdownExpanded, setIsWeeklyBreakdownExpanded] = useState(true);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<number>>(new Set());

  // Fetch data based on mode (single month or YTD)
  const actualMonth = selectedMonth === 'ytd' ? currentDate.getMonth() + 1 : selectedMonth;
  const { weeklyData: singleMonthData, loading: singleMonthLoading, initializeMonthlyBudget, updateWeeklyActual, updateWeeklyBudgetTarget, syncFromServiceMix } = 
    useWeeklyBudget(selectedYear, actualMonth);
  const { ytdData, loading: ytdLoading } = useYTDBudget(selectedYear);
  
  // Use YTD data when in YTD mode, otherwise use single month data
  const weeklyData = selectedMonth === 'ytd' ? ytdData : singleMonthData;
  const loading = selectedMonth === 'ytd' ? ytdLoading : singleMonthLoading;

  // Sync local state with fetched data
  useEffect(() => {
    const newLocalData: Record<string, { revenue: number; jobs: number; target: number }> = {};
    let firTotal = 0;
    weeklyData.forEach(week => {
      if (week.id) {
        newLocalData[week.id] = {
          revenue: Math.round(week.actualRevenue),
          jobs: week.jobsCompleted,
          target: Math.round(week.weeklyBudgetTarget)
        };
        firTotal = Math.round(week.monthlyFirTotal || 0);
      }
    });
    setLocalWeekData(newLocalData);
    setMonthlyFirTotal(firTotal);
    setHasUnsavedChanges(false);
  }, [weeklyData]);

  const handleInitialize = async () => {
    // Don't allow initialization in YTD mode
    if (selectedMonth === 'ytd') {
      alert('Please select a specific month to initialize budget targets.');
      return;
    }
    
    try {
      setIsInitializing(true);
      await initializeMonthlyBudget(selectedYear, selectedMonth);
      alert('Monthly budget initialized successfully!');
    } catch (error) {
      console.error('Error initializing budget:', error);
      alert('Failed to initialize budget. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSync = async () => {
    // Don't allow sync in YTD mode
    if (selectedMonth === 'ytd') {
      alert('Please select a specific month to sync with Service Mix.');
      return;
    }
    
    try {
      setIsSyncing(true);
      await syncFromServiceMix(selectedYear, selectedMonth);
      alert('Synced with Service Mix successfully!');
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Failed to sync with Service Mix. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInputChange = (weekId: string, field: 'revenue' | 'jobs' | 'target', value: number) => {
    // Update local state immediately
    setLocalWeekData(prev => ({
      ...prev,
      [weekId]: {
        ...prev[weekId],
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  // Calculate total of adjusted weekly targets
  const calculateAdjustedTargetTotal = () => {
    return Math.round(Object.values(localWeekData).reduce((sum, week) => sum + (week.target || 0), 0));
  };

  // Check if targets are balanced
  const targetsAreBalanced = () => {
    const adjustedTotal = calculateAdjustedTargetTotal();
    return Math.abs(adjustedTotal - monthlyFirTotal) <= 1; // Allow for $1 rounding difference
  };

  const handleSaveAll = async () => {
    if (!hasUnsavedChanges) return;

    // Validate that weekly targets sum to monthly FIR total
    if (!targetsAreBalanced()) {
      const adjustedTotal = calculateAdjustedTargetTotal();
      const difference = adjustedTotal - monthlyFirTotal;
      alert(
        `Weekly targets must equal monthly FIR total!\n\n` +
        `Monthly FIR: $${Math.round(monthlyFirTotal).toLocaleString()}\n` +
        `Weekly Total: $${Math.round(adjustedTotal).toLocaleString()}\n` +
        `Difference: $${Math.round(Math.abs(difference)).toLocaleString()} ${difference > 0 ? 'over' : 'under'}\n\n` +
        `Please adjust the weekly targets so they sum to the monthly total.`
      );
      return;
    }

    try {
      setIsSavingAll(true);
      
      // Save all weeks with changes
      const savePromises = weeklyData.map(week => {
        const localData = localWeekData[week.id!];
        if (localData) {
          const promises = [];
          // Update actual revenue and jobs
          promises.push(updateWeeklyActual(week.id!, localData.revenue, localData.jobs));
          // Update budget target if changed
          if (Math.abs(localData.target - week.weeklyBudgetTarget) > 1) {
            promises.push(updateWeeklyBudgetTarget(week.id!, Math.round(localData.target)));
          }
          return Promise.all(promises);
        }
        return Promise.resolve();
      });

      await Promise.all(savePromises);
      setHasUnsavedChanges(false);
      alert('All changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save some changes. Please try again.');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Toggle month collapse/expand
  const toggleMonthCollapse = (month: number) => {
    setCollapsedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  // Calculate monthly summaries for YTD mode
  const monthlySummaries = useMemo(() => {
    if (selectedMonth !== 'ytd') return {};
    
    const summaries: Record<number, {
      budget: number;
      actual: number;
      variance: number;
      jobs: number;
      weeksOnTrack: number;
      totalWeeks: number;
    }> = {};
    
    weeklyData.forEach(week => {
      if (!summaries[week.month]) {
        summaries[week.month] = {
          budget: 0,
          actual: 0,
          variance: 0,
          jobs: 0,
          weeksOnTrack: 0,
          totalWeeks: 0
        };
      }
      
      const weekVariance = week.actualRevenue - week.weeklyBudgetTarget;
      summaries[week.month].budget += week.weeklyBudgetTarget;
      summaries[week.month].actual += week.actualRevenue;
      summaries[week.month].variance += weekVariance;
      summaries[week.month].jobs += week.jobsCompleted;
      summaries[week.month].totalWeeks += 1;
      if (weekVariance >= 0) {
        summaries[week.month].weeksOnTrack += 1;
      }
    });
    
    return summaries;
  }, [selectedMonth, weeklyData]);

  // Calculate totals - use direct weeklyData for YTD mode, localWeekData for single month
  const { totalBudget, totalActual, totalVariance, totalJobs, percentageComplete, adjustedTargetTotal, targetDifference, showTargetWarning } = useMemo(() => {
    if (selectedMonth === 'ytd') {
      // YTD mode: aggregate all weeks from weeklyData
      const budget = Math.round(weeklyData.reduce((sum, week) => sum + week.weeklyBudgetTarget, 0));
      const actual = Math.round(weeklyData.reduce((sum, week) => sum + week.actualRevenue, 0));
      const jobs = weeklyData.reduce((sum, week) => sum + week.jobsCompleted, 0);
      return {
        totalBudget: budget,
        totalActual: actual,
        totalVariance: actual - budget,
        totalJobs: jobs,
        percentageComplete: budget > 0 ? (actual / budget) * 100 : 0,
        adjustedTargetTotal: budget,
        targetDifference: 0,
        showTargetWarning: false
      };
    } else {
      // Single month mode: use local data for real-time updates
      const budget = Math.round(Object.values(localWeekData).reduce((sum, week) => sum + (week.target || 0), 0));
      const actual = Math.round(Object.values(localWeekData).reduce((sum, week) => sum + (week.revenue || 0), 0));
      const jobs = Object.values(localWeekData).reduce((sum, week) => sum + (week.jobs || 0), 0);
      const adjustedTotal = calculateAdjustedTargetTotal();
      const diff = adjustedTotal - monthlyFirTotal;
      return {
        totalBudget: budget,
        totalActual: actual,
        totalVariance: actual - budget,
        totalJobs: jobs,
        percentageComplete: budget > 0 ? (actual / budget) * 100 : 0,
        adjustedTargetTotal: adjustedTotal,
        targetDifference: diff,
        showTargetWarning: hasUnsavedChanges && Math.abs(diff) > 1
      };
    }
  }, [selectedMonth, weeklyData, localWeekData, monthlyFirTotal, hasUnsavedChanges]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">
            Budget vs Actual Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track weekly revenue goals vs actual performance
          </p>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          {/* Active Viewing Display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>Viewing:</span>
            <span className="font-medium text-foreground">
              {selectedMonth === 'ytd' ? 'Year to Date' : fullMonths[(selectedMonth as number) - 1]}
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

            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-accent" />
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => {
                  if (value === 'ytd') {
                    setSelectedMonth('ytd');
                  } else {
                    setSelectedMonth(Number(value));
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
                    const monthName = fullMonths[i];
                    return (
                      <SelectItem key={month} value={month.toString()}>
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleInitialize}
              disabled={isInitializing || selectedMonth === 'ytd'}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={selectedMonth === 'ytd' ? 'Select a specific month to initialize' : 'Creates or updates weekly budget targets from your monthly FIR'}
            >
              {isInitializing && <Loader2 className="h-4 w-4 animate-spin" />}
              {weeklyData.length > 0 ? 'Refresh Month' : 'Month Up to Date'}
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing || weeklyData.length === 0 || selectedMonth === 'ytd'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={selectedMonth === 'ytd' ? 'Select a specific month to sync' : 'Sync actual revenue from Service Mix'}
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync from Service Mix
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-accent">Monthly Budget</p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ${Math.round(totalBudget).toLocaleString()}
                </div>
                <p className="text-xs text-accent mt-1">
                  {monthlyFirTotal > 0 && Math.abs(totalBudget - monthlyFirTotal) > 1 ? (
                    <span className="text-yellow-600">
                      FIR: ${Math.round(monthlyFirTotal).toLocaleString()} • Click Refresh
                    </span>
                  ) : (
                    'From Master Revenue'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-accent">Actual Revenue</p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ${totalActual.toLocaleString()}
                </div>
                <p className="text-xs text-accent mt-1">
                  {percentageComplete.toFixed(1)}% of budget
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                {totalVariance >= 0 ? <TrendingUp className="h-5 w-5 text-accent" /> : <TrendingDown className="h-5 w-5 text-accent" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-accent">Variance</p>
                <div className={`text-2xl font-bold mt-1 ${totalVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalVariance >= 0 ? '+' : ''}${Math.round(totalVariance).toLocaleString()}
                </div>
                <p className="text-xs text-accent mt-1">
                  {totalVariance >= 0 ? 'Above' : 'Below'} target
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-accent">Total Jobs</p>
                <div className="text-2xl font-bold text-foreground mt-1">{totalJobs}</div>
                <p className="text-xs text-accent mt-1">Completed this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Breakdown Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {selectedMonth === 'ytd' 
                ? `Year to Date - ${selectedYear}`
                : `Weekly Breakdown - ${months[(selectedMonth as number) - 1]} ${selectedYear}`
              }
            </CardTitle>
            <div className="flex items-center gap-2">
              {weeklyData.length > 0 && weeklyData.some(w => w.isAutoPopulated) && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Auto-synced from Service Mix
                </span>
              )}
              <button
                onClick={() => setIsWeeklyBreakdownExpanded(!isWeeklyBreakdownExpanded)}
                className="p-1 hover:bg-accent/10 rounded transition-colors"
                aria-label={isWeeklyBreakdownExpanded ? "Collapse section" : "Expand section"}
              >
                {isWeeklyBreakdownExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        {isWeeklyBreakdownExpanded && (
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted" />
              <p className="text-muted mt-2">Loading weekly data...</p>
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted mb-4" />
              <p className="text-muted text-lg mb-2">No data for this month</p>
              <p className="text-sm text-muted mb-4">
                Click "Initialize Month" to create weekly budget targets based on your FIR
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Week</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Date Range</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Budget Target</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Actual Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Gap (+/-)</th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">Jobs</th>
                    <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((week, index) => {
                    const localData = localWeekData[week.id!] || { revenue: week.actualRevenue, jobs: week.jobsCompleted, target: week.weeklyBudgetTarget };
                    const variance = localData.revenue - localData.target;
                    const variancePercent = localData.target > 0 ? (variance / localData.target) * 100 : 0;
                    const isYTDMode = selectedMonth === 'ytd';
                    
                    // Show month header in YTD mode when month changes
                    const showMonthHeader = isYTDMode && (index === 0 || weeklyData[index - 1].month !== week.month);
                    const isMonthCollapsed = collapsedMonths.has(week.month);
                    const monthSummary = monthlySummaries[week.month];
                    
                    return (
                      <>
                        {showMonthHeader && (
                          <>
                            <tr 
                              key={`month-header-${week.month}`} 
                              className="bg-accent/10 cursor-pointer hover:bg-accent/20 transition-colors"
                              onClick={() => toggleMonthCollapse(week.month)}
                            >
                              <td colSpan={7} className="py-2 px-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-foreground">
                                    {fullMonths[week.month - 1]} {week.year}
                                  </span>
                                  <div className="flex items-center gap-4">
                                    {isMonthCollapsed ? (
                                      <ChevronDown className="h-5 w-5 text-foreground" />
                                    ) : (
                                      <ChevronUp className="h-5 w-5 text-foreground" />
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {isMonthCollapsed && monthSummary && (
                              <tr key={`month-summary-${week.month}`} className="bg-accent/5 border-b-2 border-border">
                                <td colSpan={2} className="py-3 px-4 font-semibold text-foreground">
                                  {monthSummary.totalWeeks} weeks
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-foreground">
                                  ${Math.round(monthSummary.budget).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-foreground">
                                  ${Math.round(monthSummary.actual).toLocaleString()}
                                </td>
                                <td className={`py-3 px-4 text-right font-semibold ${
                                  monthSummary.variance >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  <div>
                                    {monthSummary.variance >= 0 ? '+' : ''}${Math.abs(Math.round(monthSummary.variance)).toLocaleString()}
                                  </div>
                                  <div className="text-xs font-normal">
                                    ({monthSummary.variance >= 0 ? '+' : ''}{((monthSummary.variance / monthSummary.budget) * 100).toFixed(1)}%)
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-foreground">
                                  {monthSummary.jobs}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {monthSummary.variance >= 0 ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                      <span className="text-xs text-green-600 font-medium">
                                        {monthSummary.weeksOnTrack}/{monthSummary.totalWeeks} On Track
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <AlertCircle className="h-5 w-5 text-red-500" />
                                      <span className="text-xs text-red-600 font-medium">
                                        {monthSummary.weeksOnTrack}/{monthSummary.totalWeeks} On Track
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        )}
                        {(!isYTDMode || !isMonthCollapsed) && (
                        <tr key={week.id} className="border-b border-border hover:bg-accent/5 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">
                            {isYTDMode ? `${months[week.month - 1]} W${week.weekOfMonth}` : `Week ${week.weekOfMonth}`}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted">
                            {new Date(week.weekStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(week.weekEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isYTDMode ? (
                              <span className="font-medium text-foreground">${Math.round(week.weeklyBudgetTarget).toLocaleString()}</span>
                            ) : (
                              <input
                                type="number"
                                value={localData.target}
                                onChange={(e) => handleInputChange(week.id!, 'target', Math.round(Number(e.target.value)))}
                                className="w-32 px-2 py-1 border border-border rounded text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                                step="1"
                                title="Adjust weekly target (must sum to monthly FIR)"
                              />
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isYTDMode ? (
                              <span className="text-foreground">${Math.round(week.actualRevenue).toLocaleString()}</span>
                            ) : (
                              <input
                                type="number"
                                value={localData.revenue}
                                onChange={(e) => handleInputChange(week.id!, 'revenue', Math.round(Number(e.target.value)))}
                                className="w-32 px-2 py-1 border border-border rounded text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                step="1"
                              />
                            )}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${
                            variance >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            <div>
                              {variance >= 0 ? '+' : ''}${Math.abs(variance).toLocaleString()}
                            </div>
                            <div className="text-xs font-normal">
                              ({variance >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isYTDMode ? (
                              <span className="text-foreground">{week.jobsCompleted}</span>
                            ) : (
                              <input
                                type="number"
                                value={localData.jobs}
                                onChange={(e) => handleInputChange(week.id!, 'jobs', Number(e.target.value))}
                                className="w-20 px-2 py-1 border border-border rounded text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                min="0"
                              />
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {variance >= 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="text-xs text-green-600 font-medium">On Track</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <span className="text-xs text-red-600 font-medium">Behind</span>
                              </div>
                            )}
                          </td>
                        </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-accent/5">
                    <td colSpan={2} className="py-3 px-4 font-bold text-foreground">
                      {selectedMonth === 'ytd' ? 'YTD Total' : 'Monthly Total'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ${totalBudget.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ${totalActual.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      totalVariance >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {totalVariance >= 0 ? '+' : ''}${Math.abs(totalVariance).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {totalJobs}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              {/* Target Balance Warning */}
              {showTargetWarning && (
                <div className={`mt-4 p-4 rounded-lg border-2 ${
                  targetsAreBalanced() 
                    ? 'bg-green-500/10 border-green-500' 
                    : 'bg-red-500/10 border-red-500'
                }`}>
                  <div className="flex items-start gap-3">
                    {targetsAreBalanced() ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        targetsAreBalanced() ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {targetsAreBalanced() ? 'Targets Balanced ✓' : 'Targets Must Equal Monthly FIR'}
                      </p>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>Monthly FIR Total: <span className="font-medium text-foreground">${Math.round(monthlyFirTotal).toLocaleString()}</span></p>
                        <p>Weekly Targets Sum: <span className={`font-medium ${
                          targetsAreBalanced() ? 'text-green-500' : 'text-red-500'
                        }`}>${Math.round(adjustedTargetTotal).toLocaleString()}</span></p>
                        {!targetsAreBalanced() && (
                          <p className="mt-1 text-red-500 font-medium">
                            Difference: ${Math.round(Math.abs(targetDifference)).toLocaleString()} {targetDifference > 0 ? 'over' : 'under'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save All Button */}
              {hasUnsavedChanges && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                    className="px-6 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    {isSavingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving All Changes...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Save All Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        )}
      </Card>

      {/* Help Text */}
      {weeklyData.length > 0 && (
        <Card className="bg-muted/30 border-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-accent/20">
                <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground mb-2">How to use this page:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong className="text-accent">Initialize/Re-Initialize Month:</strong> Creates weekly budget targets based on your FIR. Weeks start on Sunday and only show dates within the current month.</li>
                  <li>• <strong className="text-accent">Sync from Service Mix:</strong> Auto-populates actual revenue and jobs from your Service Mix tracking</li>
                  <li>• <strong className="text-accent">Manual Entry:</strong> Enter actual revenue and jobs completed directly in the table</li>
                  <li>• <strong className="text-accent">Gap Analysis:</strong> Green = ahead of target, Red = behind target</li>
                  <li>• <strong className="text-accent">Note:</strong> If you see dates from previous/next month, click "Re-Initialize Month" to update the week structure</li>
                  <li>• <strong className="text-accent">Save Changes:</strong> Click "Save All Changes" button at the bottom after entering your data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
