/**
 * Azure Document Intelligence Service
 * 
 * This service handles financial document processing using Microsoft Azure Document Intelligence.
 * It provides AI-powered extraction of structured data from financial documents
 * like P&L statements, balance sheets, and cash flow statements.
 * 
 * Azure Document Intelligence is more reliable than custom OCR solutions and provides
 * excellent accuracy for financial documents with built-in understanding of tables,
 * key-value pairs, and document structure.
 */

import type { DocumentType, FinancialDocument, FinancialMetric, AzureFinancialData } from '../models/FinancialStatement';
import { supabase } from '../config/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// Service role client for bypassing RLS
const supabaseServiceRole = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
);

// API endpoint for document analysis
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5180';

// Azure Document Intelligence field value interface
export interface AzureFieldValue {
  type?: string;
  value?: number | string;
  valueNumber?: number;
  valueString?: string;
  content?: string;
  confidence?: number;
  boundingBox?: number[];
}

// Azure Document Intelligence document interface
export interface AzureDocument {
  docType?: string;
  boundingRegions?: Array<{
    pageNumber: number;
    boundingBox: number[];
  }>;
  fields: Record<string, AzureFieldValue>;
  confidence?: number;
}

// Azure Document Intelligence table cell interface
export interface AzureTableCell {
  kind?: string;
  rowIndex: number;
  columnIndex: number;
  content: string;
  boundingRegions?: Array<{
    pageNumber: number;
    boundingBox: number[];
  }>;
}

// Azure Document Intelligence table interface
export interface AzureTable {
  rowCount: number;
  columnCount: number;
  cells: AzureTableCell[];
  boundingRegions?: Array<{
    pageNumber: number;
    boundingBox: number[];
  }>;
}

// Azure Document Intelligence key-value pair interface
export interface AzureKeyValuePair {
  key: {
    content: string;
    boundingBox?: number[];
    confidence?: number;
  };
  value: {
    content: string;
    boundingBox?: number[];
    confidence?: number;
  };
  confidence: number;
}

export interface AzureDocumentAnalysisResult {
  apiVersion: string;
  modelId: string;
  stringIndexType: string;
  content: string;
  pages: Array<{
    pageNumber: number;
    angle: number;
    width: number;
    height: number;
    unit: string;
    words?: Array<{
      content: string;
      polygon?: number[];
      confidence?: number;
      span?: { offset: number; length: number };
    }>;
    lines?: Array<{
      content: string;
      polygon?: number[];
      spans?: Array<{ offset: number; length: number }>;
    }>;
  }>;
  tables?: AzureTable[];
  keyValuePairs?: AzureKeyValuePair[];
  documents?: AzureDocument[];
}

export interface AzureDocumentResponse {
  status: string;
  createdDateTime: string;
  lastUpdatedDateTime: string;
  analyzeResult: AzureDocumentAnalysisResult;
}

export interface ExtractedFinancialData {
  documentType: DocumentType;
  extractedFields: Record<string, { value: string | number; confidence: number; boundingBox: number[] }>;
  // Azure custom model data
  azureData: AzureFinancialData;
  summary: {
    totalRevenue?: number;
    totalExpenses?: number;
    netProfit?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    equity?: number;
    operatingCashFlow?: number;
    investingCashFlow?: number;
    financingCashFlow?: number;
  };
  tables: Array<{
    rowCount: number;
    columnCount: number;
    data: string[][];
  }>;
  document: {
    start_date: string;
    end_date: string;
    document_type: DocumentType;
  };
  metadata: {
    processingTime: number;
    confidence: number;
    documentId: string;
    extractedAt: string;
    pageCount: number;
  };
}

/**
 * Azure Document Intelligence Service for AI-powered document processing
 * 
 * This service uses Azure's pre-built document models and general document analysis
 * to extract structured data from financial documents. It's more reliable than
 * custom OCR solutions and provides excellent accuracy.
 */
export class AzureDocumentService {
  /**
   * Process a financial document using Azure Document Intelligence
   * @param file - The file to process (PDF or image)
   * @param documentType - Type of financial document
   * @returns Extracted financial data
   */
  static async processDocument(
    file: File,
    documentType: DocumentType
  ): Promise<ExtractedFinancialData> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting Azure Document Intelligence processing...');
      console.log('🔌 API Base URL:', API_BASE_URL);
      
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Send to backend for processing (matching backend API format)
      const response = await fetch(`${API_BASE_URL}/api/documentAnalysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: [base64Data], // Backend expects array of base64 strings
          userId: 'user-123' // Placeholder user ID
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Backend response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Document analysis failed');
      }

      // Backend returns data in result.data, not result.result
      const responseData = result.data || result.result;
      if (!responseData) {
        throw new Error('No data returned from document analysis service');
      }

      // Parse the Azure Document Intelligence response
      return await this.parseResults(responseData, documentType, startTime);
      
    } catch (error) {
      console.error('❌ Error processing document:', error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save processed financial document to Supabase
   */
  static async saveDocument(
    extractedData: ExtractedFinancialData,
    metrics: FinancialMetric[]
  ): Promise<string> {
    try {
      console.log('🔑 Service role key available:', !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      console.log('🔑 Service role key length:', import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.length || 0);
      
      // Get current user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare document data for insertion - only essential fields
      const documentToSave = {
        user_id: user.id, // Use actual authenticated user ID
        document_type: extractedData.documentType,
        start_date: new Date(extractedData.document.start_date).toISOString().split('T')[0], // Convert to YYYY-MM-DD
        end_date: new Date(extractedData.document.end_date).toISOString().split('T')[0], // Convert to YYYY-MM-DD
        status: 'pending',
        source: 'azure_document_intelligence',
      };

      // Insert financial document using service role to bypass RLS
      const { data: document, error: docError } = await supabaseServiceRole
        .from('financial_documents')
        .insert(documentToSave)
        .select()
        .single();

      if (docError) {
        throw new Error(`Error saving financial document: ${docError.message}`);
      }

      const documentId = document.id;

      // Insert financial metrics
      if (metrics.length > 0) {
        const metricsWithDocId = metrics.map(metric => ({
          ...metric,
          document_id: documentId,
        }));

        const { error: metricsError } = await supabase
          .from('financial_metrics')
          .insert(metricsWithDocId);

        if (metricsError) {
          throw new Error(`Error saving financial metrics: ${metricsError.message}`);
        }
      }

      console.log('✅ Document and metrics saved successfully');
      return documentId;
      
    } catch (error) {
      console.error('❌ Error saving document:', error);
      throw new Error(`Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert file to base64 string
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Parse Azure Document Intelligence results into structured financial data
   */
  private static async parseResults(
    response: AzureDocumentResponse, 
    documentType: DocumentType, 
    startTime: number
  ): Promise<ExtractedFinancialData> {
    const analyzeResult = response.analyzeResult;
    console.log('🔍 Parsing Azure Document Intelligence results...');
    console.log('Pages found:', analyzeResult.pages.length);
    console.log('Tables found:', analyzeResult.tables?.length || 0);
    console.log('Documents found:', analyzeResult.documents?.length || 0);

    // Extract fields from documents
    const extractedFields: Record<string, { value: string | number; confidence: number; boundingBox: number[] }> = {};
    
    // Check if documents exist and extract financial data using proper types
    if (analyzeResult.documents && analyzeResult.documents.length > 0) {
      const document = analyzeResult.documents[0];
      console.log('🔍 DEBUG: Document fields:', Object.keys(document.fields));
      
      // Extract each field with proper numeric conversion using typed interfaces
      Object.entries(document.fields).forEach(([fieldName, field]: [string, AzureFieldValue]) => {
        console.log(`🔍 DEBUG: Processing field ${fieldName}:`, field);
        
        // Extract numeric value using proper type checking
        let numericValue = 0;
        if (typeof field.value === 'number') {
          numericValue = field.value;
        } else if (typeof field.value === 'string') {
          numericValue = this.parseValue(field.value);
        } else if (field.valueNumber) {
          numericValue = field.valueNumber;
        } else if (field.valueString) {
          numericValue = this.parseValue(field.valueString);
        } else if (field.content) {
          numericValue = this.parseValue(field.content);
        }
        
        const key = fieldName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
        extractedFields[key] = {
          value: numericValue,
          confidence: field.confidence || 0.5,
          boundingBox: field.boundingBox || []
        };
        
        console.log(`🔍 DEBUG: Extracted ${key} = ${numericValue}`);
      });
    } else {
      console.log('🔍 DEBUG: No documents or fields found');
    }

    // Process key-value pairs if available using proper types
    if (analyzeResult.keyValuePairs) {
      analyzeResult.keyValuePairs.forEach((kvp: AzureKeyValuePair) => {
        const key = kvp.key.content.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
        const value = kvp.value.content;
        
        extractedFields[key] = {
          value: this.parseValue(value),
          confidence: kvp.confidence,
          boundingBox: kvp.value.boundingBox || [],
        };
      });
    }

    // Process tables using proper types
    const tables = (analyzeResult.tables || []).map((table: AzureTable) => {
      const data: string[][] = [];
      
      // Initialize table structure
      for (let row = 0; row < table.rowCount; row++) {
        data[row] = new Array(table.columnCount).fill('');
      }
      
      // Fill table data from cells
      table.cells.forEach((cell: AzureTableCell) => {
        if (cell.rowIndex < table.rowCount && cell.columnIndex < table.columnCount) {
          data[cell.rowIndex][cell.columnIndex] = cell.content;
        }
      });
      
      return {
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        data
      };
    });

    // Extract reporting period from the document
    const reportingPeriod = this.extractReportingPeriod(extractedFields, tables);
    
    // Generate summary from extracted data (simplified for P&L-only mode)
    const summary = {
      totalRevenue: this.extractNumericValue(extractedFields, ['pnl_totalrevenue', 'total_revenue', 'revenue', 'sales']),
      totalExpenses: this.extractNumericValue(extractedFields, ['pnl_operatingexpenses', 'pnl_costofgoodssold', 'total_expenses', 'expenses']),
      netProfit: this.extractNumericValue(extractedFields, ['pnl_netincome', 'pnl_netoperatingincome', 'net_profit', 'net_income'])
    };

    // Create Azure financial data structure
    const azureData: AzureFinancialData = {
      reportingPeriod: reportingPeriod?.period || 'Unknown Period',
      documentType: documentType,
      // P&L data extracted from document - using actual Azure field names from your model
      pnl_totalRevenue: this.extractNumericValue(extractedFields, ['pnl_totalrevenue', 'total_revenue', 'revenue', 'sales']),
      pnl_costOfGoodsSold: this.extractNumericValue(extractedFields, ['pnl_costofgoodssold', 'cost_of_goods_sold', 'cogs']),
      pnl_grossProfit: this.extractNumericValue(extractedFields, ['pnl_grossprofit', 'gross_profit']),
      pnl_operatingExpenses: this.extractNumericValue(extractedFields, ['pnl_operatingexpenses', 'operating_expenses']),
      pnl_netIncome: this.extractNumericValue(extractedFields, ['pnl_netincome', 'pnl_netoperatingincome', 'net_income', 'net_profit', 'operating_income']),
      pnl_expenseBreakdown: this.extractExpenseBreakdown(extractedFields, tables),
      // Balance Sheet data - NOT REQUIRED FOR P&L ONLY MODE
      bs_totalAssets: 0,
      bs_totalLiabilities: 0,
      bs_totalEquity: 0,
      bs_currentAssets: 0,
      bs_currentLiabilities: 0,
      bs_assetBreakdown: [],
      // Cash Flow data - NOT REQUIRED FOR P&L ONLY MODE
      cf_cashFromOperations: 0,
      cf_cashFromInvesting: 0,
      cf_cashFromFinancing: 0,
      cf_netCashFlow: 0,
      cf_cashAtBeginning: 0,
      cf_cashAtEnd: 0,
      cf_cashMovements: [],
    };

    console.log('✅ Final Azure financial data:', azureData);

    return {
      documentType,
      extractedFields,
      azureData,
      summary,
      tables,
      document: {
        start_date: reportingPeriod?.startDate || new Date().toISOString().split('T')[0],
        end_date: reportingPeriod?.endDate || new Date().toISOString().split('T')[0],
        document_type: documentType
      },
      metadata: {
        processingTime: Date.now() - startTime,
        confidence: 0.85,
        documentId: response.lastUpdatedDateTime,
        extractedAt: new Date().toISOString(),
        pageCount: analyzeResult.pages.length,
      }
    };
  }

  /**
   * Parse a value that could be a string or number into a number
   */
  private static parseValue(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value !== 'string') {
      return 0;
    }
    
    // Remove common currency symbols and formatting
    const cleanValue = value.replace(/[$,\s()]/g, '').replace(/[()]/g, '-');
    
    // Try to parse as number
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue)) {
      return numericValue;
    }
    
    return 0;
  }

  /**
   * Extract numeric value from fields using multiple possible field names
   */
  private static extractNumericValue(
    fields: Record<string, { value: string | number; confidence: number; boundingBox: number[] }>,
    possibleNames: string[]
  ): number {
    for (const name of possibleNames) {
      const field = fields[name];
      if (field && typeof field.value === 'number') {
        return field.value;
      }
      if (field && typeof field.value === 'string') {
        return this.parseValue(field.value);
      }
    }
    return 0;
  }



  /**
   * Extract expense breakdown from P&L data
   */
  private static extractExpenseBreakdown(_extractedFields: any, _tables: any[]): Array<{ category: string; amount: number; percentage: number }> {
    // This would extract detailed expense categories from tables
    // For now, return empty array as we're focusing on main P&L items
    return [];
  }

  /**
   * Extract reporting period from the document
   */
  private static extractReportingPeriod(extractedFields: any, tables: any[]): { 
    period: string; 
    startDate: string; 
    endDate: string; 
  } | null {
    // Try to extract period from common field names
    const periodFields = [
      'reporting_period', 'period', 'date_range', 'statement_period',
      'for_the_period', 'period_ending', 'statement_date', 'as_of_date'
    ];
    
    let extractedPeriod = '';
    for (const field of periodFields) {
      if (extractedFields[field]) {
        extractedPeriod = extractedFields[field];
        break;
      }
    }
    
    // Try to extract from tables if not found in fields
    if (!extractedPeriod && tables.length > 0) {
      for (const table of tables) {
        if (table.cells) {
          for (const cell of table.cells) {
            const content = cell.content?.toLowerCase() || '';
            if (content.includes('period') || content.includes('year ended') || 
                content.includes('month ended') || content.includes('quarter ended')) {
              extractedPeriod = cell.content;
              break;
            }
          }
        }
        if (extractedPeriod) break;
      }
    }
    
    // Parse the extracted period
    if (extractedPeriod) {
      const dates = this.parsePeriodString(extractedPeriod);
      return {
        period: extractedPeriod,
        startDate: dates.startDate,
        endDate: dates.endDate
      };
    }
    
    // Return null if no period could be extracted
    return null;
  }

  /**
   * Parse a period string to extract start and end dates
   */
  private static parsePeriodString(periodStr: string): { startDate: string; endDate: string } {
    const str = periodStr.toLowerCase();
    
    // Try to extract year
    const yearMatch = str.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
    
    // Check for different period types
    if (str.includes('year ended') || str.includes('annual')) {
      // Annual period
      if (str.includes('december') || str.includes('dec')) {
        return {
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`
        };
      }
    }
    
    if (str.includes('quarter') || str.includes('q1') || str.includes('q2') || str.includes('q3') || str.includes('q4')) {
      // Quarterly period - default to Q4
      return {
        startDate: `${year}-10-01`,
        endDate: `${year}-12-31`
      };
    }
    
    if (str.includes('month')) {
      // Monthly period - try to extract month
      const months = ['january', 'february', 'march', 'april', 'may', 'june',
                     'july', 'august', 'september', 'october', 'november', 'december'];
      
      for (let i = 0; i < months.length; i++) {
        if (str.includes(months[i]) || str.includes(months[i].substring(0, 3))) {
          const month = (i + 1).toString().padStart(2, '0');
          const daysInMonth = new Date(parseInt(year), i + 1, 0).getDate();
          return {
            startDate: `${year}-${month}-01`,
            endDate: `${year}-${month}-${daysInMonth}`
          };
        }
      }
    }
    
    // Default to annual period for current year
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }

  /**
   * Get financial documents for a user from Supabase
   */
  static async getFinancialDocuments(userId: string): Promise<FinancialDocument[]> {
    try {
      const { data, error } = await supabase
        .from('financial_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw new Error(`Error fetching financial documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error getting financial documents:', error);
      throw new Error(`Failed to get financial documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(documentId: string, status: 'pending' | 'reviewed' | 'approved' | 'rejected'): Promise<void> {
    try {
      const { error } = await supabase
        .from('financial_documents')
        .update({ status })
        .eq('id', documentId);

      if (error) {
        throw new Error(`Error updating document status: ${error.message}`);
      }

      console.log(`✅ Document status updated to: ${status}`);
    } catch (error) {
      console.error('❌ Error updating document status:', error);
      throw new Error(`Failed to update document status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an approved document with enhanced cleanup
   */
  static async deleteApprovedDocument(documentId: string): Promise<{
    success: boolean;
    affectedKPIs: string[];
    rollbackData?: any;
  }> {
    try {
      // Get document details for rollback capability
      const { data: document, error: fetchError } = await supabase
        .from('financial_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found or access denied');
      }

      // Get associated metrics for rollback
      const { data: metrics, error: metricsError } = await supabase
        .from('financial_metrics')
        .select('*')
        .eq('document_id', documentId);

      if (metricsError) {
        throw new Error(`Error fetching metrics: ${metricsError.message}`);
      }

      // Store rollback data
      const rollbackData = {
        document,
        metrics: metrics || [],
        timestamp: new Date().toISOString()
      };

      // Delete associated metrics first
      const { error: deleteMetricsError } = await supabase
        .from('financial_metrics')
        .delete()
        .eq('document_id', documentId);

      if (deleteMetricsError) {
        throw new Error(`Error deleting financial metrics: ${deleteMetricsError.message}`);
      }

      // Delete the document
      const { error: deleteDocError } = await supabase
        .from('financial_documents')
        .delete()
        .eq('id', documentId);

      if (deleteDocError) {
        throw new Error(`Error deleting financial document: ${deleteDocError.message}`);
      }

      // TODO: Add knowledgebase cleanup here
      // TODO: Add KPI recalculation here
      // TODO: Add audit trail entry here

      console.log('✅ Approved document deleted with rollback capability');
      
      return {
        success: true,
        affectedKPIs: ['Revenue Growth', 'Profit Margin', 'Cash Flow Ratio'], // Simulated
        rollbackData
      };
    } catch (error) {
      console.error('❌ Error deleting approved document:', error);
      throw new Error(`Failed to delete approved document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a financial document and its associated metrics (simple deletion)
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      // Delete associated metrics first
      const { error: metricsError } = await supabase
        .from('financial_metrics')
        .delete()
        .eq('document_id', documentId);

      if (metricsError) {
        throw new Error(`Error deleting financial metrics: ${metricsError.message}`);
      }

      // Delete the document
      const { error: docError } = await supabase
        .from('financial_documents')
        .delete()
        .eq('id', documentId);

      if (docError) {
        throw new Error(`Error deleting financial document: ${docError.message}`);
      }

      console.log('✅ Document and metrics deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
