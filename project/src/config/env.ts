// This file provides type-safe access to environment variables

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  backendUrl: string;
  // Zep Cloud Configuration (optional)
  zepApiKey?: string;
  // AI Provider Configuration (optional)
  anthropicApiKey?: string;
  openaiApiKey?: string;
  defaultAiProvider?: string;
}

// Get environment variables with runtime validation
function getEnv(): EnvConfig {
  const env = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    // Optional Zep Cloud configuration
    zepApiKey: import.meta.env.VITE_ZEP_API_KEY,
    // Optional AI configuration
    anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
    defaultAiProvider: import.meta.env.VITE_DEFAULT_AI_PROVIDER || 'claude',
  };

  // Validate only required environment variables in production (Supabase only)
  if (import.meta.env.PROD) {
    const requiredVars = ['supabaseUrl', 'supabaseAnonKey'];
    const missingVars = requiredVars.filter(key => !env[key as keyof EnvConfig]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  return env as EnvConfig;
}

export const env = getEnv();
