import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for backend operations only
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Confirm user email using Supabase admin client
 * This should only be called from backend code, never frontend
 */
export async function confirmUserEmail(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { 
      email_confirm: true 
    });
    
    if (error) {
      console.error('Failed to confirm user email:', error.message);
      return false;
    }
    
    console.log('User email confirmed successfully:', userId);
    return true;
  } catch (err) {
    console.error('Error confirming user email:', err);
    return false;
  }
}
