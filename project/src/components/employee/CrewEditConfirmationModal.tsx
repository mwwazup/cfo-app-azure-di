import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Users, Clock, DollarSign } from 'lucide-react';
import type { DailyRecord } from './AddDailyRecordWithServices';

interface CrewEditConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  crewRecord: DailyRecord;
  affectedCrewMembers: Array<{
    employeeId: string;
    employeeName: string;
    baseRate: number;
    totalHours: number;
    totalRevenue: number;
    ler: number;
    bonus: number;
  }>;
  newValues: {
    totalHours?: number;
    totalRevenue?: number;
    notes?: string;
  };
}

export function CrewEditConfirmationModal({
  open,
  onClose,
  onConfirm,
  crewRecord,
  affectedCrewMembers,
  newValues
}: CrewEditConfirmationModalProps) {
  const hasChanges = 
    (newValues.totalHours !== undefined && newValues.totalHours !== crewRecord.totalHoursWorked) ||
    (newValues.totalRevenue !== undefined && newValues.totalRevenue !== crewRecord.totalJobRevenue) ||
    (newValues.notes !== undefined && newValues.notes !== (crewRecord.notes || ''));

  if (!hasChanges) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Crew Day Edit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Warning:</strong> You are editing a crew day that affects {affectedCrewMembers.length} employees. 
              This change will update records for all crew members listed below.
            </p>
          </div>

          {/* Changes Summary */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Changes to be Made:</h3>
            <div className="space-y-2">
              {newValues.totalHours !== undefined && newValues.totalHours !== crewRecord.totalHoursWorked && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    Daily Hours: <span className="font-mono">{crewRecord.totalHoursWorked}</span> → 
                    <span className="font-mono text-blue-600">{newValues.totalHours}</span>
                  </span>
                </div>
              )}
              {newValues.totalRevenue !== undefined && newValues.totalRevenue !== crewRecord.totalJobRevenue && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    Total Revenue: <span className="font-mono">${crewRecord.totalJobRevenue.toFixed(2)}</span> → 
                    <span className="font-mono text-green-600">${newValues.totalRevenue?.toFixed(2)}</span>
                  </span>
                </div>
              )}
              {newValues.notes !== undefined && newValues.notes !== (crewRecord.notes || '') && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span>
                  <div className="mt-1 p-2 bg-background rounded border">
                    <div className="text-muted-foreground line-clamp-2">{crewRecord.notes || 'No notes'}</div>
                    <div className="border-t border-dashed my-1"></div>
                    <div className="text-foreground">{newValues.notes || 'No notes'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Affected Crew Members */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Affected Crew Members ({affectedCrewMembers.length})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Employee</th>
                    <th className="text-center p-3 text-sm font-medium">Hours</th>
                    <th className="text-center p-3 text-sm font-medium">Revenue</th>
                    <th className="text-center p-3 text-sm font-medium">LER</th>
                    <th className="text-center p-3 text-sm font-medium">Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {affectedCrewMembers.map((member) => (
                    <tr key={member.employeeId} className="hover:bg-muted/20">
                      <td className="p-3 text-sm font-medium">{member.employeeName}</td>
                      <td className="p-3 text-sm text-center font-mono">{member.totalHours}</td>
                      <td className="p-3 text-sm text-center font-mono">${member.totalRevenue.toFixed(2)}</td>
                      <td className="p-3 text-sm text-center font-mono">{member.ler.toFixed(2)}</td>
                      <td className="p-3 text-sm text-center font-mono text-green-600">
                        ${member.bonus.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel Edit
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Update All {affectedCrewMembers.length} Records
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
