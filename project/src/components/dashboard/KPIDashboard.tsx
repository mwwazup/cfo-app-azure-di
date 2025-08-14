import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { KPIRecordsService, KPIRecord } from '../../services/kpiRecordsService';
import { RevenueKPIGenerator } from '../../services/revenueKPIGenerator';
import { 
  Loader2, 
  Brain, 
  Edit3, 
  BarChart3, 
  PieChart, 
  Clock, 
  TrendingUp, 
  Target, 
  DollarSign,
  Calendar,
  RefreshCw,
  Filter,
  Check,
  X
} from 'lucide-react';

import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { MoneyBreakdown } from './MoneyBreakdown';


interface KPIDashboardProps {
  className?: string;
}

type FilterPeriod = 'current_month' | 'last_month' | 'same_month_last_year' | 'last3months' | 'ytd' | 'all' | string;

// Icon mapping for different KPI types
const getKPIIcon = (kpiName: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'gross_profit_margin': BarChart3,
    'net_profit_margin': PieChart,
    'cash_runway': Clock,
    'revenue_growth_rate': TrendingUp,
    'customer_acquisition_cost': Target,
    'monthly_revenue': DollarSign,
    'revenue_gap_to_target': Target,
    'net_profit_after_draws': DollarSign // New KPI icon
  };
  return iconMap[kpiName] || BarChart3;
};



export default function KPIDashboard({ className = '' }: KPIDashboardProps) {
  const { user } = useAuth();
  const [kpiRecords, setKpiRecords] = useState<KPIRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('current_month');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalValue, setGoalValue] = useState<string>('');
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const lastLoadTime = React.useRef<number>(0);

  // Load KPI records with proper comparison data and throttling
  const loadKPIRecords = React.useCallback(async (forceLoad = false) => {
    if (!user?.id) return;
    
    // Throttle loading to prevent excessive calls on window focus
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTime.current;
    
    // Only reload if forced, or if enough time has passed (5 seconds)
    if (!forceLoad && timeSinceLastLoad < 5000) {
      console.log('🚫 Skipping KPI load - too soon since last load');
      return;
    }
    
    lastLoadTime.current = now;
    setLoading(true);
    try {
      // Load the KPI records for the selected period
      const records = await KPIRecordsService.getKPIRecords(user.id, {
        period: filterPeriod === 'current_month' ? 'current' : filterPeriod,
        kpi_category: filterCategory,
        status: filterStatus as any
      });
      
      // For historical periods, load comparison data (same month last year)
      let recordsWithComparison = records;
      if (records.length > 0 && filterPeriod !== 'current_month' && filterPeriod !== 'all') {
        try {
          // Extract year and month from current period
          const currentPeriod = records[0]?.period;
          if (currentPeriod) {
            const currentDate = new Date(currentPeriod);
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            
            // Calculate same month last year
            const lastYearPeriod = `${currentYear - 1}-${currentMonth.toString().padStart(2, '0')}-01`;
            
            console.log(`Loading comparison data for ${lastYearPeriod}`);
            
            // Load last year's data for the same month
            const comparisonRecords = await KPIRecordsService.getKPIRecords(user.id, {
              period: lastYearPeriod,
              kpi_category: filterCategory,
              status: 'all'
            });
            
            console.log(`Found ${comparisonRecords.length} comparison records`);
            
            // Add comparison data to current records
            recordsWithComparison = records.map(record => {
              const comparison = comparisonRecords.find(c => c.kpi_name === record.kpi_name);
              if (comparison) {
                const changePercent = ((record.kpi_value - comparison.kpi_value) / comparison.kpi_value * 100);
                console.log(`${record.kpi_name}: ${record.kpi_value} vs ${comparison.kpi_value} = ${changePercent.toFixed(1)}%`);
                return {
                  ...record,
                  comparison_value: comparison.kpi_value,
                  year_over_year_change: changePercent,
                  comparison_period: lastYearPeriod
                };
              }
              return record;
            });
            
            console.log('✅ Added year-over-year comparison data');
          }
        } catch (compError) {
          console.log('⚠️ No comparison data available:', compError);
        }
      }
      
      // If no records found for current month, generate current month KPIs only
      if (records.length === 0 && filterPeriod === 'current_month') {
        setGenerating(true);
        await RevenueKPIGenerator.generateKPIsForPeriod(user.id, 'current');
        setGenerating(false);
        
        // Reload records after generation
        const newRecords = await KPIRecordsService.getKPIRecords(user.id, {
          period: 'current',
          kpi_category: filterCategory,
          status: filterStatus as any
        });
        setKpiRecords(newRecords);
      } else {
        setKpiRecords(recordsWithComparison);
      }
      
      console.log('📊 Final KPI records with comparison:', recordsWithComparison);
      
    } catch (error) {
      console.error('❌ Error loading KPI records:', error);
      setKpiRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterPeriod, filterCategory, filterStatus]);

  const handleRefreshKPIs = async () => {
    if (!user?.id) return;
    
    setGenerating(true);
    try {
      await RevenueKPIGenerator.generateKPIsForPeriod(user.id, 'current');
      await loadKPIRecords(true); // Force reload after generation
    } catch (error) {
      console.error('Error refreshing KPIs:', error);
    } finally {
      setGenerating(false);
    }
  };

  const refreshData = () => {
    loadKPIRecords(true); // Force reload when user manually refreshes
  };

  // Log window focus status for debugging alt-tab refresh prevention
  React.useEffect(() => {
    console.log(`🪟 Window is ${isWindowFocused ? 'focused' : 'blurred'} - KPI refresh ${isWindowFocused ? 'enabled' : 'prevented'}`);
  }, [isWindowFocused]);

  // Window focus event listeners to prevent unnecessary refreshes
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      // Don't automatically reload on focus - user can manually refresh if needed
    };
    
    const handleBlur = () => {
      setIsWindowFocused(false);
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Load KPIs on filter changes (with throttling)
  useEffect(() => {
    loadKPIRecords(true); // Force load on filter changes
  }, [loadKPIRecords, filterPeriod, filterCategory, filterStatus]);

  const generateHistoricalKPIs = async () => {
    if (!user?.id) return;
    
    setGenerating(true);
    try {
      await RevenueKPIGenerator.generateHistoricalKPIs(user.id);
      // Reload records after generation
      await loadKPIRecords(true); // Force reload after generation
    } catch (error) {
      console.error('Error generating historical KPIs:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleEditGoal = (kpiId: string, currentGoal: number) => {
    console.log('handleEditGoal called with:', { kpiId, currentGoal });
    setEditingGoal(kpiId);
    setGoalValue(currentGoal.toString());
  };

  const handleSaveGoal = async (kpiId: string) => {
    const newGoal = parseFloat(goalValue);
    console.log('Attempting to save goal:', { kpiId, goalValue, newGoal });
    
    if (isNaN(newGoal)) {
      alert('Please enter a valid number for the goal.');
      return;
    }
    
    try {
      console.log('Calling KPIRecordsService.updateKPIGoal...');
      // Update the goal in the database
      const success = await KPIRecordsService.updateKPIGoal(kpiId, newGoal);
      console.log('Update result:', success);
      
      if (success) {
        console.log('Goal updated successfully, refreshing data...');
        setEditingGoal(null);
        setGoalValue('');
        await loadKPIRecords(); // Refresh data to show updated goal
        alert(`Goal updated successfully to ${newGoal}!`);
      } else {
        console.error('Update failed - service returned false');
        alert('Failed to update goal. Check console for details.');
      }
    } catch (error) {
      console.error('Error updating KPI goal:', error);
      alert(`Failed to update goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setGoalValue('');
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const formatTrend = (trend: number) => {
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
        <span className="ml-3 text-muted">Loading KPI dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">KPI Coaching Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={generateHistoricalKPIs} 
            disabled={generating}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Historical KPIs'}
          </Button>
          <Button 
            onClick={refreshData} 
            disabled={generating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Refreshing...' : 'Refresh KPIs'}
          </Button>
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-sm text-gray-600 mb-4">
        <span>AI-powered KPI insights with coaching recommendations</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as FilterPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="2025-07">July 2025</SelectItem>
              <SelectItem value="2025-06">June 2025</SelectItem>
              <SelectItem value="2025-05">May 2025</SelectItem>
              <SelectItem value="2025-04">April 2025</SelectItem>
              <SelectItem value="2025-03">March 2025</SelectItem>
              <SelectItem value="2025-02">February 2025</SelectItem>
              <SelectItem value="2025-01">January 2025</SelectItem>
              <SelectItem value="same_month_last_year">Same Month Last Year</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="profitability">Profitability</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="alert">Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpiRecords.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No KPIs Found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or refresh to generate new KPIs.</p>
          <Button onClick={handleRefreshKPIs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate KPIs
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiRecords
  .filter((kpi) => {
    // During historical comparison views, hide KPIs with no meaningful data
    const isHistoricalView = filterPeriod === 'last_month' || filterPeriod === 'same_month_last_year';
    
    if (isHistoricalView) {
      // Hide KPIs with zero or very low values that don't provide insight
      if (kpi.kpi_name === 'Profit Margin' && kpi.kpi_value === 0) return false;
      if (kpi.kpi_name === 'Revenue Growth Rate' && Math.abs(kpi.kpi_value) < 0.01) return false;
      // Hide Revenue Gap to Target as it's not meaningful for year-over-year comparison
      if (kpi.kpi_name === 'Revenue Gap to Target') return false;
      
      // Always show Revenue Velocity KPI in historical views (it's designed for this purpose)
      if (kpi.kpi_name === 'Revenue Velocity') return true;
      
      // Hide KPIs that don't have historical comparison data
      if (!(kpi as any).comparison_value && kpi.kpi_value === 0) return false;
    }
    
    return true;
  })
  .map((kpi) => {
            const IconComponent = getKPIIcon(kpi.kpi_name);
            
            return (
              <div key={kpi.id} className="space-y-3">
                {/* KPI Card */}
                <div className="bg-card rounded-lg shadow-sm border border-border">
                  <div className="px-6 py-4 pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-[#d5b274] mb-2">
                          {kpi.kpi_name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                        
                        {/* First-person subtitle for user clarity */}
                        <p className="text-xs text-muted-foreground mb-8 italic">
                          {(() => {
                            switch (kpi.kpi_name) {
                              case 'Revenue Velocity':
                                return 'Am I making money faster or slower than last year?';
                              case 'Monthly Revenue':
                                return 'Am I hitting my revenue targets this month?';
                              case 'YTD Revenue':
                                return 'Am I on track to hit my annual revenue goal?';
                              case 'Revenue Growth Rate':
                                return 'Am I growing faster than I was last year?';
                              case 'Profit Margin':
                                return 'Am I keeping enough profit from each dollar I make?';
                              case 'Net Profit After Owner Draws':
                                return 'Am I leaving enough money in the business after paying myself?';
                              case 'Revenue Gap to Target':
                                return 'How much more revenue do I need to hit my annual goal?';
                              default:
                                return '';
                            }
                          })()}
                        </p>
                        
                        {/* KPI Value */}
                        <div className="text-2xl font-bold text-foreground mb-1">
                          {formatValue(kpi.kpi_value, kpi.display_format)}
                        </div>
                        
                        {/* Goal Value - Hide during comparison views */}
                        {!(kpi as any).comparison_value && (
                          editingGoal === kpi.id ? (
                            <div className="flex items-center gap-1 mb-2">
                              <Input
                                value={goalValue}
                                onChange={(e) => setGoalValue(e.target.value)}
                                className="h-6 text-xs flex-1"
                                type="number"
                                step="any"
                                placeholder="Goal"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveGoal(kpi.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className={`text-xs ${
                              kpi.status === 'good' ? 'text-green-400' : 
                              kpi.status === 'warning' ? 'text-orange-400' : 
                              'text-red-400'
                            }`}>
                              {kpi.goal_value ? `Goal: ${formatValue(kpi.goal_value, kpi.display_format)}` : 'No goal set'}
                            </p>
                          )
                        )}
                        
                        {/* Trend - Hide during historical comparison */}
                        {kpi.trend_vs_last_month !== null && kpi.trend_vs_last_month !== undefined && !(kpi as any).comparison_value && (
                          <p className={`text-xs ${
                            kpi.trend_vs_last_month >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {kpi.trend_vs_last_month >= 0 ? '↗' : '↘'} {formatTrend(kpi.trend_vs_last_month)} vs last month
                          </p>
                        )}
                        
                        {/* Year-over-Year Comparison - Match Main KPI Layout */}
                        {(kpi as any).year_over_year_change !== undefined && (kpi as any).comparison_value && (
                          <div className="mt-3 space-y-3">
                            {/* Last Year - Label on top, value underneath like main KPI */}
                            <div>
                              <p className="text-sm text-muted font-medium mb-1">Last Year</p>
                              <div className="text-2xl font-bold text-[#d5b274] mb-1">
                                {formatValue((kpi as any).comparison_value, kpi.display_format)}
                              </div>
                            </div>
                            
                            {/* Dollar Difference - Label on top, value underneath */}
                            <div className="pt-2 border-t border-border">
                              <p className="text-sm text-muted font-medium mb-1">Difference</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${
                                  (kpi as any).year_over_year_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {(() => {
                                    const dollarDifference = kpi.kpi_value - (kpi as any).comparison_value;
                                    return (dollarDifference >= 0 ? '+' : '') + formatValue(dollarDifference, kpi.display_format);
                                  })()}
                                </span>
                                <span className={`text-sm ${
                                  (kpi as any).year_over_year_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}>
                                  ({(kpi as any).year_over_year_change >= 0 ? '+' : ''}{(kpi as any).year_over_year_change.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Icon */}
                      <div className="h-12 w-12 bg-accent/20 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-accent" />
                      </div>
                    </div>
                    
                    {/* Explanation and Action - Enhanced for Historical Comparison */}
                    {(kpi.plain_explanation || kpi.action_suggestion || (kpi as any).comparison_value) && (
                      <div className="mt-4 pt-3 border-t border-border">
                        {/* Enhanced explanation for historical comparison */}
                        <div className="mb-2">
                          <div className="text-xs font-medium text-muted mb-1">What it means</div>
                          <div className="text-xs text-foreground">
                            {(kpi as any).comparison_value ? (
                              (() => {
                                const dollarDifference = kpi.kpi_value - (kpi as any).comparison_value;
                                const isPositive = dollarDifference >= 0;
                                const currentValue = formatValue(kpi.kpi_value, kpi.display_format);
                                const lastYearValue = formatValue((kpi as any).comparison_value, kpi.display_format);
                                
                                return `Your ${kpi.kpi_name.replace(/_/g, ' ').toLowerCase()} this year is ${currentValue} compared to ${lastYearValue} last year. ${isPositive ? 'Great Job!' : 'We need to improve in this area.'}`;
                              })()
                            ) : (
                              kpi.plain_explanation || `Current ${kpi.kpi_name.replace(/_/g, ' ').toLowerCase()} performance.`
                            )}
                          </div>
                        </div>
                        
                        {/* Enhanced action suggestion for historical comparison */}
                        <div>
                          <div className="text-xs font-medium text-muted mb-1">Suggested Action</div>
                          <div className="text-xs text-foreground">
                            {(kpi as any).comparison_value ? (
                              (() => {
                                const dollarDifference = kpi.kpi_value - (kpi as any).comparison_value;
                                const isPositive = dollarDifference >= 0;
                                const percentChange = (kpi as any).year_over_year_change;
                                
                                if (isPositive) {
                                  if (percentChange > 20) {
                                    return `Excellent growth! You've built serious momentum. Let's consider analyzing what drove this success and build more momentum for those strategies.`;
                                  } else if (percentChange > 5) {
                                    return `Good progress with solid improvement. Let's look for opportunities to accelerate this positive trend.`;
                                  } else {
                                    return `You're showing modest growth. Let's consider some profit producing strategies to boost performance in this area.`;
                                  }
                                } else {
                                  if (Math.abs(percentChange) > 20) {
                                    return `Uh, oh! You're showing a significant decline. Let's take immediate action to identify and address the root cause(s).`;
                                  } else if (Math.abs(percentChange) > 5) {
                                    return `You're showing a decline. It's somewhat concerning now but let's review recent changes to see what impacted this number and implement a plan to get you back on track.`;
                                  } else {
                                    return `You're showing a decline. While only minor now, let's keep an eye on this and consider proactive actions to get back on track.`;
                                  }
                                }
                              })()
                            ) : (
                              kpi.action_suggestion || 'We will continue to monitor this KPI and compare it with your historical numbers or industry benchmarks.'
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Money Breakdown for Net Profit After Owner Draws KPI */}
                    {kpi.kpi_name === 'net_profit_after_draws' && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <MoneyBreakdown kpi={kpi} />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons - Outside Card */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center gap-2"
                    onClick={() => alert(`AI Coaching for ${kpi.kpi_name}: ${kpi.action_suggestion || 'Focus on improving this metric based on current performance.'}`)}
                  >
                    <Brain className="h-4 w-4" />
                    AI Tip
                  </Button>
                  
                  {editingGoal !== kpi.id && !(kpi as any).comparison_value && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditGoal(kpi.id, kpi.goal_value || 0)}
                      className="flex items-center gap-2"
                      title="Edit goal"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Goal
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
