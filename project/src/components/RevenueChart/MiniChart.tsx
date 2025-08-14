import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useRevenue } from '../../contexts/revenue-context';
import { WaveRiderStatus } from '../dashboard/WaveRiderStatus';
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

export function MiniChart() {
  const [mounted, setMounted] = useState(false);
  const { getYearData } = useRevenue();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  
  // Always get current year data regardless of selected year
  const currentYear = new Date().getFullYear();
  const currentYearData = getYearData(currentYear);
  const monthlyRevenue = currentYearData.data.map(item => item.revenue);
  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);

  // Calculate current month's actual revenue and FIR target for Wave Rider Status
  const currentMonth = new Date().getMonth();
  const currentMonthRevenue = monthlyRevenue[currentMonth] || 0;
  const currentMonthFIRTarget = currentYearData.monthlyFIRTargets?.[currentMonth] || 0;

  const chartData = {
    labels: currentYearData.data.map(item => item.month),
    datasets: [
      {
        label: "Revenue",
        data: monthlyRevenue,
        borderColor: "rgba(34, 139, 34, 1)",
        backgroundColor: "rgba(34, 139, 34, 0.2)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4
      },
      {
        label: "Future Inspired Revenue",
        data: currentYearData.monthlyFIRTargets || [],
        borderColor: "rgba(208, 180, 106, 1)",
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        borderWidth: 1,
        pointRadius: 0,
        pointHoverRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#fff',
          font: {
            size: 10,
          },
        },
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="h-32 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* Wave Rider Status with fixed FIR target */}
      <WaveRiderStatus 
        actualRevenue={currentMonthRevenue}
        firTarget={currentMonthFIRTarget}
        profitMargin={currentYearData.profitMargin}
      />
    </div>
  );
}