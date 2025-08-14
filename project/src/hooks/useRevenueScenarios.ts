import { useState, useEffect } from 'react';
import { RevenueScenario, CreateRevenueScenarioData, RevenueCurveReport } from '../models/RevenueScenario';
import { RevenueScenarioService } from '../services/revenueScenarioService';
import { useAuth } from '../contexts/auth-context';

export function useRevenueScenarios() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<RevenueScenario[]>([]);
  const [currentReport, setCurrentReport] = useState<RevenueCurveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.id) {
      setScenarios([]);
      setCurrentReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch current revenue report and scenarios in parallel
      const [report, scenarioList] = await Promise.all([
        RevenueScenarioService.getCurrentRevenueReport(user.id),
        RevenueScenarioService.getRevenueScenarios(user.id)
      ]);

      setCurrentReport(report);
      setScenarios(scenarioList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scenario data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const createScenario = async (scenarioData: CreateRevenueScenarioData) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    setError(null);

    try {
      const result = await RevenueScenarioService.createRevenueScenario(user.id, scenarioData);
      
      if (result.success && result.scenario) {
        setScenarios(prev => [result.scenario!, ...prev]);
      } else {
        setError(result.error || 'Failed to save scenario');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save scenario';
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