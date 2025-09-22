import React from 'react';
import { AlertTriangle, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { Button } from './button';

interface KPIRefreshDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  isRefreshing?: boolean;
  changeDescription?: string;
  affectedKPIs?: string[];
}

export function KPIRefreshDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  isRefreshing = false,
  changeDescription = "This change",
  affectedKPIs = ["Revenue metrics", "Growth rates", "Performance indicators"]
}: KPIRefreshDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Update KPIs?
            </h3>
            <p className="text-sm text-muted mb-3">
              {changeDescription} will affect your KPIs. Would you like to refresh them now to see the updated values?
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 mb-4">
              <p className="text-xs font-medium text-muted mb-2">Affected KPIs:</p>
              <ul className="text-xs text-muted space-y-1">
                {affectedKPIs.map((kpi, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                    {kpi}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            disabled={isRefreshing}
            className="flex-1 flex items-center justify-center gap-2"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Yes, Update KPIs
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isRefreshing}
            className="flex-1 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Clock className="h-4 w-4" />
            Not Now
          </Button>
        </div>

        <p className="text-xs text-muted mt-3 text-center">
          You can always refresh KPIs later from the dashboard
        </p>
      </div>
    </div>
  );
}
