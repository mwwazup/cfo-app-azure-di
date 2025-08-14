import { supabase } from '../config/supabaseClient';

// Mindee API configuration - using REST API for browser compatibility
const MINDEE_API_KEY = import.meta.env.VITE_MINDEE_API_KEY || '';
const MINDEE_MODEL_ID = import.meta.env.VITE_MINDEE_MODEL_ID || '';
const MINDEE_USERNAME = 'mwwazup'; // Your Mindee username/namespace

// Build the API URL with username and model ID
const getMindeeApiUrl = () => {
  if (!MINDEE_MODEL_ID) {
    throw new Error('Mindee Model ID is required');
  }
  return `https://api.mindee.net/v1/products/${MINDEE_USERNAME}/${MINDEE_MODEL_ID}/predict`;
};

// Document type mapping
export type DocumentType = 'pnl' | 'balance_sheet' | 'cash_flow';

export interface FinancialDocument {
  id?: string;
  user_id: string;
  document_type: DocumentType;
  start_date: string;
  end_date: string;
  raw_json?: any;
  summary_metrics?: any;
  confidence_score?: number;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  source: string;
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialMetric {
  id?: string;
  document_id: string;
  label: string;
  value: number;
  category: string;
  subcategory?: string;
  confidence_score?: number;
  is_verified: boolean;
}

// P&L specific fields to extract
const PNL_FIELDS = {
  revenue: { category: 'profitability', subcategory: 'revenue' },
  sales: { category: 'profitability', subcategory: 'revenue' },
  cogs: { category: 'profitability', subcategory: 'expenses' },
  cost_of_goods_sold: { category: 'profitability', subcategory: 'expenses' },
  gross_profit: { category: 'profitability', subcategory: 'profit' },
  operating_expenses: { category: 'profitability', subcategory: 'expenses' },
  ebitda: { category: 'profitability', subcategory: 'profit' },
  operating_profit: { category: 'profitability', subcategory: 'profit' },
  net_profit: { category: 'profitability', subcategory: 'profit' },
  net_income: { category: 'profitability', subcategory: 'profit' }
};

// Balance Sheet specific fields to extract
const BALANCE_SHEET_FIELDS = {
  total_assets: { category: 'liquidity', subcategory: 'assets' },
  current_assets: { category: 'liquidity', subcategory: 'assets' },
  cash: { category: 'liquidity', subcategory: 'assets' },
  accounts_receivable: { category: 'liquidity', subcategory: 'assets' },
  inventory: { category: 'liquidity', subcategory: 'assets' },
  total_liabilities: { category: 'liquidity', subcategory: 'liabilities' },
  current_liabilities: { category: 'liquidity', subcategory: 'liabilities' },
  accounts_payable: { category: 'liquidity', subcategory: 'liabilities' },
  owners_equity: { category: 'liquidity', subcategory: 'equity' },
  retained_earnings: { category: 'liquidity', subcategory: 'equity' }
};

// Cash Flow specific fields to extract
const CASH_FLOW_FIELDS = {
  operating_cash_flow: { category: 'cash_flow', subcategory: 'operating' },
  investing_cash_flow: { category: 'cash_flow', subcategory: 'investing' },
  financing_cash_flow: { category: 'cash_flow', subcategory: 'financing' },
  net_cash_flow: { category: 'cash_flow', subcategory: 'net' },
  opening_cash: { category: 'cash_flow', subcategory: 'balance' },
  ending_cash: { category: 'cash_flow', subcategory: 'balance' }
};

export class MindeeService {
  /**
   * Process a financial document using Mindee API
   */
  static async processDocument(file: File, documentType: DocumentType): Promise<any> {
    if (!MINDEE_API_KEY) {
      throw new Error('Mindee API key is not configured. Please set VITE_MINDEE_API_KEY environment variable.');
    }

    if (!MINDEE_MODEL_ID) {
      throw new Error('Mindee Model ID is not configured. Please set VITE_MINDEE_MODEL_ID environment variable.');
    }

    // TEMPORARY: Hardcoded values for debugging 404 issue
    const hardcodedUrl = "https://api.mindee.net/v1/custom/mwwazup/models/547bcf52-acbf-40fc-99c8-45dd0174504d/predict";
    const hardcodedApiKey = "md_gsqsbcsfajshaqaf4pefzltebyyow3wh";
    
    console.log('DEBUGGING: Using hardcoded values');
    console.log('Hardcoded URL:', hardcodedUrl);
    console.log('Hardcoded API Key:', hardcodedApiKey ? 'Yes' : 'No');
    console.log('Environment MINDEE_MODEL_ID:', MINDEE_MODEL_ID);
    console.log('Environment MINDEE_API_KEY loaded:', MINDEE_API_KEY ? 'Yes' : 'No');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(hardcodedUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${hardcodedApiKey}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Mindee API error details:', {
          status: response.status,
          statusText: response.statusText,
          url: hardcodedUrl,
          result: result,
          api_request: result.api_request
        });
        console.error('Full API response:', JSON.stringify(result, null, 2));
        throw new Error(`Mindee error: ${response.status} - ${result.api_request?.error?.message || result.api_request?.status_code || 'Unknown error'}`);
      }

      console.log('Mindee result:', result);
      
      return result;
    } catch (error) {
      console.error('Error processing document with Mindee:', error);
      throw error;
    }
  }

  /**
   * Extract structured financial data from Mindee response
   */
  static extractFinancialData(mindeeResponse: any, documentType: DocumentType): {
    summary_metrics: any;
    metrics: Omit<FinancialMetric, 'id' | 'document_id'>[];
    confidence_score: number;
    time_period: { start_date: string; end_date: string };
  } {
    // Access the REST API response structure
    const document = mindeeResponse.document;
    const inference = document?.inference;
    const prediction = inference?.prediction;
    
    if (!prediction) {
      throw new Error('No prediction data found in Mindee response');
    }
    
    // Extract fields from the prediction
    const fields = prediction.fields || prediction;

    console.log('Mindee fields:', fields);

    // Extract time period information
    const timePeriod = this.extractTimePeriod(prediction);
    
    // Get field mapping based on document type
    const fieldMapping = this.getFieldMapping(documentType);
    
    // Extract metrics based on document type
    const extractedMetrics: Omit<FinancialMetric, 'id' | 'document_id'>[] = [];
    const summaryMetrics: any = {};
    let totalConfidence = 0;
    let fieldCount = 0;

    // Process each field in the response
    Object.entries(fields).forEach(([fieldName, fieldData]: [string, any]) => {
      const normalizedFieldName = fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const mapping = fieldMapping[normalizedFieldName];
      
      if (mapping && fieldData?.value !== undefined) {
        const value = parseFloat(fieldData.value) || 0;
        const confidence = fieldData.confidence || 0;
        
        extractedMetrics.push({
          label: normalizedFieldName,
          value: value,
          category: mapping.category,
          subcategory: mapping.subcategory,
          confidence_score: confidence,
          is_verified: false
        });
        
        summaryMetrics[normalizedFieldName] = value;
        totalConfidence += confidence;
        fieldCount++;
      }
    });

    const averageConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;

    return {
      summary_metrics: {
        ...summaryMetrics,
        document_type: documentType,
        time_period: timePeriod,
        extracted_at: new Date().toISOString()
      },
      metrics: extractedMetrics,
      confidence_score: averageConfidence,
      time_period: timePeriod
    };
  }

  /**
   * Extract time period from Mindee prediction
   */
  private static extractTimePeriod(prediction: any): { start_date: string; end_date: string } {
    // Try to extract dates from various possible field names
    const dateFields = ['date', 'period', 'start_date', 'end_date', 'reporting_period', 'document_date'];
    
    let startDate = '';
    let endDate = '';
    
    // Look for date information in the prediction
    dateFields.forEach(fieldName => {
      if (prediction[fieldName]?.value) {
        const dateValue = prediction[fieldName].value;
        if (!startDate) startDate = dateValue;
        if (!endDate) endDate = dateValue;
      }
    });
    
    // If no dates found, use current month as default
    if (!startDate || !endDate) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    }
    
    return { start_date: startDate, end_date: endDate };
  }

  /**
   * Get field mapping based on document type
   */
  private static getFieldMapping(documentType: DocumentType): Record<string, { category: string; subcategory: string }> {
    switch (documentType) {
      case 'pnl':
        return PNL_FIELDS;
      case 'balance_sheet':
        return BALANCE_SHEET_FIELDS;
      case 'cash_flow':
        return CASH_FLOW_FIELDS;
      default:
        return {};
    }
  }

  /**
   * Save processed financial document to Supabase
   */
  static async saveFinancialDocument(
    userId: string,
    documentData: Omit<FinancialDocument, 'id' | 'user_id'>,
    metrics: Omit<FinancialMetric, 'id' | 'document_id'>[]
  ): Promise<string> {
    try {
      // Insert financial document
      const { data: document, error: docError } = await supabase
        .from('financial_documents')
        .insert({
          user_id: userId,
          ...documentData
        })
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
          document_id: documentId
        }));

        const { error: metricsError } = await supabase
          .from('financial_metrics')
          .insert(metricsWithDocId);

        if (metricsError) {
          throw new Error(`Error saving financial metrics: ${metricsError.message}`);
        }
      }

      console.log(`Successfully saved financial document with ${metrics.length} metrics`);
      return documentId;
    } catch (error) {
      console.error('Error saving financial document:', error);
      throw error;
    }
  }

  /**
   * Get financial documents for a user
   */
  static async getFinancialDocuments(userId: string, documentType?: DocumentType): Promise<FinancialDocument[]> {
    try {
      let query = supabase
        .from('financial_documents')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error fetching financial documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching financial documents:', error);
      throw error;
    }
  }

  /**
   * Get financial metrics for a document
   */
  static async getFinancialMetrics(documentId: string): Promise<FinancialMetric[]> {
    try {
      const { data, error } = await supabase
        .from('financial_metrics')
        .select('*')
        .eq('document_id', documentId)
        .order('category', { ascending: true });

      if (error) {
        throw new Error(`Error fetching financial metrics: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      throw error;
    }
  }

  /**
   * Update financial document status
   */
  static async updateDocumentStatus(
    documentId: string, 
    status: 'pending' | 'reviewed' | 'approved' | 'rejected'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('financial_documents')
        .update({ status })
        .eq('id', documentId);

      if (error) {
        throw new Error(`Error updating document status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  /**
   * Update financial metric
   */
  static async updateFinancialMetric(
    metricId: string,
    updates: Partial<Pick<FinancialMetric, 'value' | 'is_verified'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('financial_metrics')
        .update(updates)
        .eq('id', metricId);

      if (error) {
        throw new Error(`Error updating financial metric: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating financial metric:', error);
      throw error;
    }
  }
}
