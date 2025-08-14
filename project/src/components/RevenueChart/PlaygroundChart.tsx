import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { CurrencyInput } from '../ui/currency-input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Line } from 'react-chartjs-2';
import { useRevenue } from '../../contexts/revenue-context';
import { Button } from '../ui/button';
import { DynamicScenarioFlow } from '../scenario/dynamic-scenario-flow';
import { 
  Save, 
  Lock, 
  Plus, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
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
  RefreshCw,
  Zap
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

export function PlaygroundChart() {
  const [mounted, setMounted] = useState(false);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number | null>(null);
  const [editingMonthIndex, setEditingMonthIndex] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState<number>(0);
  const [showMonthlyInputs, setShowMonthlyInputs] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showScenarioFlow, setShowScenarioFlow] = useState(false);
  const chartRef = useRef<any>(null);
  const monthlyInputsRef = useRef<HTMLDivElement>(null);
  
  const { 
    playgroundData,
    updatePlaygroundData,
    resetPlayground,
    getYearData
  } = useRevenue();
  
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('yearly');
  const [annualFIRTarget, setAnnualFIRTarget] = useState(playgroundData.targetRevenue);
  const [profitMargin, setProfitMargin] = useState(playgroundData.profitMargin);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAnnualFIRTarget(playgroundData.targetRevenue);
    setProfitMargin(playgroundData.profitMargin);
  }, [playgroundData]);

  // Update targets when inputs change
  const handleFIRTargetChange = (value: number) => {
    setAnnualFIRTarget(value);
    updatePlaygroundData({
      targetRevenue: value,
      monthlyFIRTargets: Array(12).fill(value / 12)
    });
  };

  const handleProfitMarginChange = (value: number) => {
    setProfitMargin(value);
    updatePlaygroundData({ profitMargin: value });
  };

  // Clear active month highlight after 3 seconds
  useEffect(() => {
    if (activeMonthIndex !== null && editingMonthIndex === null) {
      const timeout = setTimeout(() => {
        setActiveMonthIndex(null);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [activeMonthIndex, editingMonthIndex]);

  if (!mounted) {
    return null;
  }

  const textColor = '#fff';
  const gridColor = 'rgba(255, 255, 255, 0.1)';

  const monthlyRevenue = playgroundData.data.map(item => item.revenue);
  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);

  // Get FIR data from the fixed monthly targets
  const getFIRData = () => {
    return playgroundData.monthlyFIRTargets || [];
  };

  // Calculate Gap data using fixed FIR targets
  const calculateGapData = () => {
    const firData = getFIRData();
    if (firData.length === 0) return [];
    
    // Gap = FIR - Actual Revenue
    return monthlyRevenue.map((actualRevenue, index) => {
      return firData[index] - actualRevenue;
    });
  };

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

  const insights = calculateCoachingInsights();

  // Get status configuration
  const getStatusConfig = (status: TrackingStatus) => {
    switch (status) {
      case 'ahead':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/20',
          label: 'Ahead of Pace',
          emoji: '🟢'
        };
      case 'on-track':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/20',
          label: 'On Track',
          emoji: '🟢'
        };
      case 'slightly-behind':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/20',
          label: 'Slightly Behind',
          emoji: '🟡'
        };
      case 'off-track':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
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
        return `Excellent work! At your current pace, you're projected to reach $${Math.round(onPaceAnnual).toLocaleString()} by year-end—exceeding your $${targetAnnual.toLocaleString()} goal by $${Math.round(gapAmount).toLocaleString()}. Keep up the momentum!`;
      
      case 'on-track':
        return `Great job staying on track! You're currently pacing toward $${Math.round(onPaceAnnual).toLocaleString()}, which puts you right on target to hit your $${targetAnnual.toLocaleString()} goal.`;
      
      case 'slightly-behind':
        return `You're currently pacing toward $${Math.round(onPaceAnnual).toLocaleString()}, which is $${Math.round(gapAmount).toLocaleString()} below your target of $${targetAnnual.toLocaleString()}. ${remainingMonths > 0 ? `Consider boosting monthly revenue to $${Math.round(requiredMonthlyAvg).toLocaleString()} to catch up.` : 'Focus on strong finish to close the gap.'}`;
      
      case 'off-track':
        return `Your current trajectory leads to $${Math.round(onPaceAnnual).toLocaleString()}, $${Math.round(gapAmount).toLocaleString()} short of your goal. ${remainingMonths > 0 ? `You'll need to increase average monthly revenue to $${Math.round(requiredMonthlyAvg).toLocaleString()} to close the gap.` : 'Consider adjusting your strategy for next year.'}`;
    }
  };

  const handleMonthlyRevenueChange = (index: number, value: number) => {
    const newData = [...playgroundData.data];
    newData[index] = { ...newData[index], revenue: value };
    updatePlaygroundData({ data: newData });
  };

  const handleChartClick = (event: any, elements: any[]) => {
    // Use Chart.js's built-in element detection
    if (elements && elements.length > 0) {
      const clickedElement = elements[0];
      const clickedMonthIndex = clickedElement.index;
      
      if (clickedMonthIndex >= 0 && clickedMonthIndex < months.length) {
        setActiveMonthIndex(clickedMonthIndex);
        setEditingMonthIndex(clickedMonthIndex);
        setTempValue(monthlyRevenue[clickedMonthIndex]);
        
        // Auto-show monthly inputs when clicking chart
        if (!showMonthlyInputs) {
          setShowMonthlyInputs(true);
        }
        
        // Scroll to monthly inputs section
        setTimeout(() => {
          if (monthlyInputsRef.current) {
            monthlyInputsRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 100);
      }
    }
  };

  const handleQuickEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingMonthIndex !== null) {
      handleMonthlyRevenueChange(editingMonthIndex, tempValue);
      setEditingMonthIndex(null);
      setActiveMonthIndex(null);
    }
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
  const firData = getFIRData();
  const gapData = calculateGapData();

  // Create chart data based on view mode
  const createChartDatasets = () => {
    const datasets = [];

    // Actual Revenue (always shown)
    datasets.push({
      label: "Actual Revenue",
      data: actualData,
      borderColor: "rgba(34, 139, 34, 1)",
      backgroundColor: "rgba(34, 139, 34, 0.2)",
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
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          beforeBody: function(tooltipItems: any) {
            const monthIndex = tooltipItems[0]?.dataIndex || 0;
            
            // Get all values for this month
            const actualValue = actualData[monthIndex] || 0;
            const firValue = firData[monthIndex] || 0;
            const gapValue = gapData[monthIndex] || 0;
            
            const lines = [];
            
            // Show values in the requested order: Future Growth, GAP, Actual
            if (viewMode !== 'actual-only' && firData.length > 0) {
              lines.push(`Future Growth: $${Math.round(firValue).toLocaleString()}`);
              lines.push(`GAP: $${Math.round(gapValue).toLocaleString()}`);
            }
            lines.push(`Actual: $${Math.round(actualValue).toLocaleString()}`);
            
            return lines;
          },
          label: () => null,
          afterBody: function(tooltipItems: any) {
            const monthIndex = tooltipItems[0]?.dataIndex;
            if (monthIndex !== undefined) {
              return ['', `💡 Click to edit ${months[monthIndex]} revenue`];
            }
            return [];
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
          callback: (value: number) => `$${Math.round(value).toLocaleString()}`,
        },
      },
    },
    onClick: handleChartClick,
    onHover: (event: any, elements: any[]) => {
      if (event.native) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  const averageMonthly = Math.round(totalRevenue / 12);
  const projectedAnnual = Math.round(averageMonthly * 12);
  const gapToTarget = Math.round(annualFIRTarget - projectedAnnual);

  // Calculate KPI values based on current data
  const currentMonth = new Date().getMonth();
  const ytdActual = monthlyRevenue.slice(0, currentMonth + 1).reduce((sum, revenue) => sum + revenue, 0);
  const onPaceAnnual = ytdActual > 0 ? Math.round((ytdActual / (currentMonth + 1)) * 12) : 0;
  
  // FIR Annual: Sum of all monthly FIR values
  const firAnnual = firData.length > 0 ? Math.round(firData.reduce((sum, value) => sum + value, 0)) : 0;
  
  // Current Monthly Gap: Average gap between FIR and Actual for each month
  const monthlyGaps = calculateGapData();
  const currentMonthlyGap = monthlyGaps.length > 0 ? Math.round(monthlyGaps.reduce((sum, gap) => sum + Math.abs(gap), 0) / 12) : 0;
  
  // Year-End Projected Gap: Sum of all monthly gaps
  const yearEndProjectedGap = monthlyGaps.length > 0 ? Math.round(monthlyGaps.reduce((sum, gap) => sum + gap, 0)) : 0;

  // View mode options
  const viewModeOptions = [
    { id: 'all', label: 'Show All Lines', icon: Eye },
    { id: 'actual-only', label: 'Actual Only', icon: EyeOff }
  ];

  return (
    <div className="space-y-8">
      {/* Coaching Insight Card */}
      <Card className={`${getStatusConfig(insights.status).bgColor} ${getStatusConfig(insights.status).borderColor} border-2`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            {React.createElement(getStatusConfig(insights.status).icon, {
              className: `h-6 w-6 ${getStatusConfig(insights.status).color}`
            })}
            <div>
              <CardTitle className={`${getStatusConfig(insights.status).color} text-xl`}>
                {getStatusConfig(insights.status).emoji} {getStatusConfig(insights.status).label}
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">Playground Scenario Analysis</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className={`text-lg leading-relaxed ${getStatusConfig(insights.status).color}`}>
              {generateCoachingMessage(insights)}
            </p>
            
            {/* Gap to Goal Tracker */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400">Gap to Goal</span>
                  </div>
                  <div className={`text-xl font-bold ${insights.gapAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ${Math.round(insights.gapAmount).toLocaleString()}
                  </div>
                </div>
                
                {insights.remainingMonths > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-400">Required Monthly Avg</span>
                    </div>
                    <div className="text-xl font-bold text-accent">
                      ${Math.round(insights.requiredMonthlyAvg).toLocaleString()}
                    </div>
                  </div>
                )}
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Gauge className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-400">Performance vs Target</span>
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

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-accent">
              ${onPaceAnnual.toLocaleString()}
            </div>
            <p className="text-sm text-gray-400">On Pace to Earn (Annual)</p>
            <p className="text-xs text-gray-400">Based on YTD performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              ${firAnnual.toLocaleString()}
            </div>
            <p className="text-sm text-gray-400">Future-Inspired Revenue (Annual)</p>
            <p className="text-xs text-gray-400">Sum of monthly FIR values</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-400">
              ${currentMonthlyGap.toLocaleString()}
            </div>
            <p className="text-sm text-gray-400">Current Monthly Gap</p>
            <p className="text-xs text-gray-400">Average monthly FIR-Actual gap</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${yearEndProjectedGap > 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${Math.abs(yearEndProjectedGap).toLocaleString()}
            </div>
            <p className="text-sm text-gray-400">Year-End Projected Gap</p>
            <p className="text-xs text-gray-400">Total annual FIR-Actual gap</p>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Filter Toggles */}
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
            </div>
            
            {/* FIR Explanation */}
            {viewMode !== 'actual-only' && firData.length > 0 && (
              <div className="bg-accent/10 rounded-lg p-3 border border-accent/20 max-w-md">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-accent" />
                  <span className="text-xs font-medium text-accent">Future Inspired Revenue (FIR)</span>
                </div>
                <p className="text-xs text-gray-400">
                  Your FIR line is based on your annual target of ${annualFIRTarget.toLocaleString()}, 
                  distributed evenly across months. This creates a stable benchmark 
                  that doesn't change when you update monthly actuals.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Playground Revenue Curve - {playgroundData.year}
            </CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-green-400 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Click chart to edit
              </span>
              <Button 
                variant="secondary" 
                onClick={resetPlayground}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8">
            {/* Legend */}
            <div className="flex justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(34, 139, 34, 1)" }}></div>
                <span>Actual Revenue</span>
              </div>
              {viewMode !== 'actual-only' && firData.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(208, 180, 106, 1)" }}></div>
                  <span className="text-accent">Future Inspired Revenue</span>
                </div>
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
            <div className="flex flex-col items-center gap-6">
              {/* Controls Row */}
              <div className="flex items-center gap-12 w-full justify-center">
                <div className="flex flex-col items-center">
                  <Label className="text-sm text-gray-400 mb-2">Annual FIR Target</Label>
                  <CurrencyInput
                    value={annualFIRTarget}
                    onChange={handleFIRTargetChange}
                    className="w-40 text-center"
                  />
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-lg text-gray-400 mb-2">
                    Total Current Revenue
                  </div>
                  <div className="text-3xl font-bold">${Math.round(totalRevenue).toLocaleString()}</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <Label className="text-sm text-gray-400 mb-2">Profit Margin (%)</Label>
                  <Input
                    type="number"
                    value={profitMargin}
                    onChange={(e) => handleProfitMarginChange(Number(e.target.value))}
                    className="w-24 text-center"
                  />
                </div>
              </div>

              {/* Quick Edit Section */}
              {editingMonthIndex !== null && (
                <div className="bg-accent/10 border-2 border-accent/20 rounded-lg p-4 w-full max-w-md">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <h4 className="font-medium text-accent">
                      {months[editingMonthIndex]} Revenue
                    </h4>
                  </div>
                  <CurrencyInput
                    value={tempValue}
                    onChange={setTempValue}
                    onKeyPress={handleQuickEditKeyPress}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Input Grid with Toggle */}
      <Card ref={monthlyInputsRef}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Monthly Revenue Input - {playgroundData.year}
              <span className="text-sm font-normal text-gray-400 ml-2">
                (Click chart above to highlight a month)
              </span>
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
              {months.map((month, index) => (
                <CurrencyInput
                  key={month}
                  label={month}
                  value={monthlyRevenue[index]}
                  onChange={(value) => handleMonthlyRevenueChange(index, value)}
                  placeholder="0"
                  className={activeMonthIndex === index ? 'ring-2 ring-accent' : ''}
                />
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Scenario Analysis Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              CFO Scenario Analysis
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowScenarioFlow(!showScenarioFlow)}
              className="flex items-center gap-2"
            >
              {showScenarioFlow ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Scenarios
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Scenarios
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showScenarioFlow && (
          <CardContent>
            <DynamicScenarioFlow 
              currentMonthlyRevenue={averageMonthly}
              onScenarioComplete={(scenarioType, inputs, result) => {
                console.log('Scenario completed:', { scenarioType, inputs, result });
              }}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}