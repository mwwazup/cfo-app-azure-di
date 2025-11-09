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
  onAdd: (period: { periodName: string; startDate: string; endDate: string; year: number }) => void;
  hasMultipleEmployees?: boolean;
  onAddForAllEmployees?: (period: { periodName: string; startDate: string; endDate: string; year: number }) => void;
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [applyToAll, setApplyToAll] = useState(false);

  const handleSubmit = () => {
    if (!periodName || !startDate || !endDate) {
      alert('Please fill in all fields');
      return;
    }
    
    if (applyToAll && onAddForAllEmployees) {
      // Apply to all employees (each with their own base rate)
      onAddForAllEmployees({ periodName, startDate, endDate, year });
    } else {
      // Apply to current employee only (uses their current base rate)
      onAdd({ periodName, startDate, endDate, year });
    }
    
    setPeriodName('');
    setStartDate('');
    setEndDate('');
    setYear(new Date().getFullYear());
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
          
          <div>
            <Label>Year</Label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the calendar year for this pay period
            </p>
          </div>
          
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
            <div className="bg-muted/30 p-3 rounded-md border border-accent/20">
              <p className="text-sm font-medium text-foreground mb-1">📋 Bulk Pay Period</p>
              <p className="text-sm text-muted-foreground">This pay period will be created for all employees using their individual base rates.</p>
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
