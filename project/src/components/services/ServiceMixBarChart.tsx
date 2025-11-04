import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useServices, useServiceRevenueData } from '../../hooks/useServices';
import { useRevenue } from '../../contexts/revenue-context';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface ServiceMixBarChartProps {
  year: number;
  month?: number | 'ytd';
}

export function ServiceMixBarChart({ year, month = 'ytd' }: ServiceMixBarChartProps) {
  const { services } = useServices();
  
  const { revenueData } = useServiceRevenueData(year);
  const { currentYear } = useRevenue();
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [showServiceMix, setShowServiceMix] = useState(true); // Open by default
  const chartRef = useRef<any>(null);

  // Auto-select all services when they first load
  useEffect(() => {
    if (services.length > 0 && selectedServices.size === 0) {
      setSelectedServices(new Set(services.map(s => s.id)));
    }
  }, [services, selectedServices.size]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const toggleAllServices = () => {
    if (selectedServices.size === services.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(services.map(s => s.id)));
    }
  };

  // Generate chart data - horizontal stacked bars (one bar per service, months stacked)
  const selectedServiceData = revenueData.filter(service => selectedServices.has(service.serviceId));
  
  // Filter data by parent's month filter
  const filteredServiceData = selectedServiceData.map(service => {
    const filteredRevenue = service.monthlyRevenue.filter(m => 
      month === 'ytd' || m.month === month
    );
    const total = filteredRevenue.reduce((sum, m) => sum + m.revenue, 0);
    return {
      ...service,
      totalRevenue: total
    };
  });

  // Create single dataset with gold accent color
  const monthDatasets = [{
    label: month === 'ytd' ? 'Total Revenue' : (typeof month === 'number' ? months[month - 1] : 'Total Revenue'),
    data: filteredServiceData.map(s => s.totalRevenue),
    backgroundColor: 'rgba(208, 180, 106, 0.8)', // Gold accent
    borderColor: 'rgba(208, 180, 106, 1)',
    borderWidth: 1,
    barThickness: 'flex' as const,
    maxBarThickness: 30,
  }];

  const chartData = {
    labels: selectedServiceData.map(service => service.serviceName),
    datasets: monthDatasets,
  };

  const chartOptions = {
    indexAxis: 'y' as const, // Horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'y' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // Hide legend (no months to show)
      },
      tooltip: {
        enabled: true,
        mode: 'y' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.x || 0;
            return `${label}: $${Math.round(value).toLocaleString()}`;
          },
          afterBody: (tooltipItems: any) => {
            // Calculate total for this service
            const total = tooltipItems.reduce((sum: number, item: any) => sum + (item.parsed.x || 0), 0);
            return `\nTotal: $${Math.round(total).toLocaleString()}`;
          },
        },
      },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: 'end' as const,
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 4,
        padding: 6,
        font: {
          size: 11,
          weight: 'bold' as const,
        },
        formatter: (value: any) => {
          return '$' + Math.round(value).toLocaleString();
        },
      },
    },
    scales: {
      x: {
        stacked: true, // Stack months horizontally
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9ca3af',
          callback: (value: any) => {
            return '$' + (value / 1000).toFixed(0) + 'k';
          },
        },
        title: {
          display: true,
          text: 'Revenue',
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
      },
      y: {
        stacked: true, // Stack months horizontally
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#e5e7eb',
          font: {
            size: 12,
          },
        },
        title: {
          display: true,
          text: 'Services',
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
        barPercentage: 0.25, // Reduce bar thickness to 1/4
        categoryPercentage: 0.8,
      },
    },
  };

  if (services.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Service Revenue Breakdown
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Compare service performance across time periods
            </p>
          </div>
          <button
            onClick={() => setShowServiceMix(!showServiceMix)}
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-accent/10"
          >
            {showServiceMix ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </CardHeader>

      {showServiceMix && (
        <CardContent className="space-y-4">
          {/* Service Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select services to display in the breakdown
              </p>
              <button
                onClick={toggleAllServices}
                className="text-xs text-accent hover:underline"
              >
                {selectedServices.size === services.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {services.map(service => {
                const isSelected = selectedServices.has(service.id);
                const serviceData = revenueData.find(d => d.serviceId === service.id);
                const totalRevenue = serviceData?.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0) || 0;

                return (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
                      isSelected
                        ? 'border-accent bg-muted/30'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {service.serviceName}
                      </p>
                      {totalRevenue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ${totalRevenue.toLocaleString()}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart */}
          {selectedServices.size > 0 ? (
            <div className="h-[400px] mt-4">
              <Chart ref={chartRef} type="bar" data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select at least one service to view the breakdown</p>
            </div>
          )}

          {/* Summary */}
          {selectedServices.size > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Services Selected</p>
                  <p className="text-lg font-semibold text-foreground">{selectedServices.size}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Service Revenue</p>
                  <p className="text-lg font-semibold text-accent">
                    ${revenueData
                      .filter(s => selectedServices.has(s.serviceId))
                      .reduce((sum, s) => sum + s.monthlyRevenue.reduce((m, r) => m + r.revenue, 0), 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Actual Revenue</p>
                  <p className="text-lg font-semibold text-foreground">
                    ${currentYear.data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Coverage</p>
                  <p className="text-lg font-semibold text-foreground">
                    {(() => {
                      const serviceTotal = revenueData
                        .filter(s => selectedServices.has(s.serviceId))
                        .reduce((sum, s) => sum + s.monthlyRevenue.reduce((m, r) => m + r.revenue, 0), 0);
                      const actualTotal = currentYear.data.reduce((sum, item) => sum + item.revenue, 0);
                      return actualTotal > 0 ? Math.round((serviceTotal / actualTotal) * 100) : 0;
                    })()}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
