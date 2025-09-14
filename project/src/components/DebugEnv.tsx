import { useEffect } from 'react';

export function DebugEnv() {
  useEffect(() => {
    console.log('Environment Variables:', {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' : 'Not set',
      NODE_ENV: import.meta.env.MODE,
      BASE_URL: import.meta.env.BASE_URL,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
    });
  }, []);

  return null; // This component doesn't render anything
}

export default DebugEnv;
