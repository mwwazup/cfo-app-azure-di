import { createClient } from '@supabase/supabase-js';

// Admin client with Service Role key for server-side operations
// This bypasses RLS and has full admin privileges
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export { supabaseAdmin };
