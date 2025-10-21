import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AddPayPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (period: { periodName: string; startDate: string; endDate: string }) => void;
}

export function AddPayPeriodDialog({ open, onClose, onAdd }: AddPayPeriodDialogProps) {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!periodName || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }
    onAdd({ periodName, startDate, endDate });
    setPeriodName('');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Pay Period</DialogTitle>
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
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">Add Period</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
