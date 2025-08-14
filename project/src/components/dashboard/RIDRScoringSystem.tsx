import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { useRevenue } from '../../contexts/revenue-context';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface RIDRChip {
  letter: string;
  label: string;
  score: 'green' | 'yellow' | 'red';
  tooltip: string;
  value?: string;
}

interface CoachingContent {
  title: string;
  message: string;
  actions: string[];
}

export function RIDRScoringSystem() {
  const { currentYear, getYearData } = useRevenue();
  const [showCoaching, setShowCoaching] = useState(false);
  const [intentGoalsSet, setIntentGoalsSet] = useState(false); // This would come from user tracking

  // Get current month data
  const currentMonth = new Date().getMonth();
  const currentMonthRevenue = currentYear.data[currentMonth]?.revenue || 0;
  
  // Calculate FIR for current month
  const fir = currentMonthRevenue / (1 - currentYear.profitMargin / 100);
  
  // Get last month's revenue for direction calculation
  const lastMonthRevenue = currentMonth > 0 
    ? currentYear.data[currentMonth - 1]?.revenue || 0 
    : getYearData(currentYear.year - 1).data[11]?.revenue || 0;

  // Get last 3 months for rhythm calculation
  const getLast3MonthsRevenue = () => {
    const revenues = [];
    for (let i = 2; i >= 0; i--) {
      const monthIndex = currentMonth - i;
      if (monthIndex >= 0) {
        revenues.push(currentYear.data[monthIndex]?.revenue || 0);
      } else {
        // Get from previous year
        const prevYear = getYearData(currentYear.year - 1);
        revenues.push(prevYear.data[12 + monthIndex]?.revenue || 0);
      }
    }
    return revenues;
  };

  const last3MonthsRevenue = getLast3MonthsRevenue();

  // Calculate variance for rhythm
  const calculateVariance = (values: number[]) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  };

  // Determine season
  const month = new Date().getMonth();
  const isPeakSeason = [3, 4, 5, 6, 7, 8].includes(month); // Apr-Sep
  const seasonLabel = isPeakSeason ? 'Peak Season' : 'Down Season';

  // Calculate RIDR scores
  const calculateRIDRScores = (): RIDRChip[] => {
    // R - Revenue (Actual vs FIR)
    const revenuePercent = fir > 0 ? (currentMonthRevenue / fir) : 0;
    const revenueScore = revenuePercent >= 1 ? 'green' : revenuePercent >= 0.9 ? 'yellow' : 'red';
    const revenueTooltip = `You're at ${(revenuePercent * 100).toFixed(1)}% of your profit-aligned target for this month.`;

    // I - Intent (Goals set this month)
    const intentScore = intentGoalsSet ? 'green' : 'red';
    const intentTooltip = intentGoalsSet 
      ? "You've reviewed and set goals this month." 
      : "You didn't review or set goals this month.";

    // D - Direction (This month vs last month)
    const directionChange = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const directionScore = directionChange >= 5 ? 'green' : directionChange >= -5 ? 'yellow' : 'red';
    const directionTooltip = directionChange >= 0 
      ? `Revenue increased ${directionChange.toFixed(1)}% compared to last month.`
      : `Revenue declined ${Math.abs(directionChange).toFixed(1)}% compared to last month.`;

    // R - Rhythm (Variance across last 3 months)
    const variance = calculateVariance(last3MonthsRevenue);
    const rhythmScore = variance < 0.10 ? 'green' : variance < 0.25 ? 'yellow' : 'red';
    const rhythmTooltip = variance < 0.10 
      ? "Consistent monthly performance - great rhythm!"
      : variance < 0.25 
        ? "Moderate monthly swings - aim for steadier flow."
        : "High monthly swings detected - focus on consistency.";

    return [
      { letter: 'R', label: 'Revenue', score: revenueScore, tooltip: revenueTooltip, value: `${(revenuePercent * 100).toFixed(0)}%` },
      { letter: 'I', label: 'Intent', score: intentScore, tooltip: intentTooltip },
      { letter: 'D', label: 'Direction', score: directionScore, tooltip: directionTooltip, value: `${directionChange >= 0 ? '+' : ''}${directionChange.toFixed(1)}%` },
      { letter: 'R', label: 'Rhythm', score: rhythmScore, tooltip: rhythmTooltip, value: `${(variance * 100).toFixed(0)}%` }
    ];
  };

  // Generate seasonal coaching content
  const generateCoachingContent = (): CoachingContent => {
    const ridrScores = calculateRIDRScores();
    const redCount = ridrScores.filter(chip => chip.score === 'red').length;
    const yellowCount = ridrScores.filter(chip => chip.score === 'yellow').length;
    
    if (redCount >= 2) {
      // Critical situation
      return {
        title: `Critical Focus Needed - ${seasonLabel}`,
        message: isPeakSeason 
          ? "Multiple areas need attention during your busiest time. Focus on the fundamentals to stabilize performance."
          : "Multiple challenges during slower season. Use this time to rebuild systems and prepare for peak season.",
        actions: isPeakSeason 
          ? ["Prioritize cash flow management", "Focus on high-value clients only", "Streamline operations"]
          : ["Review and fix broken processes", "Plan for peak season capacity", "Invest in team training"]
      };
    } else if (redCount === 1 || yellowCount >= 2) {
      // Needs attention
      return {
        title: `Strategic Adjustments - ${seasonLabel}`,
        message: isPeakSeason 
          ? "Good overall performance with some areas to optimize during peak season."
          : "Solid foundation with room for improvement during the slower period.",
        actions: isPeakSeason 
          ? ["Capitalize on strong areas", "Address weak points quickly", "Maintain momentum"]
          : ["Strengthen weak areas", "Prepare for growth", "Build consistent habits"]
      };
    } else {
      // Performing well
      return {
        title: `Excellent Performance - ${seasonLabel}`,
        message: isPeakSeason 
          ? "Outstanding performance during peak season! You're maximizing your opportunities."
          : "Exceptional performance during slower season shows strong fundamentals.",
        actions: isPeakSeason 
          ? ["Scale successful strategies", "Build reserves for slower months", "Document what's working"]
          : ["Invest in growth initiatives", "Prepare for peak season expansion", "Mentor others"]
      };
    }
  };

  const ridrScores = calculateRIDRScores();
  const coachingContent = generateCoachingContent();

  const getChipColor = (score: 'green' | 'yellow' | 'red') => {
    switch (score) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'red':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
    }
  };

  const getScoreIcon = (score: 'green' | 'yellow' | 'red') => {
    switch (score) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'red':
        return '🔴';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          RIDR Scoring System
        </CardTitle>
        <p className="text-sm text-muted">
          Quick-glance performance indicators beyond just revenue
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* RIDR Score Display */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">RIDR Score:</div>
          <div className="grid grid-cols-2 gap-3">
            {ridrScores.map((chip, index) => (
              <Tooltip key={index} content={chip.tooltip}>
                <div className={`
                  flex items-center justify-between p-3 rounded-lg border cursor-help transition-all hover:shadow-md
                  ${getChipColor(chip.score)}
                `}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold">
                      {chip.letter}
                    </div>
                    <span className="font-medium text-sm">{chip.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {chip.value && (
                      <span className="text-xs font-medium">{chip.value}</span>
                    )}
                    <span className="text-lg">{getScoreIcon(chip.score)}</span>
                  </div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Intent Goals Toggle */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm text-foreground">Monthly Goal Setting</div>
              <div className="text-xs text-muted">Did you review and set goals this month?</div>
            </div>
            <Button
              variant={intentGoalsSet ? "primary" : "outline"}
              size="sm"
              onClick={() => setIntentGoalsSet(!intentGoalsSet)}
              className="flex items-center gap-2"
            >
              {intentGoalsSet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {intentGoalsSet ? 'Goals Set' : 'Set Goals'}
            </Button>
          </div>
        </div>

        {/* Season Indicator */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Current Season: {seasonLabel}
            </span>
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {isPeakSeason ? 'Apr-Sep' : 'Oct-Mar'}
          </div>
        </div>

        {/* Coaching Section */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setShowCoaching(!showCoaching)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            {showCoaching ? 'Hide' : 'Show'} Seasonal Coaching
            {showCoaching ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showCoaching && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-foreground">{coachingContent.title}</h4>
              </div>
              
              <p className="text-sm text-muted leading-relaxed">
                {coachingContent.message}
              </p>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Recommended Actions:</div>
                <ul className="space-y-1">
                  {coachingContent.actions.map((action, index) => (
                    <li key={index} className="text-sm text-muted flex items-start gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {ridrScores.filter(chip => chip.score === 'green').length}/4
            </div>
            <div className="text-xs text-muted">Areas Excelling</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {ridrScores.filter(chip => chip.score === 'red').length}/4
            </div>
            <div className="text-xs text-muted">Areas Needing Focus</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}