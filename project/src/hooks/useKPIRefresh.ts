import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthContext } from '../contexts/auth-context';
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
  const { dbUserId } = useAuthContext();
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
    if (!dbUserId) {
      console.warn('⚠️ Cannot refresh KPIs: No user ID available');
      setState(prev => ({ ...prev, isRefreshing: false }));
      return;
    }

    console.log('🔄 Starting KPI refresh for user:', dbUserId);
    setState(prev => ({ ...prev, isRefreshing: true }));

    // Add a 15-second timeout
    const timeoutId = setTimeout(() => {
      console.error('⏱️ KPI refresh timed out after 15 seconds');
      RevenueKPIGenerator.emergencyStop(); // Stop generation FIRST
      setState(prev => ({ ...prev, isRefreshing: false }));
      alert('KPI refresh is taking too long and has been stopped. The page will reload.');
      setTimeout(() => window.location.reload(), 1000); // Reload after 1 second
    }, 15000);

    try {
      // Only generate KPIs for current year to avoid processing dummy data from 2023
      await RevenueKPIGenerator.generateAllKPIs(dbUserId, false);
      
      clearTimeout(timeoutId); // Clear timeout if successful
      console.log('✅ KPI refresh completed successfully');
      
      // Close dialog after successful refresh
      setState(prev => ({ 
        ...prev, 
        isDialogOpen: false, 
        isRefreshing: false,
        hasPendingChanges: false
      }));
      
      // Clear pending changes
      pendingChangesRef.current = null;

      // Note: Removed kpiRefreshComplete event dispatch to prevent infinite loops
      // KPI Dashboard will refresh on its own schedule or user can manually refresh
      
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error('❌ Failed to refresh KPIs:', error);
      setState(prev => ({ ...prev, isRefreshing: false }));
      alert('Failed to refresh KPIs. Check console for details.');
    }
  }, [dbUserId]);

  const promptForKPIRefresh = useCallback((options: KPIRefreshOptions = {}) => {
    const {
      changeDescription = "This change",
      affectedKPIs = ["Revenue metrics", "Growth rates", "Performance indicators"],
      autoRefresh = false
    } = options;

    if (autoRefresh && dbUserId) {
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

    // Set new timer - only show dialog after user stops making changes for 10 seconds
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
    }, 10000); // 10 second delay
  }, [dbUserId, refreshKPIs]);

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

  // Cleanup on unmount and ensure clean state on mount
  useEffect(() => {
    // Reset state on mount to prevent stuck states
    setState(prev => ({ ...prev, isRefreshing: false, isDialogOpen: false }));
    
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
