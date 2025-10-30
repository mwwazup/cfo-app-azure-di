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
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
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
 * Save a financial document directly to Supabase
 */
export async function saveFinancialDocument(data: {
  userId: string;
  document_type: string;
  start_date: string;
  end_date: string;
  summary_metrics: any;
  raw_json: any;
  confidence_score?: number;
  status?: string;
  source?: string;
  filename?: string;
}) {
  try {
    console.log('💾 Saving financial document to Supabase:', data);
    
    const { data: savedDoc, error } = await supabase
      .from('financial_documents')
      .insert([{
        user_id: data.userId,
        document_type: data.document_type,
        start_date: data.start_date,
        end_date: data.end_date,
        summary_metrics: data.summary_metrics,
        raw_json: data.raw_json,
        confidence_score: data.confidence_score || 0.9,
        status: data.status || 'approved',
        filename: data.filename || 'csv_upload',
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase save error:', error);
      throw error;
    }

    console.log('✅ Document saved successfully:', savedDoc);
    
    return {
      success: true,
      document: savedDoc
    };
  } catch (error) {
    console.error('❌ Error saving document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save document'
    };
  }
}

/**
 * Get financial documents for a user
 */
export async function getUserFinancialDocuments(userId: string, limit: number = 50) {
  try {
    console.log('📄 Fetching financial documents from Supabase for user:', userId);
    
    // Query Supabase directly for financial_documents
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} financial documents`);
    
    if (!data || data.length === 0) {
      console.log('⚠️ No documents found in database for user:', userId);
      return {
        success: true,
        documents: []
      };
    }

    // Transform the data to match expected structure
    const transformedData = data.map((doc: any) => ({
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
    console.error('❌ Error fetching financial documents:', error);
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
    console.log('📄 Fetching specific document:', documentId);
    
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ Document not found:', documentId);
      return {
        success: false,
        document: null,
        error: 'Document not found'
      };
    }

    console.log('✅ Document fetched successfully');
    return {
      success: true,
      document: data
    };
  } catch (error) {
    console.error('❌ Error fetching document:', error);
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
    console.log('🗑️ API: Starting document deletion:', { documentId, userId });
    
    const API_BASE_URL = 'http://localhost:8000';
    const response = await fetch(`${API_BASE_URL}/api/financial-documents/${documentId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('🗑️ API: Delete response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🗑️ API: Delete request failed:', response.status, errorText);
      throw new Error(`Failed to delete document: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('🗑️ API: Document deleted successfully:', result);
    
    return {
      success: true,
      deletedCount: result.deletedCount || 1,
      message: result.message || 'Document deleted successfully'
    };
  } catch (error) {
    console.error('🗑️ API: Deletion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document'
    };
  }
}
