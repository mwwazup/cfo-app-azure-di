import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface EmployeeInfo {
  name: string;
  position: string;
  currentBaseRate: number;
}

interface EditEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeInfo;
  onSave: (employee: EmployeeInfo) => void;
}

export function EditEmployeeDialog({ open, onClose, employee, onSave }: EditEmployeeDialogProps) {
  const [name, setName] = useState(employee.name);
  const [position, setPosition] = useState(employee.position);
  const [baseRate, setBaseRate] = useState(employee.currentBaseRate.toString());

  useEffect(() => {
    setName(employee.name);
    setPosition(employee.position);
    setBaseRate(employee.currentBaseRate.toString());
  }, [employee]);

  const handleSubmit = () => {
    if (!name || !position || !baseRate) {
      alert('Please fill in all fields');
      return;
    }
    onSave({
      name,
      position,
      currentBaseRate: parseFloat(baseRate)
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Position</Label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div>
            <Label>Base Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
