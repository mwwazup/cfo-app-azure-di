import React, { createContext, useContext } from 'react';
import { useKPIRefresh } from '../../hooks/useKPIRefresh';
import { KPIRefreshDialog } from '../ui/kpi-refresh-dialog';

interface KPIRefreshContextType {
  promptForKPIRefresh: (options?: any) => void;
  refreshKPIs: () => Promise<void>;
  showPendingChangesDialog: () => void;
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
    changeDescription,
    affectedKPIs,
    hasPendingChanges,
    promptForKPIRefresh,
    refreshKPIs,
    showPendingChangesDialog,
    closeDialog,
    cancelRefresh
  } = kpiRefreshHook;

  return (
    <KPIRefreshContext.Provider value={{
      promptForKPIRefresh,
      refreshKPIs,
      showPendingChangesDialog,
      isDialogOpen,
      isRefreshing,
      hasPendingChanges
    }}>
      {children}
      
      <KPIRefreshDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onConfirm={refreshKPIs}
        onCancel={cancelRefresh}
        isRefreshing={isRefreshing}
        changeDescription={changeDescription}
        affectedKPIs={affectedKPIs}
      />
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
