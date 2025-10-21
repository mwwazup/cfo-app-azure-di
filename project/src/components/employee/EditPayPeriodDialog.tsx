import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface EditPayPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  currentPeriod: {
    periodName: string;
    startDate: string;
    endDate: string;
    baseRate: number;
  } | null;
  onUpdate: (period: { periodName: string; startDate: string; endDate: string; baseRate: number }) => void;
}

export function EditPayPeriodDialog({ open, onClose, currentPeriod, onUpdate }: EditPayPeriodDialogProps) {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseRate, setBaseRate] = useState('');

  useEffect(() => {
    if (currentPeriod && open) {
      setPeriodName(currentPeriod.periodName);
      setStartDate(currentPeriod.startDate);
      setEndDate(currentPeriod.endDate);
      setBaseRate(currentPeriod.baseRate.toString());
    }
  }, [currentPeriod, open]);

  const handleSubmit = () => {
    if (!periodName || !startDate || !endDate || !baseRate) {
      alert('Please fill in all fields');
      return;
    }
    const rate = parseFloat(baseRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid base rate');
      return;
    }
    onUpdate({ periodName, startDate, endDate, baseRate: rate });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pay Period</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Period Name</Label>
            <Input
              placeholder="e.g., 12/26 thru 1/10"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
            />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Base Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 32.46"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This rate will be used for all calculations in this pay period
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              Update Period
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
