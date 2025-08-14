import { supabase, STORAGE_BUCKETS, TABLES } from '../config/supabaseClient';
import { FinancialStatement, StatementType } from '../models/FinancialStatement';
import { FinancialFileParser } from '../utils/parseFinancialFile';

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
      
      // Upload file to Supabase Storage
      const fileName = `${userId}/${finalStatementType}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.FINANCIAL_STATEMENTS)
        .upload(fileName, file);

      if (uploadError) {
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

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

      const { data: dbData, error: dbError } = await supabase
        .from(TABLES.FINANCIAL_STATEMENTS)
        .insert(statementData)
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from(STORAGE_BUCKETS.FINANCIAL_STATEMENTS)
          .remove([uploadData.path]);
        
        return { success: false, error: `Database error: ${dbError.message}` };
      }

      return { success: true, statement: dbData };
    } catch (error) {
      return { 
        success: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static async getFinancialStatements(userId: string): Promise<FinancialStatement[]> {
    const { data, error } = await supabase
      .from(TABLES.FINANCIAL_STATEMENTS)
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching financial statements:', error);
      return [];
    }

    return data || [];
  }

  static async getFinancialStatementsByType(
    userId: string, 
    statementType: StatementType
  ): Promise<FinancialStatement[]> {
    const { data, error } = await supabase
      .from(TABLES.FINANCIAL_STATEMENTS)
      .select('*')
      .eq('user_id', userId)
      .eq('statement_type', statementType)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching financial statements by type:', error);
      return [];
    }

    return data || [];
  }

  static async deleteFinancialStatement(statementId: string): Promise<boolean> {
    try {
      // Get statement details first
      const { data: statement, error: fetchError } = await supabase
        .from(TABLES.FINANCIAL_STATEMENTS)
        .select('file_path')
        .eq('id', statementId)
        .single();

      if (fetchError || !statement) {
        console.error('Error fetching statement for deletion:', fetchError);
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKETS.FINANCIAL_STATEMENTS)
        .remove([statement.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from(TABLES.FINANCIAL_STATEMENTS)
        .delete()
        .eq('id', statementId);

      if (dbError) {
        console.error('Error deleting statement from database:', dbError);
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
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.FINANCIAL_STATEMENTS)
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        return null;
      }

      return data;
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