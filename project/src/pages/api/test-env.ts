import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In Vite, environment variables are exposed through import.meta.env
    const env = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
    };

    console.log('Environment variables received:', {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ? 'Set' : 'Not set',
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY ? 'Set' : 'Not set',
    });

    // Check if required environment variables are set
    const envVars = {
      VITE_SUPABASE_URL: !!env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!env.VITE_SUPABASE_ANON_KEY,
      VITE_GEMINI_API_KEY: !!env.VITE_GEMINI_API_KEY,
    };

    const allVarsSet = Object.values(envVars).every(Boolean);

    return NextResponse.json({
      success: true,
      message: allVarsSet ? 'All required environment variables are set' : 'Some environment variables are missing',
      envVars: {
        ...envVars,
        // Show first few characters of each value for verification (except for keys)
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ? '***' + env.VITE_SUPABASE_URL.slice(-4) : null,
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ? '***' + env.VITE_SUPABASE_ANON_KEY.slice(-4) : null,
        VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY ? '***' + env.VITE_GEMINI_API_KEY.slice(-4) : null,
      },
    });
  } catch (error) {
    console.error('Error in test-env endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
