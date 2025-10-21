import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

// COGS Calculator - Average cost per service type
export const COGS_CALCULATOR = {
  grill: 19.20,
  oven: 16.20,
  range: 15.00,
  ventHood: 20.00
};

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
    grill: number;
    oven: number;
    range: number;
    ventHood: number;
  };
  totalJobRevenue: number;
  totalHoursWorked: number;
  totalJobTime: number;
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

interface AddDailyRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (record: DailyRecord) => void;
  baseRate: number;
  enableOvertime?: boolean;
  editingRecord?: DailyRecord | null;
  onUpdate?: (record: DailyRecord) => void;
}

export function AddDailyRecordDialog({ open, onClose, onAdd, baseRate, enableOvertime = false, editingRecord = null, onUpdate }: AddDailyRecordDialogProps) {
  const [date, setDate] = useState('');
  const [grillJobs, setGrillJobs] = useState('0');
  const [ovenJobs, setOvenJobs] = useState('0');
  const [rangeJobs, setRangeJobs] = useState('0');
  const [ventHoodJobs, setVentHoodJobs] = useState('0');
  const [revenue, setRevenue] = useState('0');
  const [hours, setHours] = useState('0');
  const [tips, setTips] = useState('0');
  const [notes, setNotes] = useState('');
  const [applyOvertime, setApplyOvertime] = useState(enableOvertime);

  // Load editing record data when dialog opens
  useEffect(() => {
    if (editingRecord) {
      // Convert date back to YYYY-MM-DD format
      const dateObj = new Date(editingRecord.date);
      const isoDate = dateObj.toISOString().split('T')[0];
      setDate(isoDate);
      setGrillJobs(editingRecord.jobTypes.grill.toString());
      setOvenJobs(editingRecord.jobTypes.oven.toString());
      setRangeJobs(editingRecord.jobTypes.range.toString());
      setVentHoodJobs(editingRecord.jobTypes.ventHood.toString());
      setRevenue(editingRecord.totalJobRevenue.toString());
      setHours(editingRecord.totalHoursWorked.toString());
      setTips(editingRecord.tipAmount.toString());
      setNotes(editingRecord.notes || '');
    } else {
      // Reset form for new record
      setDate('');
      setGrillJobs('0');
      setOvenJobs('0');
      setRangeJobs('0');
      setVentHoodJobs('0');
      setRevenue('0');
      setHours('0');
      setTips('0');
      setNotes('');
    }
  }, [editingRecord, open]);

  const calculatePreview = () => {
    const totalRevenue = parseFloat(revenue) || 0;
    const totalHours = parseFloat(hours) || 0;
    const totalJobs = parseInt(grillJobs) + parseInt(ovenJobs) + parseInt(rangeJobs) + parseInt(ventHoodJobs);
    
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
    
    // Calculate COGS based on actual services performed
    const cogsNoLaborDollars = 
      (parseInt(grillJobs) * COGS_CALCULATOR.grill) +
      (parseInt(ovenJobs) * COGS_CALCULATOR.oven) +
      (parseInt(rangeJobs) * COGS_CALCULATOR.range) +
      (parseInt(ventHoodJobs) * COGS_CALCULATOR.ventHood);
    
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
    
    // Check if qualifies for bonus (Gross Profit % between 25% and 100%)
    const qualifyForBonus = 
      grossProfitBeforeBonusPercent >= COMPANY_SETTINGS.bonusThresholdMin && 
      grossProfitBeforeBonusPercent <= COMPANY_SETTINGS.bonusThresholdMax;
    
    // Calculate Bonus Qualified For $ = LER × Total Hours Worked (if qualified)
    const bonusQualifiedForDollars = qualifyForBonus ? ler * totalHours : 0;
    
    // Calculate Appointment Based Bonus
    let appointmentBasedBonus = 0;
    if (totalJobs === 3) {
      appointmentBasedBonus = 7;
    } else if (totalJobs >= 4) {
      appointmentBasedBonus = 10;
    }
    
    // Total bonus
    const totalBonus = qualifyForBonus ? bonusQualifiedForDollars + appointmentBasedBonus : 0;
    
    // Total employee pay
    const tipAmount = parseFloat(tips) || 0;
    const totalEmployeePay = basePay + totalBonus + tipAmount;
    const dailyHourlyWithTipsAndBonus = totalHours > 0 ? totalEmployeePay / totalHours : 0;
    
    // Net profit after bonus
    const dailyNetProfitAfterBonus = grossProfitBeforeBonusDollars - totalBonus;
    const dailyNetProfitAfterBonusPercent = totalRevenue > 0 
      ? (dailyNetProfitAfterBonus / totalRevenue) * 100 
      : 0;
    
    return {
      ler,
      grossProfitBeforeBonusPercent,
      grossProfitBeforeBonusDollars,
      qualifyForBonus,
      bonusQualifiedForDollars,
      appointmentBasedBonus,
      totalBonus,
      totalEmployeePay,
      basePay,
      overtimeHours,
      overtimePay,
      cogsNoLaborDollars,
      cogsNoLaborPercent,
      overheadAllocationRate,
      totalCostOfJob,
      dailyHourlyWithTipsAndBonus,
      dailyNetProfitAfterBonus,
      dailyNetProfitAfterBonusPercent
    };
  };

  const handleSubmit = () => {
    if (!date || parseFloat(hours) === 0) {
      alert('Please fill in date and hours worked');
      return;
    }

    const preview = calculatePreview();
    const totalJobs = parseInt(grillJobs) + parseInt(ovenJobs) + parseInt(rangeJobs) + parseInt(ventHoodJobs);
    const totalRevenue = parseFloat(revenue);
    const totalHours = parseFloat(hours);

    const record: DailyRecord = {
      workDay: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
      date: new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
      calledOut: false,
      numberOfJobs: totalJobs,
      jobTypes: {
        grill: parseInt(grillJobs),
        oven: parseInt(ovenJobs),
        range: parseInt(rangeJobs),
        ventHood: parseInt(ventHoodJobs)
      },
      totalJobRevenue: totalRevenue,
      totalHoursWorked: totalHours,
      totalJobTime: totalHours,
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
    setGrillJobs('0');
    setOvenJobs('0');
    setRangeJobs('0');
    setVentHoodJobs('0');
    setRevenue('0');
    setHours('0');
    setTips('0');
    setNotes('');
    onClose();
  };

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="grill">Grill Jobs</Label>
              <Input 
                id="grill" 
                type="number" 
                min="0" 
                value={grillJobs} 
                onChange={(e) => setGrillJobs(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="oven">Oven Jobs</Label>
              <Input 
                id="oven" 
                type="number" 
                min="0" 
                value={ovenJobs} 
                onChange={(e) => setOvenJobs(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="range">Range Jobs</Label>
              <Input 
                id="range" 
                type="number" 
                min="0" 
                value={rangeJobs} 
                onChange={(e) => setRangeJobs(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="ventHood">Vent Hood Jobs</Label>
              <Input 
                id="ventHood" 
                type="number" 
                min="0" 
                value={ventHoodJobs} 
                onChange={(e) => setVentHoodJobs(e.target.value)} 
              />
            </div>
          </div>

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
                Base: ${calculatePreview().basePay.toFixed(2)} + Bonus: ${calculatePreview().totalBonus.toFixed(2)} + Tips: ${parseFloat(tips || '0').toFixed(2)}
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