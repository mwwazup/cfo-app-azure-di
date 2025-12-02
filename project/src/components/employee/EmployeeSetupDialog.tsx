import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface EmployeeSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (employee: { name: string; position: string; currentBaseRate: number }) => void;
}

export function EmployeeSetupDialog({ open, onClose, onSave }: EmployeeSetupDialogProps) {
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

    onSave({
      name,
      position,
      currentBaseRate: rate
    });
    
    // Reset form
    setName('');
    setPosition('');
    setBaseRate('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome! Let's Set Up Your Employee Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To get started with the Employee LER tracking system, we need some basic information.
          </p>

          <div>
            <Label htmlFor="name">Employee Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Smith"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., Senior Technician"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="baseRate">Hourly Base Rate ($) *</Label>
            <Input
              id="baseRate"
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              placeholder="e.g., 32.46"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
              Create Employee Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
