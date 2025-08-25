import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context';

// Types for API responses
interface DocumentMeta {
  id: string;
  document_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  label: string;
}

interface DocumentKPIs {
  document_id: string;
  revenue_total: number;
  expense_total: number;
  gross_profit: number;
  gross_margin: number;
  net_income: number;
  net_margin: number;
  created_at: string;
}

interface DocumentMetrics {
  revenue: Array<{
    document_id: string;
    metric_type: string;
    metric_key: string;
    label: string;
    value: number;
    confidence: number;
  }>;
  expenses: Array<{
    document_id: string;
    metric_type: string;
    metric_key: string;
    label: string;
    value: number;
    confidence: number;
  }>;
  kpis: Array<{
    document_id: string;
    metric_type: string;
    metric_key: string;
    label: string;
    value: number;
    confidence: number;
  }>;
}

// API functions
const api = {
  ingestDocument: async (file: string, userId: string, documentType = 'profit_loss') => {
    const response = await fetch('/api/di/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, userId, documentType })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Document ingestion failed');
    }
    
    return response.json();
  },

  getDocumentsMeta: async (userId: string): Promise<{ docs: DocumentMeta[] }> => {
    const response = await fetch(`/api/docs/meta?user=${userId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch documents');
    }
    
    return response.json();
  },

  getDocumentKPIs: async (docId: string): Promise<{ kpis: DocumentKPIs }> => {
    const response = await fetch(`/api/docs/kpis?id=${docId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch KPIs');
    }
    
    return response.json();
  },

  getDocumentMetrics: async (docId: string): Promise<{ metrics: DocumentMetrics; total: number }> => {
    const response = await fetch(`/api/docs/metrics?id=${docId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch metrics');
    }
    
    return response.json();
  }
};

// React Query hooks
export const useDocumentsMeta = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['documents', 'meta', user?.id],
    queryFn: () => api.getDocumentsMeta(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDocumentKPIs = (docId: string | null) => {
  return useQuery({
    queryKey: ['documents', 'kpis', docId],
    queryFn: () => api.getDocumentKPIs(docId!),
    enabled: !!docId,
    staleTime: 10 * 60 * 1000, // 10 minutes - KPIs don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useDocumentMetrics = (docId: string | null) => {
  return useQuery({
    queryKey: ['documents', 'metrics', docId],
    queryFn: () => api.getDocumentMetrics(docId!),
    enabled: !!docId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useIngestDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ file, documentType }: { file: string; documentType?: string }) =>
      api.ingestDocument(file, user!.id, documentType),
    onSuccess: () => {
      // Invalidate documents meta to refetch the list
      queryClient.invalidateQueries({ queryKey: ['documents', 'meta'] });
    },
    onError: (error) => {
      console.error('Document ingestion failed:', error);
    }
  });
};

// Utility hook for getting selected document data
export const useSelectedDocument = (selectedDocId: string | null) => {
  const kpisQuery = useDocumentKPIs(selectedDocId);
  const metricsQuery = useDocumentMetrics(selectedDocId);
  
  return {
    kpis: kpisQuery.data?.kpis,
    metrics: metricsQuery.data?.metrics,
    isLoading: kpisQuery.isLoading || metricsQuery.isLoading,
    isError: kpisQuery.isError || metricsQuery.isError,
    error: kpisQuery.error || metricsQuery.error,
    // Only refetch if we have a selected document
    refetch: selectedDocId ? () => {
      kpisQuery.refetch();
      metricsQuery.refetch();
    } : undefined
  };
};

// Memoized KPI calculations hook with guards
export const useCalculatedKPIs = (selectedDocId: string | null) => {
  const { kpis, isLoading, isError } = useSelectedDocument(selectedDocId);
  
  // Return memoized calculations only when we have valid data
  return {
    kpis: kpis || null,
    isLoading,
    isError,
    hasData: !!kpis && !!selectedDocId
  };
};
