import { useState, useEffect } from 'react';
import { FinancialStatement, StatementType } from '../models/FinancialStatement';
import { FinancialDataService } from '../services/financialDataService';
import { useAuth } from '../contexts/auth-context';

export function useFinancialData() {
  const { user } = useAuth();
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatements = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await FinancialDataService.getFinancialStatements(user.id);
      setStatements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial statements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements();
  }, [user?.id]);

  const uploadStatement = async (file: File, statementType?: StatementType) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await FinancialDataService.uploadFinancialStatement(
        file, 
        user.id, 
        statementType
      );

      if (result.success && result.statement) {
        setStatements(prev => [result.statement!, ...prev]);
      } else {
        setError(result.error || 'Upload failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteStatement = async (statementId: string) => {
    setLoading(true);
    setError(null);

    try {
      const success = await FinancialDataService.deleteFinancialStatement(statementId);
      
      if (success) {
        setStatements(prev => prev.filter(s => s.id !== statementId));
      } else {
        setError('Failed to delete statement');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getStatementsByType = (type: StatementType) => {
    return statements.filter(s => s.statement_type === type);
  };

  const getLatestStatement = (type?: StatementType) => {
    const filtered = type ? getStatementsByType(type) : statements;
    return filtered.length > 0 ? filtered[0] : null;
  };

  const refreshStatements = () => {
    fetchStatements();
  };

  return {
    statements,
    loading,
    error,
    uploadStatement,
    deleteStatement,
    getStatementsByType,
    getLatestStatement,
    refreshStatements
  };
}