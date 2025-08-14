import { createClient } from '@supabase/supabase-js';

// Types for Azure Document Intelligence response
interface AzureDocumentResponse {
  documentType: string;
  reportingPeriod?: string;
  pnl_totalRevenue?: number;
  pnl_costOfGoodsSold?: number;
  pnl_grossProfit?: number;
  pnl_operatingExpenses?: number;
  pnl_netIncome?: number;
  pnl_otherIncome?: number;
  pnl_otherExpenses?: number;
  pnl_expenseBreakdown?: Array<{
    category: string;
    amount: number;
    notes?: string;
  }>;
  bs_totalAssets?: number;
  bs_totalLiabilities?: number;
  bs_totalEquity?: number;
  bs_currentAssets?: number;
  bs_currentLiabilities?: number;
  bs_assetBreakdown?: Array<{
    assetType: string;
    value: number;
  }>;
  cf_cashFromOperations?: number;
  cf_cashFromInvesting?: number;
  cf_cashFromFinancing?: number;
  cf_netCashFlow?: number;
  cf_cashAtBeginning?: number;
  cf_cashAtEnd?: number;
  cf_cashMovements?: Array<{
    source: string;
    amount: number;
    category: string;
  }>;
}

interface DocumentUpload {
  id: string;
  user_id: string;
  document_type: 'P&L' | 'BALANCE_SHEET' | 'CASH_FLOW' | null;
  reporting_period?: string;
  azure_data: any;
  uploaded_at: string;
}

interface AnalysisResult {
  documentId: string;
  success: boolean;
  error?: string;
  documentType?: string;
}

export class AzureDocumentAnalysisService {
  private supabase: any;
  private azureEndpoint: string;
  private azureApiKey: string;

  constructor() {
    this.azureEndpoint = import.meta.env.DI_ENDPOINT;
    this.azureApiKey = import.meta.env.DI_KEY;
    
    // Create Supabase client for server-side operations
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  /**
   * Analyze and store financial documents
   */
  async analyzeAndStore(files: File[], userId: string): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const file of files) {
      try {
        const result = await this.processFile(file, userId);
        results.push(result);
      } catch (error) {
        results.push({
          documentId: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    return results;
  }

  /**
   * Process a single file
   */
  private async processFile(file: File, userId: string): Promise<AnalysisResult> {
    // 1. Call Azure Document Intelligence analyzer
    const azureResponse = await this.callAzureAnalyzer(file);
    
    // 2. Normalize document type
    const documentType = this.normalizeDocumentType(azureResponse.documentType);
    
    if (!documentType) {
      throw new Error('Unable to determine document type from Azure response');
    }

    // 3. Insert into financial_documents table
    const documentRecord = await this.insertDocumentRecord({
      user_id: userId,
      document_type: documentType,
      reporting_period: azureResponse.reportingPeriod,
      azure_data: azureResponse,
      uploaded_at: new Date().toISOString()
    });

    // 4. Fan-out data based on document type
    await this.insertBreakdownData(documentRecord.id, documentType, azureResponse);

    return {
      documentId: documentRecord.id,
      success: true,
      documentType
    };
  }

  /**
   * Call Azure Document Intelligence analyzer
   */
  private async callAzureAnalyzer(file: File): Promise<AzureDocumentResponse> {
    // Convert file to base64
    const base64File = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Extract base64 data without the data URL prefix
    const base64Data = base64File.split(',')[1];

    const response = await fetch(`${this.azureEndpoint}/formrecognizer/documentModels/${import.meta.env.DI_MODEL_ID || 'prebuilt-document'}:analyze?api-version=${import.meta.env.DI_API_VERSION || '2024-07-31'}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.azureApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Source: base64Data
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure analyze failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Normalize document type from Azure response
   */
  private normalizeDocumentType(azureType?: string): 'P&L' | 'BALANCE_SHEET' | 'CASH_FLOW' | null {
    if (!azureType) return null;
    
    const type = azureType.toLowerCase();
    
    if (/p&l|pnl|profit.*loss|income/i.test(type)) {
      return 'P&L';
    }
    if (/balance.*sheet/i.test(type)) {
      return 'BALANCE_SHEET';
    }
    if (/cash.*flow/i.test(type)) {
      return 'CASH_FLOW';
    }
    
    return null;
  }

  /**
   * Insert document record into financial_documents
   */
  private async insertDocumentRecord(data: any): Promise<DocumentUpload> {
    const { data: result, error } = await this.supabase
      .from('financial_documents')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert document record: ${error.message}`);
    }

    return result;
  }

  /**
   * Insert breakdown data based on document type
   */
  private async insertBreakdownData(
    documentId: string,
    documentType: string,
    azureData: AzureDocumentResponse
  ): Promise<void> {
    switch (documentType) {
      case 'P&L':
        await this.insertPNLData(documentId, azureData);
        break;
      case 'BALANCE_SHEET':
        await this.insertBalanceSheetData(documentId, azureData);
        break;
      case 'CASH_FLOW':
        await this.insertCashFlowData(documentId, azureData);
        break;
    }
  }

  /**
   * Insert P&L data
   */
  private async insertPNLData(documentId: string, data: AzureDocumentResponse): Promise<void> {
    const { error } = await this.supabase
      .from('financial_documents')
      .update({
        pnl_total_revenue: data.pnl_totalRevenue,
        pnl_cost_of_goods_sold: data.pnl_costOfGoodsSold,
        pnl_gross_profit: data.pnl_grossProfit,
        pnl_operating_expenses: data.pnl_operatingExpenses,
        pnl_net_income: data.pnl_netIncome,
        pnl_other_income: data.pnl_otherIncome,
        pnl_other_expenses: data.pnl_otherExpenses,
        pnl_expense_breakdown: data.pnl_expenseBreakdown || []
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to update P&L data: ${error.message}`);
    }
  }

  /**
   * Insert Balance Sheet data
   */
  private async insertBalanceSheetData(documentId: string, data: AzureDocumentResponse): Promise<void> {
    const { error } = await this.supabase
      .from('financial_documents')
      .update({
        bs_total_assets: data.bs_totalAssets,
        bs_total_liabilities: data.bs_totalLiabilities,
        bs_total_equity: data.bs_totalEquity,
        bs_current_assets: data.bs_currentAssets,
        bs_current_liabilities: data.bs_currentLiabilities,
        bs_asset_breakdown: data.bs_assetBreakdown || []
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to update Balance Sheet data: ${error.message}`);
    }
  }

  /**
   * Insert Cash Flow data
   */
  private async insertCashFlowData(documentId: string, data: AzureDocumentResponse): Promise<void> {
    const { error } = await this.supabase
      .from('financial_documents')
      .update({
        cf_cash_from_operations: data.cf_cashFromOperations,
        cf_cash_from_investing: data.cf_cashFromInvesting,
        cf_cash_from_financing: data.cf_cashFromFinancing,
        cf_net_cash_flow: data.cf_netCashFlow,
        cf_cash_at_beginning: data.cf_cashAtBeginning,
        cf_cash_at_end: data.cf_cashAtEnd,
        cf_cash_movements: data.cf_cashMovements || []
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to update Cash Flow data: ${error.message}`);
    }
  }

  /**
   * Get documents for a user
   */
  async getUserDocuments(userId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return data;
  }
}

// Export singleton instance
export const azureDocumentAnalysisService = new AzureDocumentAnalysisService();
