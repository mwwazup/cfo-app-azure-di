import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useServices, useServiceActivities } from '../../hooks/useServices';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface TrackActivitiesCardProps {
  year: number;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function TrackActivitiesCard({ year }: TrackActivitiesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { services } = useServices();
  const { createActivity } = useServiceActivities(year);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [activityData, setActivityData] = useState<Record<string, { appointments: number; revenue: number }>>({});

  const handleInputChange = (serviceId: string, field: 'appointments' | 'revenue', value: string) => {
    setActivityData(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        appointments: prev[serviceId]?.appointments || 0,
        revenue: prev[serviceId]?.revenue || 0,
        [field]: field === 'revenue' ? parseFloat(value) || 0 : parseInt(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    const promises = Object.entries(activityData).map(([serviceId, data]) => {
      if (data.appointments > 0 || data.revenue > 0) {
        return createActivity({
          service_id: serviceId,
          year,
          month: selectedMonth,
          week_of_month: selectedWeek,
          appointments: data.appointments,
          total_revenue: data.revenue
        });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    setActivityData({});
    alert('Activities saved successfully!');
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
              <Calendar className="h-5 w-5" />
              Track Activities
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Record weekly appointments and revenue by service
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
        <CardContent className="space-y-4">
          {/* Month and Week Selection */}
          <div className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
              >
                {months.map((month, idx) => (
                  <option key={idx} value={idx + 1}>{month}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Week:</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value={1}>Week 1</option>
                <option value={2}>Week 2</option>
                <option value={3}>Week 3</option>
                <option value={4}>Week 4</option>
                <option value={5}>Week 5</option>
              </select>
            </div>
          </div>

          {/* Services Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Service</th>
                  <th className="text-left p-3 text-sm font-medium">Appointments</th>
                  <th className="text-left p-3 text-sm font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-t border-border">
                    <td className="p-3">
                      <span className="text-sm font-medium">{service.serviceName}</span>
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={activityData[service.id]?.appointments || ''}
                        onChange={(e) => handleInputChange(service.id, 'appointments', e.target.value)}
                        className="w-24"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="$0.00"
                        value={activityData[service.id]?.revenue || ''}
                        onChange={(e) => handleInputChange(service.id, 'revenue', e.target.value)}
                        className="w-32"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="flex items-center gap-2">
              Save Activities
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
