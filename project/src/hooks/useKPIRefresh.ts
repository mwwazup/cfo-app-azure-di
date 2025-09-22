import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { RevenueKPIGenerator } from '../services/revenueKPIGenerator';

interface KPIRefreshOptions {
  changeDescription?: string;
  affectedKPIs?: string[];
  autoRefresh?: boolean;
}

interface KPIRefreshState {
  isDialogOpen: boolean;
  isRefreshing: boolean;
  changeDescription: string;
  affectedKPIs: string[];
  hasPendingChanges: boolean;
}

export function useKPIRefresh() {
  const { user } = useAuth();
  const [state, setState] = useState<KPIRefreshState>({
    isDialogOpen: false,
    isRefreshing: false,
    changeDescription: '',
    affectedKPIs: [],
    hasPendingChanges: false
  });
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<{
    changeDescription: string;
    affectedKPIs: string[];
  } | null>(null);

  const refreshKPIs = useCallback(async () => {
    if (!user?.id) return;

    setState(prev => ({ ...prev, isRefreshing: true }));

    try {
      await RevenueKPIGenerator.generateAllKPIs(user.id);
      
      // Close dialog after successful refresh
      setState(prev => ({ 
        ...prev, 
        isDialogOpen: false, 
        isRefreshing: false,
        hasPendingChanges: false
      }));
      
      // Clear pending changes
      pendingChangesRef.current = null;

      // Trigger custom event to notify KPI dashboard to refresh
      console.log('KPIs refreshed successfully - notifying dashboard to refresh');
      window.dispatchEvent(new CustomEvent('kpiRefreshComplete'));
      
    } catch (error) {
      console.error('Failed to refresh KPIs:', error);
      setState(prev => ({ ...prev, isRefreshing: false }));
      // Optional: Show error notification
    }
  }, [user?.id]);

  const promptForKPIRefresh = useCallback((options: KPIRefreshOptions = {}) => {
    const {
      changeDescription = "This change",
      affectedKPIs = ["Revenue metrics", "Growth rates", "Performance indicators"],
      autoRefresh = false
    } = options;

    if (autoRefresh && user?.id) {
      // Auto-refresh without prompting
      refreshKPIs();
      return;
    }

    // Store pending changes but don't show dialog immediately
    pendingChangesRef.current = { changeDescription, affectedKPIs };
    setState(prev => ({ ...prev, hasPendingChanges: true }));

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer - only show dialog after user stops making changes for 3 seconds
    debounceTimerRef.current = setTimeout(() => {
      if (pendingChangesRef.current) {
        setState(prev => ({
          ...prev,
          isDialogOpen: true,
          isRefreshing: false,
          changeDescription: pendingChangesRef.current!.changeDescription,
          affectedKPIs: pendingChangesRef.current!.affectedKPIs
        }));
      }
    }, 3000); // 3 second delay
  }, [user?.id, refreshKPIs]);

  const closeDialog = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isDialogOpen: false, 
      isRefreshing: false 
    }));
  }, []);

  const cancelRefresh = useCallback(() => {
    // Clear pending changes when user cancels
    pendingChangesRef.current = null;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setState(prev => ({ 
      ...prev, 
      isDialogOpen: false, 
      isRefreshing: false,
      hasPendingChanges: false
    }));
  }, []);

  // Force show dialog immediately (for page navigation)
  const showPendingChangesDialog = useCallback(() => {
    if (pendingChangesRef.current && state.hasPendingChanges) {
      // Clear timer since we're showing immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      setState(prev => ({
        ...prev,
        isDialogOpen: true,
        isRefreshing: false,
        changeDescription: pendingChangesRef.current!.changeDescription,
        affectedKPIs: pendingChangesRef.current!.affectedKPIs
      }));
    }
  }, [state.hasPendingChanges]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    isDialogOpen: state.isDialogOpen,
    isRefreshing: state.isRefreshing,
    changeDescription: state.changeDescription,
    affectedKPIs: state.affectedKPIs,
    hasPendingChanges: state.hasPendingChanges,
    
    // Actions
    promptForKPIRefresh,
    refreshKPIs,
    closeDialog,
    cancelRefresh,
    showPendingChangesDialog
  };
}

// Utility function to determine which KPIs are affected by different changes
export function getAffectedKPIs(changeType: string): string[] {
  const kpiMap: Record<string, string[]> = {
    revenue: [
      "Monthly Revenue",
      "YTD Revenue", 
      "Projected Annual",
      "Gap to Target",
      "YoY Growth",
      "Revenue Velocity"
    ],
    target: [
      "Gap to Target",
      "Projected Annual",
      "YTD Performance"
    ],
    profit_margin: [
      "Profit Margin",
      "Revenue metrics"
    ],
    all: [
      "All KPIs and performance metrics"
    ]
  };

  return kpiMap[changeType] || kpiMap.all;
}
