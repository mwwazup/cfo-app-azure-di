/**
 * Pay Period Generator Utility
 * Automatically generates pay periods based on company pay schedule
 */

export type PaySchedule = 
  | 'weekly'           // Every week (52 periods/year)
  | 'bi-weekly'        // Every 2 weeks (26 periods/year)
  | 'semi-monthly'     // Twice a month - 1st-15th, 16th-end (24 periods/year)
  | 'monthly'          // Once a month (12 periods/year)
  | 'custom';          // Custom / Manual (user creates their own periods)

export interface PayPeriodConfig {
  schedule: PaySchedule;
  weeklyDayOfWeek?: number;      // 0=Sunday, 1=Monday, ..., 5=Friday (for weekly/bi-weekly)
  semiMonthlyDates?: [number, number]; // e.g., [1, 15] for 1st and 15th
  startDate?: string;            // Reference start date for bi-weekly (YYYY-MM-DD)
}

export interface GeneratedPayPeriod {
  periodName: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

/**
 * Generate pay periods for a given year and month based on pay schedule
 */
export function generatePayPeriods(
  year: number,
  month: number,
  config: PayPeriodConfig
): GeneratedPayPeriod[] {
  switch (config.schedule) {
    case 'weekly':
      return generateWeeklyPayPeriods(year, month, config.weeklyDayOfWeek || 5);
    case 'bi-weekly':
      return generateBiWeeklyPayPeriods(year, month, config.weeklyDayOfWeek || 5, config.startDate);
    case 'semi-monthly':
      return generateSemiMonthlyPayPeriods(year, month, config.semiMonthlyDates || [1, 15]);
    case 'monthly':
      return generateMonthlyPayPeriods(year, month);
    default:
      return [];
  }
}

/**
 * Generate all pay periods for an entire year
 */
export function generateYearPayPeriods(
  year: number,
  config: PayPeriodConfig
): GeneratedPayPeriod[] {
  const periods: GeneratedPayPeriod[] = [];
  
  for (let month = 1; month <= 12; month++) {
    const monthPeriods = generatePayPeriods(year, month, config);
    periods.push(...monthPeriods);
  }
  
  return periods;
}

/**
 * Weekly pay periods (e.g., every Friday)
 */
function generateWeeklyPayPeriods(
  year: number,
  month: number,
  dayOfWeek: number
): GeneratedPayPeriod[] {
  const periods: GeneratedPayPeriod[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // Find first occurrence of the day in the month
  let current = new Date(firstDay);
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }
  
  // Generate periods for each week
  let weekNum = 1;
  while (current <= lastDay) {
    const endDate = new Date(current);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7-day period ending on payDay
    
    // Only include if end date is in the target month
    if (endDate.getMonth() === month - 1) {
      periods.push({
        periodName: `Week ${weekNum} (${formatShortDate(startDate)} - ${formatShortDate(endDate)})`,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });
      weekNum++;
    }
    
    current.setDate(current.getDate() + 7);
  }
  
  return periods;
}

/**
 * Bi-weekly pay periods (every 2 weeks)
 */
function generateBiWeeklyPayPeriods(
  year: number,
  month: number,
  dayOfWeek: number,
  referenceStartDate?: string
): GeneratedPayPeriod[] {
  const periods: GeneratedPayPeriod[] = [];
  
  // Use reference date or default to first occurrence in January of the year
  let referenceDate: Date;
  if (referenceStartDate) {
    referenceDate = new Date(referenceStartDate);
  } else {
    referenceDate = new Date(year, 0, 1);
    while (referenceDate.getDay() !== dayOfWeek) {
      referenceDate.setDate(referenceDate.getDate() + 1);
    }
  }
  
  // Find all bi-weekly periods that overlap with the target month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  
  let current = new Date(referenceDate);
  let periodNum = 1;
  
  // Move to first period that might overlap with target month
  while (current < monthStart) {
    current.setDate(current.getDate() + 14);
    periodNum++;
  }
  
  // Generate periods that overlap with the month
  while (current <= monthEnd) {
    const endDate = new Date(current);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 13); // 14-day period
    
    // Include if any part of the period is in the target month
    if (endDate >= monthStart && startDate <= monthEnd) {
      periods.push({
        periodName: `Pay Period ${periodNum} (${formatShortDate(startDate)} - ${formatShortDate(endDate)})`,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });
    }
    
    current.setDate(current.getDate() + 14);
    periodNum++;
  }
  
  return periods;
}

/**
 * Semi-monthly pay periods (1st-15th, 16th-end of month)
 */
function generateSemiMonthlyPayPeriods(
  year: number,
  month: number,
  dates: [number, number]
): GeneratedPayPeriod[] {
  const [firstDate, secondDate] = dates;
  const lastDay = new Date(year, month, 0).getDate();
  
  return [
    {
      periodName: `${getMonthName(month)} 1-15`,
      startDate: `${year}-${String(month).padStart(2, '0')}-${String(firstDate).padStart(2, '0')}`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(secondDate - 1).padStart(2, '0')}`
    },
    {
      periodName: `${getMonthName(month)} 16-${lastDay}`,
      startDate: `${year}-${String(month).padStart(2, '0')}-${String(secondDate).padStart(2, '0')}`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }
  ];
}

/**
 * Monthly pay periods (1st to last day of month)
 */
function generateMonthlyPayPeriods(
  year: number,
  month: number
): GeneratedPayPeriod[] {
  const lastDay = new Date(year, month, 0).getDate();
  
  return [
    {
      periodName: `${getMonthName(month)} ${year}`,
      startDate: `${year}-${String(month).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }
  ];
}

/**
 * Get default pay schedule configuration
 */
export function getDefaultPayConfig(): PayPeriodConfig {
  return {
    schedule: 'bi-weekly',
    weeklyDayOfWeek: 5, // Friday
    startDate: new Date().toISOString().split('T')[0]
  };
}

/**
 * Get human-readable description of pay schedule
 */
export function getPayScheduleDescription(config: PayPeriodConfig): string {
  switch (config.schedule) {
    case 'weekly':
      return `Weekly (every ${getDayName(config.weeklyDayOfWeek || 5)})`;
    case 'bi-weekly':
      return `Bi-weekly (every other ${getDayName(config.weeklyDayOfWeek || 5)})`;
    case 'semi-monthly':
      const date1 = config.semiMonthlyDates?.[0] || 1;
      const date2 = config.semiMonthlyDates?.[1] || 15;
      return `Semi-monthly (${getOrdinal(date1)} and ${getOrdinal(date2)})`;
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom / Manual';
    default:
      return 'Unknown';
  }
}

// Helper functions
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1];
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
