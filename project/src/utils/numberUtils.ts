/**
 * Utility functions for handling financial numbers and avoiding floating-point precision issues
 */

/**
 * Round a number to 2 decimal places to avoid floating-point precision issues
 * Example: 25295.979999999996 → 25295.98
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Round all numeric values in a financial metrics object
 */
export function roundFinancialMetrics(metrics: Record<string, any>): Record<string, any> {
  const rounded: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      rounded[key] = roundToTwoDecimals(value);
    } else {
      rounded[key] = value;
    }
  }
  
  return rounded;
}

/**
 * Format currency for display with proper rounding
 */
export function formatCurrency(value: number): string {
  const rounded = roundToTwoDecimals(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Parse currency string and return rounded number
 */
export function parseCurrency(value: string): number {
  const parsed = parseFloat(value.replace(/[$,]/g, '')) || 0;
  return roundToTwoDecimals(parsed);
}
