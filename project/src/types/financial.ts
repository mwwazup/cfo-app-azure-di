/**
 * Type definitions for financial data structures
 * Replaces 'any' types with proper TypeScript interfaces
 */

// ============================================================================
// Revenue Entry Types
// ============================================================================

export interface RevenueEntry {
  id: string;
  user_id: string;
  year: number;
  month: number;
  actual_revenue: number;
  desired_revenue: number;
  target_revenue?: number;
  profit_margin?: number;
  owner_distributions?: number;
  created_at: string;
  updated_at: string;
}

export interface RevenueEntryCreate {
  year: number;
  month: number;
  actual_revenue: number;
  desired_revenue: number;
  target_revenue?: number;
  profit_margin?: number;
  owner_distributions?: number;
}

export interface RevenueEntryUpdate {
  actual_revenue?: number;
  desired_revenue?: number;
  target_revenue?: number;
  profit_margin?: number;
  owner_distributions?: number;
}

// ============================================================================
// KPI Types
// ============================================================================

export type KPICategory = 
  | 'revenue'
  | 'profitability'
  | 'growth'
  | 'efficiency'
  | 'liquidity';

export interface KPIRecord {
  id: string;
  user_id: string;
  period: string; // YYYY-MM-DD format
  kpi_name: string;
  kpi_category: KPICategory;
  actual_value: number;
  goal_value: number;
  trend_vs_last_month?: number;
  action_suggestion?: string;
  display_format?: string;
  plain_explanation?: string;
  created_at: string;
  updated_at: string;
}

export interface KPIRecordCreate {
  period: string;
  kpi_name: string;
  kpi_category: KPICategory;
  actual_value: number;
  goal_value: number;
  trend_vs_last_month?: number;
  action_suggestion?: string;
  display_format?: string;
  plain_explanation?: string;
}

// ============================================================================
// Service Mix Types
// ============================================================================

export interface Service {
  id: string;
  user_id: string;
  service_name: string;
  category?: string;
  price_per_unit?: number;
  cogs_per_unit?: number;
  color?: string;
  created_at: string;
}

export interface ServiceCreate {
  service_name: string;
  category?: string;
  price_per_unit?: number;
  cogs_per_unit?: number;
  color?: string;
}

export interface ServiceActivity {
  id: string;
  user_id: string;
  service_id: string;
  year: number;
  month: number;
  week_of_month: number;
  appointments: number;
  revenue: number;
  created_at: string;
}

export interface ServiceActivityCreate {
  service_id: string;
  year: number;
  month: number;
  week_of_month: number;
  appointments: number;
  revenue: number;
}

// ============================================================================
// Employee LER Types
// ============================================================================

export interface EmployeeInfo {
  id: string;
  user_id: string;
  employee_name: string;
  base_rate: number;
  ler_target: number;
  bonus_threshold?: number;
  bonus_rate?: number;
  created_at: string;
}

export interface EmployeeInfoCreate {
  employee_name: string;
  base_rate: number;
  ler_target: number;
  bonus_threshold?: number;
  bonus_rate?: number;
}

export interface PayPeriod {
  id: string;
  user_id: string;
  year: number;
  start_date: string;
  end_date: string;
  pay_schedule?: string;
  created_at: string;
}

export interface PayPeriodCreate {
  year: number;
  start_date: string;
  end_date: string;
  pay_schedule?: string;
}

export interface EmployeeDailyRecord {
  id: string;
  pay_period_id: string;
  date: string;
  revenue: number;
  hours: number;
  base_pay: number;
  ler: number;
  bonus: number;
  gross_profit: number;
  gross_profit_percentage: number;
  job_types?: Record<string, number>;
  created_at: string;
}

export interface EmployeeDailyRecordCreate {
  pay_period_id: string;
  date: string;
  revenue: number;
  hours: number;
  job_types?: Record<string, number>;
}

// ============================================================================
// Financial Document Types
// ============================================================================

export type DocumentType = 'profit_loss' | 'balance_sheet' | 'cash_flow';

export interface FinancialDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  period_start: string;
  period_end: string;
  filename: string;
  file_path?: string;
  raw_json?: Record<string, unknown>;
  summary_metrics?: FinancialSummaryMetrics;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummaryMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossProfit?: number;
  operatingIncome?: number;
}

export interface FinancialDocumentCreate {
  document_type: DocumentType;
  period_start: string;
  period_end: string;
  filename: string;
  file_path?: string;
  raw_json?: Record<string, unknown>;
  summary_metrics?: FinancialSummaryMetrics;
}

// ============================================================================
// Company Settings Types
// ============================================================================

export type PaySchedule = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';

export interface CompanySettings {
  id: string;
  user_id: string;
  company_name?: string;
  pay_schedule?: PaySchedule;
  fiscal_year_start?: number; // month (1-12)
  default_profit_margin_target?: number;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsUpdate {
  company_name?: string;
  pay_schedule?: PaySchedule;
  fiscal_year_start?: number;
  default_profit_margin_target?: number;
}

// ============================================================================
// Aggregated Data Types
// ============================================================================

export interface MonthlyFinancialSummary {
  year: number;
  month: number;
  revenue: number;
  target: number;
  variance: number;
  variancePercent: number;
  profitMargin?: number;
  ownerDistributions?: number;
}

export interface YearlyFinancialSummary {
  year: number;
  totalRevenue: number;
  totalTarget: number;
  averageMonthlyRevenue: number;
  bestMonth: {
    month: number;
    revenue: number;
  };
  worstMonth: {
    month: number;
    revenue: number;
  };
  yearOverYearGrowth?: number;
}

export interface ServiceRevenueData {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  totalAppointments: number;
  averageRevenuePerAppointment: number;
  percentOfTotal: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SupabaseListResponse<T> {
  rows: T[];
  count?: number;
  error?: Error | null;
}

export interface ServiceOperationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}
