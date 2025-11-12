/**
 * Conditional logger for frontend
 * Only logs in development mode to avoid exposing debug info in production
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const logger = {
  /**
   * Debug-level logs (only in development)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info-level logs (only in development)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning logs (always logged)
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Error logs (always logged)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Group logs (only in development)
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End group (only in development)
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Table logs (only in development)
   */
  table: (data: any) => {
    if (isDev) {
      console.table(data);
    }
  },
};

// Export environment check utilities
export const env = {
  isDev,
  isProduction,
  mode: import.meta.env.MODE,
};
