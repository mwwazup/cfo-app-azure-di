import { CalculationResult } from '../components/scenario/scenario-calculator';

export interface RevenueScenario {
  id: string;
  user_id: string;
  base_report_id: string;
  question_text?: string;
  delta_payload?: Record<string, any>; // JSONB data
  generated_answer?: string;
  created_at: string;
}

export interface CreateRevenueScenarioData {
  base_report_id: string;
  question_text?: string;
  delta_payload?: Record<string, any>;
  generated_answer?: string;
}

export interface RevenueCurveReport {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  january?: number;
  february?: number;
  march?: number;
  april?: number;
  may?: number;
  june?: number;
  july?: number;
  august?: number;
  september?: number;
  october?: number;
  november?: number;
  december?: number;
  total_revenue?: number;
  desired_revenue?: number;
  profit_margin?: number;
  gap_amount?: number;
  created_at?: string;
  report_month?: string;
  version: number;
}

// Helper function to convert CalculationResult to delta_payload
export function calculationResultToDeltaPayload(
  scenarioType: string,
  inputs: Record<string, any>,
  result: CalculationResult
): Record<string, any> {
  return {
    scenario_type: scenarioType,
    inputs,
    monthly_impact: result.monthlyImpact,
    annual_impact: result.annualImpact,
    profit_change: result.profitChange,
    old_revenue: result.oldRevenue,
    new_revenue: result.newRevenue,
    break_even_months: result.breakEvenMonths,
    roi: result.roi,
    details: result.details,
    monthly_breakdown: result.monthlyBreakdown,
    timestamp: new Date().toISOString()
  };
}