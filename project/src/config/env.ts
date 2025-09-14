// This file provides type-safe access to environment variables

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
}

// Get environment variables with runtime validation
function getEnv(): EnvConfig {
  const env = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  };

  // Validate required environment variables in production
  if (import.meta.env.PROD) {
    const missingVars = Object.entries(env)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  return env as EnvConfig;
}

export const env = getEnv();
