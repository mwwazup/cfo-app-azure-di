export type StatementType = 'profit_loss' | 'cash_flow' | 'balance_sheet';

// Document type for financial statements
export type DocumentType = 'pnl' | 'balance_sheet' | 'cash_flow';

// Interfaces for Azure Document Intelligence custom model
export interface ExpenseBreakdownItem {
  category?: string;
  amount?: number;
  notes?: string;
}

export interface AssetBreakdownItem {
  assetType?: string;
  value?: number;
}

export interface CashMovementItem {
  source?: string;
  amount?: number;
  category?: string;
}

export interface AzureFinancialData {
  reportingPeriod?: string;
  documentType?: string;
  // P&L fields
  pnl_totalRevenue?: number;
  pnl_costOfGoodsSold?: number;
  pnl_grossProfit?: number;
  pnl_operatingExpenses?: number;
  pnl_netOperatingIncome?: number;
  pnl_netIncome?: number;
  pnl_otherIncome?: number;
  pnl_otherExpenses?: number;
  pnl_expenseBreakdown?: ExpenseBreakdownItem[];
  // Balance Sheet fields
  bs_totalAssets?: number;
  bs_totalLiabilities?: number;
  bs_totalEquity?: number;
  bs_currentAssets?: number;
  bs_currentLiabilities?: number;
  bs_assetBreakdown?: AssetBreakdownItem[];
  // Cash Flow fields
  cf_cashFromOperations?: number;
  cf_cashFromInvesting?: number;
  cf_cashFromFinancing?: number;
  cf_netCashFlow?: number;
  cf_cashAtBeginning?: number;
  cf_cashAtEnd?: number;
  cf_cashMovements?: CashMovementItem[];
}

export interface FinancialStatement {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  statement_type: StatementType;
  uploaded_at: string;
  file_size: number;
  file_type: string;
  parsed_data?: FinancialData;
  metadata?: Record<string, any>;
}

export interface FinancialData {
  statement_type: StatementType;
  period_start?: string;
  period_end?: string;
  currency?: string;
  data: FinancialDataRow[];
  totals?: Record<string, number>;
  categories?: FinancialCategory[];
}

export interface FinancialDataRow {
  id: string;
  category: string;
  subcategory?: string;
  account_name: string;
  amount: number;
  period?: string;
  percentage_of_total?: number;
}

export interface FinancialCategory {
  name: string;
  type: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity' | 'cash_inflow' | 'cash_outflow';
  total: number;
  percentage: number;
  items: FinancialDataRow[];
}

export interface ParsedFileResult {
  success: boolean;
  data?: FinancialData;
  error?: string;
  detectedType?: StatementType;
}

// Financial document and metric interfaces for database storage
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
  // Azure Document Intelligence fields
  azure_data?: AzureFinancialData;
  reporting_period?: string;
  azure_document_type?: string;
  // P&L fields (matching actual database schema)
  pnl_totalRevenue?: number;
  pnl_costOfGoodsSold?: number;
  pnl_grossProfit?: number;
  pnl_operatingExpenses?: number;
  pnl_netOperatingIncome?: number;
  pnl_netIncome?: number;
  pnl_other_income?: number;
  pnl_other_expenses?: number;
  pnl_expense_breakdown?: ExpenseBreakdownItem[];
  reportingPeriod?: string;
  // Balance Sheet fields
  bs_total_assets?: number;
  bs_total_liabilities?: number;
  bs_total_equity?: number;
  bs_current_assets?: number;
  bs_current_liabilities?: number;
  bs_asset_breakdown?: AssetBreakdownItem[];
  // Cash Flow fields
  cf_cash_from_operations?: number;
  cf_cash_from_investing?: number;
  cf_cash_from_financing?: number;
  cf_net_cash_flow?: number;
  cf_cash_at_beginning?: number;
  cf_cash_at_end?: number;
  cf_cash_movements?: CashMovementItem[];
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

// Chart data interfaces
interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface FinancialChartData {
  labels: string[];
  datasets: ChartDataset[];
}