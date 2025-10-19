import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useWeeklyBudget } from '../hooks/useWeeklyBudget';
import { Calendar, TrendingUp, TrendingDown, DollarSign, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function BudgetVsActualPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localWeekData, setLocalWeekData] = useState<Record<string, { revenue: number; jobs: number; target: number }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [monthlyFirTotal, setMonthlyFirTotal] = useState<number>(0);

  const { weeklyData, loading, initializeMonthlyBudget, updateWeeklyActual, updateWeeklyBudgetTarget, syncFromServiceMix } = 
    useWeeklyBudget(selectedYear, selectedMonth);

  // Sync local state with fetched data
  useEffect(() => {
    const newLocalData: Record<string, { revenue: number; jobs: number; target: number }> = {};
    let firTotal = 0;
    weeklyData.forEach(week => {
      if (week.id) {
        newLocalData[week.id] = {
          revenue: week.actualRevenue,
          jobs: week.jobsCompleted,
          target: week.weeklyBudgetTarget
        };
        firTotal = week.monthlyFirTotal || 0;
      }
    });
    setLocalWeekData(newLocalData);
    setMonthlyFirTotal(firTotal);
    setHasUnsavedChanges(false);
  }, [weeklyData]);

  const handleInitialize = async () => {
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
    return Object.values(localWeekData).reduce((sum, week) => sum + (week.target || 0), 0);
  };

  // Check if targets are balanced
  const targetsAreBalanced = () => {
    const adjustedTotal = calculateAdjustedTargetTotal();
    return Math.abs(adjustedTotal - monthlyFirTotal) < 0.01; // Allow for rounding errors
  };

  const handleSaveAll = async () => {
    if (!hasUnsavedChanges) return;

    // Validate that weekly targets sum to monthly FIR total
    if (!targetsAreBalanced()) {
      const adjustedTotal = calculateAdjustedTargetTotal();
      const difference = adjustedTotal - monthlyFirTotal;
      alert(
        `Weekly targets must equal monthly FIR total!\n\n` +
        `Monthly FIR: $${monthlyFirTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `Weekly Total: $${adjustedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `Difference: $${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${difference > 0 ? 'over' : 'under'}\n\n` +
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
          if (Math.abs(localData.target - week.weeklyBudgetTarget) > 0.01) {
            promises.push(updateWeeklyBudgetTarget(week.id!, localData.target));
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

  // Use local data for calculations to show real-time updates
  const totalBudget = Object.values(localWeekData).reduce((sum, week) => sum + (week.target || 0), 0);
  const totalActual = Object.values(localWeekData).reduce((sum, week) => sum + (week.revenue || 0), 0);
  const totalVariance = totalActual - totalBudget;
  const totalJobs = Object.values(localWeekData).reduce((sum, week) => sum + (week.jobs || 0), 0);
  const percentageComplete = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  
  const adjustedTargetTotal = calculateAdjustedTargetTotal();
  const targetDifference = adjustedTargetTotal - monthlyFirTotal;
  const showTargetWarning = hasUnsavedChanges && Math.abs(targetDifference) > 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">
            Budget vs Actual Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track weekly revenue goals and actual performance with FIR integration
          </p>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background text-foreground"
              >
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border rounded-md bg-background text-foreground"
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Creates or updates weekly budget targets from your monthly FIR"
            >
              {isInitializing && <Loader2 className="h-4 w-4 animate-spin" />}
              {weeklyData.length > 0 ? 'Re-Initialize Month' : 'Initialize Month'}
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing || weeklyData.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <p className="text-sm text-muted-foreground">Monthly Budget</p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">From FIR Target</p>
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
                <p className="text-sm text-muted-foreground">Actual Revenue</p>
                <div className="text-2xl font-bold text-foreground mt-1">
                  ${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
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
                <p className="text-sm text-muted-foreground">Variance</p>
                <div className={`text-2xl font-bold mt-1 ${totalVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalVariance >= 0 ? '+' : ''}${totalVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
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
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <div className="text-2xl font-bold text-foreground mt-1">{totalJobs}</div>
                <p className="text-xs text-muted-foreground mt-1">Completed this month</p>
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
              Weekly Breakdown - {months[selectedMonth - 1]} {selectedYear}
            </CardTitle>
            {weeklyData.length > 0 && weeklyData.some(w => w.isAutoPopulated) && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Auto-synced from Service Mix
              </span>
            )}
          </div>
        </CardHeader>
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
                  {weeklyData.map((week) => {
                    const localData = localWeekData[week.id!] || { revenue: week.actualRevenue, jobs: week.jobsCompleted, target: week.weeklyBudgetTarget };
                    const variance = localData.revenue - localData.target;
                    const variancePercent = localData.target > 0 ? (variance / localData.target) * 100 : 0;
                    
                    return (
                      <tr key={week.id} className="border-b border-border hover:bg-accent/5 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          Week {week.weekOfMonth}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted">
                          {new Date(week.weekStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(week.weekEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            value={localData.target}
                            onChange={(e) => handleInputChange(week.id!, 'target', Number(e.target.value))}
                            className="w-32 px-2 py-1 border border-border rounded text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                            step="0.01"
                            title="Adjust weekly target (must sum to monthly FIR)"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            value={localData.revenue}
                            onChange={(e) => handleInputChange(week.id!, 'revenue', Number(e.target.value))}
                            className="w-32 px-2 py-1 border border-border rounded text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                            step="0.01"
                          />
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${
                          variance >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          <div>
                            {variance >= 0 ? '+' : ''}${Math.abs(variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs font-normal">
                            ({variance >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            value={localData.jobs}
                            onChange={(e) => handleInputChange(week.id!, 'jobs', Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-border rounded text-right bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                            min="0"
                          />
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
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-accent/5">
                    <td colSpan={2} className="py-3 px-4 font-bold text-foreground">
                      Monthly Total
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      totalVariance >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {totalVariance >= 0 ? '+' : ''}${Math.abs(totalVariance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <p>Monthly FIR Total: <span className="font-medium text-foreground">${monthlyFirTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        <p>Weekly Targets Sum: <span className={`font-medium ${
                          targetsAreBalanced() ? 'text-green-500' : 'text-red-500'
                        }`}>${adjustedTargetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        {!targetsAreBalanced() && (
                          <p className="mt-1 text-red-500 font-medium">
                            Difference: ${Math.abs(targetDifference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {targetDifference > 0 ? 'over' : 'under'}
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
