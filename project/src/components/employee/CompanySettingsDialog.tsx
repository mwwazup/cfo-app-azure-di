import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Settings, Percent } from 'lucide-react';

interface CompanySettings {
  overheadPercent: number;
  bonusThresholdMin: number;
  bonusThresholdMax: number;
  overtimeHoursDaily: number;
  overtimeMultiplier: number;
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

  useEffect(() => {
    setOverheadPercent(currentSettings.overheadPercent.toString());
    setBonusThresholdMin(currentSettings.bonusThresholdMin.toString());
    setBonusThresholdMax(currentSettings.bonusThresholdMax.toString());
    setOvertimeHoursDaily(currentSettings.overtimeHoursDaily.toString());
    setOvertimeMultiplier(currentSettings.overtimeMultiplier.toString());
  }, [currentSettings]);

  const handleSubmit = () => {
    const overheadValue = parseFloat(overheadPercent);
    const bonusMinValue = parseFloat(bonusThresholdMin);
    const bonusMaxValue = parseFloat(bonusThresholdMax);
    const overtimeHoursValue = parseFloat(overtimeHoursDaily);
    const overtimeMultValue = parseFloat(overtimeMultiplier);

    if (isNaN(overheadValue) || isNaN(bonusMinValue) || isNaN(bonusMaxValue) || 
        isNaN(overtimeHoursValue) || isNaN(overtimeMultValue)) {
      alert('Please enter valid numbers for all settings');
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
      overtimeMultiplier: overtimeMultValue
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
                Overtime Settings
              </Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="overtimeHours" className="text-sm">
                    Overtime After (Hours/Day)
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
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
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
                    <span className="text-muted-foreground">x</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overtime hours are paid at this multiplier (e.g., 1.5x = time and a half)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <div className="text-sm text-yellow-300">
              <strong>⚠️ Important:</strong> Changes to these settings will affect all future calculations. Consider reviewing annually.
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