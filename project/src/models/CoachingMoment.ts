import { CalculationResult } from '../components/scenario/scenario-calculator';

export interface CoachingMoment {
  id: string;
  user_id: string;
  question: string;
  response: string;
  impact?: CalculationResult;
  date: string; // ISO string from database
  title: string;
  scenario_type?: string;
  response_type: 'quick_ridr' | 'detailed_calculation';
  ridr_response?: {
    results: string;
    insight: string;
    direction: string;
    repeat: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateCoachingMomentData {
  question: string;
  response: string;
  impact?: CalculationResult;
  title: string;
  scenario_type?: string;
  response_type: 'quick_ridr' | 'detailed_calculation';
  ridr_response?: {
    results: string;
    insight: string;
    direction: string;
    repeat: string;
  };
}