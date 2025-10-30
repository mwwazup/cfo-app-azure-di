// Removed unused Supabase imports - using test server API instead
import { FinancialStatement, StatementType } from '../models/FinancialStatement';
import { FinancialFileParser } from '../utils/parseFinancialFile';

// Use backend API
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export class FinancialDataService {
  static async uploadFinancialStatement(
    file: File, 
    userId: string, 
    statementType?: StatementType
  ): Promise<{ success: boolean; statement?: FinancialStatement; error?: string }> {
    try {
      // Parse the file first
      const parseResult = await FinancialFileParser.parseFile(file);
      
      if (!parseResult.success) {
        return { success: false, error: parseResult.error };
      }

      const finalStatementType = statementType || parseResult.detectedType || 'profit_loss';
      
      // For test server, we'll skip file upload and just create metadata
      const fileName = `${userId}/${finalStatementType}/${Date.now()}_${file.name}`;
      
      // Mock upload data for test server
      const uploadData = { path: fileName };

      // Skip upload error check for test server

      // Save metadata to database
      const statementData: Omit<FinancialStatement, 'id'> = {
        user_id: userId,
        file_name: file.name,
        file_path: uploadData.path,
        statement_type: finalStatementType,
        uploaded_at: new Date().toISOString(),
        file_size: file.size,
        file_type: file.type,
        parsed_data: parseResult.data,
        metadata: {
          original_name: file.name,
          detected_type: parseResult.detectedType,
          parse_timestamp: new Date().toISOString()
        }
      };

      // Use test server API for document upload
      const response = await fetch(`${API_BASE}/api/financial-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...statementData
        })
      });

      if (!response.ok) {
        return { success: false, error: `Upload failed: ${response.statusText}` };
      }

      const result = await response.json();
      return { success: true, statement: result.data };
    } catch (error) {
      return { 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async getFinancialStatements(userId: string): Promise<FinancialStatement[]> {
    try {
      // Use test server API instead of direct Supabase call
      const response = await fetch(`${API_BASE}/api/financial-documents?userId=${userId}`);
      
      if (!response.ok) {
        console.error('Error fetching financial statements:', response.status, response.statusText);
        return [];
      }
      
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching financial statements:', error);
      return [];
    }
  }

  static async getFinancialStatementsByType(
    userId: string, 
    statementType: StatementType
  ): Promise<FinancialStatement[]> {
    try {
      // Use test server API and filter by type
      const response = await fetch(`${API_BASE}/api/financial-documents?userId=${userId}`);
      
      if (!response.ok) {
        console.error('Error fetching financial statements by type:', response.status, response.statusText);
        return [];
      }
      
      const result = await response.json();
      const allDocs = result.data || [];
      
      // Filter by statement type
      return allDocs.filter((doc: FinancialStatement) => doc.statement_type === statementType);
    } catch (error) {
      console.error('Error fetching financial statements by type:', error);
      return [];
    }
  }

  static async deleteFinancialStatement(statementId: string): Promise<boolean> {
    try {
      // Use test server API for deletion
      const response = await fetch(`${API_BASE}/api/financial-documents/${statementId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        console.error('Error deleting statement:', response.status, response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error during deletion:', error);
      return false;
    }
  }

  static async downloadFinancialStatement(filePath: string): Promise<Blob | null> {
    try {
      // For test server, return a mock blob or handle differently
      console.log('Download not implemented in test server for:', filePath);
      return null;
    } catch (error) {
      console.error('Unexpected error during download:', error);
      return null;
    }
  }

  static getStatementTypeLabel(type: StatementType): string {
    switch (type) {
      case 'profit_loss':
        return 'Profit & Loss';
      case 'cash_flow':
        return 'Cash Flow';
      case 'balance_sheet':
        return 'Balance Sheet';
      default:
        return 'Unknown';
    }
  }

  static getStatementTypeColor(type: StatementType): string {
    switch (type) {
      case 'profit_loss':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cash_flow':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'balance_sheet':
        return 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }
}