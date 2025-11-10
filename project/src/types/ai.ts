/**
 * Type definitions for AI Coach service
 * Replaces 'any' types with proper TypeScript interfaces
 */

// ============================================================================
// Conversation Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  id?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  tags?: string[];
}

// ============================================================================
// Financial Context Types
// ============================================================================

export interface RevenueData {
  month: number;
  year: number;
  actual_revenue: number;
  desired_revenue: number;
  target_revenue?: number;
  profit_margin?: number;
  owner_distributions?: number;
}

export interface KPIData {
  kpi_name: string;
  period: string;
  actual_value: number;
  goal_value: number;
  trend_vs_last_month?: number;
  kpi_category?: string;
  action_suggestion?: string;
  plain_explanation?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  ytdRevenue: number;
  averageMonthlyRevenue: number;
  bestMonth?: {
    month: number;
    year: number;
    revenue: number;
  };
  worstMonth?: {
    month: number;
    year: number;
    revenue: number;
  };
  yearOverYearGrowth?: number;
}

export interface MonthlyBreakdown {
  month: number;
  year: number;
  revenue: number;
  target: number;
  variance: number;
  variancePercent: number;
}

export interface FinancialContext {
  // Revenue data
  revenue: RevenueData[];
  revenueYears: number[];
  totalRevenue: number;
  
  // KPI data
  kpis: KPIData[];
  
  // Summary statistics
  summary: FinancialSummary;
  
  // Monthly breakdown
  monthlyBreakdown: MonthlyBreakdown[];
  
  // Trends
  trends?: {
    revenueGrowth: number;
    profitMarginTrend: number;
    seasonalPatterns?: Record<number, number>; // month -> multiplier
  };
  
  // Current period focus
  currentPeriod?: {
    year: number;
    month: number;
    revenue: number;
    target: number;
    profitMargin: number;
  };
}

// ============================================================================
// AI Service Types
// ============================================================================

export type AIProvider = 'claude' | 'openai';

export interface AICoachRequest {
  userMessage: string;
  userId: string;
  financialContext?: FinancialContext;
  conversationHistory?: ConversationMessage[];
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
}

export interface AICoachResponse {
  response: string;
  provider: AIProvider;
  tokensUsed?: number;
  conversationId?: string;
}

export interface AIHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  providers: {
    claude: ProviderStatus;
    openai: ProviderStatus;
  };
  timestamp: string;
}

export interface ProviderStatus {
  failures: number;
  is_open: boolean;
  can_attempt: boolean;
  last_failure?: string;
}

// ============================================================================
// Coaching Moment Types
// ============================================================================

export interface CoachingMoment {
  id: string;
  userId: string;
  title: string;
  conversation_json: ConversationMessage[];
  scenario_type: 'general' | 'revenue_analysis' | 'goal_setting' | 'problem_solving';
  tags: string[];
  date: string;
  createdAt: Date;
  saved?: boolean;
}

export interface CoachingMomentCreate {
  title: string;
  conversation_json: ConversationMessage[];
  scenario_type: string;
  tags: string[];
  date: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface AIServiceError {
  code: string;
  message: string;
  provider?: AIProvider;
  retryable: boolean;
  timestamp: Date;
}

export type AIErrorType = 
  | 'authentication'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'invalid_request'
  | 'content_policy'
  | 'unknown';

// ============================================================================
// Prompt Building Types
// ============================================================================

export interface PromptContext {
  userMessage: string;
  financialData?: FinancialContext;
  conversationHistory?: ConversationMessage[];
  systemInstructions?: string;
  constraints?: string[];
}

export interface PromptTemplate {
  system: string;
  user: string;
  assistant?: string;
}
