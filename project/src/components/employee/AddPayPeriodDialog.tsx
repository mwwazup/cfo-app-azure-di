import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

interface AddPayPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  currentBaseRate: number;
  onAdd: (period: { periodName: string; startDate: string; endDate: string; baseRate: number }) => void;
  hasMultipleEmployees?: boolean;
  onAddForAllEmployees?: (period: { periodName: string; startDate: string; endDate: string }) => void;
}

export function AddPayPeriodDialog({ 
  open, 
  onClose, 
  currentBaseRate, 
  onAdd, 
  hasMultipleEmployees = false,
  onAddForAllEmployees 
}: AddPayPeriodDialogProps) {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseRate, setBaseRate] = useState(currentBaseRate.toString());
  const [applyToAll, setApplyToAll] = useState(false);

  const handleSubmit = () => {
    if (!periodName || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }
    
    if (applyToAll && onAddForAllEmployees) {
      // Apply to all employees (each with their own base rate)
      onAddForAllEmployees({ periodName, startDate, endDate });
    } else {
      // Apply to current employee only
      const rate = parseFloat(baseRate);
      if (isNaN(rate) || rate <= 0) {
        alert('Please enter a valid base rate');
        return;
      }
      onAdd({ periodName, startDate, endDate, baseRate: rate });
    }
    
    setPeriodName('');
    setStartDate('');
    setEndDate('');
    setBaseRate(currentBaseRate.toString());
    setApplyToAll(false);
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
          {!applyToAll && (
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
                Current employee rate: ${currentBaseRate.toFixed(2)}/hr
              </p>
            </div>
          )}
          
          {hasMultipleEmployees && (
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-md">
              <Checkbox
                id="apply-to-all"
                checked={applyToAll}
                onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
              />
              <label
                htmlFor="apply-to-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Apply this pay period to all employees
              </label>
            </div>
          )}
          
          {applyToAll && (
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">📋 Bulk Pay Period</p>
              <p>This pay period will be created for all employees using their individual base rates.</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">Add Period</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
