/**
 * Unit tests for label mapping and KPI calculation utilities
 */
import { normalizeLabel, mapLabel, parseMonetaryValue, calculateKPIs } from './labelMapping';

describe('normalizeLabel', () => {
  it('should normalize labels to lowercase and remove punctuation', () => {
    expect(normalizeLabel('Total Revenue')).toBe('total revenue');
    expect(normalizeLabel('Cost of Goods Sold')).toBe('cost of goods sold');
    expect(normalizeLabel('Operating Expenses!')).toBe('operating expenses');
    expect(normalizeLabel('  Net Income  ')).toBe('net income');
    expect(normalizeLabel('Gross-Profit')).toBe('grossprofit');
  });

  it('should handle empty and special cases', () => {
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel('   ')).toBe('');
    expect(normalizeLabel('123')).toBe('123');
  });
});

describe('mapLabel', () => {
  it('should map revenue labels correctly', () => {
    expect(mapLabel('Total Revenue')).toEqual({ type: 'kpi', key: 'revenue_total' });
    expect(mapLabel('Revenue')).toEqual({ type: 'kpi', key: 'revenue_total' });
    expect(mapLabel('Sales')).toEqual({ type: 'kpi', key: 'revenue_total' });
    expect(mapLabel('Gross Sales')).toEqual({ type: 'kpi', key: 'revenue_total' });
  });

  it('should map COGS labels correctly', () => {
    expect(mapLabel('Cost of Goods Sold')).toEqual({ type: 'kpi', key: 'cogs_total' });
    expect(mapLabel('COGS')).toEqual({ type: 'kpi', key: 'cogs_total' });
    expect(mapLabel('Cost of Sales')).toEqual({ type: 'kpi', key: 'cogs_total' });
    expect(mapLabel('Direct Costs')).toEqual({ type: 'kpi', key: 'cogs_total' });
  });

  it('should map operating expense labels correctly', () => {
    expect(mapLabel('Operating Expenses')).toEqual({ type: 'kpi', key: 'opex_total' });
    expect(mapLabel('OpEx')).toEqual({ type: 'kpi', key: 'opex_total' });
    expect(mapLabel('Total Expenses')).toEqual({ type: 'kpi', key: 'opex_total' });
    expect(mapLabel('Operating Costs')).toEqual({ type: 'kpi', key: 'opex_total' });
  });

  it('should map KPI labels correctly', () => {
    expect(mapLabel('Gross Profit')).toEqual({ type: 'kpi', key: 'gross_profit' });
    expect(mapLabel('Net Income')).toEqual({ type: 'kpi', key: 'net_income' });
    expect(mapLabel('Net Profit')).toEqual({ type: 'kpi', key: 'net_income' });
    expect(mapLabel('Operating Income')).toEqual({ type: 'kpi', key: 'operating_income' });
  });

  it('should return null for unmapped labels', () => {
    expect(mapLabel('Unknown Label')).toBeNull();
    expect(mapLabel('Random Text')).toBeNull();
    expect(mapLabel('')).toBeNull();
  });

  it('should handle case variations and synonyms', () => {
    expect(mapLabel('TOTAL REVENUE')).toEqual({ type: 'kpi', key: 'revenue_total' });
    expect(mapLabel('total revenue')).toEqual({ type: 'kpi', key: 'revenue_total' });
    expect(mapLabel('Payroll')).toEqual({ type: 'expense', key: 'salaries_wages' });
    expect(mapLabel('Wages')).toEqual({ type: 'expense', key: 'salaries_wages' });
    expect(mapLabel('Employee Costs')).toEqual({ type: 'expense', key: 'salaries_wages' });
  });
});

describe('parseMonetaryValue', () => {
  it('should parse numeric values correctly', () => {
    expect(parseMonetaryValue(1000)).toBe(1000);
    expect(parseMonetaryValue(1000.50)).toBe(1000.50);
    expect(parseMonetaryValue(0)).toBe(0);
    expect(parseMonetaryValue(-500)).toBe(-500);
  });

  it('should parse string currency values correctly', () => {
    expect(parseMonetaryValue('$1,000')).toBe(1000);
    expect(parseMonetaryValue('$1,000.50')).toBe(1000.50);
    expect(parseMonetaryValue('1000')).toBe(1000);
    expect(parseMonetaryValue('1,000.00')).toBe(1000);
  });

  it('should handle negative values with parentheses', () => {
    expect(parseMonetaryValue('($1,000)')).toBe(-1000);
    expect(parseMonetaryValue('(500.50)')).toBe(-500.50);
  });

  it('should handle edge cases', () => {
    expect(parseMonetaryValue('')).toBe(0);
    expect(parseMonetaryValue('invalid')).toBe(0);
    expect(parseMonetaryValue('$')).toBe(0);
    expect(parseMonetaryValue(null as any)).toBe(0);
    expect(parseMonetaryValue(undefined as any)).toBe(0);
  });

  it('should remove whitespace and currency symbols', () => {
    expect(parseMonetaryValue(' $1,000 ')).toBe(1000);
    expect(parseMonetaryValue('$ 1,000.50')).toBe(1000.50);
    expect(parseMonetaryValue('1 000')).toBe(1000);
  });
});

describe('calculateKPIs', () => {
  it('should calculate KPIs correctly with valid metrics', () => {
    const metrics = [
      { metric_key: 'revenue_total', value: 100000 },
      { metric_key: 'cogs_total', value: 40000 },
      { metric_key: 'opex_total', value: 30000 },
    ];

    const kpis = calculateKPIs(metrics);

    expect(kpis.revenue_total).toBe(100000);
    expect(kpis.cogs_total).toBe(40000);
    expect(kpis.opex_total).toBe(30000);
    expect(kpis.gross_profit).toBe(60000); // 100000 - 40000
    expect(kpis.net_income).toBe(30000); // 60000 - 30000
    expect(kpis.gross_margin_percent).toBe(60); // (60000 / 100000) * 100
    expect(kpis.net_margin_percent).toBe(30); // (30000 / 100000) * 100
  });

  it('should handle multiple metrics of the same type', () => {
    const metrics = [
      { metric_key: 'revenue_total', value: 50000 },
      { metric_key: 'revenue_total', value: 30000 },
      { metric_key: 'cogs_total', value: 20000 },
      { metric_key: 'opex_total', value: 15000 },
    ];

    const kpis = calculateKPIs(metrics);

    expect(kpis.revenue_total).toBe(80000); // 50000 + 30000
    expect(kpis.cogs_total).toBe(20000);
    expect(kpis.opex_total).toBe(15000);
    expect(kpis.gross_profit).toBe(60000); // 80000 - 20000
    expect(kpis.net_income).toBe(45000); // 60000 - 15000
  });

  it('should handle zero revenue correctly', () => {
    const metrics = [
      { metric_key: 'revenue_total', value: 0 },
      { metric_key: 'cogs_total', value: 1000 },
      { metric_key: 'opex_total', value: 500 },
    ];

    const kpis = calculateKPIs(metrics);

    expect(kpis.revenue_total).toBe(0);
    expect(kpis.gross_profit).toBe(-1000); // 0 - 1000
    expect(kpis.net_income).toBe(-1500); // -1000 - 500
    expect(kpis.gross_margin_percent).toBe(0); // Division by zero protection
    expect(kpis.net_margin_percent).toBe(0); // Division by zero protection
  });

  it('should handle empty metrics array', () => {
    const metrics: Array<{ metric_key: string; value: number }> = [];

    const kpis = calculateKPIs(metrics);

    expect(kpis.revenue_total).toBe(0);
    expect(kpis.cogs_total).toBe(0);
    expect(kpis.opex_total).toBe(0);
    expect(kpis.gross_profit).toBe(0);
    expect(kpis.net_income).toBe(0);
    expect(kpis.gross_margin_percent).toBe(0);
    expect(kpis.net_margin_percent).toBe(0);
  });

  it('should handle missing metric types', () => {
    const metrics = [
      { metric_key: 'revenue_total', value: 100000 },
      // Missing COGS and OpEx
    ];

    const kpis = calculateKPIs(metrics);

    expect(kpis.revenue_total).toBe(100000);
    expect(kpis.cogs_total).toBe(0);
    expect(kpis.opex_total).toBe(0);
    expect(kpis.gross_profit).toBe(100000); // 100000 - 0
    expect(kpis.net_income).toBe(100000); // 100000 - 0
    expect(kpis.gross_margin_percent).toBe(100); // (100000 / 100000) * 100
    expect(kpis.net_margin_percent).toBe(100); // (100000 / 100000) * 100
  });

  it('should round percentages to 2 decimal places', () => {
    const metrics = [
      { metric_key: 'revenue_total', value: 333 },
      { metric_key: 'cogs_total', value: 111 },
      { metric_key: 'opex_total', value: 111 },
    ];

    const kpis = calculateKPIs(metrics);

    expect(kpis.gross_profit).toBe(222); // 333 - 111
    expect(kpis.net_income).toBe(111); // 222 - 111
    expect(kpis.gross_margin_percent).toBe(66.67); // (222 / 333) * 100, rounded
    expect(kpis.net_margin_percent).toBe(33.33); // (111 / 333) * 100, rounded
  });
});
