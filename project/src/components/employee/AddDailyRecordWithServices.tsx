import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useServices } from '../../hooks/useServices';

// Company Settings
export const COMPANY_SETTINGS = {
  overheadPercent: 32,
  bonusThresholdMin: 25,
  bonusThresholdMax: 100,
  overtimeHoursDaily: 12,
  overtimeMultiplier: 1.5,
  paySchedule: 'bi-weekly' as 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly',
  payDayOfWeek: 5,
  payReferenceDate: undefined as string | undefined,
  paySemiMonthlyDates: [1, 15] as [number, number]
};

interface ServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  jobs: number;
  hours: number;
  revenue: number;
}

interface DailyRecord {
  workDay: string;
  date: string;
  calledOut: boolean;
  numberOfJobs: number;
  jobTypes: {
    [serviceName: string]: number;
  };
  totalJobRevenue: number;
  totalHoursWorked: number;
  totalJobTime: number;
  baseRate: number;
  employeeBasePay: number;
  overtimeHours: number;
  overtimePay: number;
  cogsNoLabor: number;
  cogsNoLaborPercent: number;
  overheadCostsPercent: number;
  grossProfitBeforeBonus: number;
  grossProfitBeforeBonusPercent: number;
  ler: number;
  qualifyForBonus: boolean;
  bonusQualifiedForPercent: number;
  appointmentBasedBonus: number;
  tipAmount: number;
  totalEmployeePay: number;
  dailyHourlyWithTipsAndBonus: number;
  dailyNetProfitAfterBonus: number;
  dailyNetProfitAfterBonusPercent: number;
  notes: string;
  serviceBreakdown?: ServiceBreakdownItem[]; // NEW: Service breakdown
}

interface AddDailyRecordWithServicesProps {
  open: boolean;
  onClose: () => void;
  onAdd: (record: DailyRecord, serviceBreakdown: ServiceBreakdownItem[]) => void;
  baseRate: number;
  enableOvertime?: boolean;
  editingRecord?: DailyRecord | null;
  onUpdate?: (record: DailyRecord, serviceBreakdown: ServiceBreakdownItem[]) => void;
  servicesWithCOGS: { [serviceName: string]: number };
}

// Helper function to round to 2 decimal places
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export function AddDailyRecordWithServices({ 
  open, 
  onClose, 
  onAdd, 
  baseRate, 
  enableOvertime = false, 
  editingRecord = null, 
  onUpdate,
  servicesWithCOGS 
}: AddDailyRecordWithServicesProps) {
  const { services } = useServices(); // Fetch services from database
  
  const [date, setDate] = useState('');
  const [tips, setTips] = useState('0');
  const [notes, setNotes] = useState('');
  const [applyOvertime, setApplyOvertime] = useState(enableOvertime);
  
  // NEW: Service breakdown state
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdownItem[]>([]);
  const [validationError, setValidationError] = useState<string>('');

  // Initialize with one empty service row
  useEffect(() => {
    if (open && !editingRecord) {
      setServiceBreakdown([{
        serviceId: '',
        serviceName: '',
        jobs: 0,
        hours: 0,
        revenue: 0
      }]);
    }
  }, [open, editingRecord]);

  // Load editing record data
  useEffect(() => {
    if (editingRecord && open) {
      setDate(editingRecord.date);
      setTips(editingRecord.tipAmount.toString());
      setNotes(editingRecord.notes || '');
      
      // Load service breakdown if it exists
      if (editingRecord.serviceBreakdown && editingRecord.serviceBreakdown.length > 0) {
        setServiceBreakdown(editingRecord.serviceBreakdown);
      } else {
        // Convert old format to new format
        const breakdown: ServiceBreakdownItem[] = [];
        Object.entries(editingRecord.jobTypes).forEach(([serviceName, jobs]) => {
          if (jobs > 0) {
            const service = services.find(s => s.serviceName === serviceName);
            breakdown.push({
              serviceId: service?.id || '',
              serviceName,
              jobs,
              hours: 0, // Will need to be filled in
              revenue: 0 // Will need to be filled in
            });
          }
        });
        setServiceBreakdown(breakdown.length > 0 ? breakdown : [{
          serviceId: '',
          serviceName: '',
          jobs: 0,
          hours: 0,
          revenue: 0
        }]);
      }
    }
  }, [editingRecord, open, services]);

  // Add new service row
  const addServiceRow = () => {
    setServiceBreakdown([...serviceBreakdown, {
      serviceId: '',
      serviceName: '',
      jobs: 0,
      hours: 0,
      revenue: 0
    }]);
  };

  // Remove service row
  const removeServiceRow = (index: number) => {
    if (serviceBreakdown.length > 1) {
      setServiceBreakdown(serviceBreakdown.filter((_, i) => i !== index));
    }
  };

  // Update service row
  const updateServiceRow = (index: number, field: keyof ServiceBreakdownItem, value: string | number) => {
    const updated = [...serviceBreakdown];
    
    if (field === 'serviceId') {
      const service = services.find(s => s.id === value);
      updated[index].serviceId = value as string;
      updated[index].serviceName = service?.serviceName || '';
    } else if (field === 'serviceName') {
      updated[index].serviceName = value as string;
    } else if (field === 'jobs') {
      updated[index].jobs = value as number;
    } else if (field === 'hours') {
      updated[index].hours = value as number;
    } else if (field === 'revenue') {
      updated[index].revenue = value as number;
    }
    
    setServiceBreakdown(updated);
  };

  // Calculate totals from service breakdown
  const calculateTotals = () => {
    const totalJobs = serviceBreakdown.reduce((sum, item) => sum + (item.jobs || 0), 0);
    const totalHours = serviceBreakdown.reduce((sum, item) => sum + (parseFloat(item.hours?.toString() || '0') || 0), 0);
    const totalRevenue = serviceBreakdown.reduce((sum, item) => sum + (parseFloat(item.revenue?.toString() || '0') || 0), 0);
    
    return { totalJobs, totalHours, totalRevenue };
  };

  // Validate service breakdown
  const validateBreakdown = (): boolean => {
    setValidationError('');
    
    // Check if at least one service is selected
    const hasServices = serviceBreakdown.some(item => item.serviceId && item.jobs > 0);
    if (!hasServices) {
      setValidationError('Please add at least one service with jobs completed');
      return false;
    }
    
    // Check for duplicate services
    const serviceIds = serviceBreakdown.map(item => item.serviceId).filter(id => id);
    const uniqueIds = new Set(serviceIds);
    if (serviceIds.length !== uniqueIds.size) {
      setValidationError('Cannot select the same service multiple times');
      return false;
    }
    
    // Check that all selected services have valid data
    for (const item of serviceBreakdown) {
      if (item.serviceId) {
        if (item.jobs <= 0) {
          setValidationError(`${item.serviceName}: Jobs must be greater than 0`);
          return false;
        }
        if (item.hours <= 0) {
          setValidationError(`${item.serviceName}: Hours must be greater than 0`);
          return false;
        }
        if (item.revenue <= 0) {
          setValidationError(`${item.serviceName}: Revenue must be greater than 0`);
          return false;
        }
      }
    }
    
    return true;
  };

  const calculatePreview = () => {
    const { totalJobs, totalHours, totalRevenue } = calculateTotals();
    
    // Calculate labor costs with optional overtime
    let regularHours = totalHours;
    let overtimeHours = 0;
    let employeeBaseHourlyPay = 0;
    let overtimePay = 0;
    
    if (applyOvertime && totalHours > COMPANY_SETTINGS.overtimeHoursDaily) {
      regularHours = COMPANY_SETTINGS.overtimeHoursDaily;
      overtimeHours = totalHours - COMPANY_SETTINGS.overtimeHoursDaily;
      employeeBaseHourlyPay = regularHours * baseRate;
      overtimePay = overtimeHours * (baseRate * COMPANY_SETTINGS.overtimeMultiplier);
    } else {
      employeeBaseHourlyPay = totalHours * baseRate;
    }
    
    const basePay = employeeBaseHourlyPay + overtimePay;
    
    // Calculate COGS dynamically based on services performed
    const cogsNoLaborDollars = serviceBreakdown.reduce((total, item) => {
      if (!item.serviceId) return total;
      const costPerService = servicesWithCOGS[item.serviceName] || 0;
      return total + (item.jobs * costPerService);
    }, 0);
    
    const cogsNoLaborPercent = totalRevenue > 0 ? (cogsNoLaborDollars / totalRevenue) * 100 : 0;
    
    // Calculate overhead allocation
    const overheadPercent = COMPANY_SETTINGS.overheadPercent;
    const overheadAllocationRate = totalRevenue * (overheadPercent / 100);
    
    // Calculate total cost of job
    const totalCostOfJob = basePay + cogsNoLaborDollars + overheadAllocationRate;
    
    // Calculate gross profit before bonus
    const grossProfitBeforeBonusDollars = totalRevenue - totalCostOfJob;
    const grossProfitBeforeBonusPercent = totalRevenue > 0 
      ? (grossProfitBeforeBonusDollars / totalRevenue) * 100
      : 0;
    
    // Calculate LER (Labor Efficiency Ratio)
    const ler = basePay > 0 ? grossProfitBeforeBonusDollars / basePay : 0;
    
    // Check if qualifies for bonus
    const qualifyForBonus = 
      grossProfitBeforeBonusPercent >= COMPANY_SETTINGS.bonusThresholdMin && 
      grossProfitBeforeBonusPercent <= COMPANY_SETTINGS.bonusThresholdMax;
    
    // Calculate Bonus Qualified For
    const bonusQualifiedForDollars = qualifyForBonus ? ler * totalHours : 0;
    
    // Calculate Appointment Based Bonus
    let appointmentBasedBonus = 0;
    if (totalJobs === 3) {
      appointmentBasedBonus = 7;
    } else if (totalJobs === 4) {
      appointmentBasedBonus = 10;
    } else if (totalJobs === 5) {
      appointmentBasedBonus = 15;
    } else if (totalJobs >= 6) {
      appointmentBasedBonus = 20;
    }
    
    const tipsDollars = parseFloat(tips) || 0;
    const totalEmployeePay = basePay + bonusQualifiedForDollars + appointmentBasedBonus + tipsDollars;
    const dailyHourlyWithTipsAndBonus = totalHours > 0 ? totalEmployeePay / totalHours : 0;
    const dailyNetProfitAfterBonus = totalRevenue - totalCostOfJob - bonusQualifiedForDollars - appointmentBasedBonus;
    const dailyNetProfitAfterBonusPercent = totalRevenue > 0 
      ? (dailyNetProfitAfterBonus / totalRevenue) * 100
      : 0;

    return {
      totalJobs,
      totalHours,
      totalRevenue,
      basePay: roundToTwo(basePay),
      overtimeHours: roundToTwo(overtimeHours),
      overtimePay: roundToTwo(overtimePay),
      cogsNoLabor: roundToTwo(cogsNoLaborDollars),
      cogsNoLaborPercent: roundToTwo(cogsNoLaborPercent),
      overheadCostsPercent: overheadPercent,
      grossProfitBeforeBonus: roundToTwo(grossProfitBeforeBonusDollars),
      grossProfitBeforeBonusPercent: roundToTwo(grossProfitBeforeBonusPercent),
      ler: roundToTwo(ler),
      qualifyForBonus,
      bonusQualifiedForPercent: roundToTwo(bonusQualifiedForDollars),
      appointmentBasedBonus,
      totalEmployeePay: roundToTwo(totalEmployeePay),
      dailyHourlyWithTipsAndBonus: roundToTwo(dailyHourlyWithTipsAndBonus),
      dailyNetProfitAfterBonus: roundToTwo(dailyNetProfitAfterBonus),
      dailyNetProfitAfterBonusPercent: roundToTwo(dailyNetProfitAfterBonusPercent)
    };
  };

  const preview = calculatePreview();

  const handleSubmit = () => {
    if (!date) {
      setValidationError('Please select a date');
      return;
    }
    
    if (!validateBreakdown()) {
      return;
    }

    const { totalJobs, totalHours, totalRevenue } = calculateTotals();
    
    // Build jobTypes object for backward compatibility
    const jobTypes: { [serviceName: string]: number } = {};
    serviceBreakdown.forEach(item => {
      if (item.serviceId && item.jobs > 0) {
        jobTypes[item.serviceName] = item.jobs;
      }
    });

    const dateObj = new Date(date + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workDay = dayNames[dateObj.getDay()];

    const record: DailyRecord = {
      workDay,
      date,
      calledOut: false,
      numberOfJobs: totalJobs,
      jobTypes,
      totalJobRevenue: totalRevenue,
      totalHoursWorked: totalHours,
      totalJobTime: totalHours,
      baseRate,
      employeeBasePay: preview.basePay,
      overtimeHours: preview.overtimeHours,
      overtimePay: preview.overtimePay,
      cogsNoLabor: preview.cogsNoLabor,
      cogsNoLaborPercent: preview.cogsNoLaborPercent,
      overheadCostsPercent: preview.overheadCostsPercent,
      grossProfitBeforeBonus: preview.grossProfitBeforeBonus,
      grossProfitBeforeBonusPercent: preview.grossProfitBeforeBonusPercent,
      ler: preview.ler,
      qualifyForBonus: preview.qualifyForBonus,
      bonusQualifiedForPercent: preview.bonusQualifiedForPercent,
      appointmentBasedBonus: preview.appointmentBasedBonus,
      tipAmount: parseFloat(tips) || 0,
      totalEmployeePay: preview.totalEmployeePay,
      dailyHourlyWithTipsAndBonus: preview.dailyHourlyWithTipsAndBonus,
      dailyNetProfitAfterBonus: preview.dailyNetProfitAfterBonus,
      dailyNetProfitAfterBonusPercent: preview.dailyNetProfitAfterBonusPercent,
      notes,
      serviceBreakdown: serviceBreakdown.filter(item => item.serviceId && item.jobs > 0)
    };

    // Filter out empty service rows
    const validServiceBreakdown = serviceBreakdown.filter(item => item.serviceId && item.jobs > 0);

    if (editingRecord && onUpdate) {
      onUpdate(record, validServiceBreakdown);
    } else {
      onAdd(record, validServiceBreakdown);
    }

    // Reset form
    setDate('');
    setTips('0');
    setNotes('');
    setServiceBreakdown([{
      serviceId: '',
      serviceName: '',
      jobs: 0,
      hours: 0,
      revenue: 0
    }]);
    setValidationError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editingRecord ? 'Edit Daily Record' : 'Add Daily Record'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date */}
          <div>
            <Label htmlFor="date" className="text-foreground">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background text-foreground border-border"
            />
          </div>

          {/* Service Breakdown Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground font-semibold">Service Breakdown</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addServiceRow}
                className="bg-accent/20 text-accent border-accent/50 hover:bg-accent/30"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
            </div>

            {serviceBreakdown.map((item, index) => (
              <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Service {index + 1}</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Service Selection */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Service</Label>
                    <select
                      value={item.serviceId}
                      onChange={(e) => updateServiceRow(index, 'serviceId', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">Select service...</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.serviceName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Jobs */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Jobs</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.jobs || ''}
                      onChange={(e) => updateServiceRow(index, 'jobs', parseInt(e.target.value) || 0)}
                      className="bg-background text-foreground border-border"
                    />
                  </div>

                  {/* Hours */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Hours</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={item.hours || ''}
                      onChange={(e) => updateServiceRow(index, 'hours', parseFloat(e.target.value) || 0)}
                      className="bg-background text-foreground border-border"
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

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{validationError}</p>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
            <h4 className="font-semibold text-foreground mb-3">Daily Totals</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-lg font-bold text-accent">{preview.totalJobs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="text-lg font-bold text-accent">{preview.totalHours.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-accent">${preview.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div>
            <Label htmlFor="tips" className="text-foreground">Tips ($)</Label>
            <Input
              id="tips"
              type="number"
              step="0.01"
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              className="bg-background text-foreground border-border"
            />
          </div>

          {/* Overtime Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overtime"
              checked={applyOvertime}
              onCheckedChange={(checked) => setApplyOvertime(checked as boolean)}
            />
            <Label htmlFor="overtime" className="text-foreground cursor-pointer">
              Apply overtime (over {COMPANY_SETTINGS.overtimeHoursDaily} hours)
            </Label>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-foreground">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Add any notes about this day..."
            />
          </div>

          {/* Preview Section */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-3">
            <h4 className="font-semibold text-foreground">Calculation Preview</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Base Pay</p>
                <p className="font-semibold text-foreground">${preview.basePay.toFixed(2)}</p>
              </div>
              {preview.overtimeHours > 0 && (
                <div>
                  <p className="text-muted-foreground">Overtime Pay</p>
                  <p className="font-semibold text-foreground">${preview.overtimePay.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">COGS (No Labor)</p>
                <p className="font-semibold text-foreground">${preview.cogsNoLabor.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross Profit %</p>
                <p className="font-semibold text-foreground">{preview.grossProfitBeforeBonusPercent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">LER</p>
                <p className="font-semibold text-accent">{preview.ler.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bonus Qualified</p>
                <p className="font-semibold text-foreground">${preview.bonusQualifiedForPercent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Appointment Bonus</p>
                <p className="font-semibold text-foreground">${preview.appointmentBasedBonus.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Employee Pay</p>
                <p className="font-semibold text-accent">${preview.totalEmployeePay.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Profit %</p>
                <p className={`font-semibold ${preview.dailyNetProfitAfterBonusPercent >= 25 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {preview.dailyNetProfitAfterBonusPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {editingRecord ? 'Update Record' : 'Add Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
