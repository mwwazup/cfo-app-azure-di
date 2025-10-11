import { supabase } from '../config/supabaseClient';

export interface UploadFinancialDocumentRequest {
  files: File[];
  userId: string;
}

export interface UploadFinancialDocumentResponse {
  success: boolean;
  documentIds: string[];
  errors: string[];
}

/**
 * Upload and analyze financial documents
 */
export async function uploadFinancialDocuments(
  files: File[],
  userId: string
): Promise<UploadFinancialDocumentResponse> {
  try {
    // Convert files to base64
    const base64Files = await Promise.all(
      files.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    // Call our backend API for document analysis
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5180';
    
    const response = await fetch(`${API_BASE_URL}/api/documentAnalysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: base64Files,
        userId
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        documentIds: [],
        errors: [result.error || 'Document analysis failed']
      };
    }

    // For now, we're just returning a mock response
    // In a real implementation, the backend would handle the full analysis and storage
    return {
      success: true,
      documentIds: [],
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      documentIds: [],
      errors: [error instanceof Error ? error.message : 'Upload failed']
    };
  }
}

/**
 * Get financial documents for a user
 */
export async function getUserFinancialDocuments(userId: string, limit: number = 50) {
  try {
    // Use the backend API instead of direct Supabase calls to bypass RLS issues
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5180';
    
    const response = await fetch(`${API_BASE_URL}/api/financial-documents?userId=${encodeURIComponent(userId)}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // The API returns data in a 'data' property, not 'documents'
    const documents = result.data || result.documents || [];
    
    if (!documents) {
      throw new Error(result.error || 'No documents returned from API');
    }

    // Transform the data to match expected structure
    const transformedData = documents.map((doc: any) => ({
      ...doc,
      // Ensure uploaded_at exists for display
      uploaded_at: doc.uploaded_at || doc.created_at || doc.start_date || new Date().toISOString(),
      // Ensure document_type exists
      document_type: doc.document_type || 'pnl',
      // Ensure status exists
      status: doc.status || 'approved',
      // Ensure date fields exist
      start_date: doc.start_date || '2024-01-01',
      end_date: doc.end_date || '2024-01-31'
    }));

    return {
      success: true,
      documents: transformedData
    };
  } catch (error) {
    console.error('Error fetching financial documents:', error);
    return {
      success: false,
      documents: [],
      error: error instanceof Error ? error.message : 'Failed to fetch documents'
    };
  }
}

/**
 * Get a specific financial document
 */
export async function getFinancialDocument(documentId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      document: data
    };
  } catch (error) {
    return {
      success: false,
      document: null,
      error: error instanceof Error ? error.message : 'Failed to fetch document'
    };
  }
}

/**
 * Delete a financial document
 */
export async function deleteFinancialDocument(documentId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('financial_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document'
    };
  }
}
