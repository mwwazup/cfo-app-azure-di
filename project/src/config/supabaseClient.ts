import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Disable automatic session refresh on window focus to prevent unnecessary re-renders
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-application-name': 'BigFigCFO'
      }
    }
  }
);

export const TABLES = {
  REVENUE_DATA: 'revenue_data',
  REVENUE_ENTRIES: 'revenue_entries',
  REVENUE_SCENARIOS: 'revenue_scenarios',
  MOMENTUM_ENTRIES: 'momentum_entries',
  COACHING_MOMENTS: 'coaching_moments',
  FINANCIAL_STATEMENTS: 'financial_documents',
  PROFILES: 'profiles'
};

export const STORAGE_BUCKETS = {
  FINANCIAL_STATEMENTS: 'financial-statements'
};
