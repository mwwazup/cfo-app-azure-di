import { useAuth } from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

/**
 * Creates a Supabase client that automatically forwards the active Clerk session token
 * with every request. This allows Supabase Row Level Security policies that rely on
 * `auth.uid()` to work when Clerk is the primary auth provider.
 */
export function useClerkSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    return createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers ?? {});

            try {
              // Prefer a dedicated Clerk JWT template named "supabase" if it exists.
              const token = (await getToken({ template: 'supabase' })) ?? (await getToken());
              if (token) {
                headers.set('Authorization', `Bearer ${token}`);
              }
            } catch (error) {
              console.warn('Unable to fetch Clerk session token for Supabase request:', error);
            }

            return fetch(input, {
              ...init,
              headers,
            });
          },
        },
      }
    );
  }, [getToken]);

  return supabase;
}
