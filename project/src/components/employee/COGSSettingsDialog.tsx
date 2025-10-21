import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DollarSign } from 'lucide-react';

interface COGSSettings {
  grill: number;
  oven: number;
  range: number;
  ventHood: number;
}

interface COGSSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentSettings: COGSSettings;
  onSave: (settings: COGSSettings) => void;
}

export function COGSSettingsDialog({ open, onClose, currentSettings, onSave }: COGSSettingsDialogProps) {
  const [grill, setGrill] = useState(currentSettings.grill.toString());
  const [oven, setOven] = useState(currentSettings.oven.toString());
  const [range, setRange] = useState(currentSettings.range.toString());
  const [ventHood, setVentHood] = useState(currentSettings.ventHood.toString());

  useEffect(() => {
    setGrill(currentSettings.grill.toString());
    setOven(currentSettings.oven.toString());
    setRange(currentSettings.range.toString());
    setVentHood(currentSettings.ventHood.toString());
  }, [currentSettings]);

  const handleSubmit = () => {
    const grillValue = parseFloat(grill);
    const ovenValue = parseFloat(oven);
    const rangeValue = parseFloat(range);
    const ventHoodValue = parseFloat(ventHood);

    if (isNaN(grillValue) || isNaN(ovenValue) || isNaN(rangeValue) || isNaN(ventHoodValue)) {
      alert('Please enter valid numbers for all COGS values');
      return;
    }

    if (grillValue < 0 || ovenValue < 0 || rangeValue < 0 || ventHoodValue < 0) {
      alert('COGS values cannot be negative');
      return;
    }

    onSave({
      grill: grillValue,
      oven: ovenValue,
      range: rangeValue,
      ventHood: ventHoodValue
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>COGS Calculator Settings</DialogTitle>
          <DialogDescription>
            Configure the average Cost of Goods Sold (COGS) for each service type. These values represent the average cost of supplies used per cleaning.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-3">
              💡 <strong>Tip:</strong> These are "on average" estimates. Some jobs may use more or less, but this helps calculate profitability consistently.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="grill" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Grill Cleaning COGS
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="grill"
                  type="number"
                  step="0.01"
                  min="0"
                  value={grill}
                  onChange={(e) => setGrill(e.target.value)}
                  placeholder="19.20"
                />
                <span className="text-sm text-muted-foreground">per cleaning</span>
              </div>
            </div>

            <div>
              <Label htmlFor="oven" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Oven Cleaning COGS
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="oven"
                  type="number"
                  step="0.01"
                  min="0"
                  value={oven}
                  onChange={(e) => setOven(e.target.value)}
                  placeholder="16.20"
                />
                <span className="text-sm text-muted-foreground">per cleaning</span>
              </div>
            </div>

            <div>
              <Label htmlFor="range" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Range Cleaning COGS
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="range"
                  type="number"
                  step="0.01"
                  min="0"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder="15.00"
                />
                <span className="text-sm text-muted-foreground">per cleaning</span>
              </div>
            </div>

            <div>
              <Label htmlFor="ventHood" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Vent Hood Cleaning COGS
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="ventHood"
                  type="number"
                  step="0.01"
                  min="0"
                  value={ventHood}
                  onChange={(e) => setVentHood(e.target.value)}
                  placeholder="20.00"
                />
                <span className="text-sm text-muted-foreground">per cleaning</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <div className="text-sm text-blue-300">
              <strong>Note:</strong> These values will be used to calculate the total COGS for each day based on the services performed.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              Save COGS Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}