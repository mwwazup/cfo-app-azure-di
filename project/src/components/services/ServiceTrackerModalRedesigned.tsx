import { useState } from 'react';
import { X, Plus, Trash2, Edit2, Calendar, DollarSign, Hash, Save, TrendingUp, Activity } from 'lucide-react';
import { useServices, useServiceActivities, getWeekOfMonth, getWeekDates } from '../../hooks/useServices';
import { Button } from '../ui/button';

interface ServiceTrackerModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'services' | 'activities';
}

// Gold accent color for all services
const ACCENT_COLOR = '#D0B46A'; // Gold accent

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

export function ServiceTrackerModal({ open, onClose, defaultTab = 'activities' }: ServiceTrackerModalProps) {
  const { services, createService, updateService, deleteService, refreshServices } = useServices();
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const { createActivity, activities } = useServiceActivities(filterYear);
  
  // Service Management State
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [cogsCost, setCogsCost] = useState('');
  const [autoPricing, setAutoPricing] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Activity Tracking State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentCount, setAppointmentCount] = useState('');
  const [revenue, setRevenue] = useState('');
  const [weeklyActivities, setWeeklyActivities] = useState<Array<{
    serviceId: string;
    date: string;
    appointments: string;
    revenue: string;
  }>>([]);
  const [existingActivity, setExistingActivity] = useState<any>(null);
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'track' | 'manage'>(defaultTab === 'services' ? 'manage' : 'track');
  const showOnlyServices = defaultTab === 'services';

  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  const handleAddService = async () => {
    if (!serviceName.trim()) {
      alert('Please enter a service name');
      return;
    }

    try {
      setIsSaving(true);
      await createService({
        serviceName,
        serviceCategory: serviceCategory || undefined,
        color: ACCENT_COLOR,
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
        cogsCost: cogsCost ? parseFloat(cogsCost) : undefined,
        isAutoPricingEnabled: autoPricing,
        displayOrder: services.length,
      });

      // Clear form
      setServiceName('');
      setServiceCategory('');
      setDefaultPrice('');
      setCogsCost('');
      setAutoPricing(false);
      
      // Refresh services list
      await refreshServices();
      
      alert(`${serviceName} added successfully`);
    } catch (error) {
      alert(`Failed to add service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditService = (service: any) => {
    setEditingServiceId(service.id);
    setServiceName(service.serviceName);
    setServiceCategory(service.serviceCategory || '');
    setDefaultPrice(service.defaultPrice ? service.defaultPrice.toString() : '');
    setCogsCost(service.cogsCost ? service.cogsCost.toString() : '');
    setAutoPricing(service.isAutoPricingEnabled || false);
  };

  const handleSaveService = async () => {
    if (!serviceName.trim() || !editingServiceId) {
      alert('Please enter a service name');
      return;
    }

    try {
      setIsSaving(true);
      await updateService(editingServiceId, {
        serviceName,
        serviceCategory: serviceCategory || undefined,
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
        cogsCost: cogsCost ? parseFloat(cogsCost) : undefined,
        isAutoPricingEnabled: autoPricing,
      });

      // Clear form
      setEditingServiceId(null);
      setServiceName('');
      setServiceCategory('');
      setDefaultPrice('');
      setCogsCost('');
      setAutoPricing(false);
      
      // Refresh services list
      await refreshServices();
      
      alert('Service updated successfully');
    } catch (error) {
      alert(`Failed to update service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setServiceName('');
    setServiceCategory('');
    setDefaultPrice('');
    setCogsCost('');
    setAutoPricing(false);
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (confirm(`Are you sure you want to delete "${serviceName}"?`)) {
      try {
        await deleteService(serviceId);
        alert(`${serviceName} deleted successfully`);
      } catch (error) {
        alert(`Failed to delete service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleClearForm = () => {
    setSelectedServiceId('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setAppointmentCount('');
    setRevenue('');
    setExistingActivity(null);
  };

  const handleAddWeeklyActivity = () => {
    if (!selectedServiceId) {
      alert('Please select a service');
      return;
    }
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }
    if (!appointmentCount || parseInt(appointmentCount) <= 0) {
      alert('Please enter a valid appointment count');
      return;
    }

    const selectedService = services.find(s => s.id === selectedServiceId);
    const needsRevenue = !selectedService?.isAutoPricingEnabled;

    if (needsRevenue && (!revenue || parseFloat(revenue) <= 0)) {
      alert('Please enter revenue amount');
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
    
    alert('Activity added to list');
  };

  const handleRemoveWeeklyActivity = (index: number) => {
    setWeeklyActivities(weeklyActivities.filter((_, i) => i !== index));
  };

  const handleSaveActivities = async () => {
    if (weeklyActivities.length === 0) {
      alert('No activities to save');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving activities:', weeklyActivities);
      
      for (const activity of weeklyActivities) {
        const date = new Date(activity.date);
        const { start, end } = getWeekDates(date);
        const weekOfMonth = getWeekOfMonth(date);

        console.log('Creating activity:', {
          serviceId: activity.serviceId,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          weekOfMonth,
          weekStartDate: start.toISOString().split('T')[0],
          weekEndDate: end.toISOString().split('T')[0],
          appointmentCount: parseInt(activity.appointments),
          totalRevenue: activity.revenue ? parseFloat(activity.revenue) : undefined,
        });

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
        
        console.log('Activity created successfully');
      }

      alert(`${weeklyActivities.length} ${weeklyActivities.length === 1 ? 'activity' : 'activities'} saved successfully! (New entries created or existing ones updated)`);
      setWeeklyActivities([]);
    } catch (error) {
      console.error('Failed to save activities:', error);
      alert(`Failed to save activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <style>
        {`
          /* Make calendar icon white and visible on dark background */
          input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            cursor: pointer;
            opacity: 1;
          }
          input[type="date"] {
            color-scheme: dark;
          }
        `}
      </style>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Service Tracker
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-6 w-6" style={{ color: 'white' }} />
            </button>
          </div>

          {/* Tabs - Only show if not in services-only mode */}
          {!showOnlyServices && (
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('track')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'track'
                    ? 'text-accent border-b-2 border-accent bg-accent/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                Track Activities
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'manage'
                    ? 'text-accent border-b-2 border-accent bg-accent/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                Manage Services
              </button>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Tab: Manage Services */}
            {activeTab === 'manage' && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Your Services</h3>
              
              {/* Existing Services */}
              {services.length > 0 && (
                <div className="space-y-2 mb-6">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-background"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: service.color || '#3B82F6' }}
                        />
                        <div>
                          <p className="font-medium text-foreground">{service.serviceName}</p>
                          {service.serviceCategory && (
                            <p className="text-xs text-muted-foreground">{service.serviceCategory}</p>
                          )}
                          <div className="flex gap-3 mt-1">
                            {service.defaultPrice && (
                              <p className="text-xs text-blue-400">
                                Price: ${Number(service.defaultPrice).toFixed(2)}
                              </p>
                            )}
                            {service.cogsCost && (
                              <p className="text-xs text-orange-400">
                                COGS: ${Number(service.cogsCost).toFixed(2)}
                              </p>
                            )}
                          </div>
                          {service.isAutoPricingEnabled && (
                            <p className="text-xs text-green-400">
                              Auto-pricing enabled
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditService(service)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                          title="Edit service"
                        >
                          <Edit2 className="h-4 w-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id, service.serviceName)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                          title="Delete service"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Service Form */}
              <div className="p-4 border border-border rounded-lg bg-background space-y-4">
                <h4 className="text-sm font-medium text-foreground">
                  {editingServiceId ? 'Edit Service' : 'Add New Service'}
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Lawn Mowing"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category
                    </label>
                    <select
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                    >
                      <option value="">Select category</option>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Default Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      COGS Cost (per service)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cogsCost}
                      onChange={(e) => setCogsCost(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPricing}
                      onChange={(e) => setAutoPricing(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-foreground">Auto-calculate revenue</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  {editingServiceId && (
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={editingServiceId ? handleSaveService : handleAddService}
                    disabled={!serviceName.trim() || isSaving}
                    className="flex-1"
                  >
                    {editingServiceId ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            )}

            {/* Tab: Track Activities */}
            {activeTab === 'track' && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Track Weekly Activity</h3>
              
              <div className="p-4 border border-border rounded-lg bg-background space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Service * {services.length === 0 && '(Add a service first)'}
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => {
                        console.log('Selected service:', e.target.value);
                        setSelectedServiceId(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                      disabled={services.length === 0}
                    >
                      <option value="">Select service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.serviceName}
                        </option>
                      ))}
                    </select>
                    {existingActivity && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ⚠️ Activity exists for this week - editing will update it
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date (Week auto-calculated)
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Hash className="h-4 w-4 inline mr-1" />
                      Appointments *
                    </label>
                    <input
                      type="number"
                      placeholder="Number of appointments"
                      value={appointmentCount}
                      onChange={(e) => setAppointmentCount(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Revenue {services.find(s => s.id === selectedServiceId)?.isAutoPricingEnabled && '(Auto)'}
                    </label>
                    <input
                      type="number"
                      placeholder="Total revenue"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      disabled={services.find(s => s.id === selectedServiceId)?.isAutoPricingEnabled}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent bg-background text-foreground disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleAddWeeklyActivity} 
                    disabled={!selectedServiceId || !selectedDate || !appointmentCount}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {existingActivity ? 'Update Activity' : 'Add to List'}
                  </Button>
                  <Button 
                    onClick={handleClearForm}
                    variant="outline"
                  >
                    Clear Form
                  </Button>
                </div>

                {/* Weekly Activities List */}
                {weeklyActivities.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <label className="block text-sm font-medium text-foreground">Activities to Save</label>
                    {weeklyActivities.map((activity, index) => {
                      const service = services.find(s => s.id === activity.serviceId);
                      const date = new Date(activity.date);
                      const { start, end } = getWeekDates(date);
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: service?.color || '#3B82F6' }}
                              />
                              <span className="font-medium text-foreground">{service?.serviceName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Week of {start.toLocaleDateString()} - {end.toLocaleDateString()} • {activity.appointments} appointments
                              {activity.revenue && ` • $${parseFloat(activity.revenue).toLocaleString()}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveWeeklyActivity(index)}
                            className="p-2 hover:bg-gray-700 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      );
                    })}

                    <Button onClick={handleSaveActivities} disabled={isSaving} className="w-full mt-4">
                      <Save className="h-4 w-4 mr-2" />
                      Save All Activities ({weeklyActivities.length})
                    </Button>
                  </div>
                )}

                {/* Existing Activities */}
                <div className="mt-6 p-4 border border-blue-500/20 rounded-lg bg-blue-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Existing Activities
                    </h4>
                    <div className="flex items-center gap-2">
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-2 py-1 text-xs border border-border rounded-md bg-background text-foreground"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="px-2 py-1 text-xs border border-border rounded-md bg-background text-foreground"
                      >
                        <option value="all">All Months</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                    </div>
                  </div>
                  
                  {activities.length > 0 ? (
                    <>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {activities
                          .filter((activity) => filterMonth === 'all' || activity.month === filterMonth)
                          .sort((a, b) => {
                            if (a.year !== b.year) return b.year - a.year;
                            if (a.month !== b.month) return b.month - a.month;
                            return b.weekOfMonth - a.weekOfMonth;
                          })
                          .map((activity) => {
                            const service = services.find(s => s.id === activity.serviceId);
                            const isSelected = existingActivity?.id === activity.id;
                            return (
                              <button
                                key={activity.id}
                                onClick={() => {
                                  setSelectedServiceId(activity.serviceId);
                                  setSelectedDate(activity.weekStartDate);
                                  setAppointmentCount(activity.appointmentCount?.toString() || '');
                                  setRevenue(activity.totalRevenue?.toString() || '');
                                  setExistingActivity(activity);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer hover:bg-background/80 ${
                                  isSelected ? 'bg-accent/20 border border-accent' : 'bg-background'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: service?.color || '#3B82F6' }}
                                  />
                                  <span className="text-foreground font-medium">{service?.serviceName || 'Unknown'}</span>
                                  <span className="text-gray-400">
                                    {activity.year}/{activity.month}/Week {activity.weekOfMonth}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-400">{activity.appointmentCount} appts</span>
                                  <span className="text-accent font-medium">${Number(activity.totalRevenue).toLocaleString()}</span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                        <p className="text-gray-400">💡 Click any activity above to edit it</p>
                        <div className="flex items-center gap-4 font-medium">
                          <span className="text-foreground">
                            {activities.filter((activity) => filterMonth === 'all' || activity.month === filterMonth).reduce((sum, a) => sum + (a.appointmentCount || 0), 0)} total appts
                          </span>
                          <span className="text-accent">
                            ${activities.filter((activity) => filterMonth === 'all' || activity.month === filterMonth).reduce((sum, a) => sum + Number(a.totalRevenue || 0), 0).toLocaleString()} total
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No activities found for {filterYear}</p>
                      <p className="text-xs mt-1">Try selecting a different year or add some activities!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-6 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
