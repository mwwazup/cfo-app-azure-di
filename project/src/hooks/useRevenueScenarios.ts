import { useState, useEffect } from 'react';
import { RevenueScenario, CreateRevenueScenarioData, RevenueCurveReport } from '../models/RevenueScenario';
import { RevenueScenarioService } from '../services/revenueScenarioService';
import { useAuthContext } from '../contexts/auth-context';

export function useRevenueScenarios() {
  const { dbUserId } = useAuthContext();
  const [scenarios, setScenarios] = useState<RevenueScenario[]>([]);
  const [currentReport, setCurrentReport] = useState<RevenueCurveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!dbUserId) {
      setScenarios([]);
      setCurrentReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [scenariosData, report] = await Promise.all([
        RevenueScenarioService.getRevenueScenarios(dbUserId),
        RevenueScenarioService.getCurrentRevenueReport(dbUserId)
      ]);

      setScenarios(scenariosData);
      setCurrentReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dbUserId]);

  const createScenario = async (scenarioData: CreateRevenueScenarioData) => {
    if (!dbUserId) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    setError(null);

    try {
      const result = await RevenueScenarioService.createRevenueScenario(dbUserId, scenarioData);

      if (result.success) {
        // Refresh data after successful creation
        await fetchData();
      } else {
        setError(result.error || 'Failed to create scenario');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create scenario';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteScenario = async (scenarioId: string) => {
    setError(null);

    try {
      const success = await RevenueScenarioService.deleteRevenueScenario(scenarioId);
      
      if (success) {
        setScenarios(prev => prev.filter(scenario => scenario.id !== scenarioId));
      } else {
        setError('Failed to delete scenario');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete scenario';
      setError(errorMessage);
      return false;
    }
  };

  const refreshData = () => {
    fetchData();
  };

  return {
    scenarios,
    currentReport,
    loading,
    error,
    createScenario,
    deleteScenario,
    refreshData
  };
}