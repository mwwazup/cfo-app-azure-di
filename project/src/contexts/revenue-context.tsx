import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from './auth-context';
import { RevenueDataService } from '../services/revenueDataService';
import { KPIDataService, RevenueKPI } from '../services/kpiDataService';
import { RevenueKPIGenerator } from '../services/revenueKPIGenerator';

export interface MonthlyData {
  month: string;
  revenue: number;
  target?: number;
  /** true if this value is still a placeholder/sample that the user hasn’t replaced */
  isSample?: boolean;
}

interface YearData {
  year: number;
  data: MonthlyData[];
  targetRevenue: number;
  profitMargin: number;
  isLocked: boolean;
  isHistorical?: boolean; // New flag to distinguish historical vs current/future years
  monthlyFIRTargets?: number[]; // New property for fixed monthly FIR targets
  isSample?: boolean; // Indicates the data is placeholder/sample only
}

interface RevenueContextType {
  currentYear: YearData;
  selectedYear: number;
  availableYears: number[];
  historicalYears: YearData[];
  updateMonthlyRevenue: (month: string, revenue: number) => void;
  updateTargets: (targetRevenue: number, profitMargin: number) => void;
  updateProfitMargin: (profitMargin: number) => void;
  saveAndLockYear: () => void;
  createNewYear: () => void;
  selectYear: (year: number) => void;
  getYearData: (year: number) => YearData;
  playgroundData: YearData;
  updatePlaygroundData: (data: Partial<YearData>) => void;
  resetPlayground: () => void;
  isLoading: boolean;
  currentYearKpis?: RevenueKPI;
  unlockHistoricalYear: (year: number) => void;
  lockHistoricalYear: (year: number) => void;
}

const RevenueContext = createContext<RevenueContextType | undefined>(undefined);

export const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Sample data from the original code
const defaultMonthlyRevenue = [18000, 23500, 28000, 35000, 39500, 42500, 52000, 58000, 62500, 42000, 35000, 22000];
const defaultDesiredRevenue = 750000; // Changed from 600000 to 750000 for cleaner display
const defaultProfitMargin = 20;

// Generate realistic historical data with growth patterns and seasonality
const generateHistoricalData = (year: number): MonthlyData[] => {
  const currentYear = new Date().getFullYear();
  const yearsBack = currentYear - year;
  
  // Apply growth factor (businesses typically grow 10-20% year over year)
  const growthFactor = Math.pow(0.85, yearsBack); // 15% decline per year going back
  
  // Add some randomness and seasonality
  return months.map((month, index) => {
    const baseMonthly = defaultMonthlyRevenue[index];
    const seasonalityFactor = 1 + Math.sin((index + 1) * Math.PI / 6) * 0.2; // Seasonal variation
    const randomFactor = 0.8 + Math.random() * 0.4; // ±20% random variation
    
    const revenue = Math.round(baseMonthly * growthFactor * seasonalityFactor * randomFactor);
    return { month, revenue, isSample: true };
  });
};

// Calculate monthly FIR targets based on previous year's distribution
const calculateMonthlyFIRTargets = (targetRevenue: number, previousYearData?: YearData, currentYearData?: YearData): number[] => {
  if (previousYearData && previousYearData.data) {
    // Use previous year's pattern as the base
    const previousYearRevenue = previousYearData.data.map(item => item.revenue);
    const totalPreviousRevenue = previousYearRevenue.reduce((sum, revenue) => sum + revenue, 0);

    if (totalPreviousRevenue > 0) {
      // Calculate each month's percentage of total previous year revenue
      const monthlyPercentages = previousYearRevenue.map(revenue => revenue / totalPreviousRevenue);
      
      // Apply these percentages to the target revenue
      return monthlyPercentages.map(percentage => targetRevenue * percentage);
    }
  }

  // No previous year data OR previous year has no revenue
  // Create an intelligent FIR curve based on current year data + growth trajectory
  if (currentYearData && currentYearData.data) {
    const currentRevenue = currentYearData.data.map(item => item.revenue);
    const totalCurrentRevenue = currentRevenue.reduce((sum, revenue) => sum + revenue, 0);
    
    if (totalCurrentRevenue > 0) {
      // Calculate the gap we need to fill
      const revenueGap = targetRevenue - totalCurrentRevenue;
      
      // Create a growth curve that builds on current year's pattern
      const currentPercentages = currentRevenue.map(revenue => 
        totalCurrentRevenue > 0 ? revenue / totalCurrentRevenue : 1/12
      );
      
      // Apply current pattern + proportional growth to reach target
      return currentPercentages.map((percentage, index) => {
        const baseAmount = currentRevenue[index];
        const growthAmount = revenueGap * percentage;
        return Math.max(baseAmount + growthAmount, targetRevenue / 12 * 0.5); // Minimum floor
      });
    }
  }

  // Fallback: Create a realistic business growth curve (not flat)
  // Most businesses have seasonal patterns - higher in middle/end of year
  const seasonalMultipliers = [
    0.75, 0.80, 0.85, 0.90, 0.95, 1.00,  // Jan-Jun: Building up
    1.05, 1.10, 1.15, 1.20, 1.15, 1.10   // Jul-Dec: Peak and taper
  ];
  
  const baseMonthly = targetRevenue / 12;
  return seasonalMultipliers.map(multiplier => baseMonthly * multiplier);
};

const createCurrentYear = (year: number, allYearsData?: Map<number, YearData>): YearData => {
  const previousYearData = allYearsData?.get(year - 1);
  const monthlyFIRTargets = calculateMonthlyFIRTargets(defaultDesiredRevenue, previousYearData);

  return {
    year,
    data: months.map((month, index) => ({ 
      month, 
      revenue: defaultMonthlyRevenue[index] || 0,
      isSample: true
    })),
    targetRevenue: defaultDesiredRevenue,
    profitMargin: defaultProfitMargin,
    isLocked: false,
    isHistorical: false,
    monthlyFIRTargets,
    isSample: true
  };
};

const createHistoricalYear = (year: number): YearData => {
  
  return {
    year,
    data: generateHistoricalData(year),
    targetRevenue: 0, // No targets for historical years
    profitMargin: 0, // No profit margin tracking for historical years
    isLocked: true,
    isHistorical: true,
    monthlyFIRTargets: undefined, // No FIR targets for historical years
    isSample: true
  };
};

const createPlaygroundYear = (year: number): YearData => ({
  year,
  data: months.map((month, index) => ({ 
    month, 
    revenue: defaultMonthlyRevenue[index] || 0,
    isSample: true
  })),
  targetRevenue: defaultDesiredRevenue,
  profitMargin: defaultProfitMargin,
  isLocked: false,
  isHistorical: false,
  monthlyFIRTargets: Array(12).fill(defaultDesiredRevenue / 12), // Even distribution for playground
  isSample: true
});

export function RevenueProvider({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();
  const { dbUserId } = useAuthContext();
  
  const [availableYears, setAvailableYears] = useState<number[]>(Array.from({ length: 6 }, (_, i) => currentYear - i)); // default
   
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [allYearsData, setAllYearsData] = useState<Map<number, YearData>>(() => {
    const initialData = new Map();
    
    // Create historical years first
    availableYears.forEach(year => {
      if (year < currentYear) {
        initialData.set(year, createHistoricalYear(year));
      }
    });
    
    // Create current year with access to previous year data
    initialData.set(currentYear, createCurrentYear(currentYear, initialData));
    
    return initialData;
  });
  
  const [playgroundData, setPlaygroundData] = useState<YearData>(() => 
    createPlaygroundYear(currentYear)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [currentYearKpis, setCurrentYearKpis] = useState<RevenueKPI | undefined>();

  // Fetch revenue data from Supabase when user is available
  useEffect(() => {
    if (!dbUserId) return;

    const fetchRevenue = async () => {
      try {
        setIsLoading(true);

        // Get all years that have data for this user
        const years = await RevenueDataService.getAvailableYears(dbUserId);

        if (years && years.length) {
          setAvailableYears(prev => {
            // Merge unique years with any pre-existing
            const merged = Array.from(new Set([...prev, ...years])).sort((a, b) => b - a);
            return merged;
          });
        }

        const newYearMap = new Map<number, YearData>();

        for (const year of years) {
          const entries = await RevenueDataService.getRevenueDataForYear(dbUserId, year);

          // Build 12-month structure
          const monthlyData: MonthlyData[] = months.map((month, idx) => {
            const entry = entries.find(e => e.month === idx + 1);
            return {
              month,
              revenue: entry ? (entry.actual_revenue ?? 0) : 0,
              target: entry ? (entry.desired_revenue ?? entry.target_revenue ?? undefined) : undefined
            };
          });

          // Calculate targetRevenue by summing all 12 months' desired_revenue values
          // (not multiplying first month by 12, since each month has different seasonal targets)
          const targetRevenue = entries.reduce((sum, entry) => {
            return sum + (entry.desired_revenue ?? entry.target_revenue ?? 0);
          }, 0);
          
          const sampleEntry = entries[0];
          const profitMargin = sampleEntry ? (sampleEntry.profit_margin ?? 0) : 0;

          // Create temporary year data for FIR calculation
          const tempYearData = {
            year,
            data: monthlyData,
            targetRevenue,
            profitMargin,
            isLocked: false,
            isHistorical: year < currentYear,
            monthlyFIRTargets: [],
            isSample: false
          };

          // Reconstruct monthlyFIRTargets using intelligent FIR calculation
          const previousYearData = newYearMap.get(year - 1) || allYearsData.get(year - 1);
          const monthlyFIRTargets = year < currentYear 
            ? undefined // Historical years don't need FIR targets
            : calculateMonthlyFIRTargets(targetRevenue, previousYearData, tempYearData);

          // Debug: Log FIR calculation details
          if (monthlyFIRTargets && year >= currentYear) {
            console.log(`🎯 FIR Reconstruction for ${year}:`, {
              targetRevenue,
              hasPreviousYear: !!previousYearData,
              previousYearRevenue: previousYearData?.data?.reduce((sum, item) => sum + item.revenue, 0) || 0,
              firPattern: monthlyFIRTargets.map(val => Math.round(val)),
              isFlat: monthlyFIRTargets.every(val => Math.abs(val - monthlyFIRTargets[0]) < 1)
            });
            
            // Check if calculated FIR targets differ from database values
            const needsSync = entries.some((entry, index) => {
              const calculatedTarget = monthlyFIRTargets[index];
              const storedTarget = entry.desired_revenue || 0;
              // Allow 1 cent difference due to rounding
              return Math.abs(calculatedTarget - storedTarget) > 0.01;
            });
            
            if (needsSync && dbUserId) {
              console.log('⚠️ FIR targets out of sync with database. Syncing...');
              console.log('📊 Calculated targets:', monthlyFIRTargets.map(val => Math.round(val)));
              console.log('📊 Database targets:', entries.map(e => Math.round(e.desired_revenue || 0)));
              
              // Sync asynchronously without blocking UI
              RevenueDataService.updateYearTargets(
                dbUserId,
                year,
                targetRevenue,
                profitMargin,
                monthlyFIRTargets
              ).then(async res => {
                if (res.success) {
                  console.log('✅ FIR targets synced to database');
                  console.log('🔄 Reloading data to refresh UI...');
                  
                  // Refetch the year's data from database to update UI
                  const freshEntries = await RevenueDataService.getRevenueDataForYear(dbUserId, year);
                  const monthlyData: MonthlyData[] = months.map((month, idx) => {
                    const entry = freshEntries.find(e => e.month === idx + 1);
                    return {
                      month,
                      revenue: entry ? (entry.actual_revenue ?? 0) : 0,
                      target: entry ? (entry.desired_revenue ?? entry.target_revenue ?? undefined) : undefined
                    };
                  });
                  
                  // Update the state with fresh data
                  setAllYearsData(prev => {
                    const updated = new Map(prev);
                    const existingYear = updated.get(year);
                    if (existingYear) {
                      updated.set(year, {
                        ...existingYear,
                        data: monthlyData,
                        monthlyFIRTargets: monthlyFIRTargets
                      });
                    }
                    return updated;
                  });
                  
                  console.log('✅ UI refreshed with synced data');
                  
                  // Auto-regenerate KPIs for current month so they reflect new FIR targets
                  const currentMonth = new Date().getMonth() + 1;
                  const period = `${year}-${currentMonth.toString().padStart(2, '0')}`;
                  console.log('🔄 Auto-regenerating KPIs for', period);
                  
                  await RevenueKPIGenerator.generateKPIsForPeriod(dbUserId, period);
                  
                  // Reload KPIs to update dashboard
                  const freshKpis = await KPIDataService.getKpis(dbUserId, year);
                  setCurrentYearKpis(freshKpis);
                  
                  console.log('✅ KPIs auto-regenerated and refreshed');
                } else {
                  console.error('❌ Failed to sync FIR targets:', res.error);
                }
              }).catch(err => {
                console.error('❌ Error syncing FIR targets:', err);
              });
            }
          }

          newYearMap.set(year, {
            year,
            data: monthlyData,
            targetRevenue,
            profitMargin,
            isLocked: sampleEntry ? (sampleEntry.is_locked ?? false) : false,
            isHistorical: year < currentYear,
            monthlyFIRTargets,
            isSample: false
          });
        }

        if (newYearMap.size) {
          setAllYearsData(prev => {
            const combined = new Map(prev);
            newYearMap.forEach((val, key) => combined.set(key, val));
            return combined;
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenue();
  }, [dbUserId]);

  // Load data from localStorage on mount
  useEffect(() => {
    const storedData = localStorage.getItem('bigfigcfo-all-years-data');
    const storedSelectedYear = localStorage.getItem('bigfigcfo-selected-year');
    const storedPlayground = localStorage.getItem('bigfigcfo-playground');

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      const dataMap = new Map();
      Object.entries(parsedData).forEach(([year, data]) => {
        dataMap.set(parseInt(year), data);
      });
      setAllYearsData(dataMap);
    }
    
    if (storedSelectedYear) {
      setSelectedYear(parseInt(storedSelectedYear));
    }
    
    if (storedPlayground) {
      setPlaygroundData(JSON.parse(storedPlayground));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    const dataObject = Object.fromEntries(allYearsData);
    localStorage.setItem('bigfigcfo-all-years-data', JSON.stringify(dataObject));
  }, [allYearsData]);

  useEffect(() => {
    localStorage.setItem('bigfigcfo-selected-year', selectedYear.toString());
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('bigfigcfo-playground', JSON.stringify(playgroundData));
  }, [playgroundData]);

  // Load KPI metrics whenever selected year changes or data is mutated
  useEffect(() => {
    const loadKpis = async () => {
      if (!dbUserId) return;
      const kpi = await KPIDataService.getKpis(dbUserId, selectedYear);
      setCurrentYearKpis(kpi);
    };

    loadKpis();
  }, [dbUserId, selectedYear, allYearsData]);

  const getCurrentYearData = (): YearData => {
    return allYearsData.get(selectedYear) || createCurrentYear(selectedYear, allYearsData);
  };

  const getYearData = (year: number): YearData => {
    return allYearsData.get(year) || createCurrentYear(year, allYearsData);
  };

  const updateMonthlyRevenue = async (month: string, revenue: number) => {
    const yearData = getCurrentYearData();
    if (yearData.isLocked) return;
    
    // Optimistically update local state first
    // Clear sample flag for this month
    const updatedData = {
      ...yearData,
      data: yearData.data.map(item =>
        item.month === month ? { ...item, revenue, isSample: false } : item
      )
    };

    // If no sample values remain, flip the year-level flag
    updatedData.isSample = updatedData.data.some(d => d.isSample);

    setAllYearsData(prev => new Map(prev.set(selectedYear, updatedData)));

    // Persist to Supabase if we have an authenticated user
    if (dbUserId) {
      const monthIndex = months.findIndex(m => m === month) + 1; // 1-based index for DB
      try {
        const res = await RevenueDataService.updateMonthlyRevenue(
          dbUserId,
          selectedYear,
          monthIndex,
          revenue
        );
        if (!res.success) {
          console.error(res.error || 'Unknown error saving monthly revenue');
        }
      } catch (e) {
        console.error('Failed to save monthly revenue:', e);
      }
    }
  };

  const updateTargets = async (targetRevenue: number, profitMargin: number) => {
    const yearData = getCurrentYearData();
    if (yearData.isLocked || yearData.isHistorical) return;
    
    console.log('🎯 updateTargets called:', { 
      targetRevenue, 
      profitMargin, 
      selectedYear, 
      dbUserId,
      yearDataBefore: yearData.targetRevenue 
    });
    
    // Recalculate monthly FIR targets based on new target revenue
    const previousYearData = allYearsData.get(selectedYear - 1);
    const newMonthlyFIRTargets = calculateMonthlyFIRTargets(targetRevenue, previousYearData, yearData);
    
    console.log('📊 New monthly FIR targets:', newMonthlyFIRTargets);
    console.log('📊 Sum of monthly targets:', newMonthlyFIRTargets.reduce((a, b) => a + b, 0));
    
    // Use intelligent monthly FIR targets instead of flat distribution
    const updatedData = {
      ...yearData,
      targetRevenue,
      profitMargin,
      monthlyFIRTargets: newMonthlyFIRTargets,
      data: yearData.data.map((item, index) => {
        // Use the intelligent monthly FIR target for this month
        const monthlyTarget = newMonthlyFIRTargets[index] || (targetRevenue / 12);
        
        return {
          ...item,
          target: monthlyTarget
        };
      })
    };
    setAllYearsData(prev => new Map(prev.set(selectedYear, updatedData)));

    // Persist to Supabase
    if (dbUserId) {
      console.log('💾 Persisting to Supabase with user ID:', dbUserId);
      try {
        const res = await RevenueDataService.updateYearTargets(
          dbUserId,
          selectedYear,
          targetRevenue,
          profitMargin,
          newMonthlyFIRTargets // Pass intelligent monthly FIR targets
        );
        if (!res.success) {
          console.error('❌ Failed to save targets:', res.error || 'Unknown error');
        } else {
          console.log('✅ Targets saved successfully');
        }
      } catch (e) {
        console.error('❌ Failed to save targets:', e);
      }
    } else {
      console.warn('⚠️ No dbUserId - targets not persisted to database');
    }
  };

  // Update ONLY profit margin without recalculating FIR targets
  const updateProfitMargin = async (profitMargin: number) => {
    const yearData = getCurrentYearData();
    if (yearData.isLocked || yearData.isHistorical) return;
    
    // Only update profit margin, keep FIR targets unchanged
    const updatedData = {
      ...yearData,
      profitMargin
    };
    setAllYearsData(prev => new Map(prev.set(selectedYear, updatedData)));

    // Persist to Supabase
    if (dbUserId) {
      try {
        const res = await RevenueDataService.updateYearTargets(
          dbUserId,
          selectedYear,
          yearData.targetRevenue, // Keep existing target revenue
          profitMargin,
          yearData.monthlyFIRTargets // Keep existing FIR targets
        );
        if (!res.success) {
          console.error(res.error || 'Unknown error saving profit margin');
        }
      } catch (e) {
        console.error('Failed to save profit margin:', e);
      }
    }
  };

  const saveAndLockYear = () => {
    const yearData = getCurrentYearData();
    const lockedYear = { ...yearData, isLocked: true };
    setAllYearsData(prev => new Map(prev.set(selectedYear, lockedYear)));
  };

  const createNewYear = () => {
    const newYear = currentYear + 1;
    const newYearData = createCurrentYear(newYear, allYearsData);
    setAllYearsData(prev => new Map(prev.set(newYear, newYearData)));
    setSelectedYear(newYear);
  };

  const selectYear = (year: number) => {
    setSelectedYear(year);
  };

  const updatePlaygroundData = (data: Partial<YearData>) => {
    setPlaygroundData(prev => ({ ...prev, ...data }));
  };

  const resetPlayground = () => {
    setPlaygroundData(createPlaygroundYear(currentYear));
  };

  const unlockHistoricalYear = (year: number) => {
    const yearData = allYearsData.get(year);
    if (yearData && yearData.isHistorical) {
      const unlockedYear = { 
        ...yearData, 
        isHistorical: false,
        isLocked: false 
      };
      setAllYearsData(prev => new Map(prev.set(year, unlockedYear)));
    }
  };

  const lockHistoricalYear = (year: number) => {
    const yearData = allYearsData.get(year);
    if (yearData && year < currentYear) {
      const lockedYear = { 
        ...yearData, 
        isHistorical: true,
        isLocked: true 
      };
      setAllYearsData(prev => new Map(prev.set(year, lockedYear)));
    }
  };

  const historicalYears = availableYears
    .filter(year => year !== selectedYear && allYearsData.has(year))
    .map(year => allYearsData.get(year)!)
    .filter(year => year.isHistorical);

  return (
    <RevenueContext.Provider value={{
      currentYear: getCurrentYearData(),
      selectedYear,
      availableYears,
      historicalYears,
      updateMonthlyRevenue,
      updateTargets,
      updateProfitMargin,
      saveAndLockYear,
      createNewYear,
      selectYear,
      getYearData,
      playgroundData,
      updatePlaygroundData,
      resetPlayground,
      isLoading,
      currentYearKpis,
      unlockHistoricalYear,
      lockHistoricalYear
    }}>
      {children}
    </RevenueContext.Provider>
  );
}

export function useRevenue() {
  const context = useContext(RevenueContext);
  if (context === undefined) {
    throw new Error('useRevenue must be used within a RevenueProvider');
  }
  return context;
}