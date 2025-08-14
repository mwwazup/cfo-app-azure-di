import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { 
  Info, 
  TrendingUp, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar
} from 'lucide-react';

interface WaveRiderStatusProps {
  actualRevenue: number;
  firTarget?: number; // New optional prop for fixed FIR target
  profitMargin: number; // as percentage (e.g., 20 for 20%)
  className?: string;
}

type WaveStatus = 'behind' | 'riding' | 'ahead';

interface StatusConfig {
  status: WaveStatus;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<any>;
  title: string;
  tooltip: string;
  coachingPrompt: string;
}

export function WaveRiderStatus({ actualRevenue, firTarget, profitMargin, className = '' }: WaveRiderStatusProps) {
  const [showCoaching, setShowCoaching] = useState(false);

  // Get current month info
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  // Use provided FIR target or calculate from profit margin (fallback)
  const fir = firTarget || (actualRevenue / (1 - profitMargin / 100));
  const gap = fir - actualRevenue;

  // Determine wave status
  const getWaveStatus = (): StatusConfig => {
    if (actualRevenue < fir) {
      return {
        status: 'behind',
        emoji: '🟥',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: AlertTriangle,
        title: 'Behind the Wave',
        tooltip: `You're behind your profit goal for ${currentMonthName}. You'll need an extra $${Math.round(gap).toLocaleString()} this month to get back on track.`,
        coachingPrompt: `Time to catch the wave this ${currentMonthName}. Focus on:\n• Closing 2 more jobs\n• Raising your average ticket\n• Following up with unclosed estimates\n\nSmall moves now can prevent a crash later.`
      };
    } else if (Math.abs(actualRevenue - fir) < 100) { // Within $100 tolerance
      return {
        status: 'riding',
        emoji: '🟨',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: CheckCircle,
        title: 'Riding the Wave (On Track)',
        tooltip: `You're riding the wave perfectly in ${currentMonthName}. Your revenue this month matches your target profit goal.`,
        coachingPrompt: `You're right where you need to be for ${currentMonthName}.\nKeep the rhythm going:\n• Track your daily revenue\n• Monitor your expenses\n• Avoid chasing extra work that doesn't move profit`
      };
    } else {
      return {
        status: 'ahead',
        emoji: '🟩',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: TrendingUp,
        title: 'Ahead of the Wave',
        tooltip: `You're ahead of your target for ${currentMonthName}. Your current revenue exceeds your profit goal.`,
        coachingPrompt: `You're surfing ahead in ${currentMonthName} — now's the time to use that momentum:\n• Build a buffer for slower months\n• Pre-book high-ticket clients\n• Invest in system improvements while you're ahead`
      };
    }
  };

  const statusConfig = getWaveStatus();

  return (
    <div className={className}>
      <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2 transition-all duration-300 hover:shadow-lg`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <CardTitle className={`text-lg ${statusConfig.color} flex items-center gap-2`}>
                <statusConfig.icon className="h-5 w-5" />
                {statusConfig.emoji} {statusConfig.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {currentMonthName} {currentYear} • Current Month Analysis
                </span>
              </div>
            </div>
            <Tooltip content={statusConfig.tooltip}>
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
            </Tooltip>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Wave Visual Representation */}
          <div className="relative h-16 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Simplified wave visualization */}
              <div className="flex items-center gap-4 w-full px-4">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Actual</div>
                  <div className={`w-3 h-3 rounded-full ${statusConfig.status === 'behind' ? 'bg-red-500' : statusConfig.status === 'riding' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    ${Math.round(actualRevenue / 1000)}K
                  </div>
                </div>
                
                <div className="flex-1 relative">
                  <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full">
                    <div 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        statusConfig.status === 'behind' ? 'bg-red-500' : 
                        statusConfig.status === 'riding' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (actualRevenue / fir) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">FIR Goal</div>
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    ${Math.round(fir / 1000)}K
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monthly Gap</div>
              <div className={`text-sm font-bold ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${Math.round(Math.abs(gap)).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Target Profit %</div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {profitMargin}%
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">FIR Progress</div>
              <div className={`text-sm font-bold ${statusConfig.color}`}>
                {Math.round((actualRevenue / fir) * 100)}%
              </div>
            </div>
          </div>

          {/* Time Context Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Analysis Period
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This analysis shows your {currentMonthName} {currentYear} performance against your Future Inspired Revenue (FIR) goal. 
              {firTarget ? 
                `FIR is set at $${Math.round(firTarget).toLocaleString()} for this month based on your annual target and seasonal distribution.` :
                `FIR represents the revenue needed to achieve your ${profitMargin}% target profit margin.`
              }
            </p>
          </div>

          {/* Coaching Section */}
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowCoaching(!showCoaching)}
              className="w-full flex items-center justify-center gap-2 text-gray-900"
            >
              <Activity className="h-4 w-4" />
              {showCoaching ? 'Hide Coaching' : 'Get Monthly Coaching'}
            </Button>
            
            {showCoaching && (
              <div className="bg-white dark:bg-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-blue-600 dark:text-blue-100" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Rider's {currentMonthName} Coaching
                  </span>
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-900 leading-relaxed whitespace-pre-line">
                  {statusConfig.coachingPrompt}
                </div>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <Button className="w-full" variant="primary">
            <TrendingUp className="h-4 w-4 mr-2" />
            Catch the {currentMonthName} Wave
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}