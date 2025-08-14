import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Client-side hook that guarantees a profile row exists for the current user.
 * 1. Tries to fetch the row.
 * 2. If it doesn't exist, calls the `create_profile_for_user` RPC to insert one.
 * Returns the profile and a loading flag.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Get current auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Attempt to fetch existing profile
      let { data: existing, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id) // `id` is uuid PK after schema fix
        .maybeSingle();

      if (error || !existing) {
        // Create profile via RPC as a safety net
        const { data: newProfile, error: rpcError } = await supabase.rpc(
          'create_profile_for_user',
          {
            input_user_id: user.id,
            input_email: user.email,
            input_first_name: user.user_metadata?.first_name ?? null,
            input_last_name: user.user_metadata?.last_name ?? null
          }
        );
        if (rpcError) {
          console.error('create_profile_for_user RPC failed:', rpcError);
        }
        existing = newProfile ?? null;
      }

      setProfile(existing);
      setLoading(false);
    })();
  }, []);

  return { profile, loading } as const;
}
