import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { CurrencyInput } from '../ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Line } from 'react-chartjs-2';
import { useRevenue } from '../../contexts/revenue-context';
import { useKPIRefreshContext } from '../kpi/KPIRefreshProvider';
import { Button } from '../ui/button';
import { 
  Lock, 
  Calendar, 
  TrendingUp, 
  History, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Target,
  Activity,
  Gauge,
  Eye,
  EyeOff,
  Unlock,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

type TimePeriod = '30days' | 'quarterly' | 'yearly';
type TrackingStatus = 'on-track' | 'slightly-behind' | 'off-track' | 'ahead';
type ViewMode = 'all' | 'actual-only';

const months = [
  "Jan", "Feb", "March", "April", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec"
];

export function MasterChart() {
  const [mounted, setMounted] = useState(false);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number | null>(null);
  const [editingMonthIndex, setEditingMonthIndex] = useState<number | null>(null);
  const [showMonthlyInputs, setShowMonthlyInputs] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [show2024Line, setShow2024Line] = useState(false);
  const chartRef = useRef<any>(null);
  const monthlyInputsRef = useRef<HTMLDivElement>(null);
  
  const { 
    currentYear,
    selectedYear,
    availableYears,
    updateMonthlyRevenue, 
    updateTargets,
    updateProfitMargin,
    saveAndLockYear,
    selectYear,
    getYearData,
    unlockHistoricalYear,
    lockHistoricalYear
  } = useRevenue();
  
  const { refreshKPIs, isRefreshing, promptForKPIRefresh } = useKPIRefreshContext();
  
  const [timePeriod] = useState<TimePeriod>('yearly');
  const [annualFIRTarget, setAnnualFIRTarget] = useState(currentYear.targetRevenue);
  const [profitMargin, setProfitMargin] = useState(currentYear.profitMargin);

  // All hooks must be called before any early returns
  const monthlyRevenue = currentYear.data.map(item => item.revenue);
  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
  const isHistoricalYear = currentYear.isHistorical;

  // Get FIR data from the fixed monthly targets - MEMOIZED to prevent infinite renders
  const getFIRData = useMemo(() => {
    if (isHistoricalYear || !currentYear.monthlyFIRTargets) {
      return [];
    }
    return currentYear.monthlyFIRTargets;
  }, [isHistoricalYear, currentYear.monthlyFIRTargets]);

  // Calculate Gap data using fixed FIR targets - MEMOIZED
  const calculateGapData = useMemo(() => {
    if (getFIRData.length === 0) return [];
    
    // Gap = FIR - Actual Revenue
    return monthlyRevenue.map((actualRevenue, index) => {
      return getFIRData[index] - actualRevenue;
    });
  }, [getFIRData, monthlyRevenue]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAnnualFIRTarget(currentYear.targetRevenue);
    setProfitMargin(currentYear.profitMargin);
  }, [currentYear]);

  // Clear active month highlight after 3 seconds
  useEffect(() => {
    if (activeMonthIndex !== null && editingMonthIndex === null) {
      const timeout = setTimeout(() => {
        setActiveMonthIndex(null);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [activeMonthIndex, editingMonthIndex]);

  // Global keyboard handler for Quick Edit dialog
  useEffect(() => {
    if (editingMonthIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        closeQuickEdit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingMonthIndex]);

  // Debounce timer for FIR target changes
  const firDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (firDebounceTimerRef.current) {
        clearTimeout(firDebounceTimerRef.current);
      }
    };
  }, []);

  // Update targets when inputs change (debounced to avoid saving on every keystroke)
  const handleFIRTargetChange = (value: number) => {
    setAnnualFIRTarget(value);
    
    // Clear existing timer
    if (firDebounceTimerRef.current) {
      clearTimeout(firDebounceTimerRef.current);
    }
    
    // Only save after user stops typing for 1 second
    firDebounceTimerRef.current = setTimeout(() => {
      console.log('💾 Saving FIR target after debounce:', value);
      updateTargets(value, profitMargin);
      
      // Trigger KPI refresh prompt
      promptForKPIRefresh({
        changeDescription: 'FIR target updated',
        affectedKPIs: ['All revenue and target KPIs']
      });
    }, 1000);
  };

  const handleProfitMarginChange = (value: number) => {
    setProfitMargin(value);
    // Use updateProfitMargin instead of updateTargets to avoid recalculating FIR
    updateProfitMargin(value);
    
    // Trigger KPI refresh prompt
    promptForKPIRefresh({
      changeDescription: 'Profit margin updated',
      affectedKPIs: ['Profit Margin', 'Net Profit After Draws']
    });
  };

  if (!mounted) {
    return null;
  }

  const textColor = '#fff';
  const gridColor = 'rgba(255, 255, 255, 0.1)';

  // Calculate coaching insights
  const calculateCoachingInsights = () => {
    const currentMonth = new Date().getMonth();
    const ytdActual = monthlyRevenue.slice(0, currentMonth + 1).reduce((sum, revenue) => sum + revenue, 0);
    const onPaceAnnual = ytdActual > 0 ? (ytdActual / (currentMonth + 1)) * 12 : 0;
    const targetAnnual = annualFIRTarget;
    
    // Calculate percentage difference from target
    const percentageDiff = targetAnnual > 0 ? ((onPaceAnnual - targetAnnual) / targetAnnual) * 100 : 0;
    
    // Determine tracking status
    let status: TrackingStatus;
    if (percentageDiff >= 10) {
      status = 'ahead';
    } else if (percentageDiff >= -5) {
      status = 'on-track';
    } else if (percentageDiff >= -15) {
      status = 'slightly-behind';
    } else {
      status = 'off-track';
    }

    // Calculate required monthly average to catch up
    const remainingMonths = 12 - (currentMonth + 1);
    const remainingTarget = targetAnnual - ytdActual;
    const requiredMonthlyAvg = remainingMonths > 0 ? remainingTarget / remainingMonths : 0;

    return {
      onPaceAnnual,
      targetAnnual,
      percentageDiff,
      status,
      gapAmount: Math.abs(targetAnnual - onPaceAnnual),
      requiredMonthlyAvg: Math.max(0, requiredMonthlyAvg),
      remainingMonths
    };
  };

  const insights = !isHistoricalYear ? calculateCoachingInsights() : null;

  // Get status configuration
  const getStatusConfig = (status: TrackingStatus) => {
    switch (status) {
      case 'ahead':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-400',
          textColor: 'text-white',
          bgColor: 'bg-background',
          borderColor: 'border-accent/40',
          label: 'Ahead of Pace',
        };
      case 'on-track':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-400',
          textColor: 'text-white',
          bgColor: 'bg-background',
          borderColor: 'border-accent/40',
          label: 'On Track!',
        };
      case 'slightly-behind':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
          textColor: 'text-yellow-400',
          bgColor: 'bg-background',
          borderColor: 'border-yellow-400/20',
          label: 'Slightly Behind',
          emoji: '🟡'
        };
      case 'off-track':
        return {
          icon: XCircle,
          iconColor: 'text-red-400',
          textColor: 'text-red-400',
          bgColor: 'bg-background',
          borderColor: 'border-red-400/20',
          label: 'Off Track',
          emoji: '🔴'
        };
    }
  };

  // Generate coaching message
  const generateCoachingMessage = (insights: any) => {
    const { status, onPaceAnnual, targetAnnual, gapAmount, requiredMonthlyAvg, remainingMonths } = insights;
    
    switch (status) {
      case 'ahead':
        return `Excellent work! At your current pace, you're projected to reach $${Math.round(onPaceAnnual).toLocaleString()} by year-end—exceeding your $${Math.round(targetAnnual).toLocaleString()} goal by $${Math.round(gapAmount).toLocaleString()}. Keep up the momentum!`;
      
      case 'on-track':
        return `Great job staying on track! You're currently pacing toward $${Math.round(onPaceAnnual).toLocaleString()}, which puts you right on target to hit your $${Math.round(targetAnnual).toLocaleString()} goal.`;
      
      case 'slightly-behind':
        return `You're currently pacing toward $${Math.round(onPaceAnnual).toLocaleString()}, which is $${Math.round(gapAmount).toLocaleString()} below your target of $${Math.round(targetAnnual).toLocaleString()}. ${remainingMonths > 0 ? `Consider boosting monthly revenue to $${Math.round(requiredMonthlyAvg).toLocaleString()} to catch up.` : 'Focus on strong finish to close the gap.'}`;
      
      case 'off-track':
        return `Your current trajectory leads to $${Math.round(onPaceAnnual).toLocaleString()}, $${Math.round(gapAmount).toLocaleString()} short of your $${Math.round(targetAnnual).toLocaleString()} goal. ${remainingMonths > 0 ? `You'll need to increase average monthly revenue to $${Math.round(requiredMonthlyAvg).toLocaleString()} to close the gap.` : 'Consider adjusting your strategy for next year.'}`;
    }
  };

  const handleMonthlyRevenueChange = (index: number, value: number) => {
    const month = currentYear.data[index].month;
    updateMonthlyRevenue(month, value);
    
    // Trigger KPI refresh prompt (debounced)
    promptForKPIRefresh({
      changeDescription: 'Revenue data updated',
      affectedKPIs: ['Monthly Revenue', 'YTD Revenue', 'Revenue Gap', 'Growth Rate']
    });
  };

  const handleYearChange = (year: string) => {
    selectYear(parseInt(year));
  };

  const handleChartClick = (_event: any, elements: any[]) => {
    if (isHistoricalYear || currentYear.isLocked) return;
    
    // Use Chart.js's built-in element detection
    if (elements && elements.length > 0) {
      const clickedElement = elements[0];
      const clickedMonthIndex = clickedElement.index;
      
      if (clickedMonthIndex >= 0 && clickedMonthIndex < months.length) {
        setActiveMonthIndex(clickedMonthIndex);
        setEditingMonthIndex(clickedMonthIndex);
        
        // Auto-show monthly inputs when clicking chart
        if (!showMonthlyInputs) {
          setShowMonthlyInputs(true);
        }
        
        // No scroll needed - Quick Edit dialog overlays on top
      }
    }
  };

  const handleQuickEditChange = (value: number) => {
    if (editingMonthIndex !== null) {
      // Update in real-time as user types
      handleMonthlyRevenueChange(editingMonthIndex, value);
    }
  };

  const handleQuickEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingMonthIndex !== null) {
      closeQuickEdit();
    } else if (e.key === 'Escape') {
      closeQuickEdit();
    }
  };

  const closeQuickEdit = () => {
    if (editingMonthIndex !== null) {
      setActiveMonthIndex(editingMonthIndex); // Keep highlight for 3 seconds
    }
    setEditingMonthIndex(null);
  };

  const getFilteredData = () => {
    switch (timePeriod) {
      case '30days':
        // Generate daily data based on current month's revenue
        const currentMonthRevenue = monthlyRevenue[new Date().getMonth()];
        return {
          labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
          revenue: Array.from({ length: 30 }, (_, i) => 
            Math.round((currentMonthRevenue / 30) * (1 + Math.sin(i / 5) * 0.2))
          )
        };
      case 'quarterly':
        // Get last 3 months
        const currentMonth = new Date().getMonth();
        const quarterRevenue = monthlyRevenue.slice(Math.max(0, currentMonth - 2), currentMonth + 1);
        const quarterLabels = months.slice(Math.max(0, currentMonth - 2), currentMonth + 1);
        return {
          labels: quarterLabels,
          revenue: quarterRevenue
        };
      case 'yearly':
        return {
          labels: months,
          revenue: monthlyRevenue
        };
    }
  };

  const filteredData = getFilteredData();

  // Calculate all line data
  const actualData = filteredData.revenue;
  const firData = getFIRData;
  const gapData = calculateGapData;
  
  // Get previous year data for comparison line and YoY calculations
  const previousYearData = getYearData(selectedYear - 1);

  // Create chart data based on view mode and whether it's historical or current year
  const createChartDatasets = () => {
    if (isHistoricalYear) {
      return [
        {
          label: "Actual Revenue",
          data: actualData,
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHitRadius: 10
        }
      ];
    }

    const datasets = [];

    // 2024 Actual (background comparison line - shown first so it renders behind)
    if (show2024Line && previousYearData.data.length > 0) {
      datasets.push({
        label: `${selectedYear - 1} Actual`,
        data: previousYearData.data.map(item => item.revenue),
        borderColor: "rgba(156, 163, 175, 0.5)", // Muted gray
        backgroundColor: "rgba(156, 163, 175, 0.05)",
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        borderDash: [5, 5], // Dashed line
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 10
      });
    }

    // Actual Revenue (always shown)
    datasets.push({
      label: "Actual Revenue",
      data: actualData,
      borderColor: "rgba(0, 123, 255, 1)",
      backgroundColor: "rgba(0, 123, 255, 0.2)",
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 15
    });

    // Future Inspired Revenue (only show if not actual-only view and FIR data exists)
    if (viewMode !== 'actual-only' && firData.length > 0) {
      datasets.push({
        label: "Future Inspired Revenue",
        data: firData,
        borderColor: "rgba(208, 180, 106, 1)",
        backgroundColor: "rgba(208, 180, 106, 0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 10
      });
    }

    return datasets;
  };

  const chartData = {
    labels: filteredData.labels,
    datasets: createChartDatasets()
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    layout: {
      padding: {
        top: 40,
      },
    },
    plugins: {
      datalabels: {
        display: false, // Disable datalabels plugin for this chart
      },
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(42, 42, 42, 1)', // #666666 muted gray matching bg-muted/30
        titleColor: '#ffffff', // text-foreground
        bodyColor: 'rgba(255, 255, 255, 1)', // text-muted-foreground
        borderColor: 'rgba(212, 175, 55, 0.3)', // border-accent/30 gold accent
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          beforeBody: function(tooltipItems: any) {
            if (isHistoricalYear) {
              const currentValue = tooltipItems[0]?.raw || 0;
              return [`Actual: $${Math.round(currentValue).toLocaleString()}`];
            } else {
              const monthIndex = tooltipItems[0]?.dataIndex || 0;
              
              // Get all values for this month
              const actualValue = actualData[monthIndex] || 0;
              const firValue = firData[monthIndex] || 0;
              const gapValue = gapData[monthIndex] || 0;
              const prevYearValue = previousYearData.data[monthIndex]?.revenue || 0;
              
              const lines = [];
              
              // Show values in the requested order: Future Growth, GAP, Actual, 2024 Actual
              if (viewMode !== 'actual-only' && firData.length > 0) {
                lines.push(`Future Growth: $${Math.round(firValue).toLocaleString()}`);
                
                // GAP: Always show as positive number
                // Original gapValue is FIR - Actual, so negative means ahead
                const isAhead = gapValue < 0;
                const gapAmount = Math.abs(gapValue);
                const gapLabel = isAhead ? 'GAP (Ahead)' : 'GAP (Behind)';
                lines.push(`${gapLabel}: $${Math.round(gapAmount).toLocaleString()}`);
              }
              lines.push(`Actual: $${Math.round(actualValue).toLocaleString()}`);
              
              // Show 2024 actual if the line is enabled
              if (show2024Line && prevYearValue > 0) {
                lines.push(`${selectedYear - 1} Actual: $${Math.round(prevYearValue).toLocaleString()}`);
              }
              
              return lines;
            }
          },
          label: () => '',
          afterBody: function(tooltipItems: any) {
            const lines = [];
            const monthIndex = tooltipItems[0]?.dataIndex;
            
            if (monthIndex !== undefined && viewMode !== 'actual-only' && firData.length > 0) {
              // Use already-defined previousYearData
              const prevYearRevenue = previousYearData.data[monthIndex]?.revenue || 0;
              const prevYearTotal = previousYearData.data.reduce((sum, item) => sum + item.revenue, 0);
              const prevYearPercentage = prevYearTotal > 0 ? (prevYearRevenue / prevYearTotal * 100).toFixed(2) : '0';
              
              // Show the actual FIR value
              const actualFIR = firData[monthIndex];
              
              lines.push('');
              lines.push(`📊 ${months[monthIndex]} ${selectedYear - 1}: $${Math.round(prevYearRevenue).toLocaleString()} (${prevYearPercentage}% of year)`);
              lines.push(`   ${months[monthIndex]} ${selectedYear} FIR: $${Math.round(actualFIR).toLocaleString()} (${prevYearPercentage}% × $${Math.round(annualFIRTarget).toLocaleString()})`);
            }
            
            if (!isHistoricalYear && !currentYear.isLocked && monthIndex !== undefined) {
              lines.push('');
              lines.push(`💡 Click to edit ${months[monthIndex]} revenue`);
            }
            
            return lines;
          }
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: textColor,
        },
      },
      y: {
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
          // Accept both number and string per Chart.js type definition
          callback: (tickValue: string | number) => {
            const numeric = typeof tickValue === 'number' ? tickValue : Number(tickValue);
            return `$${Math.round(numeric).toLocaleString()}`;
          },
        },
      },
    },
    onClick: handleChartClick,
    onHover: (event: any, elements: any[]) => {
      if (!isHistoricalYear && !currentYear.isLocked && event.native) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  const averageMonthly = Math.round(totalRevenue / 12);

  // Calculate year-over-year growth
  const previousYearTotal = previousYearData.data.reduce((sum, item) => sum + item.revenue, 0);
  const yoyGrowth = previousYearTotal > 0 ? ((totalRevenue - previousYearTotal) / previousYearTotal) * 100 : 0;

  // Calculate KPI values based on current data
  const currentMonth = new Date().getMonth();
  const ytdActual = monthlyRevenue.slice(0, currentMonth + 1).reduce((sum, revenue) => sum + revenue, 0);
  
  // Debug: Log Master Revenue Curve YTD calculation
  console.log(`🎯 Master Revenue Curve YTD Debug:`, {
    currentMonth: currentMonth,
    monthsIncluded: currentMonth + 1,
    monthlyRevenue: monthlyRevenue.slice(0, currentMonth + 1).map((rev, idx) => `${months[idx]}: $${rev}`),
    ytdActual: ytdActual,
    totalRevenue: totalRevenue
  });
  const onPaceAnnual = ytdActual > 0 ? Math.round((ytdActual / (currentMonth + 1)) * 12) : 0;
  
  // FIR Annual: Sum of all monthly FIR values
  const firAnnual = firData.length > 0 ? Math.round(firData.reduce((sum: number, value: number) => sum + value, 0)) : 0;
  
  // Current Monthly Gap: Average gap between FIR and Actual for each month
  const monthlyGaps = calculateGapData;
  const currentMonthlyGap = monthlyGaps.length > 0 ? Math.round(monthlyGaps.reduce((sum: number, gap: number) => sum + Math.abs(gap), 0) / 12) : 0;
  
  // Year-End Projected Gap: Sum of all monthly gaps
  const yearEndProjectedGap = monthlyGaps.length > 0 ? Math.round(monthlyGaps.reduce((sum: number, gap: number) => sum + gap, 0)) : 0;

  // View mode options
  const viewModeOptions = [
    { id: 'all', label: 'Show All Lines', icon: Eye },
    { id: 'actual-only', label: 'Actual Only', icon: EyeOff }
  ];

  return (
    <div className="space-y-8">
      {/* Coaching Insight Card - Only for non-historical years */}
      {!isHistoricalYear && insights && (
        <Card className={`${getStatusConfig(insights.status).bgColor} ${getStatusConfig(insights.status).borderColor} border-2`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {React.createElement(getStatusConfig(insights.status).icon, {
                className: `h-6 w-6 ${getStatusConfig(insights.status).iconColor}`
              })}
              <div>
                <CardTitle className={`${getStatusConfig(insights.status).textColor} text-xl`}>
                  {getStatusConfig(insights.status).emoji} {getStatusConfig(insights.status).label}
                </CardTitle>
                <p className="text-sm text-gray-400 mt-1">Riding the Wave...</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className={`text-lg font-light leading-relaxed ${getStatusConfig(insights.status).textColor}`}>
                {generateCoachingMessage(insights)}
              </p>
              
              {/* Gap to Goal Tracker */}
              <div className="bg-muted/30 rounded-lg p-4 border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-accent">Gap to Goal</span>
                    </div>
                    <div className={`text-xl font-bold ${insights.gapAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${Math.round(insights.gapAmount).toLocaleString()}
                    </div>
                  </div>
                  
                  {insights.remainingMonths > 0 && (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium text-accent">Required Monthly Avg</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        ${Math.round(insights.requiredMonthlyAvg).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-accent">Performance vs Target</span>
                    </div>
                    <div className={`text-xl font-bold ${insights.percentageDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {insights.percentageDiff >= 0 ? '+' : ''}{insights.percentageDiff.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Section - Updated with corrected values */}
      {!isHistoricalYear && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-accent">
                ${onPaceAnnual.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">On Pace to Earn (Annual)</p>
              <p className="text-xs text-gray-400">Based on YTD performance</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                ${firAnnual.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Future-Inspired Revenue (Annual)</p>
              <p className="text-xs text-gray-400">Sum of monthly FIR values</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-400">
                ${currentMonthlyGap.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Current Monthly Gap</p>
              <p className="text-xs text-gray-400">Average monthly FIR-Actual gap</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${yearEndProjectedGap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                ${Math.abs(yearEndProjectedGap).toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Year-End Projected Gap</p>
              <p className="text-xs text-gray-400">Total annual FIR-Actual gap</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical KPIs */}
      {isHistoricalYear && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                ${Math.round(totalRevenue).toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Total Actual Revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                ${averageMonthly.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Average Monthly</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {yoyGrowth >= 0 ? '+' : ''}{yoyGrowth.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-400">YoY Growth</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Mode Filter Toggles - Moved right above the chart */}
      {!isHistoricalYear && (
        <Card>
          <CardHeader>
            <CardTitle>Chart View Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {viewModeOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant={viewMode === option.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode(option.id as ViewMode)}
                    className="flex items-center gap-2"
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                ))}
                
                {/* 2024 Comparison Line Toggle */}
                <Button
                  variant={show2024Line ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShow2024Line(!show2024Line)}
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  {selectedYear - 1} Comparison
                </Button>
              </div>
              
              {/* FIR Explanation moved here and aligned with buttons */}
              {viewMode !== 'actual-only' && firData.length > 0 && (
                <div className="bg-accent/10 rounded-lg p-3 border border-accent/20 max-w-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3 w-3 text-accent" />
                    <span className="text-xs font-medium text-accent">Future Inspired Revenue (FIR)</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Your FIR line is based on your annual target of ${Math.round(annualFIRTarget).toLocaleString()}, 
                    distributed using your previous year's seasonal pattern. This creates a stable benchmark 
                    that doesn't change when you update monthly actuals.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Master Revenue Curve - {currentYear.year}
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Manual KPI Refresh Button */}
              {!isRefreshing ? (
                <Button
                  onClick={() => refreshKPIs()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh KPIs
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      // Emergency stop
                      const { RevenueKPIGenerator } = require('../../services/revenueKPIGenerator');
                      RevenueKPIGenerator.emergencyStop();
                      window.location.reload();
                    }}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel & Reload
                  </Button>
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating KPIs...
                  </span>
                </div>
              )}
              {currentYear.isLocked && (
                <span className="text-sm text-amber-400 flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  Locked
                </span>
              )}
              {isHistoricalYear && (
                <span className="text-sm text-blue-400 flex items-center gap-1">
                  <History className="h-4 w-4" />
                  Historical Data
                </span>
              )}
              {!isHistoricalYear && !currentYear.isLocked && (
                <span className="text-sm text-green-400 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Click chart to edit
                </span>
              )}
              <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={`${selectedYear} ${selectedYear === new Date().getFullYear() ? '(Current)' : ''}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} {year === new Date().getFullYear() ? '(Current)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(selectedYear < new Date().getFullYear()) && (
                <div className="flex items-center gap-2">
                  {!currentYear.isHistorical && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                      <Unlock className="h-3 w-3" />
                      <span>Unlocked for Editing</span>
                    </div>
                  )}
                  {currentYear.isHistorical ? (
                    <Button 
                      variant="secondary" 
                      onClick={() => unlockHistoricalYear(selectedYear)}
                      size="sm"
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Unlock for Editing
                    </Button>
                  ) : (
                    <Button 
                      variant="secondary" 
                      onClick={() => lockHistoricalYear(selectedYear)}
                      size="sm"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Lock Historical Year
                    </Button>
                  )}
                </div>
              )}
              {!isHistoricalYear && (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={saveAndLockYear}
                    disabled={currentYear.isLocked}
                    size="sm"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Year
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            {/* Legend */}
            <div className="flex justify-center gap-8 flex-wrap">
              {isHistoricalYear ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(68, 156, 249, 1)" }}></div>
                  <span>Actual Revenue</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(0, 123, 255, 1)" }}></div>
                    <span>Actual Revenue</span>
                  </div>
                  {viewMode !== 'actual-only' && firData.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(208, 180, 106, 1)" }}></div>
                      <span className="text-accent">Future Inspired Revenue</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="h-[400px] w-full">
              <Line 
                ref={chartRef}
                data={chartData} 
                options={chartOptions} 
              />
            </div>

            {/* Controls and Total Revenue Section */}
            <div className="flex flex-col items-center gap-6 relative">
              {/* Three Metric Cards Row - Only for non-historical years */}
              {!isHistoricalYear && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                  {/* FIR Target Card */}
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-accent/20">
                            <Target className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Annual FIR Target</p>
                            <CurrencyInput
                              value={annualFIRTarget}
                              onChange={handleFIRTargetChange}
                              disabled={currentYear.isLocked}
                              className="text-xl font-bold text-foreground mt-1"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Controls the gold FIR line on the graph
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Current Revenue Card */}
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-accent/20">
                            <DollarSign className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Current Revenue</p>
                            <p className="text-2xl font-bold text-accent">${Math.round(totalRevenue).toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sum of all monthly actuals, update monthly!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Profit Margin Goal Card */}
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-accent/20">
                            <Gauge className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Profit Margin Goal</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={profitMargin}
                                onChange={(e) => handleProfitMarginChange(Number(e.target.value))}
                                disabled={currentYear.isLocked}
                                className="w-20 text-xl font-bold text-foreground"
                                min="0"
                                max="100"
                              />
                              <span className="text-xl font-bold text-foreground">%</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The percentage of revenue you want to keep as net profit (You want to keep {profitMargin} cents of every dollar = {profitMargin}%)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Historical years - just show total */}
              {isHistoricalYear && (
                <div className="text-center">
                  <div className="text-lg text-gray-400 mb-2">
                    Total Actual Revenue
                  </div>
                  <div className="text-3xl font-bold">${Math.round(totalRevenue).toLocaleString()}</div>
                </div>
              )}

              {/* Quick Edit Section - overlays on top without pushing content */}
              {editingMonthIndex !== null && !isHistoricalYear && (
                <>
                  {/* Backdrop - click to close */}
                  <div 
                    className="fixed inset-0 z-[9]" 
                    onClick={closeQuickEdit}
                  />
                  
                  {/* Dialog */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-background border border-accent/40 rounded-lg shadow-lg w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="pt-6 px-6 pb-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-accent/20">
                            <TrendingUp className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Edit {months[editingMonthIndex]} Revenue</p>
                            <CurrencyInput
                              value={monthlyRevenue[editingMonthIndex]}
                              onChange={handleQuickEditChange}
                              onKeyDown={handleQuickEditKeyPress}
                              className="text-xl font-bold text-foreground mt-1"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Updates live as you type • Press Enter or Escape to close
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Input Grid with Toggle */}
      <div ref={monthlyInputsRef}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {isHistoricalYear ? `Historical Revenue Data - ${selectedYear}` : `Monthly Revenue Input - ${selectedYear}`}
                {!isHistoricalYear && (
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    (Click chart above to highlight a month)
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowMonthlyInputs(!showMonthlyInputs)}
                className="flex items-center gap-2"
              >
                {showMonthlyInputs ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Monthly Inputs
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Monthly Inputs
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showMonthlyInputs && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {months.map((month, index) => {
                  const isSample = currentYear.data[index]?.isSample;
                  const inputClasses = [
                    activeMonthIndex === index ? 'ring-2 ring-accent' : '',
                    isSample ? 'text-gray-400 placeholder:text-gray-400' : ''
                  ].join(' ');

                  return (
                    <CurrencyInput
                      key={month}
                      label={month}
                      value={monthlyRevenue[index]}
                      onChange={(value) => handleMonthlyRevenueChange(index, value)}
                      disabled={currentYear.isLocked}
                      placeholder="0"
                      className={inputClasses.trim()}
                    />
                  );
                })}
              </div>
              {isHistoricalYear && (
                <div className="mt-4 p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-accent">
                    <strong>Historical Data:</strong> This shows actual revenue for {selectedYear}. 
                    No target or gap analysis is available for historical years.
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}