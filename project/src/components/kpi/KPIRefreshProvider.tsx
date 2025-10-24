import React, { createContext, useContext } from 'react';
import { useKPIRefresh } from '../../hooks/useKPIRefresh';

interface KPIRefreshContextType {
  promptForKPIRefresh: (options?: any) => void;
  refreshKPIs: () => Promise<void>;
  showPendingChangesDialog: () => void;
  cancelRefresh: () => void;
  isDialogOpen: boolean;
  isRefreshing: boolean;
  hasPendingChanges: boolean;
}

const KPIRefreshContext = createContext<KPIRefreshContextType | undefined>(undefined);

interface KPIRefreshProviderProps {
  children: React.ReactNode;
}

export function KPIRefreshProvider({ children }: KPIRefreshProviderProps) {
  const kpiRefreshHook = useKPIRefresh();
  
  const {
    isDialogOpen,
    isRefreshing,
    hasPendingChanges,
    promptForKPIRefresh,
    refreshKPIs,
    showPendingChangesDialog,
    cancelRefresh
  } = kpiRefreshHook;

  return (
    <KPIRefreshContext.Provider value={{
      promptForKPIRefresh,
      refreshKPIs,
      showPendingChangesDialog,
      cancelRefresh,
      isDialogOpen,
      isRefreshing,
      hasPendingChanges
    }}>
      {children}
    </KPIRefreshContext.Provider>
  );
}

// Hook to use the KPI refresh context
export function useKPIRefreshContext() {
  const context = useContext(KPIRefreshContext);
  if (context === undefined) {
    throw new Error('useKPIRefreshContext must be used within a KPIRefreshProvider');
  }
  return context;
}
