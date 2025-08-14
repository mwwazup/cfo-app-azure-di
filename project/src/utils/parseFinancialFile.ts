import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { PDFParser } from './pdfParser';
import { FinancialData, FinancialDataRow, StatementType, ParsedFileResult, FinancialCategory } from '../models/FinancialStatement';

export class FinancialFileParser {
  static async parseFile(file: File): Promise<ParsedFileResult> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let rawData: any[][] = [];

      switch (fileExtension) {
        case 'csv':
          rawData = await this.parseCSV(file);
          break;
        case 'xlsx':
        case 'xls':
          rawData = await this.parseExcel(file);
          break;
        case 'pdf':
          rawData = await this.parsePDF(file);
          break;
        default:
          return {
            success: false,
            error: 'Unsupported file format. Please upload CSV, Excel, or PDF files.'
          };
      }

      const detectedType = this.detectStatementType(file.name, rawData);
      const parsedData = this.processRawData(rawData, detectedType);

      return {
        success: true,
        data: parsedData,
        detectedType
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static parseCSV(file: File): Promise<(string | number)[][]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          resolve(results.data as (string | number)[][]);
        },
        error: (error) => {
          reject(error);
        },
        skipEmptyLines: true
      });
    });
  }

  private static async parseExcel(file: File): Promise<(string | number)[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(jsonData as (string | number)[][]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static async parsePDF(file: File): Promise<(string | number)[][]> {
    try {
      const text = await PDFParser.extractTextFromPDF(file);
      return PDFParser.parseFinancialDataFromText(text);
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static detectStatementType(fileName: string, data: (string | number)[][]): StatementType {
    const lowerFileName = fileName.toLowerCase();
    
    // Check filename for keywords
    if (lowerFileName.includes('profit') || lowerFileName.includes('loss') || lowerFileName.includes('p&l') || lowerFileName.includes('income')) {
      return 'profit_loss';
    }
    if (lowerFileName.includes('cash') || lowerFileName.includes('flow')) {
      return 'cash_flow';
    }
    if (lowerFileName.includes('balance') || lowerFileName.includes('sheet')) {
      return 'balance_sheet';
    }

    // Check data content for keywords
    const allText = data.flat().join(' ').toLowerCase();
    
    if (allText.includes('revenue') || allText.includes('sales') || allText.includes('gross profit') || allText.includes('net income')) {
      return 'profit_loss';
    }
    if (allText.includes('cash flow') || allText.includes('operating activities') || allText.includes('investing activities')) {
      return 'cash_flow';
    }
    if (allText.includes('assets') || allText.includes('liabilities') || allText.includes('equity')) {
      return 'balance_sheet';
    }

    // Default to P&L if uncertain
    return 'profit_loss';
  }

  private static processRawData(rawData: (string | number)[][], statementType: StatementType): FinancialData {
    const processedRows: FinancialDataRow[] = [];
    let headerRowIndex = -1;

    // Find header row (contains "Account", "Amount", etc.)
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i];
      if (row.some((cell: any) => 
        typeof cell === 'string' && 
        (cell.toLowerCase().includes('account') || 
         cell.toLowerCase().includes('description') || 
         cell.toLowerCase().includes('item'))
      )) {
        headerRowIndex = i;
        break;
      }
    }

    const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
    
    for (let i = startRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (row.length < 2) continue;

      const accountName = this.cleanString(row[0]);
      const amount = this.parseAmount(row[1]);

      if (accountName && !isNaN(amount) && amount !== 0) {
        const category = this.categorizeAccount(accountName, statementType);
        
        processedRows.push({
          id: `${i}-${Date.now()}`,
          category,
          account_name: accountName,
          amount,
          period: new Date().toISOString().slice(0, 7) // Current month as default
        });
      }
    }

    const categories = this.groupByCategory(processedRows, statementType);
    const totals = this.calculateTotals(categories);

    return {
      statement_type: statementType,
      period_start: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      currency: 'USD',
      data: processedRows,
      categories,
      totals
    };
  }

  private static cleanString(value: string | number): string {
    if (typeof value !== 'string') return String(value || '');
    return value.trim().replace(/[^\w\s-]/g, '');
  }

  private static parseAmount(value: string | number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and parentheses
      const cleaned = value.replace(/[$,()]/g, '').trim();
      const num = parseFloat(cleaned);
      // Handle negative numbers in parentheses
      return value.includes('(') ? -Math.abs(num) : num;
    }
    return 0;
  }

  private static categorizeAccount(accountName: string, statementType: StatementType): string {
    const lower = accountName.toLowerCase();

    switch (statementType) {
      case 'profit_loss':
        if (lower.includes('revenue') || lower.includes('sales') || lower.includes('income')) return 'Revenue';
        if (lower.includes('cost') || lower.includes('cogs')) return 'Cost of Goods Sold';
        if (lower.includes('salary') || lower.includes('wage') || lower.includes('payroll')) return 'Personnel Expenses';
        if (lower.includes('rent') || lower.includes('lease')) return 'Facility Expenses';
        if (lower.includes('marketing') || lower.includes('advertising')) return 'Marketing Expenses';
        if (lower.includes('expense') || lower.includes('cost')) return 'Operating Expenses';
        return 'Other';

      case 'balance_sheet':
        if (lower.includes('cash') || lower.includes('bank')) return 'Current Assets';
        if (lower.includes('receivable') || lower.includes('inventory')) return 'Current Assets';
        if (lower.includes('equipment') || lower.includes('property') || lower.includes('building')) return 'Fixed Assets';
        if (lower.includes('payable') || lower.includes('accrued')) return 'Current Liabilities';
        if (lower.includes('loan') || lower.includes('debt') || lower.includes('mortgage')) return 'Long-term Liabilities';
        if (lower.includes('equity') || lower.includes('capital') || lower.includes('retained')) return 'Equity';
        return 'Other';

      case 'cash_flow':
        if (lower.includes('operating') || lower.includes('operation')) return 'Operating Activities';
        if (lower.includes('investing') || lower.includes('investment')) return 'Investing Activities';
        if (lower.includes('financing') || lower.includes('loan') || lower.includes('equity')) return 'Financing Activities';
        return 'Operating Activities';

      default:
        return 'Other';
    }
  }

  private static groupByCategory(rows: FinancialDataRow[], statementType: StatementType): FinancialCategory[] {
    const categoryMap = new Map<string, FinancialDataRow[]>();
    
    rows.forEach(row => {
      if (!categoryMap.has(row.category)) {
        categoryMap.set(row.category, []);
      }
      categoryMap.get(row.category)!.push(row);
    });

    const categories: FinancialCategory[] = [];
    const totalAmount = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0);

    categoryMap.forEach((items, categoryName) => {
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      const percentage = totalAmount > 0 ? (Math.abs(total) / totalAmount) * 100 : 0;
      
      categories.push({
        name: categoryName,
        type: this.getCategoryType(categoryName, statementType),
        total,
        percentage,
        items
      });
    });

    return categories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }

  private static getCategoryType(categoryName: string, statementType: StatementType): FinancialCategory['type'] {
    const lower = categoryName.toLowerCase();
    
    switch (statementType) {
      case 'profit_loss':
        return lower.includes('revenue') || lower.includes('income') ? 'revenue' : 'expense';
      case 'balance_sheet':
        if (lower.includes('asset')) return 'asset';
        if (lower.includes('liability')) return 'liability';
        if (lower.includes('equity')) return 'equity';
        return 'asset';
      case 'cash_flow':
        return lower.includes('inflow') || lower.includes('receipt') ? 'cash_inflow' : 'cash_outflow';
      default:
        return 'expense';
    }
  }

  private static calculateTotals(categories: FinancialCategory[]): Record<string, number> {
    const totals: Record<string, number> = {};
    
    categories.forEach(category => {
      totals[category.name] = category.total;
    });

    // Calculate common totals
    const revenue = categories.filter(c => c.type === 'revenue').reduce((sum, c) => sum + c.total, 0);
    const expenses = categories.filter(c => c.type === 'expense').reduce((sum, c) => sum + Math.abs(c.total), 0);
    
    totals['Total Revenue'] = revenue;
    totals['Total Expenses'] = expenses;
    totals['Net Income'] = revenue - expenses;

    return totals;
  }
}