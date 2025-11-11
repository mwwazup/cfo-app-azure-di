/**
 * Frontend validation schemas using Zod
 * Mirrors backend Pydantic validation for consistent validation across stack
 */
import { z } from 'zod';

// ============================================================================
// Revenue Entry Schemas
// ============================================================================

export const revenueEntrySchema = z.object({
  userId: z.string()
    .min(1, 'User ID is required')
    .refine(
      (val) => val.replace('-', '').length === 32,
      'User ID must be a valid UUID'
    ),
  year: z.number()
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier')
    .refine(
      (val) => val <= new Date().getFullYear() + 10,
      'Year cannot be more than 10 years in the future'
    ),
  month: z.number()
    .int('Month must be an integer')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
  actualRevenue: z.number()
    .nonnegative('Actual revenue must be non-negative')
    .optional(),
  desiredRevenue: z.number()
    .nonnegative('Desired revenue must be non-negative')
    .optional(),
  targetRevenue: z.number()
    .nonnegative('Target revenue must be non-negative')
    .optional(),
  profitMargin: z.number()
    .min(0, 'Profit margin must be between 0 and 100')
    .max(100, 'Profit margin must be between 0 and 100')
    .optional(),
  ownerDraws: z.number()
    .nonnegative('Owner draws must be non-negative')
    .optional(),
  isLocked: z.boolean().optional(),
  notes: z.string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional(),
});

export type RevenueEntry = z.infer<typeof revenueEntrySchema>;

// Partial schema for updates (all fields optional except userId)
export const revenueEntryUpdateSchema = revenueEntrySchema.partial().required({ userId: true });

// ============================================================================
// KPI Record Schemas
// ============================================================================

export const kpiRecordDataSchema = z.object({
  period: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Period must be in YYYY-MM-DD format')
    .refine(
      (val) => {
        try {
          const date = new Date(val);
          return !isNaN(date.getTime());
        } catch {
          return false;
        }
      },
      'Period must be a valid date'
    ),
  kpi_name: z.string()
    .min(1, 'KPI name is required')
    .max(200, 'KPI name must be 200 characters or less'),
  kpi_category: z.enum(['revenue', 'profitability', 'growth', 'efficiency', 'liquidity'], {
    message: 'KPI category must be one of: revenue, profitability, growth, efficiency, liquidity'
  }),
  kpi_value: z.number(),
  goal_value: z.number(),
  status: z.enum(['good', 'warning', 'alert']),
  trend_vs_last_month: z.number().optional(),
  action_suggestion: z.string()
    .max(500, 'Action suggestion must be 500 characters or less')
    .optional(),
  display_format: z.string()
    .max(50, 'Display format must be 50 characters or less')
    .optional(),
  plain_explanation: z.string()
    .max(1000, 'Plain explanation must be 1000 characters or less')
    .optional(),
});

export type KPIRecordData = z.infer<typeof kpiRecordDataSchema>;

export const upsertKPIRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  kpiData: kpiRecordDataSchema,
});

export type UpsertKPIRequest = z.infer<typeof upsertKPIRequestSchema>;

// ============================================================================
// Financial Document Schemas
// ============================================================================

export const financialDocumentCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  document_type: z.enum(['profit_loss', 'balance_sheet', 'cash_flow', 'other'], {
    message: 'Document type must be one of: profit_loss, balance_sheet, cash_flow, other'
  }),
  period_start: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Period start must be in YYYY-MM-DD format' })
    .optional(),
  period_end: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Period end must be in YYYY-MM-DD format' })
    .optional(),
  filename: z.string()
    .max(500, 'Filename must be 500 characters or less')
    .optional(),
  file_path: z.string()
    .max(1000, 'File path must be 1000 characters or less')
    .optional(),
  raw_json: z.record(z.string(), z.any()).optional(),
  summary_metrics: z.record(z.string(), z.any()).optional(),
});

export type FinancialDocumentCreate = z.infer<typeof financialDocumentCreateSchema>;

export const financialDocumentUpdateSchema = z.object({
  document_type: z.enum(['profit_loss', 'balance_sheet', 'cash_flow', 'other']).optional(),
  period_start: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Period start must be in YYYY-MM-DD format' })
    .optional(),
  period_end: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Period end must be in YYYY-MM-DD format' })
    .optional(),
  filename: z.string()
    .max(500, 'Filename must be 500 characters or less')
    .optional(),
  raw_json: z.record(z.string(), z.any()).optional(),
  summary_metrics: z.record(z.string(), z.any()).optional(),
});

export type FinancialDocumentUpdate = z.infer<typeof financialDocumentUpdateSchema>;

// ============================================================================
// AI Chat Schemas
// ============================================================================

export const aiCoachRequestSchema = z.object({
  userMessage: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be 5000 characters or less'),
  userId: z.string().min(1, 'User ID is required'),
  provider: z.enum(['claude', 'openai'], {
    message: 'Provider must be either "claude" or "openai"'
  }).optional().default('claude'),
  max_tokens: z.number()
    .int('Max tokens must be an integer')
    .min(1, 'Max tokens must be at least 1')
    .max(4096, 'Max tokens must be 4096 or less')
    .optional()
    .default(1024),
  temperature: z.number()
    .min(0, 'Temperature must be between 0 and 2')
    .max(2, 'Temperature must be between 0 and 2')
    .optional()
    .default(0.7),
});

export type AICoachRequest = z.infer<typeof aiCoachRequestSchema>;

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const userIdQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const yearQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  year: z.number()
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier'),
});

export const revenueQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  year: z.number()
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier'),
  month: z.number()
    .int('Month must be an integer')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12')
    .optional(),
});

export const kpiQuerySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  period: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Period must be in YYYY-MM-DD format')
    .optional(),
});

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates data against a schema and returns typed result
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data or throws ZodError
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validates data and returns result with success flag
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Object with success flag and data or error
 */
export function safeValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Formats Zod validation errors into user-friendly messages
 * @param error Zod error object
 * @returns Array of error messages
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((err) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

/**
 * Formats Zod validation errors into field-specific error object
 * @param error Zod error object
 * @returns Object mapping field paths to error messages
 */
export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.issues.forEach((err) => {
    const path = err.path.join('.');
    fieldErrors[path] = err.message;
  });
  return fieldErrors;
}

// ============================================================================
// Re-export Zod for convenience
// ============================================================================

export { z } from 'zod';
