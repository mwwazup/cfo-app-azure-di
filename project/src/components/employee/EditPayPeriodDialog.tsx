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
  onUpdate: (period: { periodName: string; startDate: string; endDate: string }) => void;
}

export function EditPayPeriodDialog({ open, onClose, currentPeriod, onUpdate }: EditPayPeriodDialogProps) {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseRate, setBaseRate] = useState(0);

  useEffect(() => {
    if (currentPeriod && open) {
      setPeriodName(currentPeriod.periodName);
      setStartDate(currentPeriod.startDate);
      setEndDate(currentPeriod.endDate);
      setBaseRate(currentPeriod.baseRate);
    }
  }, [currentPeriod, open]);

  const handleSubmit = () => {
    if (!periodName || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }
    onUpdate({ periodName, startDate, endDate });
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
