import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context';


// Types for API responses
interface DocumentMeta {
  id: string;
  document_type: string;
  start_date?: string;
  end_date?: string;
  source?: string;
  created_at: string;
}

interface DocumentKPIs {
  doc_id: string;
  revenue_total: number;
  cogs_total: number;
  opex_total: number;
  gross_profit: number;
  net_income: number;
  gross_margin_percent: number;
  net_margin_percent: number;
}

interface DocumentMetrics {
  id: string;
  doc_id: string;
  metric_key: string;
  label: string;
  value: number;
  confidence: number;
}

interface IngestDocumentRequest {
  file_data: string;
  filename: string;
  document_type: string;
}

interface IngestDocumentResponse {
  success: boolean;
  doc_id: string;
  message?: string;
}

// API functions
const api = {
  ingestDocument: async (data: IngestDocumentRequest): Promise<IngestDocumentResponse> => {
    const response = await fetch('/api/di/ingest', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Document ingestion failed');
    }
    
    return response.json();
  },

  getDocumentsMeta: async (userId: string): Promise<DocumentMeta[]> => {
    const response = await fetch(`/api/docs/meta?user_id=${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch documents');
    }
    
    return response.json();
  },

  getDocumentKPIs: async (docId: string): Promise<DocumentKPIs> => {
    const response = await fetch(`/api/docs/kpis?doc_id=${docId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch KPIs');
    }
    
    return response.json();
  },

  getDocumentMetrics: async (docId: string): Promise<DocumentMetrics[]> => {
    const response = await fetch(`/api/docs/metrics?doc_id=${docId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch metrics');
    }
    
    return response.json();
  }
};

// React Query hooks
export const useDocumentsMeta = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['docs-meta', user?.id],
    queryFn: () => api.getDocumentsMeta(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useDocumentKPIs = (docId: string | null) => {
  return useQuery({
    queryKey: ['doc-kpis', docId],
    queryFn: () => api.getDocumentKPIs(docId!),
    enabled: !!docId,
    staleTime: 10 * 60 * 1000, // 10 minutes - KPIs don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useDocumentMetrics = (docId: string | null, showDetails: boolean = false) => {
  return useQuery({
    queryKey: ['doc-metrics', docId],
    queryFn: () => api.getDocumentMetrics(docId!),
    enabled: !!(docId && showDetails),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useIngestDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ fileData, filename, documentType }: { 
      fileData: string; 
      filename: string;
      documentType?: string;
    }) => api.ingestDocument({ 
      file_data: fileData, 
      filename, 
      document_type: documentType || 'financial_statement' 
    }),
    onSuccess: (data) => {
      // Invalidate documents meta to refetch the list
      queryClient.invalidateQueries({ queryKey: ['docs-meta', user?.id] });
      return data;
    },
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Document ingestion failed:', error);
      }
    }
  });
};

// Utility hook for getting selected document data
export const useSelectedDocument = (selectedDocId: string | null, showDetails: boolean = false) => {
  const kpisQuery = useDocumentKPIs(selectedDocId);
  const metricsQuery = useDocumentMetrics(selectedDocId, showDetails);
  
  return {
    kpis: kpisQuery.data,
    metrics: metricsQuery.data,
    isLoading: kpisQuery.isLoading || (showDetails && metricsQuery.isLoading),
    isError: kpisQuery.isError || metricsQuery.isError,
    error: kpisQuery.error || metricsQuery.error,
    // Only refetch if we have a selected document
    refetch: selectedDocId ? () => {
      kpisQuery.refetch();
      if (showDetails) metricsQuery.refetch();
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
