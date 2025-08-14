import { useState, useEffect } from 'react';
import { MomentumEntry, CreateMomentumEntryData, MomentumService } from '../services/momentumService';
import { useAuth } from '../contexts/auth-context';

export function useMomentum() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MomentumEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrated, setMigrated] = useState(false);

  const fetchEntries = async () => {
    if (!user?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Migrate localStorage data on first load
      if (!migrated) {
        await MomentumService.migrateLocalStorageData(user.id);
        setMigrated(true);
      }

      const momentumEntries = await MomentumService.getMomentumEntries(user.id);
      setEntries(momentumEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch momentum entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user?.id]);

  const getEntriesForMonth = (month: string): MomentumEntry[] => {
    return entries.filter(entry => entry.month === month);
  };

  const saveEntry = async (entryData: CreateMomentumEntryData) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    setError(null);

    try {
      const result = await MomentumService.upsertMomentumEntry(user.id, entryData);
      
      if (result.success && result.entry) {
        setEntries(prev => {
          const filtered = prev.filter(e => 
            !(e.month === result.entry!.month && e.section === result.entry!.section)
          );
          return [result.entry!, ...filtered];
        });
      } else {
        setError(result.error || 'Failed to save momentum entry');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save momentum entry';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteEntry = async (entryId: string) => {
    setError(null);

    try {
      const success = await MomentumService.deleteMomentumEntry(entryId);
      
      if (success) {
        setEntries(prev => prev.filter(entry => entry.id !== entryId));
      } else {
        setError('Failed to delete momentum entry');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete momentum entry';
      setError(errorMessage);
      return false;
    }
  };

  const refreshEntries = () => {
    fetchEntries();
  };

  // Group entries by month for easy access
  const entriesByMonth = entries.reduce((acc, entry) => {
    if (!acc[entry.month]) {
      acc[entry.month] = [];
    }
    acc[entry.month].push(entry);
    return acc;
  }, {} as Record<string, MomentumEntry[]>);

  return {
    entries,
    entriesByMonth,
    loading,
    error,
    getEntriesForMonth,
    saveEntry,
    deleteEntry,
    refreshEntries
  };
}

// Legacy hook for backward compatibility
export function useMomentumTimeline(ownerId: string) {
  const { entries, loading, error } = useMomentum();
  
  const data = Object.entries(entries.reduce((acc, entry) => {
    if (!acc[entry.month]) {
      acc[entry.month] = [];
    }
    acc[entry.month].push(entry);
    return acc;
  }, {} as Record<string, MomentumEntry[]>)).map(([month, monthEntries]) => {
    const completedEntries = monthEntries.filter(e => e.content?.trim().length > 0);
    const averageImpact = monthEntries.reduce((sum, e) => sum + (e.impact_score || 0), 0) / monthEntries.length;
    const completionPercentage = (completedEntries.length / monthEntries.length) * 100;

    return {
      month,
      entries: monthEntries,
      averageImpact,
      completionPercentage
    };
  }).sort((a, b) => b.month.localeCompare(a.month));

  return { data, loading, error, refetch: () => {} };
}