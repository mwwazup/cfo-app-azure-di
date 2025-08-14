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
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';
    
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
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return {
      success: true,
      documents: data || []
    };
  } catch (error) {
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
