import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChevronDown, ChevronUp, TrendingUp, DollarSign, Hash, PieChart } from 'lucide-react';
import { useServices, useServiceRevenueData } from '../../hooks/useServices';

interface ServiceAnalyticsSectionProps {
  year: number;
  month?: number | 'ytd';
}

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function ServiceAnalyticsSection({ year, month = 'ytd' }: ServiceAnalyticsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
  const [contributionOpen, setContributionOpen] = useState(true);
  const [distributionOpen, setDistributionOpen] = useState(true);
  const { services } = useServices();
  const { revenueData } = useServiceRevenueData(year);

  // Calculate total revenue per month across all services
  const monthlyTotals = Array.from({ length: 12 }, (_, monthIndex) => {
    return revenueData.reduce((sum, service) => {
      const monthData = service.monthlyRevenue.find(m => m.month === monthIndex + 1);
      return sum + (monthData?.revenue || 0);
    }, 0);
  });

  // Calculate appointment counts per service per month
  const serviceAppointmentsPerMonth = revenueData.map(service => {
    const monthlyAppointments = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthData = service.monthlyRevenue.find(m => m.month === monthIndex + 1);
      return monthData?.appointments || 0;
    });
    
    return {
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      monthlyAppointments
    };
  });

  // Calculate service revenue breakdown with percentages
  const serviceBreakdown = revenueData.map(service => {
    const totalRevenue = service.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
    const grandTotal = monthlyTotals.reduce((sum, total) => sum + total, 0);
    const percentage = grandTotal > 0 ? (totalRevenue / grandTotal) * 100 : 0;

    // Monthly breakdown
    const monthlyBreakdown = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthData = service.monthlyRevenue.find(m => m.month === monthIndex + 1);
      const monthRevenue = monthData?.revenue || 0;
      const monthTotal = monthlyTotals[monthIndex];
      const monthPercentage = monthTotal > 0 ? (monthRevenue / monthTotal) * 100 : 0;

      return {
        month: monthIndex + 1,
        revenue: monthRevenue,
        percentage: monthPercentage,
        monthTotal: monthTotal
      };
    });

    return {
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      totalRevenue,
      percentage,
      monthlyBreakdown
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by highest revenue

  const grandTotal = monthlyTotals.reduce((sum, total) => sum + total, 0);

  if (services.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Service Performance Analytics
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed breakdown of service impact on monthly revenue
            </p>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-accent/10"
          >
            {isOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Services Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <Hash className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Services</p>
                    <p className="text-2xl font-bold text-foreground">{services.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Revenue Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue ({year})</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${Math.round(grandTotal).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Appointments Per Month Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-accent/20">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Appointments/Month</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(() => {
                        const totalAppointments = serviceAppointmentsPerMonth.reduce((sum, service) => 
                          sum + service.monthlyAppointments.reduce((a: number, b: number) => a + b, 0), 0
                        );
                        return (totalAppointments / 12).toFixed(1);
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 1. Service Activity Breakdown Per Month */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Hash className="h-5 w-5 text-accent" />
                Service Activity Per Month
              </h3>
              <button
                onClick={() => setActivityOpen(!activityOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-accent/10"
              >
                {activityOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            </div>
            {activityOpen && (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium sticky left-0 bg-muted/50">
                      Service
                    </th>
                    {months.map((month) => (
                      <th key={month} className="text-center p-3 text-xs font-medium min-w-[60px]">
                        {month}
                      </th>
                    ))}
                    <th className="text-center p-3 text-sm font-medium bg-accent/20 min-w-[80px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {serviceAppointmentsPerMonth.map((service) => {
                    const yearTotal = service.monthlyAppointments.reduce((sum, count) => sum + count, 0);
                    return (
                      <tr key={service.serviceId} className="border-t border-border hover:bg-muted/20">
                        <td className="p-3 sticky left-0 bg-background">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-accent" />
                            <span className="text-sm font-medium whitespace-nowrap">
                              {service.serviceName}
                            </span>
                          </div>
                        </td>
                        {service.monthlyAppointments.map((count, idx) => (
                          <td key={idx} className="text-center p-3">
                            <span className="text-sm font-semibold text-foreground">
                              {count > 0 ? count : '-'}
                            </span>
                          </td>
                        ))}
                        <td className="text-center p-3 bg-accent/10">
                          <span className="text-sm font-bold text-accent">
                            {yearTotal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* 2. % Of Revenue Generated from Each Service */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <PieChart className="h-5 w-5 text-accent" />
                Revenue Contribution by Service
              </h3>
              <button
                onClick={() => setContributionOpen(!contributionOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-accent/10"
              >
                {contributionOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            </div>
            {contributionOpen && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Service</th>
                    <th className="text-right p-3 text-sm font-medium">Total Revenue</th>
                    <th className="text-right p-3 text-sm font-medium">% of Total</th>
                    <th className="text-left p-3 text-sm font-medium">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceBreakdown.map((service) => (
                    <tr key={service.serviceId} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-accent" />
                          <span className="text-sm font-medium">{service.serviceName}</span>
                        </div>
                      </td>
                      <td className="text-right p-3 text-sm font-semibold">
                        ${Math.round(service.totalRevenue).toLocaleString()}
                      </td>
                      <td className="text-right p-3 text-sm font-bold text-accent">
                        {service.percentage.toFixed(1)}%
                      </td>
                      <td className="p-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-accent rounded-full h-2 transition-all"
                            style={{ width: `${Math.min(service.percentage, 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* 3. % of Income Per Month (Monthly Revenue Distribution) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Monthly Revenue Distribution by Service
              </h3>
              <button
                onClick={() => setDistributionOpen(!distributionOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-accent/10"
              >
                {distributionOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            </div>
            {distributionOpen && (
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium sticky left-0 bg-muted/50">
                      Service
                    </th>
                    {months.map((month) => (
                      <th key={month} className="text-center p-3 text-xs font-medium min-w-[80px]">
                        {month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceBreakdown.map((service) => (
                    <tr key={service.serviceId} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3 sticky left-0 bg-background">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-accent" />
                          <span className="text-sm font-medium whitespace-nowrap">
                            {service.serviceName}
                          </span>
                        </div>
                      </td>
                      {service.monthlyBreakdown.map((month, idx) => (
                        <td key={idx} className="text-center p-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-semibold text-accent">
                              {month.percentage > 0 ? `${month.percentage.toFixed(1)}%` : '-'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {month.revenue > 0 ? `$${Math.round(month.revenue).toLocaleString()}` : '-'}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="border-t-2 border-accent/50 bg-muted/30 font-bold">
                    <td className="p-3 sticky left-0 bg-muted/30">
                      <span className="text-sm font-bold">Total</span>
                    </td>
                    {monthlyTotals.map((total, idx) => (
                      <td key={idx} className="text-center p-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-foreground">100%</span>
                          <span className="text-xs font-semibold text-accent">
                            ${Math.round(total).toLocaleString()}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
