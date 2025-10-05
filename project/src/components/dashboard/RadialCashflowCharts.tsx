import { 
  RadialBarChart, 
  RadialBar, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from './CashflowCalculator';

interface CashflowData {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerDistributions: number;
  taxes: number;
}

interface Calculations {
  totalCogs: number;
  totalExpenses: number;
  grossProfit: number;
  netBeforeOwnerPay: number;
  cashLeftInBusiness: number;
  grossProfitMargin: number;
  netBeforeOwnerMargin: number;
  ownerDistributionRate: number;
  cashLeftMargin: number;
}

interface RadialCashflowChartsProps {
  data: CashflowData;
  calculations: Calculations;
}

interface ChartCardProps {
  title: string;
  value: number;
  percentage: number;
  color: string;
  trendDirection: 'up' | 'down' | 'neutral';
  trendValue: number;
  dateRange: string;
}

function ChartCard({ title, value, percentage, color, trendDirection, trendValue, dateRange }: ChartCardProps) {
  // Create chart data - using percentage for the radial fill
  const chartData = [
    { 
      name: title, 
      value: 100, // Always use 100 as the data value since we control the arc with endAngle
      fill: color 
    }
  ];

  // Calculate endAngle based on percentage (0% = 0°, 100% = 360°)
  // Cap the percentage at 100% to prevent over-rotation
  const cappedPercentage = Math.min(Math.abs(percentage), 100);
  const dynamicEndAngle = (cappedPercentage / 100) * 360;

  // Determine trend icon and color
  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trendDirection === 'up' ? 'text-green-400' : 
                     trendDirection === 'down' ? 'text-red-400' : 'text-muted';

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-lg font-bold text-[#d5b274] mb-2">{title}</CardTitle>
        <p className="text-xs text-muted-foreground mb-8 italic">{dateRange}</p>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <div className="relative mx-auto aspect-square max-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={chartData}
              endAngle={dynamicEndAngle}
              innerRadius={85}
              outerRadius={130}
            >
              {/* Muted circle rendered first (underneath) as background track */}
              <circle
                cx="50%"
                cy="50%"
                r={107.5}
                fill="none"
                stroke="rgb(156 163 175)"
                strokeWidth={45}
                opacity={0.2}
              />
              <RadialBar 
                dataKey="value" 
                cornerRadius={4}
                fill={color}
              />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(value)}
            </span>
            <span className="text-sm font-medium text-white">
              {cappedPercentage.toFixed(1)}%
            </span>
            <div className="flex items-center gap-1">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-lg font-bold ${trendColor}`}>
                {trendDirection !== 'neutral' && (trendDirection === 'up' ? '+' : '')}{trendValue.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export function RadialCashflowCharts({ data, calculations }: RadialCashflowChartsProps) {
  // Calculate percentages for radial display (0-100 scale)
  const revenuePercentage = 100; // Revenue is always 100% as the base
  const cashLeftPercentage = data.revenue > 0 ? Math.abs(calculations.cashLeftInBusiness / data.revenue) * 100 : 0;

  // Mock trend data (in a real app, this would come from historical data)
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Define colors based on your specified palette
  const colors = {
    revenue: '#10B981', // Green for revenue
    cogs: '#993416', // Amber 800 for COGS
    expenses: '#124a6b', // Blue 700 for expenses
    ownerDistributions: '#d0b568', // Gold for owner distributions
    cashLeft: calculations.cashLeftInBusiness >= 0 ? '#10B981' : '#EF4444' // Green if positive, red if negative
  };

  const charts = [
    {
      title: 'Total Revenue',
      value: data.revenue,
      percentage: revenuePercentage,
      color: colors.revenue,
      trendDirection: 'up' as const,
      trendValue: 8.2,
      dateRange: currentMonth
    },
    {
      title: 'Total Costs',
      value: data.cogs + data.operatingExpenses + data.taxes,
      percentage: data.revenue > 0 ? ((data.cogs + data.operatingExpenses + data.taxes) / data.revenue) * 100 : 0,
      color: colors.expenses,
      trendDirection: 'up' as const,
      trendValue: 3.1,
      dateRange: currentMonth
    },
    {
      title: 'Cash Left',
      value: calculations.cashLeftInBusiness,
      percentage: cashLeftPercentage,
      color: colors.cashLeft,
      trendDirection: calculations.cashLeftInBusiness >= 0 ? 'up' as const : 'down' as const,
      trendValue: calculations.cashLeftInBusiness >= 0 ? 5.3 : -12.4,
      dateRange: currentMonth
    },
    {
      title: 'Cost of Goods',
      value: data.cogs,
      percentage: data.revenue > 0 ? (data.cogs / data.revenue) * 100 : 0,
      color: colors.cogs,
      trendDirection: 'down' as const,
      trendValue: -2.1,
      dateRange: currentMonth
    },
    {
      title: 'Owner Distributions',
      value: data.ownerDistributions,
      percentage: data.revenue > 0 ? (data.ownerDistributions / data.revenue) * 100 : 0,
      color: colors.ownerDistributions,
      trendDirection: 'up' as const,
      trendValue: 1.8,
      dateRange: currentMonth
    }
  ];

  // Fallback if data is invalid
  if (!data.revenue || data.revenue <= 0) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted text-sm">Enter revenue data to see cash flow charts</p>
          <p className="text-xs text-muted mt-2">Adjust the values in the calculator above to see the breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* First row - 3 charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {charts.slice(0, 3).map((chart, index) => (
          <ChartCard
            key={index}
            title={chart.title}
            value={chart.value}
            percentage={chart.percentage}
            color={chart.color}
            trendDirection={chart.trendDirection}
            trendValue={chart.trendValue}
            dateRange={chart.dateRange}
          />
        ))}
      </div>
      
      {/* Second row - 2 charts centered */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {charts.slice(3, 5).map((chart, index) => (
          <ChartCard
            key={index + 3}
            title={chart.title}
            value={chart.value}
            percentage={chart.percentage}
            color={chart.color}
            trendDirection={chart.trendDirection}
            trendValue={chart.trendValue}
            dateRange={chart.dateRange}
          />
        ))}
      </div>
    </div>
  );
}

export default RadialCashflowCharts;