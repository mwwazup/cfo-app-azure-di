import { useState } from 'react';
import { MasterChart } from '../../components/RevenueChart/MasterChart';
import KPIDashboard from '../../components/dashboard/KPIDashboard';
import { useRevenue } from '../../contexts/revenue-context';
import { Info } from 'lucide-react';
import { RevenueImportWizard } from '../../components/RevenueImport/RevenueImportWizard';

export function MasterRevenuePage() {
  const { currentYear } = useRevenue();
  const [wizardOpen, setWizardOpen] = useState(false);

  const shouldShowImport = currentYear.isSample || currentYear.data.every(d => d.revenue === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">
            Master Revenue Curve
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track your actual monthly and desired future growth revenue and let's ride your wave to close your gap!
          </p>
        </div>
      </div>

      {/* Sample Data Banner */}
      {currentYear.isSample && (() => {
        const remaining = currentYear.data.filter(d => d.isSample).length;
        return (
          <div className="flex items-start gap-3 p-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-900">
            <Info className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Sample Data</p>
              {remaining === 12 ? (
                <p className="text-sm leading-snug">
                  You’re currently viewing illustrative numbers. Edit a month’s revenue or import your actual data to personalize the dashboard.
                </p>
              ) : (
                <p className="text-sm leading-snug">
                  {remaining} of 12 months still contain sample data. Keep editing or importing until all months are updated and this banner will disappear.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {shouldShowImport && (
        <div>
          <button
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded hover:bg-accent/90"
            onClick={() => setWizardOpen(true)}
          >
            Import Revenue
          </button>
        </div>
      )}

      <MasterChart />

      {/* KPI Dashboard */}
      <div className="mt-8">
        <KPIDashboard className="w-full" />
      </div>

      {/* Import Wizard Modal */}
      <RevenueImportWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}