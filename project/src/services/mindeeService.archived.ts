/**
 * ARCHIVED: Mindee Service Implementation
 * Date Archived: 2025-08-04
 * Reason: Switching to Microsoft Azure Document Intelligence for better reliability
 * 
 * This file contains the complete Mindee integration that was developed but
 * encountered API issues. Preserved for reference and potential future use.
 */

import { DocumentType } from '../models/FinancialStatement';

// Environment variables for Mindee API
const MINDEE_API_KEY = import.meta.env.VITE_MINDEE_API_KEY;
const MINDEE_MODEL_ID = import.meta.env.VITE_MINDEE_MODEL_ID;

export interface MindeeResponse {
  api_request: {
    error?: {
      code: string;
      details: string;
      message: string;
    };
    status: string;
    status_code: number;
    url: string;
  };
  document: {
    id: string;
    inference: {
      finished_at: string;
      is_rotation_applied: boolean;
      pages: Array<{
        id: number;
        orientation: {
          value: number;
        };
        prediction: any;
      }>;
      prediction: {
        [key: string]: any;
      };
      processing_time: number;
      product: {
        features: string[];
        name: string;
        type: string;
        version: string;
      };
      started_at: string;
    };
    n_pages: number;
    name: string;
  };
}

export interface ExtractedFinancialData {
  documentType: DocumentType;
  extractedFields: {
    [key: string]: {
      value: string | number;
      confidence: number;
    };
  };
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
  metadata: {
    processingTime: number;
    confidence: number;
    documentId: string;
    extractedAt: string;
  };
}

/**
 * ARCHIVED Mindee Service for AI-powered document processing
 * This service handles financial document processing using Mindee's REST API
 * 
 * NOTE: This implementation was archived due to API connectivity issues.
 * The 404 "Resource not found" error suggested model ID or namespace issues.
 */
export class MindeeService {
  /**
   * Process a financial document using Mindee AI
   * @param file - The file to process (PDF or image)
   * @param documentType - Type of financial document
   * @returns Extracted financial data
   */
  static async processDocument(file: File, documentType: DocumentType): Promise<ExtractedFinancialData> {
    if (!MINDEE_API_KEY) {
      throw new Error('Mindee API key is not configured. Please set VITE_MINDEE_API_KEY environment variable.');
    }

    if (!MINDEE_MODEL_ID) {
      throw new Error('Mindee Model ID is not configured. Please set VITE_MINDEE_MODEL_ID environment variable.');
    }

    // ARCHIVED: This was the final URL format attempted
    const apiUrl = `https://api.mindee.net/v1/custom/mwwazup/models/${MINDEE_MODEL_ID}/predict`;
    
    console.log('ARCHIVED MINDEE: Processing document with Mindee API');
    console.log('API URL:', apiUrl);
    console.log('Document type:', documentType);
    console.log('File size:', file.size);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${MINDEE_API_KEY}`,
        },
        body: formData,
      });

      console.log('Mindee API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mindee API Error Response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Mindee API Error Details:', JSON.stringify(errorJson, null, 2));
        } catch (parseError) {
          console.error('Could not parse error response as JSON');
        }
        
        throw new Error(`Mindee API error: ${response.status} ${response.statusText}`);
      }

      const mindeeResponse: MindeeResponse = await response.json();
      console.log('Mindee API Success Response:', JSON.stringify(mindeeResponse, null, 2));

      // Check for API-level errors in the response
      if (mindeeResponse.api_request?.error) {
        console.error('Mindee API Request Error:', mindeeResponse.api_request.error);
        throw new Error(`Mindee API error: ${mindeeResponse.api_request.error.message}`);
      }

      // Parse the Mindee response and extract financial data
      return this.parseResponse(mindeeResponse, documentType);

    } catch (error) {
      console.error('Error processing document with Mindee:', error);
      throw error;
    }
  }

  /**
   * Parse Mindee response and extract structured financial data
   */
  private static parseResponse(response: MindeeResponse, documentType: DocumentType): ExtractedFinancialData {
    const prediction = response.document.inference.prediction;
    const metadata = {
      processingTime: response.document.inference.processing_time,
      confidence: 0.95, // Default confidence - would be calculated from actual fields
      documentId: response.document.id,
      extractedAt: new Date().toISOString(),
    };

    // Initialize extracted fields object
    const extractedFields: { [key: string]: { value: string | number; confidence: number } } = {};

    // Parse prediction fields (this would need to be customized based on actual Mindee model output)
    if (prediction) {
      Object.keys(prediction).forEach(key => {
        const field = prediction[key];
        if (field && typeof field === 'object' && 'value' in field) {
          extractedFields[key] = {
            value: field.value,
            confidence: field.confidence || 0.5,
          };
        }
      });
    }

    // Generate summary based on document type and extracted fields
    const summary = this.generateSummary(extractedFields, documentType);

    return {
      documentType,
      extractedFields,
      summary,
      metadata,
    };
  }

  /**
   * Generate financial summary based on extracted fields and document type
   */
  private static generateSummary(
    fields: { [key: string]: { value: string | number; confidence: number } },
    documentType: DocumentType
  ) {
    const summary: any = {};

    // This would be customized based on the actual field names from Mindee model
    switch (documentType) {
      case 'profit_loss':
        summary.totalRevenue = this.extractNumericValue(fields, ['revenue', 'total_revenue', 'sales']);
        summary.totalExpenses = this.extractNumericValue(fields, ['expenses', 'total_expenses', 'costs']);
        summary.netProfit = this.extractNumericValue(fields, ['net_profit', 'net_income', 'profit']);
        break;
      
      case 'balance_sheet':
        summary.totalAssets = this.extractNumericValue(fields, ['total_assets', 'assets']);
        summary.totalLiabilities = this.extractNumericValue(fields, ['total_liabilities', 'liabilities']);
        summary.equity = this.extractNumericValue(fields, ['equity', 'shareholders_equity']);
        break;
      
      case 'cash_flow':
        summary.operatingCashFlow = this.extractNumericValue(fields, ['operating_cash_flow', 'operating_activities']);
        summary.investingCashFlow = this.extractNumericValue(fields, ['investing_cash_flow', 'investing_activities']);
        summary.financingCashFlow = this.extractNumericValue(fields, ['financing_cash_flow', 'financing_activities']);
        break;
    }

    return summary;
  }

  /**
   * Extract numeric value from fields using multiple possible field names
   */
  private static extractNumericValue(
    fields: { [key: string]: { value: string | number; confidence: number } },
    possibleNames: string[]
  ): number | undefined {
    for (const name of possibleNames) {
      const field = fields[name];
      if (field) {
        const value = typeof field.value === 'string' ? parseFloat(field.value) : field.value;
        if (!isNaN(value)) {
          return value;
        }
      }
    }
    return undefined;
  }
}
