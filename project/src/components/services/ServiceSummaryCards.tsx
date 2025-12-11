import { Card, CardContent } from '../ui/card';
import { DollarSign, Hash } from 'lucide-react';
import { useServiceRevenueData } from '../../hooks/useServices';

interface ServiceSummaryCardsProps {
  year: number;
  month: number | 'ytd';
}

export function ServiceSummaryCards({ year, month }: ServiceSummaryCardsProps) {
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
      monthlyAppointments
    };
  });

  const grandTotal = monthlyTotals.reduce((sum, total) => sum + total, 0);

  // Filter data based on month prop
  const filteredRevenue = month === 'ytd' 
    ? grandTotal
    : monthlyTotals[(month as number) - 1] || 0;

  const filteredAppointments = month === 'ytd'
    ? serviceAppointmentsPerMonth.reduce((sum, service) => 
        sum + service.monthlyAppointments.reduce((a: number, b: number) => a + b, 0), 0
      )
    : serviceAppointmentsPerMonth.reduce((sum, service) => 
        sum + (service.monthlyAppointments[(month as number) - 1] || 0), 0
      );

  // Generate period label
  const periodLabel = month === 'ytd' 
    ? `YTD ${year}`
    : new Date(year, (month as number) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Avg Ticket Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-accent/20">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Ticket</p>
              <p className="text-2xl font-bold text-accent">
                ${filteredAppointments > 0 
                  ? Math.round(filteredRevenue / filteredAppointments).toLocaleString() 
                  : '0'}
              </p>
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
              <p className="text-sm text-muted-foreground">Total Revenue ({periodLabel})</p>
              <p className="text-2xl font-bold text-accent">
                ${Math.round(filteredRevenue).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Appointments Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-accent/20">
              <Hash className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Appointments</p>
              <p className="text-2xl font-bold text-accent">
                {filteredAppointments.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
