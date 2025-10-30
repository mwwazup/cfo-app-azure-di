/**
 * CSV Parser for Financial Documents
 * Parses CSV files and extracts financial data for P&L, Balance Sheet, and Cash Flow statements
 */

export interface CSVParseResult {
  success: boolean;
  data?: {
    documentType: 'pnl' | 'balance_sheet' | 'cash_flow';
    extractedFields: Record<string, { value: number; confidence?: number }>;
    summary: Record<string, number>;
    document: {
      start_date: string;
      end_date: string;
      document_type: string;
    };
    metadata: {
      confidence: number;
      rowCount: number;
      source: 'csv';
    };
  };
  error?: string;
}

/**
 * Parse CSV text content into rows and columns
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Simple CSV parsing (handles basic cases)
    // For production, consider using a library like papaparse
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  
  return rows;
}

/**
 * Clean and normalize field names
 */
function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Parse monetary value from string
 */
function parseMonetaryValue(value: string): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbols, commas, parentheses
  const cleaned = value
    .toString()
    .replace(/[$,\s]/g, '')
    .replace(/[()]/g, ''); // Remove parentheses (often used for negatives)
  
  // Check if it was in parentheses (negative)
  const isNegative = value.includes('(') && value.includes(')');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : (isNegative ? -parsed : parsed);
}

/**
 * Common P&L field mappings
 */
const PL_FIELD_MAPPINGS: Record<string, string> = {
  'revenue': 'total_revenue',
  'total_revenue': 'total_revenue',
  'sales': 'total_revenue',
  'income': 'total_revenue',
  'gross_revenue': 'total_revenue',
  
  'cogs': 'cost_of_goods_sold',
  'cost_of_goods_sold': 'cost_of_goods_sold',
  'cost_of_sales': 'cost_of_goods_sold',
  'direct_costs': 'cost_of_goods_sold',
  
  'operating_expenses': 'operating_expenses',
  'opex': 'operating_expenses',
  'expenses': 'operating_expenses',
  'overhead': 'operating_expenses',
  
  'net_income': 'net_income',
  'net_profit': 'net_income',
  'profit': 'net_income',
  'bottom_line': 'net_income',
  
  'gross_profit': 'gross_profit',
  'gross_margin': 'gross_profit',
  
  'owner_distributions': 'owner_distributions',
  'owner_draws': 'owner_distributions',
  'distributions': 'owner_distributions',
  'draws': 'owner_distributions'
};

/**
 * Parse P&L CSV data
 */
function parsePLData(rows: string[][]): CSVParseResult['data'] {
  const extractedFields: Record<string, { value: number; confidence?: number }> = {};
  const summary: Record<string, number> = {};
  
  // Try to find header row and data rows
  let dataStartRow = 0;
  
  // Check if first row looks like headers (skip it if so)
  if (rows.length > 0 && rows[0].some(cell => isNaN(parseMonetaryValue(cell)))) {
    dataStartRow = 1;
  }
  
  // Parse data rows
  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    
    const label = row[0];
    const value = parseMonetaryValue(row[1]);
    
    if (!label || value === 0) continue;
    
    const normalizedLabel = normalizeFieldName(label);
    const mappedField = PL_FIELD_MAPPINGS[normalizedLabel] || normalizedLabel;
    
    extractedFields[mappedField] = { value, confidence: 0.9 };
    summary[mappedField] = value;
  }
  
  // Calculate derived fields if not present
  if (!extractedFields.gross_profit && extractedFields.total_revenue && extractedFields.cost_of_goods_sold) {
    const grossProfit = extractedFields.total_revenue.value - extractedFields.cost_of_goods_sold.value;
    extractedFields.gross_profit = { value: grossProfit, confidence: 1.0 };
    summary.gross_profit = grossProfit;
  }
  
  if (!extractedFields.net_income && extractedFields.total_revenue) {
    const cogs = extractedFields.cost_of_goods_sold?.value || 0;
    const opex = extractedFields.operating_expenses?.value || 0;
    const netIncome = extractedFields.total_revenue.value - cogs - opex;
    extractedFields.net_income = { value: netIncome, confidence: 1.0 };
    summary.net_income = netIncome;
  }
  
  return {
    documentType: 'pnl',
    extractedFields,
    summary,
    document: {
      start_date: '',
      end_date: '',
      document_type: 'pnl'
    },
    metadata: {
      confidence: 0.9,
      rowCount: rows.length,
      source: 'csv'
    }
  };
}

/**
 * Main CSV parser function
 */
export async function parseFinancialCSV(
  file: File,
  documentType: 'pnl' | 'balance_sheet' | 'cash_flow' = 'pnl'
): Promise<CSVParseResult> {
  try {
    // Read file content
    const text = await file.text();
    
    // Parse CSV
    const rows = parseCSV(text);
    
    if (rows.length === 0) {
      return {
        success: false,
        error: 'CSV file is empty'
      };
    }
    
    // Parse based on document type
    let data: CSVParseResult['data'];
    
    switch (documentType) {
      case 'pnl':
        data = parsePLData(rows);
        break;
      case 'balance_sheet':
        // TODO: Implement balance sheet parsing
        return {
          success: false,
          error: 'Balance sheet CSV parsing not yet implemented'
        };
      case 'cash_flow':
        // TODO: Implement cash flow parsing
        return {
          success: false,
          error: 'Cash flow CSV parsing not yet implemented'
        };
      default:
        return {
          success: false,
          error: 'Unsupported document type'
        };
    }
    
    return {
      success: true,
      data
    };
    
  } catch (error) {
    console.error('CSV parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV file'
    };
  }
}

/**
 * Validate CSV file before parsing
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return {
      valid: false,
      error: 'File must be a CSV file (.csv)'
    };
  }
  
  // Check file size (max 5MB for CSV)
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'CSV file size must be less than 5MB'
    };
  }
  
  return { valid: true };
}
