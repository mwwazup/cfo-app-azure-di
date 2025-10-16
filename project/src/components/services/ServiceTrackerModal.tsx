import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useServices, useServiceActivities, getWeekOfMonth, getWeekDates } from '../../hooks/useServices';
import { Plus, Trash2, Calendar, DollarSign, Hash, Palette, TrendingUp } from 'lucide-react';

// Simple toast replacement
const toast = {
  success: (message: string) => alert(message),
  error: (message: string) => alert(message),
};

interface ServiceTrackerModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const SERVICE_CATEGORIES = [
  'Recurring',
  'One-Time',
  'Seasonal',
  'Emergency',
  'Maintenance',
  'Installation',
  'Repair',
  'Consultation',
];

export function ServiceTrackerModal({ open, onClose }: ServiceTrackerModalProps) {
  const { services, createService, updateService, deleteService, loading: servicesLoading } = useServices();
  const [activeTab, setActiveTab] = useState<'services' | 'activities'>('services');
  
  // Service Management State
  const [newServices, setNewServices] = useState<Array<{
    name: string;
    category: string;
    color: string;
    defaultPrice: string;
    autoPricing: boolean;
  }>>([
    { name: '', category: '', color: DEFAULT_COLORS[0], defaultPrice: '', autoPricing: false },
    { name: '', category: '', color: DEFAULT_COLORS[1], defaultPrice: '', autoPricing: false },
    { name: '', category: '', color: DEFAULT_COLORS[2], defaultPrice: '', autoPricing: false },
    { name: '', category: '', color: DEFAULT_COLORS[3], defaultPrice: '', autoPricing: false },
  ]);

  // Activity Tracking State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [appointmentCount, setAppointmentCount] = useState<string>('');
  const [revenue, setRevenue] = useState<string>('');
  const [weeklyActivities, setWeeklyActivities] = useState<Array<{
    serviceId: string;
    date: string;
    appointments: string;
    revenue: string;
  }>>([]);

  const { createActivity } = useServiceActivities();

  const handleAddService = (index: number) => {
    const service = newServices[index];
    if (!service.name.trim()) {
      toast.error('Please enter a service name');
      return;
    }

    createService({
      serviceName: service.name,
      serviceCategory: service.category || undefined,
      color: service.color,
      defaultPrice: service.defaultPrice ? parseFloat(service.defaultPrice) : undefined,
      isAutoPricingEnabled: service.autoPricing,
      displayOrder: services.length + index,
    })
      .then(() => {
        toast.success(`${service.name} added successfully`);
        // Clear the form
        const updated = [...newServices];
        updated[index] = {
          name: '',
          category: '',
          color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          defaultPrice: '',
          autoPricing: false,
        };
        setNewServices(updated);
      })
      .catch((error) => {
        toast.error(`Failed to add service: ${error.message}`);
      });
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    if (confirm(`Are you sure you want to delete "${serviceName}"?`)) {
      deleteService(serviceId)
        .then(() => {
          toast.success(`${serviceName} deleted successfully`);
        })
        .catch((error) => {
          toast.error(`Failed to delete service: ${error.message}`);
        });
    }
  };

  const handleAddWeeklyActivity = () => {
    if (!selectedServiceId) {
      toast.error('Please select a service');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!appointmentCount || parseInt(appointmentCount) <= 0) {
      toast.error('Please enter a valid appointment count');
      return;
    }

    const selectedService = services.find(s => s.id === selectedServiceId);
    const needsRevenue = !selectedService?.isAutoPricingEnabled;

    if (needsRevenue && (!revenue || parseFloat(revenue) <= 0)) {
      toast.error('Please enter revenue amount');
      return;
    }

    // Add to weekly activities list
    setWeeklyActivities([
      ...weeklyActivities,
      {
        serviceId: selectedServiceId,
        date: selectedDate,
        appointments: appointmentCount,
        revenue: revenue,
      },
    ]);

    // Clear form
    setAppointmentCount('');
    setRevenue('');
    
    toast.success('Activity added to list');
  };

  const handleRemoveWeeklyActivity = (index: number) => {
    setWeeklyActivities(weeklyActivities.filter((_, i) => i !== index));
  };

  const handleSaveActivities = async () => {
    if (weeklyActivities.length === 0) {
      toast.error('No activities to save');
      return;
    }

    try {
      for (const activity of weeklyActivities) {
        const date = new Date(activity.date);
        const { start, end } = getWeekDates(date);
        const weekOfMonth = getWeekOfMonth(date);

        await createActivity({
          serviceId: activity.serviceId,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          weekOfMonth,
          weekStartDate: start.toISOString().split('T')[0],
          weekEndDate: end.toISOString().split('T')[0],
          appointmentCount: parseInt(activity.appointments),
          totalRevenue: activity.revenue ? parseFloat(activity.revenue) : undefined,
        });
      }

      toast.success(`${weeklyActivities.length} activities saved successfully`);
      setWeeklyActivities([]);
      setActiveTab('services'); // Switch back to services tab
    } catch (error) {
      toast.error(`Failed to save activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const updateNewService = (index: number, field: string, value: any) => {
    const updated = [...newServices];
    updated[index] = { ...updated[index], [field]: value };
    setNewServices(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Service Tracker
          </DialogTitle>
          <DialogDescription>
            Manage your services and track weekly appointments and revenue
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'services' | 'activities')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services">Manage Services</TabsTrigger>
            <TabsTrigger value="activities">Track Activities</TabsTrigger>
          </TabsList>

          {/* STEP 1: Add/Edit Services */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Services */}
                {services.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Active Services</Label>
                    <div className="grid gap-2">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: service.color || '#3B82F6' }}
                            />
                            <div>
                              <p className="font-medium">{service.serviceName}</p>
                              {service.serviceCategory && (
                                <p className="text-xs text-gray-500">{service.serviceCategory}</p>
                              )}
                              {service.isAutoPricingEnabled && service.defaultPrice && (
                                <p className="text-xs text-green-600">
                                  Auto-pricing: ${Number(service.defaultPrice).toFixed(2)}/appointment
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(service.id, service.serviceName)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Services */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Add New Services (Top 4)</Label>
                  <div className="grid gap-4">
                    {newServices.map((service, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 bg-white">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Service Name *</Label>
                            <Input
                              placeholder="e.g., Sprinkler Repair"
                              value={service.name}
                              onChange={(e) => updateNewService(index, 'name', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={service.category}
                              onValueChange={(v) => updateNewService(index, 'category', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {SERVICE_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs flex items-center gap-1">
                              <Palette className="h-3 w-3" />
                              Color
                            </Label>
                            <div className="flex gap-2">
                              {DEFAULT_COLORS.slice(0, 4).map((color) => (
                                <button
                                  key={color}
                                  className={`w-8 h-8 rounded-full border-2 ${
                                    service.color === color ? 'border-gray-900' : 'border-gray-300'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateNewService(index, 'color', color)}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Default Price</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={service.defaultPrice}
                              onChange={(e) => updateNewService(index, 'defaultPrice', e.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={service.autoPricing}
                                onChange={(e) => updateNewService(index, 'autoPricing', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs">Auto-calculate revenue</span>
                            </label>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleAddService(index)}
                          disabled={!service.name.trim()}
                          size="sm"
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STEP 2: Track Activities */}
          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Service Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service *</Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: service.color || '#3B82F6' }}
                              />
                              {service.serviceName}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Date (Week will be auto-calculated)
                    </Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Appointments *
                    </Label>
                    <Input
                      type="number"
                      placeholder="Number of appointments"
                      value={appointmentCount}
                      onChange={(e) => setAppointmentCount(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Revenue {services.find(s => s.id === selectedServiceId)?.isAutoPricingEnabled && '(Auto)'}
                    </Label>
                    <Input
                      type="number"
                      placeholder="Total revenue"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      disabled={services.find(s => s.id === selectedServiceId)?.isAutoPricingEnabled}
                    />
                  </div>
                </div>

                <Button onClick={handleAddWeeklyActivity} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to List
                </Button>

                {/* Weekly Activities List */}
                {weeklyActivities.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-semibold">Activities to Save</Label>
                    <div className="space-y-2">
                      {weeklyActivities.map((activity, index) => {
                        const service = services.find(s => s.id === activity.serviceId);
                        const date = new Date(activity.date);
                        const { start, end } = getWeekDates(date);
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: service?.color || '#3B82F6' }}
                                />
                                <span className="font-medium">{service?.serviceName}</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Week of {start.toLocaleDateString()} - {end.toLocaleDateString()} • {activity.appointments} appointments
                                {activity.revenue && ` • $${parseFloat(activity.revenue).toLocaleString()}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveWeeklyActivity(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <Button onClick={handleSaveActivities} className="w-full mt-4">
                      Save All Activities ({weeklyActivities.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
