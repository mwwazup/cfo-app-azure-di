import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Users, Clock, DollarSign, Briefcase, UserPlus, Trash2, Plus } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import type { CrewWorkDay } from '../../services/crewService';
import type { Service } from '../../hooks/useServices';

interface ServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  jobs: number;
  hours: number;
  revenue: number;
}

interface CrewMemberEdit {
  employeeId: string;
  employeeName: string;
  recordId: string;
  isHelper: boolean;
  baseRate: number;
  roleId?: string;
  bonusPercentage?: number;
}

interface MasterCrewEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    date: string;
    totalHours: number;
    serviceBreakdown: ServiceBreakdownItem[];
    notes: string;
    crewMembers: CrewMemberEdit[];
  }) => Promise<void>;
  crewWorkDay: CrewWorkDay | null;
  crewName: string;
  services: Service[];
  allEmployees: Array<{
    id: string;
    name: string;
    position: string;
    base_rate: number;
  }>;
  crewMemberIds: string[]; // IDs of employees who are permanent crew members
  crewMembers: Array<{
    employee_id: string;
    role_id?: string;
    bonus_percentage?: number;
  }>; // Crew members with role info
}

export function MasterCrewEditModal({
  open,
  onClose,
  onSave,
  crewWorkDay,
  crewName,
  services,
  allEmployees,
  crewMemberIds,
  crewMembers: crewMembersWithRoles
}: MasterCrewEditModalProps) {
  const [totalHours, setTotalHours] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdownItem[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMemberEdit[]>([]);
  const [showHelperSelector, setShowHelperSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Initialize form when crewWorkDay changes
  useEffect(() => {
    if (open && crewWorkDay) {
      setTotalHours(crewWorkDay.totalHours.toString());
      setNotes('');
      
      // Convert service breakdown
      const breakdown: ServiceBreakdownItem[] = crewWorkDay.serviceBreakdown.map(s => {
        const service = services.find(svc => svc.serviceName === s.serviceName);
        return {
          serviceId: service?.id || '',
          serviceName: s.serviceName,
          jobs: s.jobs,
          hours: s.hours,
          revenue: s.revenue
        };
      });
      
      if (breakdown.length === 0) {
        breakdown.push({
          serviceId: services[0]?.id || '',
          serviceName: services[0]?.serviceName || '',
          jobs: 1,
          hours: 0,
          revenue: 0
        });
      }
      setServiceBreakdown(breakdown);
      
      // Convert crew members - include role info from crewMembersWithRoles
      const members: CrewMemberEdit[] = crewWorkDay.crewMembers.map(m => {
        const emp = allEmployees.find(e => e.id === m.employeeId);
        const memberRoleInfo = crewMembersWithRoles.find(cm => cm.employee_id === m.employeeId);
        return {
          employeeId: m.employeeId,
          employeeName: m.employeeName,
          recordId: m.recordId,
          isHelper: m.isHelper,
          baseRate: emp?.base_rate || 0,
          roleId: memberRoleInfo?.role_id,
          bonusPercentage: memberRoleInfo?.bonus_percentage
        };
      });
      setCrewMembers(members);
      setValidationError('');
    }
  }, [open, crewWorkDay, services, allEmployees, crewMembersWithRoles]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalJobs = serviceBreakdown.filter(s => s.serviceId).length;
    const totalJobTime = serviceBreakdown.reduce((sum, s) => sum + (s.hours || 0), 0);
    const totalRevenue = serviceBreakdown.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const dailyHours = parseFloat(totalHours) || 0;
    const nonJobTime = dailyHours - totalJobTime;
    
    return { totalJobs, totalJobTime, totalRevenue, dailyHours, nonJobTime };
  }, [serviceBreakdown, totalHours]);

  // Add service row
  const handleAddServiceRow = () => {
    setServiceBreakdown([...serviceBreakdown, {
      serviceId: '',
      serviceName: '',
      jobs: 1,
      hours: 0,
      revenue: 0
    }]);
  };

  // Remove service row
  const removeServiceRow = (index: number) => {
    setServiceBreakdown(serviceBreakdown.filter((_, i) => i !== index));
  };

  // Update service row
  const updateServiceRow = (index: number, field: keyof ServiceBreakdownItem, value: string | number) => {
    const updated = [...serviceBreakdown];
    if (field === 'serviceId') {
      const service = services.find(s => s.id === value);
      updated[index] = {
        ...updated[index],
        serviceId: value as string,
        serviceName: service?.serviceName || ''
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setServiceBreakdown(updated);
  };

  // Add helper
  const addHelper = (employeeId: string) => {
    const emp = allEmployees.find(e => e.id === employeeId);
    if (emp && !crewMembers.some(m => m.employeeId === employeeId)) {
      setCrewMembers([...crewMembers, {
        employeeId: emp.id,
        employeeName: emp.name,
        recordId: '', // New helper, no existing record
        isHelper: true,
        baseRate: emp.base_rate || 0
      }]);
    }
    setShowHelperSelector(false);
  };

  // Remove helper
  const removeHelper = (employeeId: string) => {
    setCrewMembers(crewMembers.filter(m => m.employeeId !== employeeId));
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!serviceBreakdown.some(s => s.serviceId)) {
      setValidationError('Please add at least one appointment');
      return;
    }
    
    const hours = parseFloat(totalHours);
    if (!hours || hours <= 0) {
      setValidationError('Please enter total daily hours');
      return;
    }

    if (crewMembers.length === 0) {
      setValidationError('At least one crew member is required');
      return;
    }

    setValidationError('');
    setSaving(true);
    
    try {
      await onSave({
        date: crewWorkDay?.date || '',
        totalHours: hours,
        serviceBreakdown,
        notes,
        crewMembers
      });
      onClose();
    } catch (error) {
      console.error('Error saving crew day:', error);
      setValidationError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get available helpers (employees not already in crew)
  const availableHelpers = allEmployees.filter(
    emp => !crewMembers.some(m => m.employeeId === emp.id)
  );

  const regularMembers = crewMembers.filter(m => !m.isHelper);
  const helpers = crewMembers.filter(m => m.isHelper);

  if (!crewWorkDay) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Edit Crew Day - {crewName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Display (read-only) */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-semibold text-foreground">
                  {new Date(crewWorkDay.date + 'T00:00:00').toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <Badge variant="outline" className="text-accent border-accent">
                {crewMembers.length} Members
              </Badge>
            </div>
          </div>

          {/* Crew Members Section */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Crew Members
            </h4>
            
            <div className="bg-muted/20 rounded-lg p-4 border border-border space-y-3">
              {/* Regular crew members */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Regular Crew</p>
                <div className="flex flex-wrap gap-2">
                  {regularMembers.map(member => (
                    <Badge key={member.employeeId} variant="outline" className="text-sm py-1 px-3">
                      {member.employeeName}
                      <span className="ml-2 text-muted-foreground">${member.baseRate.toFixed(2)}/hr</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Helpers */}
              {helpers.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">Helpers</p>
                  <div className="flex flex-wrap gap-2">
                    {helpers.map(helper => (
                      <Badge key={helper.employeeId} variant="secondary" className="text-sm py-1 px-3 bg-accent/20 text-accent">
                        {helper.employeeName}
                        <span className="ml-2 text-muted-foreground">${helper.baseRate.toFixed(2)}/hr</span>
                        <button
                          onClick={() => removeHelper(helper.employeeId)}
                          className="ml-2 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Helper Button */}
              {!showHelperSelector ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHelperSelector(true)}
                  className="mt-2"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Helper
                </Button>
              ) : (
                <div className="mt-3 p-3 bg-background/10 rounded-lg border border-border">
                  <Label className="text-sm text-foreground mb-2 block">Select Helper</Label>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {availableHelpers.map(emp => (
                      <div
                        key={emp.id}
                        onClick={() => addHelper(emp.id)}
                        className="p-2 rounded hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                      >
                        <span className="text-foreground">{emp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">{emp.position}</span>
                          <span className="text-muted-foreground text-sm">${emp.base_rate.toFixed(2)}/hr</span>
                        </div>
                      </div>
                    ))}
                    {availableHelpers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        All employees are already in the crew
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelperSelector(false)}
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Appointments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-accent" />
                Appointments
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddServiceRow}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Appointment
              </Button>
            </div>

            {serviceBreakdown.map((item, index) => (
              <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Appointment {index + 1}</span>
                  {serviceBreakdown.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeServiceRow(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Service Selection */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Service</Label>
                    <Select
                      value={item.serviceId}
                      onValueChange={(value) => updateServiceRow(index, 'serviceId', value)}
                    >
                      <SelectTrigger className="w-full bg-muted/30">
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.serviceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Time */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Job Time (hrs)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={item.hours || ''}
                      onChange={(e) => updateServiceRow(index, 'hours', parseFloat(e.target.value) || 0)}
                      className="bg-background text-foreground border-border"
                      placeholder="Time on job"
                    />
                  </div>

                  {/* Revenue */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Revenue ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.revenue || ''}
                      onChange={(e) => updateServiceRow(index, 'revenue', parseFloat(e.target.value) || 0)}
                      className="bg-background text-foreground border-border"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Daily Hours */}
          <div>
            <Label htmlFor="totalHours" className="text-foreground font-semibold mb-3">
              Total Daily Hours (Clock In/Out) *
            </Label>
            <Input
              id="totalHours"
              type="number"
              step="0.25"
              min="0"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              className="bg-background text-foreground border-border"
              placeholder="e.g., 8.0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total hours each crew member was clocked in (used for pay calculation)
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-foreground mb-3">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Add any notes about this crew day..."
            />
          </div>

          {/* Daily Summary */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
            <h4 className="font-semibold text-foreground mb-3">Daily Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-lg font-bold text-accent">{totals.totalJobs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Time</p>
                <p className="text-lg font-bold text-accent">{totals.totalJobTime.toFixed(2)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Hours</p>
                <p className="text-lg font-bold text-accent">{totals.dailyHours.toFixed(2)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-accent">${totals.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            {totals.nonJobTime > 0 && (
              <div className="mt-3 pt-3 border-t border-accent/20">
                <p className="text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Non-job time: {totals.nonJobTime.toFixed(2)} hrs (travel, breaks, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Info about what will be updated */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Saving will update records for all {crewMembers.length} crew members.
            </p>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-500">{validationError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="border-border text-foreground hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
