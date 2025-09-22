import React, { useState } from 'react';
import { useKPIRefresh, getAffectedKPIs } from '../../hooks/useKPIRefresh';
import { KPIRefreshDialog } from '../ui/kpi-refresh-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/**
 * Example component showing how to integrate KPI refresh prompts
 * with revenue updates. This demonstrates the hybrid approach.
 */
export function RevenueUpdateExample() {
  const [revenueValue, setRevenueValue] = useState('');
  const {
    isDialogOpen,
    isRefreshing,
    changeDescription,
    affectedKPIs,
    promptForKPIRefresh,
    refreshKPIs,
    closeDialog,
    cancelRefresh
  } = useKPIRefresh();

  const handleRevenueUpdate = async () => {
    if (!revenueValue) return;

    // 1. Save the revenue data first
    // await saveRevenueData(revenueValue);
    console.log('Revenue updated to:', revenueValue);

    // 2. Prompt user for KPI refresh
    promptForKPIRefresh({
      changeDescription: `Updating revenue to $${revenueValue}`,
      affectedKPIs: getAffectedKPIs('revenue')
    });
  };

  const handleTargetUpdate = async () => {
    // Example for target updates
    promptForKPIRefresh({
      changeDescription: "Updating your revenue target",
      affectedKPIs: getAffectedKPIs('target')
    });
  };

  const handleProfitMarginUpdate = async () => {
    // Example for profit margin updates
    promptForKPIRefresh({
      changeDescription: "Updating your profit margin goal",
      affectedKPIs: getAffectedKPIs('profit_margin')
    });
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Revenue Update Example</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Monthly Revenue
          </label>
          <Input
            type="number"
            value={revenueValue}
            onChange={(e) => setRevenueValue(e.target.value)}
            placeholder="Enter revenue amount"
          />
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleRevenueUpdate}
            className="w-full"
            disabled={!revenueValue}
          >
            Update Revenue
          </Button>
          
          <Button 
            onClick={handleTargetUpdate}
            variant="outline"
            className="w-full"
          >
            Update Target (Example)
          </Button>
          
          <Button 
            onClick={handleProfitMarginUpdate}
            variant="outline"
            className="w-full"
          >
            Update Profit Margin (Example)
          </Button>
        </div>
      </div>

      {/* KPI Refresh Dialog */}
      <KPIRefreshDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onConfirm={refreshKPIs}
        onCancel={cancelRefresh}
        isRefreshing={isRefreshing}
        changeDescription={changeDescription}
        affectedKPIs={affectedKPIs}
      />
    </div>
  );
}
