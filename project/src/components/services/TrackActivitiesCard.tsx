import { useState, useEffect } from 'react';
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
  const { activities, createActivity } = useServiceActivities(year);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [activityData, setActivityData] = useState<Record<string, { appointments: number; revenue: number }>>({});

  // Load existing activities when month/week changes
  useEffect(() => {
    const existingData: Record<string, { appointments: number; revenue: number }> = {};
    
    // Filter activities for selected month and week
    const weekActivities = activities.filter(
      activity => activity.month === selectedMonth && activity.weekOfMonth === selectedWeek
    );
    
    // Populate activityData with existing values
    weekActivities.forEach(activity => {
      existingData[activity.serviceId] = {
        appointments: activity.appointmentCount || 0,
        revenue: Math.round(Number(activity.totalRevenue) || 0)
      };
    });
    
    setActivityData(existingData);
  }, [activities, selectedMonth, selectedWeek]);

  const handleInputChange = (serviceId: string, field: 'appointments' | 'revenue', value: string) => {
    setActivityData(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        appointments: prev[serviceId]?.appointments || 0,
        revenue: prev[serviceId]?.revenue || 0,
        [field]: field === 'revenue' ? Math.round(parseFloat(value) || 0) : parseInt(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    try {
      // Calculate week start and end dates
      const firstDayOfMonth = new Date(year, selectedMonth - 1, 1);
      const dayOfWeek = firstDayOfMonth.getDay();
      const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
      
      // Calculate start date of the selected week
      const weekStartDay = 1 + (selectedWeek - 1) * 7 + offset;
      const weekStart = new Date(year, selectedMonth - 1, weekStartDay);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      const weekStartDate = formatDate(weekStart);
      const weekEndDate = formatDate(weekEnd);

      const promises = Object.entries(activityData).map(([serviceId, data]) => {
        if (data.appointments > 0 || data.revenue > 0) {
          return createActivity({
            serviceId: serviceId,
            year,
            month: selectedMonth,
            weekOfMonth: selectedWeek,
            weekStartDate,
            weekEndDate,
            appointmentCount: data.appointments,
            totalRevenue: data.revenue
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      // Don't clear activityData - let it persist so users can see and edit
      alert('Activities saved successfully! You can continue editing or select a different week.');
    } catch (error) {
      console.error('Error saving activities:', error);
      alert('Failed to save activities. Please try again.');
    }
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
              Record weekly appointments and revenue by service. Previously saved data will load automatically for editing.
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
                        step="1"
                        placeholder="$0"
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              onClick={() => setActivityData({})} 
              variant="outline"
              className="flex items-center gap-2"
            >
              Clear All
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2">
              Save Activities
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
