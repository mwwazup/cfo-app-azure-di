import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CashflowData {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerDistributions: number;
  taxes: number;
}

interface CashflowSyncContextType {
  cashflowData: CashflowData;
  setCashflowData: React.Dispatch<React.SetStateAction<CashflowData>>;
  syncFromManualPL: (data: CashflowData) => void;
  isManualPLOpen: boolean;
  setIsManualPLOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CashflowSyncContext = createContext<CashflowSyncContextType | undefined>(undefined);

interface CashflowSyncProviderProps {
  children: ReactNode;
}

export const CashflowSyncProvider: React.FC<CashflowSyncProviderProps> = ({ children }) => {
  const [cashflowData, setCashflowData] = useState<CashflowData>({
    revenue: 100000,
    cogs: 40000,
    operatingExpenses: 25000,
    ownerDistributions: 24000,
    taxes: 4800,
  });

  const [isManualPLOpen, setIsManualPLOpen] = useState(false);

  const syncFromManualPL = (data: CashflowData) => {
    setCashflowData(data);
  };

  const value: CashflowSyncContextType = {
    cashflowData,
    setCashflowData,
    syncFromManualPL,
    isManualPLOpen,
    setIsManualPLOpen,
  };

  return (
    <CashflowSyncContext.Provider value={value}>
      {children}
    </CashflowSyncContext.Provider>
  );
};

export const useCashflowSync = (): CashflowSyncContextType => {
  const context = useContext(CashflowSyncContext);
  if (!context) {
    throw new Error('useCashflowSync must be used within a CashflowSyncProvider');
  }
  return context;
};
