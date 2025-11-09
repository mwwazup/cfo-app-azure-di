import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Settings, Percent, Calendar, DollarSign } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface CompanySettings {
  overheadPercent: number;
  bonusThresholdMin: number;
  bonusThresholdMax: number;
  overtimeHoursDaily: number;
  overtimeMultiplier: number;
  paySchedule?: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  payDayOfWeek?: number;
  payReferenceDate?: string;
  paySemiMonthlyDates?: [number, number];
  enableAppointmentBonus?: boolean;
  appointmentBonus3Jobs?: number;
  appointmentBonus4Jobs?: number;
  appointmentBonus5Jobs?: number;
  appointmentBonus6PlusJobs?: number;
}

interface CompanySettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentSettings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
}

export function CompanySettingsDialog({ open, onClose, currentSettings, onSave }: CompanySettingsDialogProps) {
  const [overheadPercent, setOverheadPercent] = useState(currentSettings.overheadPercent.toString());
  const [bonusThresholdMin, setBonusThresholdMin] = useState(currentSettings.bonusThresholdMin.toString());
  const [bonusThresholdMax, setBonusThresholdMax] = useState(currentSettings.bonusThresholdMax.toString());
  const [overtimeHoursDaily, setOvertimeHoursDaily] = useState(currentSettings.overtimeHoursDaily.toString());
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(currentSettings.overtimeMultiplier.toString());
  const [paySchedule, setPaySchedule] = useState<'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'custom'>(currentSettings.paySchedule || 'bi-weekly');
  const [payDayOfWeek, setPayDayOfWeek] = useState((currentSettings.payDayOfWeek !== undefined ? currentSettings.payDayOfWeek : 5).toString());
  const [enableAppointmentBonus, setEnableAppointmentBonus] = useState(currentSettings.enableAppointmentBonus ?? true);
  const [appointmentBonus3Jobs, setAppointmentBonus3Jobs] = useState((currentSettings.appointmentBonus3Jobs ?? 7).toString());
  const [appointmentBonus4Jobs, setAppointmentBonus4Jobs] = useState((currentSettings.appointmentBonus4Jobs ?? 10).toString());
  const [appointmentBonus5Jobs, setAppointmentBonus5Jobs] = useState((currentSettings.appointmentBonus5Jobs ?? 15).toString());
  const [appointmentBonus6PlusJobs, setAppointmentBonus6PlusJobs] = useState((currentSettings.appointmentBonus6PlusJobs ?? 20).toString());

  useEffect(() => {
    setOverheadPercent(currentSettings.overheadPercent.toString());
    setBonusThresholdMin(currentSettings.bonusThresholdMin.toString());
    setBonusThresholdMax(currentSettings.bonusThresholdMax.toString());
    setOvertimeHoursDaily(currentSettings.overtimeHoursDaily.toString());
    setOvertimeMultiplier(currentSettings.overtimeMultiplier.toString());
    setPaySchedule(currentSettings.paySchedule || 'bi-weekly');
    setPayDayOfWeek((currentSettings.payDayOfWeek !== undefined ? currentSettings.payDayOfWeek : 5).toString());
    setEnableAppointmentBonus(currentSettings.enableAppointmentBonus ?? true);
    setAppointmentBonus3Jobs((currentSettings.appointmentBonus3Jobs ?? 7).toString());
    setAppointmentBonus4Jobs((currentSettings.appointmentBonus4Jobs ?? 10).toString());
    setAppointmentBonus5Jobs((currentSettings.appointmentBonus5Jobs ?? 15).toString());
    setAppointmentBonus6PlusJobs((currentSettings.appointmentBonus6PlusJobs ?? 20).toString());
  }, [currentSettings]);

  const handleSubmit = () => {
    const overheadValue = parseFloat(overheadPercent);
    const bonusMinValue = parseFloat(bonusThresholdMin);
    const bonusMaxValue = parseFloat(bonusThresholdMax);
    const overtimeHoursValue = parseFloat(overtimeHoursDaily);
    const overtimeMultValue = parseFloat(overtimeMultiplier);
    const apptBonus3 = parseFloat(appointmentBonus3Jobs);
    const apptBonus4 = parseFloat(appointmentBonus4Jobs);
    const apptBonus5 = parseFloat(appointmentBonus5Jobs);
    const apptBonus6Plus = parseFloat(appointmentBonus6PlusJobs);

    if (isNaN(overheadValue) || isNaN(bonusMinValue) || isNaN(bonusMaxValue) || 
        isNaN(overtimeHoursValue) || isNaN(overtimeMultValue)) {
      alert('Please enter valid numbers for all settings');
      return;
    }

    if (enableAppointmentBonus && (isNaN(apptBonus3) || isNaN(apptBonus4) || isNaN(apptBonus5) || isNaN(apptBonus6Plus))) {
      alert('Please enter valid numbers for appointment bonus amounts');
      return;
    }

    if (overheadValue < 0 || overheadValue > 100) {
      alert('Overhead percent must be between 0 and 100');
      return;
    }

    if (bonusMinValue < 0 || bonusMinValue > 100 || bonusMaxValue < 0 || bonusMaxValue > 100) {
      alert('Bonus thresholds must be between 0 and 100');
      return;
    }

    if (bonusMinValue >= bonusMaxValue) {
      alert('Minimum bonus threshold must be less than maximum');
      return;
    }

    if (overtimeHoursValue < 0 || overtimeMultValue < 1) {
      alert('Invalid overtime settings');
      return;
    }

    onSave({
      overheadPercent: overheadValue,
      bonusThresholdMin: bonusMinValue,
      bonusThresholdMax: bonusMaxValue,
      overtimeHoursDaily: overtimeHoursValue,
      overtimeMultiplier: overtimeMultValue,
      paySchedule,
      payDayOfWeek: parseInt(payDayOfWeek),
      payReferenceDate: undefined,  // Will be set automatically on first use
      paySemiMonthlyDates: [1, 15],  // Default semi-monthly dates (1st-15th, 16th-end)
      enableAppointmentBonus,
      appointmentBonus3Jobs: apptBonus3,
      appointmentBonus4Jobs: apptBonus4,
      appointmentBonus5Jobs: apptBonus5,
      appointmentBonus6PlusJobs: apptBonus6Plus
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Settings</DialogTitle>
          <DialogDescription>
            Configure company-wide settings for overhead allocation, bonus thresholds, and overtime calculations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> These settings affect all employee calculations. Review annually or when business costs change significantly.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="overhead" className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-accent" />
                Overhead Allocation Percentage
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="overhead"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={overheadPercent}
                  onChange={(e) => setOverheadPercent(e.target.value)}
                  placeholder="32"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of revenue allocated to overhead expenses (rent, utilities, insurance, etc.)
              </p>
            </div>

            <div className="border-t border-muted pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-accent" />
                Bonus Qualification Thresholds
              </Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bonusMin" className="text-sm">
                    Minimum Gross Profit % for Bonus
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="bonusMin"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={bonusThresholdMin}
                      onChange={(e) => setBonusThresholdMin(e.target.value)}
                      placeholder="25"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Employee must achieve this profit margin to qualify for bonus
                  </p>
                </div>

                <div>
                  <Label htmlFor="bonusMax" className="text-sm">
                    Maximum Gross Profit % for Bonus
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="bonusMax"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={bonusThresholdMax}
                      onChange={(e) => setBonusThresholdMax(e.target.value)}
                      placeholder="100"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upper limit for bonus qualification (typically 100%)
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-muted pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-accent" />
                Overtime Settings (Company-Wide)
              </Label>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-400 font-medium mb-1">Automatic Overtime Rules</p>
                <p className="text-xs text-muted-foreground">
                  Overtime is automatically calculated when employees work:
                </p>
                <ul className="text-xs text-muted-foreground mt-1 ml-4 space-y-0.5">
                  <li>• Over <strong>{overtimeHoursDaily}</strong> hours in a single day, OR</li>
                  <li>• Over <strong>40</strong> hours in a single week</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-1">
                  The system takes the <strong>greater</strong> of the two calculations.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="overtimeHours" className="text-sm">
                    Daily Overtime Threshold
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="overtimeHours"
                      type="number"
                      step="0.5"
                      min="0"
                      value={overtimeHoursDaily}
                      onChange={(e) => setOvertimeHoursDaily(e.target.value)}
                      placeholder="12"
                    />
                    <span className="text-sm text-muted-foreground">hours/day</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hours worked beyond this in a single day are paid at overtime rate
                  </p>
                </div>

                <div>
                  <Label htmlFor="overtimeMultiplier" className="text-sm">
                    Overtime Pay Multiplier
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="overtimeMultiplier"
                      type="number"
                      step="0.1"
                      min="1"
                      value={overtimeMultiplier}
                      onChange={(e) => setOvertimeMultiplier(e.target.value)}
                      placeholder="1.5"
                    />
                    <span className="text-muted-foreground">x base rate</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overtime hours are paid at this multiplier (e.g., 1.5x = time and a half)
                  </p>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Weekly overtime (40 hrs/week) is fixed and cannot be changed. 
                    This follows standard labor law requirements.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-muted pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-accent" />
                Appointment-Based Bonus
              </Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableAppointmentBonus"
                    checked={enableAppointmentBonus}
                    onCheckedChange={(checked) => setEnableAppointmentBonus(checked as boolean)}
                  />
                  <Label htmlFor="enableAppointmentBonus" className="text-sm cursor-pointer">
                    Enable appointment-based bonus
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reward employees with fixed bonuses based on number of jobs completed per day
                </p>

                {enableAppointmentBonus && (
                  <div className="space-y-3 ml-6 bg-muted/20 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="bonus3Jobs" className="text-xs">3 Jobs</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            id="bonus3Jobs"
                            type="number"
                            step="1"
                            min="0"
                            value={appointmentBonus3Jobs}
                            onChange={(e) => setAppointmentBonus3Jobs(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bonus4Jobs" className="text-xs">4 Jobs</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            id="bonus4Jobs"
                            type="number"
                            step="1"
                            min="0"
                            value={appointmentBonus4Jobs}
                            onChange={(e) => setAppointmentBonus4Jobs(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bonus5Jobs" className="text-xs">5 Jobs</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            id="bonus5Jobs"
                            type="number"
                            step="1"
                            min="0"
                            value={appointmentBonus5Jobs}
                            onChange={(e) => setAppointmentBonus5Jobs(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="bonus6PlusJobs" className="text-xs">6+ Jobs</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            id="bonus6PlusJobs"
                            type="number"
                            step="1"
                            min="0"
                            value={appointmentBonus6PlusJobs}
                            onChange={(e) => setAppointmentBonus6PlusJobs(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-muted pt-4">
              <Label className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-accent" />
                Pay Period Schedule
              </Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="paySchedule" className="text-sm">
                    How often do you pay employees?
                  </Label>
                  <Select value={paySchedule} onValueChange={(value: any) => setPaySchedule(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select pay schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly (52 pay periods/year)</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly (26 pay periods/year)</SelectItem>
                      <SelectItem value="semi-monthly">Semi-monthly (24 pay periods/year)</SelectItem>
                      <SelectItem value="monthly">Monthly (12 pay periods/year)</SelectItem>
                      <SelectItem value="custom">Custom / Manual (I'll create my own periods)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {paySchedule === 'custom' 
                      ? 'You will manually create pay periods with custom dates'
                      : 'This determines how pay periods are automatically generated'}
                  </p>
                </div>

                {(paySchedule === 'weekly' || paySchedule === 'bi-weekly') && (
                  <div>
                    <Label htmlFor="payDayOfWeek" className="text-sm">
                      What day of the week is payday?
                    </Label>
                    <Select value={payDayOfWeek} onValueChange={setPayDayOfWeek}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select payday" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pay periods will end on this day
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <div className="text-sm text-yellow-300">
              <strong>⚠️ Important:</strong> Changes to these settings will only affect new entries going forward. Historical records will remain unchanged unless you manually edit them. Consider reviewing annually.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              Save Company Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}