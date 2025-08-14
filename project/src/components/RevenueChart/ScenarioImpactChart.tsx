import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CalculationResult } from '../scenario/scenario-calculator';
import { MonthlyData } from '../../contexts/revenue-context';
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

interface ScenarioImpactChartProps {
  currentYearData: MonthlyData[];
  calculation: CalculationResult;
}

export function ScenarioImpactChart({ currentYearData, calculation }: ScenarioImpactChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const textColor = '#fff';
  const gridColor = 'rgba(255, 255, 255, 0.1)';

  // Calculate the impact factor
  const currentAnnualRevenue = calculation.oldRevenue;
  const projectedAnnualRevenue = calculation.newRevenue;
  const impactFactor = currentAnnualRevenue > 0 ? projectedAnnualRevenue / currentAnnualRevenue : 1;

  // Apply the impact to each month's data
  const currentRevenue = currentYearData.map(item => item.revenue);
  const projectedRevenue = currentRevenue.map(revenue => Math.round(revenue * impactFactor));

  const months = currentYearData.map(item => item.month);

  const chartData = {
    labels: months,
    datasets: [
      {
        label: "Current Revenue",
        data: currentRevenue,
        borderColor: "rgba(34, 139, 34, 1)",
        backgroundColor: "rgba(34, 139, 34, 0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(34, 139, 34, 1)",
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
      {
        label: "Projected Revenue",
        data: projectedRevenue,
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500' as const
          }
        }
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
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          beforeBody: function(tooltipItems: any) {
            const currentValue = tooltipItems[0]?.raw || 0;
            const projectedValue = tooltipItems[1]?.raw || 0;
            const difference = projectedValue - currentValue;
            const percentChange = currentValue > 0 ? ((difference / currentValue) * 100) : 0;

            return [
              `Current: $${Math.round(currentValue).toLocaleString()}`,
              `Projected: $${Math.round(projectedValue).toLocaleString()}`,
              `Difference: ${difference >= 0 ? '+' : ''}$${Math.round(difference).toLocaleString()}`,
              `Change: ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`
            ];
          },
          label: () => null,
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
          font: {
            size: 11
          }
        },
      },
      y: {
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          font: {
            size: 11
          },
          callback: (value: number) => `$${Math.round(value / 1000)}K`,
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const totalCurrentRevenue = currentRevenue.reduce((sum, value) => sum + value, 0);
  const totalProjectedRevenue = projectedRevenue.reduce((sum, value) => sum + value, 0);
  const totalDifference = totalProjectedRevenue - totalCurrentRevenue;
  const percentageChange = totalCurrentRevenue > 0 ? ((totalDifference / totalCurrentRevenue) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="h-[300px] w-full">
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400 mb-1">Current Annual</div>
          <div className="text-lg font-bold text-gray-100">
            ${Math.round(totalCurrentRevenue).toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400 mb-1">Projected Annual</div>
          <div className="text-lg font-bold text-blue-400">
            ${Math.round(totalProjectedRevenue).toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400 mb-1">Net Change</div>
          <div className={`text-lg font-bold ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalDifference >= 0 ? '+' : ''}${Math.round(totalDifference).toLocaleString()}
            <span className="text-sm ml-1">
              ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}