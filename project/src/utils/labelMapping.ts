/**
 * Canonical label mapping for financial document fields
 * Normalizes various field names to consistent keys
 */

export interface LabelMapping {
  type: 'revenue' | 'expense' | 'kpi';
  key: string;
}

export const LABEL_MAP: Record<string, LabelMapping> = {
  // Revenue mappings
  'total revenue': { type: 'kpi', key: 'revenue_total' },
  'revenue': { type: 'kpi', key: 'revenue_total' },
  'gross sales': { type: 'kpi', key: 'revenue_total' },
  'sales revenue': { type: 'revenue', key: 'sales_revenue' },
  'service revenue': { type: 'revenue', key: 'service_revenue' },
  'other revenue': { type: 'revenue', key: 'other_revenue' },
  'interest income': { type: 'revenue', key: 'interest_income' },

  // Cost of Goods Sold
  'cost of goods sold': { type: 'expense', key: 'cogs_total' },
  'cogs': { type: 'expense', key: 'cogs_total' },
  'cost of sales': { type: 'expense', key: 'cogs_total' },
  'direct costs': { type: 'expense', key: 'cogs_total' },

  // Operating Expenses
  'operating expenses': { type: 'expense', key: 'opex_total' },
  'opex': { type: 'expense', key: 'opex_total' },
  'total expenses': { type: 'expense', key: 'opex_total' },
  'salaries and wages': { type: 'expense', key: 'salaries_wages' },
  'rent expense': { type: 'expense', key: 'rent_expense' },
  'utilities': { type: 'expense', key: 'utilities' },
  'marketing': { type: 'expense', key: 'marketing' },
  'advertising': { type: 'expense', key: 'marketing' },
  'insurance': { type: 'expense', key: 'insurance' },
  'office supplies': { type: 'expense', key: 'office_supplies' },
  'depreciation': { type: 'expense', key: 'depreciation' },
  'professional fees': { type: 'expense', key: 'professional_fees' },
  'travel': { type: 'expense', key: 'travel' },
  'meals and entertainment': { type: 'expense', key: 'meals_entertainment' },

  // KPIs
  'gross profit': { type: 'kpi', key: 'gross_profit' },
  'gross income': { type: 'kpi', key: 'gross_profit' },
  'net income': { type: 'kpi', key: 'net_income' },
  'net profit': { type: 'kpi', key: 'net_income' },
  'net operating income': { type: 'kpi', key: 'net_income' },
  'operating income': { type: 'kpi', key: 'operating_income' },
  'ebitda': { type: 'kpi', key: 'ebitda' },
  'earnings before tax': { type: 'kpi', key: 'earnings_before_tax' },
};

/**
 * Normalize a label for mapping lookup
 */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Map a raw label to a canonical key and type
 */
export function mapLabel(rawLabel: string): LabelMapping | null {
  const normalized = normalizeLabel(rawLabel);
  return LABEL_MAP[normalized] || null;
}

/**
 * Parse a monetary value from various formats
 */
export function parseMonetaryValue(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value !== 'string') {
    return 0;
  }
  
  // Remove currency symbols, commas, and whitespace
  const cleanValue = value
    .replace(/[$,\s()]/g, '')
    .replace(/[()]/g, '-'); // Convert parentheses to negative
  
  const numericValue = parseFloat(cleanValue);
  return isNaN(numericValue) ? 0 : numericValue;
}

/**
 * Calculate KPIs from metrics
 */
export function calculateKPIs(metrics: Array<{ metric_key: string; value: number }>) {
  const revenue_total = metrics
    .filter(m => m.metric_key === 'revenue_total')
    .reduce((sum, m) => sum + m.value, 0);
    
  const cogs_total = metrics
    .filter(m => m.metric_key === 'cogs_total')
    .reduce((sum, m) => sum + m.value, 0);
    
  const opex_total = metrics
    .filter(m => m.metric_key === 'opex_total')
    .reduce((sum, m) => sum + m.value, 0);
    
  const gross_profit = revenue_total - cogs_total;
  const net_income = gross_profit - opex_total;
  
  const gross_margin_percent = revenue_total > 0 ? (gross_profit / revenue_total) * 100 : 0;
  const net_margin_percent = revenue_total > 0 ? (net_income / revenue_total) * 100 : 0;
  
  return {
    revenue_total,
    cogs_total,
    opex_total,
    gross_profit,
    net_income,
    gross_margin_percent: Math.round(gross_margin_percent * 100) / 100,
    net_margin_percent: Math.round(net_margin_percent * 100) / 100,
  };
}
