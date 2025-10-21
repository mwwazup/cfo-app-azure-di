import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

// Company Settings
export const COMPANY_SETTINGS = {
  overheadPercent: 32,
  bonusThresholdMin: 25,
  bonusThresholdMax: 100,
  overtimeHoursDaily: 12,
  overtimeMultiplier: 1.5
};

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
}

interface AddDailyRecordDialogDynamicProps {
  open: boolean;
  onClose: () => void;
  onAdd: (record: DailyRecord) => void;
  baseRate: number;
  enableOvertime?: boolean;
  editingRecord?: DailyRecord | null;
  onUpdate?: (record: DailyRecord) => void;
  servicesWithCOGS: { [serviceName: string]: number };
}

// Helper function to format service names for display
function formatServiceName(serviceName: string): string {
  return serviceName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to round to 2 decimal places (for money)
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

export function AddDailyRecordDialogDynamic({ 
  open, 
  onClose, 
  onAdd, 
  baseRate, 
  enableOvertime = false, 
  editingRecord = null, 
  onUpdate,
  servicesWithCOGS 
}: AddDailyRecordDialogDynamicProps) {
  const [date, setDate] = useState('');
  const [serviceQuantities, setServiceQuantities] = useState<{ [serviceName: string]: string }>({});
  const [revenue, setRevenue] = useState('0');
  const [hours, setHours] = useState('0');
  const [tips, setTips] = useState('0');
  const [notes, setNotes] = useState('');
  const [applyOvertime, setApplyOvertime] = useState(enableOvertime);

  // Initialize service quantities when services change
  useEffect(() => {
    const initialQuantities: { [key: string]: string } = {};
    Object.keys(servicesWithCOGS).forEach(serviceName => {
      initialQuantities[serviceName] = '0';
    });
    setServiceQuantities(initialQuantities);
  }, [servicesWithCOGS]);

  // Load editing record data when dialog opens
  useEffect(() => {
    if (editingRecord) {
      setDate(editingRecord.date);
      
      // Load service quantities from editing record
      const quantities: { [key: string]: string } = {};
      Object.keys(servicesWithCOGS).forEach(serviceName => {
        quantities[serviceName] = (editingRecord.jobTypes[serviceName] || 0).toString();
      });
      setServiceQuantities(quantities);
      
      setRevenue(editingRecord.totalJobRevenue.toString());
      setHours(editingRecord.totalHoursWorked.toString());
      setTips(editingRecord.tipAmount.toString());
      setNotes(editingRecord.notes || '');
    } else {
      // Reset form for new record
      setDate('');
      const resetQuantities: { [key: string]: string } = {};
      Object.keys(servicesWithCOGS).forEach(serviceName => {
        resetQuantities[serviceName] = '0';
      });
      setServiceQuantities(resetQuantities);
      setRevenue('0');
      setHours('0');
      setTips('0');
      setNotes('');
    }
  }, [editingRecord, open, servicesWithCOGS]);

  const updateServiceQuantity = (serviceName: string, value: string) => {
    setServiceQuantities(prev => ({
      ...prev,
      [serviceName]: value
    }));
  };

  const calculatePreview = () => {
    const totalRevenue = parseFloat(revenue) || 0;
    const totalHours = parseFloat(hours) || 0;
    
    // Calculate total jobs dynamically
    const totalJobs = Object.values(serviceQuantities).reduce((sum, qty) => {
      return sum + (parseInt(qty) || 0);
    }, 0);
    
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
    
    // Calculate COGS dynamically based on services performed (full precision)
    const cogsNoLaborDollars = Object.entries(serviceQuantities).reduce((total, [serviceName, qty]) => {
      const quantity = parseInt(qty) || 0;
      const costPerService = servicesWithCOGS[serviceName] || 0;
      return total + (quantity * costPerService);
    }, 0);
    
    const cogsNoLaborPercent = totalRevenue > 0 ? (cogsNoLaborDollars / totalRevenue) * 100 : 0;
    
    // Calculate overhead allocation (full precision)
    const overheadPercent = COMPANY_SETTINGS.overheadPercent;
    const overheadAllocationRate = totalRevenue * (overheadPercent / 100);
    
    // Calculate total cost of job (full precision)
    const totalCostOfJob = basePay + cogsNoLaborDollars + overheadAllocationRate;
    
    // Calculate gross profit before bonus (full precision)
    const grossProfitBeforeBonusDollars = totalRevenue - totalCostOfJob;
    const grossProfitBeforeBonusPercent = totalRevenue > 0 
      ? (grossProfitBeforeBonusDollars / totalRevenue) * 100
      : 0;
    
    // Calculate LER (Labor Efficiency Ratio) - full precision
    const ler = basePay > 0 ? grossProfitBeforeBonusDollars / basePay : 0;
    
    // Check if qualifies for bonus (Gross Profit % between 25% and 100%)
    const qualifyForBonus = 
      grossProfitBeforeBonusPercent >= COMPANY_SETTINGS.bonusThresholdMin && 
      grossProfitBeforeBonusPercent <= COMPANY_SETTINGS.bonusThresholdMax;
    
    // Calculate Bonus Qualified For $ = LER × Total Hours Worked (if qualified) - full precision
    const bonusQualifiedForDollars = qualifyForBonus ? ler * totalHours : 0;
    
    // Calculate Appointment Based Bonus
    let appointmentBasedBonus = 0;
    if (totalJobs === 3) {
      appointmentBasedBonus = 7;
    } else if (totalJobs >= 4) {
      appointmentBasedBonus = 10;
    }
    
    // Total bonus (full precision)
    const totalBonus = qualifyForBonus ? bonusQualifiedForDollars + appointmentBasedBonus : 0;
    
    // Total employee pay (full precision)
    const tipAmount = parseFloat(tips) || 0;
    const totalEmployeePay = basePay + totalBonus + tipAmount;
    const dailyHourlyWithTipsAndBonus = totalHours > 0 ? totalEmployeePay / totalHours : 0;
    
    // Net profit after bonus (full precision)
    const dailyNetProfitAfterBonus = grossProfitBeforeBonusDollars - totalBonus;
    const dailyNetProfitAfterBonusPercent = totalRevenue > 0 
      ? (dailyNetProfitAfterBonus / totalRevenue) * 100
      : 0;
    
    // Round all final values to 2 decimal places for display and saving
    return {
      totalJobs,
      ler: roundToTwo(ler),
      grossProfitBeforeBonusPercent: roundToTwo(grossProfitBeforeBonusPercent),
      grossProfitBeforeBonusDollars: roundToTwo(grossProfitBeforeBonusDollars),
      qualifyForBonus,
      bonusQualifiedForDollars: roundToTwo(bonusQualifiedForDollars),
      appointmentBasedBonus,
      totalBonus: roundToTwo(totalBonus),
      totalEmployeePay: roundToTwo(totalEmployeePay),
      basePay: roundToTwo(basePay),
      overtimeHours: roundToTwo(overtimeHours),
      overtimePay: roundToTwo(overtimePay),
      cogsNoLaborDollars: roundToTwo(cogsNoLaborDollars),
      cogsNoLaborPercent: roundToTwo(cogsNoLaborPercent),
      overheadAllocationRate: roundToTwo(overheadAllocationRate),
      totalCostOfJob: roundToTwo(totalCostOfJob),
      dailyHourlyWithTipsAndBonus: roundToTwo(dailyHourlyWithTipsAndBonus),
      dailyNetProfitAfterBonus: roundToTwo(dailyNetProfitAfterBonus),
      dailyNetProfitAfterBonusPercent: roundToTwo(dailyNetProfitAfterBonusPercent)
    };
  };

  const handleSubmit = () => {
    if (!date || parseFloat(hours) === 0) {
      alert('Please fill in date and hours worked');
      return;
    }

    const preview = calculatePreview();
    const totalRevenue = parseFloat(revenue);
    const totalHours = parseFloat(hours);

    // Build jobTypes object dynamically
    const jobTypes: { [key: string]: number } = {};
    Object.entries(serviceQuantities).forEach(([serviceName, qty]) => {
      jobTypes[serviceName] = parseInt(qty) || 0;
    });

    // Parse date locally to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    
    const record: DailyRecord = {
      workDay: localDate.toLocaleDateString('en-US', { weekday: 'long' }),
      date: date,
      calledOut: false,
      numberOfJobs: preview.totalJobs,
      jobTypes: jobTypes,
      totalJobRevenue: totalRevenue,
      totalHoursWorked: totalHours,
      totalJobTime: totalHours,
      baseRate: baseRate,
      employeeBasePay: preview.basePay,
      overtimeHours: preview.overtimeHours,
      overtimePay: preview.overtimePay,
      cogsNoLabor: preview.cogsNoLaborDollars,
      cogsNoLaborPercent: preview.cogsNoLaborPercent,
      overheadCostsPercent: COMPANY_SETTINGS.overheadPercent,
      grossProfitBeforeBonus: preview.grossProfitBeforeBonusDollars,
      grossProfitBeforeBonusPercent: preview.grossProfitBeforeBonusPercent,
      ler: preview.ler,
      qualifyForBonus: preview.qualifyForBonus,
      bonusQualifiedForPercent: preview.bonusQualifiedForDollars,
      appointmentBasedBonus: preview.totalBonus,
      tipAmount: parseFloat(tips),
      totalEmployeePay: preview.totalEmployeePay,
      dailyHourlyWithTipsAndBonus: preview.dailyHourlyWithTipsAndBonus,
      dailyNetProfitAfterBonus: preview.dailyNetProfitAfterBonus,
      dailyNetProfitAfterBonusPercent: preview.dailyNetProfitAfterBonusPercent,
      notes: notes
    };

    if (editingRecord && onUpdate) {
      onUpdate(record);
    } else {
      onAdd(record);
    }
    
    // Reset form
    setDate('');
    const resetQuantities: { [key: string]: string } = {};
    Object.keys(servicesWithCOGS).forEach(serviceName => {
      resetQuantities[serviceName] = '0';
    });
    setServiceQuantities(resetQuantities);
    setRevenue('0');
    setHours('0');
    setTips('0');
    setNotes('');
    onClose();
  };

  const serviceNames = Object.keys(servicesWithCOGS);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRecord ? 'Edit' : 'Add'} Daily Performance Record</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          {/* Dynamic Service Inputs */}
          {serviceNames.length > 0 ? (
            <div>
              <Label className="text-sm font-medium mb-2 block">Services Performed</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {serviceNames.map(serviceName => (
                  <div key={serviceName}>
                    <Label htmlFor={serviceName} className="text-xs">
                      {formatServiceName(serviceName)}
                    </Label>
                    <Input 
                      id={serviceName}
                      type="number" 
                      min="0" 
                      value={serviceQuantities[serviceName] || '0'}
                      onChange={(e) => updateServiceQuantity(serviceName, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No services defined. Please add services in the Service Mix page first.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="revenue">Total Revenue ($)</Label>
              <Input 
                id="revenue" 
                type="number" 
                step="0.01" 
                min="0" 
                value={revenue} 
                onChange={(e) => setRevenue(e.target.value)} 
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="hours">Hours Worked</Label>
              <Input 
                id="hours" 
                type="number" 
                step="0.5" 
                min="0" 
                value={hours} 
                onChange={(e) => setHours(e.target.value)} 
                placeholder="8.0"
              />
            </div>
            <div>
              <Label htmlFor="tips">Tips ($)</Label>
              <Input 
                id="tips" 
                type="number" 
                step="0.01" 
                min="0" 
                value={tips} 
                onChange={(e) => setTips(e.target.value)} 
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>

          {enableOvertime && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="overtime" 
                checked={applyOvertime}
                onCheckedChange={(checked) => setApplyOvertime(checked as boolean)}
              />
              <Label htmlFor="overtime" className="text-sm cursor-pointer">
                Apply overtime ({'>'}12 hrs at 1.5x rate)
              </Label>
            </div>
          )}

          <div className="bg-muted/30 p-4 rounded-lg border border-accent/50 space-y-3">
            <div className="text-sm font-semibold text-foreground mb-2">📊 Calculation Preview</div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">LER (Efficiency)</div>
                <div className={`text-lg font-bold ${
                  calculatePreview().ler >= 1.0 ? 'text-green-600' : 
                  calculatePreview().ler >= 0.7 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {calculatePreview().ler.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  ${calculatePreview().ler.toFixed(2)} profit per $1 paid
                </div>
              </div>
              
              <div>
                <div className="text-muted-foreground">Gross Profit %</div>
                <div className="text-lg font-bold text-foreground">
                  {calculatePreview().grossProfitBeforeBonusPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {calculatePreview().qualifyForBonus ? '✅ Qualifies for bonus' : '❌ Below 25% threshold'}
                </div>
              </div>
            </div>
            
            {calculatePreview().qualifyForBonus && (
              <div className="border-t border-accent/30 pt-3 space-y-2">
                <div className="text-xs font-semibold text-accent">💰 Bonus Breakdown</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Bonus Qualified For $:</span>
                    <span className="font-bold text-foreground ml-1">
                      ${calculatePreview().bonusQualifiedForDollars.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Appointment Bonus:</span>
                    <span className="font-bold text-foreground ml-1">
                      ${calculatePreview().appointmentBasedBonus.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-bold text-green-600 border-t border-accent/30 pt-2">
                  Total Bonus: ${calculatePreview().totalBonus.toFixed(2)}
                </div>
              </div>
            )}
            
            <div className="border-t border-accent/30 pt-3">
              <div className="text-xs text-muted-foreground">Total Employee Pay</div>
              <div className="text-xl font-bold text-foreground">
                ${calculatePreview().totalEmployeePay.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                Base: ${baseRate.toFixed(2)} × {hours || '0'} hrs = ${calculatePreview().basePay.toFixed(2)} | Bonus: ${calculatePreview().totalBonus.toFixed(2)} | Tips: ${parseFloat(tips || '0').toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              {editingRecord ? 'Update Record' : 'Add Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
