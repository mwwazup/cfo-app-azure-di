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
  paySemiMonthlyDates: [1, 15] as [number, number],
  // Appointment-based bonus settings
  enableAppointmentBonus: true,
  appointmentBonus3Jobs: 7,
  appointmentBonus4Jobs: 10,
  appointmentBonus5Jobs: 15,
  appointmentBonus6PlusJobs: 20
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
  editingRecord = null, 
  onUpdate,
  servicesWithCOGS 
}: AddDailyRecordWithServicesProps) {
  const { services } = useServices(); // Fetch services from database
  
  const [date, setDate] = useState('');
  const [tips, setTips] = useState('0');
  const [notes, setNotes] = useState('');
  const [applyAppointmentBonus, setApplyAppointmentBonus] = useState(COMPANY_SETTINGS.enableAppointmentBonus);
  const [totalDailyHours, setTotalDailyHours] = useState<string>(''); // NEW: Total clock in/out hours
  
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
      console.log('🔍 Loading editing record:', editingRecord);
      console.log('📦 Service breakdown from record:', editingRecord.serviceBreakdown);
      
      setDate(editingRecord.date);
      setTips(editingRecord.tipAmount.toString());
      setNotes(editingRecord.notes || '');
      setTotalDailyHours(editingRecord.totalHoursWorked.toString());
      
      // Load service breakdown if it exists
      if (editingRecord.serviceBreakdown && editingRecord.serviceBreakdown.length > 0) {
        console.log('✅ Using existing service breakdown:', editingRecord.serviceBreakdown);
        setServiceBreakdown(editingRecord.serviceBreakdown);
      } else {
        console.log('⚠️ No service breakdown found, using fallback rollup logic');
        // Convert old format to new format - distribute totals proportionally
        const breakdown: ServiceBreakdownItem[] = [];
        const jobTypesArray = Object.entries(editingRecord.jobTypes).filter(([_, jobs]) => jobs > 0);
        const totalJobsInRecord = Object.values(editingRecord.jobTypes).reduce((sum, jobs) => sum + jobs, 0);
        
        if (jobTypesArray.length > 0 && totalJobsInRecord > 0) {
          jobTypesArray.forEach(([serviceName, jobs]) => {
            const service = services.find(s => s.serviceName === serviceName);
            const jobProportion = jobs / totalJobsInRecord;
            
            breakdown.push({
              serviceId: service?.id || '',
              serviceName,
              jobs,
              // Distribute hours and revenue proportionally based on job count
              hours: roundToTwo(editingRecord.totalHoursWorked * jobProportion),
              revenue: roundToTwo(editingRecord.totalJobRevenue * jobProportion)
            });
          });
        }
        
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
    const totalJobTime = serviceBreakdown.reduce((sum, item) => sum + (parseFloat(item.hours?.toString() || '0') || 0), 0);
    const totalRevenue = serviceBreakdown.reduce((sum, item) => sum + (parseFloat(item.revenue?.toString() || '0') || 0), 0);
    const dailyHours = parseFloat(totalDailyHours) || 0;
    const nonJobTime = dailyHours - totalJobTime;
    
    return { totalJobs, totalJobTime, totalRevenue, dailyHours, nonJobTime };
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
    const { totalJobs, totalJobTime, totalRevenue, dailyHours, nonJobTime } = calculateTotals();
    
    // Calculate labor costs based on TOTAL DAILY HOURS (clock in/out), not job time
    let regularHours = dailyHours;
    let overtimeHours = 0;
    let employeeBaseHourlyPay = 0;
    let overtimePay = 0;
    
    // Overtime automatically applied based on company settings (12 hrs/day)
    // Weekly overtime (40 hrs/week) is calculated on page load
    if (dailyHours > COMPANY_SETTINGS.overtimeHoursDaily) {
      regularHours = COMPANY_SETTINGS.overtimeHoursDaily;
      overtimeHours = dailyHours - COMPANY_SETTINGS.overtimeHoursDaily;
      employeeBaseHourlyPay = regularHours * baseRate;
      overtimePay = overtimeHours * (baseRate * COMPANY_SETTINGS.overtimeMultiplier);
    } else {
      employeeBaseHourlyPay = dailyHours * baseRate;
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
    
    // Calculate Bonus Qualified For (based on daily hours)
    const bonusQualifiedForDollars = qualifyForBonus ? ler * dailyHours : 0;
    
    // Calculate Appointment Based Bonus (if enabled)
    let appointmentBasedBonus = 0;
    if (applyAppointmentBonus) {
      if (totalJobs === 3) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus3Jobs;
      } else if (totalJobs === 4) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus4Jobs;
      } else if (totalJobs === 5) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus5Jobs;
      } else if (totalJobs >= 6) {
        appointmentBasedBonus = COMPANY_SETTINGS.appointmentBonus6PlusJobs;
      }
    }
    
    const tipsDollars = parseFloat(tips) || 0;
    const totalEmployeePay = basePay + bonusQualifiedForDollars + appointmentBasedBonus + tipsDollars;
    const dailyHourlyWithTipsAndBonus = dailyHours > 0 ? totalEmployeePay / dailyHours : 0;
    const dailyNetProfitAfterBonus = totalRevenue - totalCostOfJob - bonusQualifiedForDollars - appointmentBasedBonus;
    const dailyNetProfitAfterBonusPercent = totalRevenue > 0 
      ? (dailyNetProfitAfterBonus / totalRevenue) * 100
      : 0;

    return {
      totalJobs,
      totalJobTime,
      dailyHours,
      nonJobTime,
      totalRevenue,
      basePay: roundToTwo(basePay),
      overtimeHours: roundToTwo(overtimeHours),
      overtimePay: roundToTwo(overtimePay),
      cogsNoLabor: roundToTwo(cogsNoLaborDollars),
      cogsNoLaborPercent: roundToTwo(cogsNoLaborPercent),
      overheadCostsPercent: overheadPercent,
      overheadAllocation: roundToTwo(overheadAllocationRate),
      totalCostOfJob: roundToTwo(totalCostOfJob),
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

  const handleSubmit = async () => {
    if (!date) {
      setValidationError('Please select a date');
      return;
    }
    
    if (!totalDailyHours || parseFloat(totalDailyHours) <= 0) {
      setValidationError('Please enter total daily hours (clock in/out time)');
      return;
    }
    
    if (!validateBreakdown()) {
      return;
    }

    // ============================================
    // CRITICAL: COGS VALIDATION
    // ============================================
    // Prevent data entry errors like 85% COGS anomaly
    const { cogsNoLabor, cogsNoLaborPercent } = preview;
    
    // Validation #1: High COGS Percentage (>20%)
    if (cogsNoLaborPercent > 20) {
      const confirmed = window.confirm(
        `⚠️ HIGH COGS ALERT!\n\n` +
        `COGS: $${cogsNoLabor.toFixed(2)} (${cogsNoLaborPercent.toFixed(1)}%)\n` +
        `Revenue: $${preview.totalRevenue.toFixed(2)}\n\n` +
        `Normal COGS range is 2-6%.\n` +
        `This ${cogsNoLaborPercent.toFixed(1)}% is ${(cogsNoLaborPercent / 5).toFixed(1)}x higher than normal!\n\n` +
        `Common causes:\n` +
        `• Decimal point error ($810 instead of $8.10)\n` +
        `• Equipment purchase entered as daily COGS\n` +
        `• Subcontractor cost not properly tracked\n\n` +
        `Are you SURE this is correct?`
      );
      if (!confirmed) {
        setValidationError(`COGS of ${cogsNoLaborPercent.toFixed(1)}% is unusually high. Please verify your entries.`);
        return;
      }
    }
    
    // Validation #2: Large COGS Dollar Amount (>$100)
    if (cogsNoLabor > 100) {
      const suggestedValue = (cogsNoLabor / 100).toFixed(2);
      const confirmed = window.confirm(
        `⚠️ LARGE COGS ENTRY!\n\n` +
        `COGS Amount: $${cogsNoLabor.toFixed(2)}\n` +
        `Revenue: $${preview.totalRevenue.toFixed(2)}\n\n` +
        `This is unusually high for a single day.\n\n` +
        `Did you mean $${suggestedValue}?\n\n` +
        `Continue with $${cogsNoLabor.toFixed(2)}?`
      );
      if (!confirmed) {
        setValidationError(`COGS of $${cogsNoLabor.toFixed(2)} is unusually high. Please verify your entries.`);
        return;
      }
    }
    
    // Validation #3: Negative Profit Margin
    if (preview.grossProfitBeforeBonusPercent < 0) {
      const confirmed = window.confirm(
        `🔴 NEGATIVE PROFIT MARGIN!\n\n` +
        `Gross Profit: $${preview.grossProfitBeforeBonus.toFixed(2)}\n` +
        `Profit Margin: ${preview.grossProfitBeforeBonusPercent.toFixed(1)}%\n\n` +
        `This job is LOSING MONEY!\n\n` +
        `Revenue: $${preview.totalRevenue.toFixed(2)}\n` +
        `Total Costs: $${preview.totalCostOfJob.toFixed(2)}\n` +
        `  - Labor: $${preview.basePay.toFixed(2)}\n` +
        `  - COGS: $${cogsNoLabor.toFixed(2)}\n` +
        `  - Overhead: $${preview.overheadAllocation.toFixed(2)}\n\n` +
        `Are you SURE you want to save this?`
      );
      if (!confirmed) {
        setValidationError(`Negative profit margin detected. Please review your entries.`);
        return;
      }
    }

    const { totalJobs, totalJobTime, dailyHours, totalRevenue } = calculateTotals();
    
    // Build jobTypes object for backward compatibility (sum up duplicate services)
    const jobTypes: { [serviceName: string]: number } = {};
    serviceBreakdown.forEach(item => {
      if (item.serviceId && item.jobs > 0) {
        if (jobTypes[item.serviceName]) {
          jobTypes[item.serviceName] += item.jobs;
        } else {
          jobTypes[item.serviceName] = item.jobs;
        }
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
      totalHoursWorked: dailyHours,  // Total daily hours (clock in/out)
      totalJobTime: totalJobTime,     // Actual time on jobs
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
    setTotalDailyHours('');
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

                  {/* Job Time (hours on this specific service) */}
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

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{validationError}</p>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
            <h4 className="font-semibold text-foreground mb-3">Daily Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-lg font-bold text-accent">{preview.totalJobs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Time</p>
                <p className="text-lg font-bold text-accent">{preview.totalJobTime.toFixed(2)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Hours</p>
                <p className="text-lg font-bold text-accent">{preview.dailyHours.toFixed(2)} hrs</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-accent">${preview.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
            {preview.nonJobTime > 0 && (
              <div className="mt-3 pt-3 border-t border-accent/20">
                <p className="text-xs text-muted-foreground">Non-Job Time (travel, breaks, admin)</p>
                <p className="text-sm font-semibold text-yellow-500">{preview.nonJobTime.toFixed(2)} hrs</p>
              </div>
            )}
          </div>

          {/* Total Daily Hours Input */}
          <div>
            <Label htmlFor="totalDailyHours" className="text-foreground font-semibold">
              Total Daily Hours (Clock In/Out) *
            </Label>
            <Input
              id="totalDailyHours"
              type="number"
              step="0.25"
              min="0"
              value={totalDailyHours}
              onChange={(e) => setTotalDailyHours(e.target.value)}
              className="bg-background text-foreground border-border"
              placeholder="e.g., 8.0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total hours employee was clocked in (used for pay calculation)
            </p>
          </div>

          {/* Bonus Options */}
          <div className="space-y-3 bg-muted/20 rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground text-sm">Bonus Options</h4>
            
            {/* Appointment Bonus Toggle */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="appointmentBonus"
                  checked={applyAppointmentBonus}
                  onCheckedChange={(checked) => setApplyAppointmentBonus(checked as boolean)}
                />
                <Label htmlFor="appointmentBonus" className="text-foreground cursor-pointer">
                  Apply appointment-based bonus
                </Label>
              </div>
              {applyAppointmentBonus && (
                <div className="ml-6 text-xs text-muted-foreground space-y-1">
                  <p>• 3 jobs: ${COMPANY_SETTINGS.appointmentBonus3Jobs}</p>
                  <p>• 4 jobs: ${COMPANY_SETTINGS.appointmentBonus4Jobs}</p>
                  <p>• 5 jobs: ${COMPANY_SETTINGS.appointmentBonus5Jobs}</p>
                  <p>• 6+ jobs: ${COMPANY_SETTINGS.appointmentBonus6PlusJobs}</p>
                  <p className="text-yellow-500 mt-2">💡 Configure values in Company Settings</p>
                </div>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Calculation Preview</h4>
              {/* COGS Warning Indicator */}
              {preview.cogsNoLaborPercent > 20 && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">HIGH COGS: {preview.cogsNoLaborPercent.toFixed(1)}%</span>
                </div>
              )}
              {preview.cogsNoLaborPercent >= 10 && preview.cogsNoLaborPercent <= 20 && (
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">ELEVATED COGS: {preview.cogsNoLaborPercent.toFixed(1)}%</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Base Pay (Labor)</p>
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
                <p className={`font-semibold ${
                  preview.cogsNoLaborPercent > 20 ? 'text-red-500' : 
                  preview.cogsNoLaborPercent >= 10 ? 'text-yellow-500' : 
                  'text-foreground'
                }`}>
                  ${preview.cogsNoLabor.toFixed(2)} ({preview.cogsNoLaborPercent.toFixed(1)}%)
                </p>
                {preview.cogsNoLaborPercent > 20 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Unusually high!</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Overhead ({preview.overheadCostsPercent}%)</p>
                <p className="font-semibold text-foreground">${preview.overheadAllocation.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Cost of Job</p>
                <p className="font-semibold text-orange-500">${preview.totalCostOfJob.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross Profit Before Bonus</p>
                <p className="font-semibold text-green-500">${preview.grossProfitBeforeBonus.toFixed(2)}</p>
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
            
            {/* Formula Explanation */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
              <p><strong>Total Cost of Job:</strong> Labor (${preview.basePay.toFixed(2)}) + COGS (${preview.cogsNoLabor.toFixed(2)}) + Overhead (${preview.overheadAllocation.toFixed(2)}) = ${preview.totalCostOfJob.toFixed(2)}</p>
              <p><strong>Gross Profit Before Bonus:</strong> Revenue (${preview.totalRevenue.toFixed(2)}) - Total Cost (${preview.totalCostOfJob.toFixed(2)}) = ${preview.grossProfitBeforeBonus.toFixed(2)}</p>
              <p><strong>LER Formula:</strong> Gross Profit (${preview.grossProfitBeforeBonus.toFixed(2)}) ÷ Labor (${preview.basePay.toFixed(2)}) = {preview.ler.toFixed(2)}</p>
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
