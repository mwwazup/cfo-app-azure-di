import { useState, useEffect } from 'react';
import { CoachingMoment, CreateCoachingMomentData } from '../models/CoachingMoment';
import { CoachingService } from '../services/coachingService';
import { useAuthContext } from '../contexts/auth-context';

export function useCoachingHistory() {
  const { dbUserId } = useAuthContext();
  const [coachingHistory, setCoachingHistory] = useState<CoachingMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoachingHistory = async () => {
    if (!dbUserId) {
      setCoachingHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const moments = await CoachingService.getCoachingMoments(dbUserId);
      setCoachingHistory(moments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coaching history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoachingHistory();
  }, [dbUserId]);

  const addCoachingMoment = async (momentData: CreateCoachingMomentData) => {
    if (!dbUserId) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    setError(null);

    try {
      const result = await CoachingService.createCoachingMoment(dbUserId, momentData);
      
      if (result.success && result.moment) {
        setCoachingHistory(prev => [result.moment!, ...prev]);
      } else {
        setError(result.error || 'Failed to save coaching moment');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save coaching moment';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteCoachingMoment = async (momentId: string) => {
    setError(null);

    try {
      const success = await CoachingService.deleteCoachingMoment(momentId);
      
      if (success) {
        setCoachingHistory(prev => prev.filter(moment => moment.id !== momentId));
      } else {
        setError('Failed to delete coaching moment');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete coaching moment';
      setError(errorMessage);
      return false;
    }
  };

  const refreshHistory = () => {
    fetchCoachingHistory();
  };

  return {
    coachingHistory,
    loading,
    error,
    addCoachingMoment,
    deleteCoachingMoment,
    refreshHistory
  };
}