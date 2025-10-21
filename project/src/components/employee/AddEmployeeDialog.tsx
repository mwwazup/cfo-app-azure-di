import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AddEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (employee: { name: string; position: string; baseRate: number }) => void;
}

export function AddEmployeeDialog({ open, onClose, onAdd }: AddEmployeeDialogProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [baseRate, setBaseRate] = useState('');

  const handleSubmit = () => {
    if (!name || !position || !baseRate) {
      alert('Please fill in all fields');
      return;
    }

    const rate = parseFloat(baseRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid base rate');
      return;
    }

    onAdd({ name, position, baseRate: rate });
    
    // Reset form
    setName('');
    setPosition('');
    setBaseRate('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee Name</Label>
            <Input
              placeholder="e.g., John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Position</Label>
            <Input
              placeholder="e.g., Technician"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div>
            <Label>Current Base Rate ($/hr)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 29.81"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is the default rate for new pay periods
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              Add Employee
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
