import React, { useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FinancialStatement, FinancialChartData } from '../../models/FinancialStatement';
import { FinancialDataService } from '../../services/financialDataService';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Calendar,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface FinancialGraphsProps {
  statements: FinancialStatement[];
}

export function FinancialGraphs({ statements }: FinancialGraphsProps) {
  const [selectedStatement, setSelectedStatement] = React.useState<string>('');
  const [chartType, setChartType] = React.useState<'line' | 'bar' | 'doughnut'>('bar');

  const textColor = '#fff';
  const gridColor = 'rgba(255, 255, 255, 0.1)';

  // Get the selected statement or the most recent one
  const currentStatement = useMemo(() => {
    if (selectedStatement) {
      return statements.find(s => s.id === selectedStatement);
    }
    return statements.length > 0 ? statements[0] : null;
  }, [statements, selectedStatement]);

  // Generate chart data based on the current statement
  const chartData = useMemo((): FinancialChartData | null => {
    if (!currentStatement?.parsed_data?.categories) return null;

    const categories = currentStatement.parsed_data.categories;
    const labels = categories.map(cat => cat.name);
    const amounts = categories.map(cat => Math.abs(cat.total));
    
    // Color scheme based on statement type
    const getColors = () => {
      const baseColors = {
        profit_loss: ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4'],
        cash_flow: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'],
        balance_sheet: ['#D0B46A', '#10B981', '#EF4444', '#F59E0B', '#06B6D4']
      };
      
      const colors = baseColors[currentStatement.statement_type] || baseColors.profit_loss;
      return labels.map((_, index) => colors[index % colors.length]);
    };

    const backgroundColors = getColors();
    const borderColors = backgroundColors.map(color => color);

    return {
      labels,
      datasets: [
        {
          label: FinancialDataService.getStatementTypeLabel(currentStatement.statement_type),
          data: amounts,
          backgroundColor: chartType === 'doughnut' ? backgroundColors : backgroundColors.map(c => c + '80'),
          borderColor: borderColors,
          borderWidth: 2,
          fill: chartType === 'line'
        }
      ]
    };
  }, [currentStatement, chartType]);

  // Chart options
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartType === 'doughnut',
          position: 'bottom' as const,
          labels: {
            color: textColor,
            padding: 20,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y || context.parsed;
              return `${context.label}: $${Math.round(value).toLocaleString()}`;
            }
          }
        }
      }
    };

    if (chartType === 'doughnut') {
      return {
        ...baseOptions,
        cutout: '60%',
        plugins: {
          ...baseOptions.plugins,
          legend: {
            ...baseOptions.plugins.legend,
            display: true
          }
        }
      };
    }

    return {
      ...baseOptions,
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            maxRotation: 45
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            callback: (value: number) => `$${Math.round(value / 1000)}K`
          }
        }
      }
    };
  }, [chartType, textColor, gridColor]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (!currentStatement?.parsed_data) return null;

    const { categories, totals } = currentStatement.parsed_data;
    const totalAmount = categories.reduce((sum, cat) => sum + Math.abs(cat.total), 0);
    const largestCategory = categories.reduce((max, cat) => 
      Math.abs(cat.total) > Math.abs(max.total) ? cat : max, categories[0]);

    return {
      totalAmount,
      categoryCount: categories.length,
      largestCategory,
      netIncome: totals?.['Net Income'] || 0
    };
  }, [currentStatement]);

  if (statements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-100 mb-2">
              No Financial Data
            </h3>
            <p className="text-gray-400">
              Upload your financial statements to see visualizations and analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    if (!chartData) return null;

    switch (chartType) {
      case 'line':
        return <Line data={chartData} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={chartOptions} />;
      default:
        return <Bar data={chartData} options={chartOptions} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Data Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Select Statement
              </label>
              <Select value={selectedStatement} onValueChange={setSelectedStatement}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a statement" />
                </SelectTrigger>
                <SelectContent>
                  {statements.map((statement) => (
                    <SelectItem key={statement.id} value={statement.id}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${FinancialDataService.getStatementTypeColor(statement.statement_type)}`}>
                          {FinancialDataService.getStatementTypeLabel(statement.statement_type)}
                        </span>
                        <span>{statement.file_name}</span>
                        <span className="text-gray-500">
                          ({new Date(statement.uploaded_at).toLocaleDateString()})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Chart Type
              </label>
              <Select value={chartType} onValueChange={(value: 'line' | 'bar' | 'doughnut') => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Bar Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Line Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="doughnut">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Doughnut Chart
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryStats && currentStatement && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Total Amount
                  </p>
                  <div className="text-2xl font-bold text-gray-100">
                    ${Math.round(summaryStats.totalAmount).toLocaleString()}
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Categories
                  </p>
                  <div className="text-2xl font-bold text-gray-100">
                    {summaryStats.categoryCount}
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Largest Category
                  </p>
                  <div className="text-lg font-bold text-gray-100">
                    {summaryStats.largestCategory.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ${Math.round(Math.abs(summaryStats.largestCategory.total)).toLocaleString()}
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          {currentStatement.statement_type === 'profit_loss' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Net Income
                    </p>
                    <div className={`text-2xl font-bold ${summaryStats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.round(summaryStats.netIncome).toLocaleString()}
                    </div>
                  </div>
                  {summaryStats.netIncome >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {currentStatement ? (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${FinancialDataService.getStatementTypeColor(currentStatement.statement_type)}`}>
                    {FinancialDataService.getStatementTypeLabel(currentStatement.statement_type)}
                  </span>
                  <span>{currentStatement.file_name}</span>
                </div>
              ) : (
                'Financial Data Chart'
              )}
            </CardTitle>
            {currentStatement && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="h-4 w-4" />
                {new Date(currentStatement.uploaded_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}