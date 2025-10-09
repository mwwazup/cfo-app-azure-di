// src/contexts/auth-context.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';

type AuthCtx = {
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkUserId: string | null;
  email: string | null;
  dbUserId: string | null; // UUID from public.profiles.id
};

const AuthContext = createContext<AuthCtx>({
  isLoaded: false,
  isSignedIn: false,
  clerkUserId: null,
  email: null,
  dbUserId: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const clerkUserId = user?.id ?? null;
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  // On sign-in, call your server to link Clerk -> Supabase (ensures profile exists) and get the UUID
  useEffect(() => {
    const link = async () => {
      try {
        if (!isLoaded || !isSignedIn || !clerkUserId || !email) {
          setDbUserId(null);
          return;
        }

        const firstName = user?.firstName ?? null;
        const lastName = user?.lastName ?? null;

        const resp = await fetch('http://localhost:5180/api/auth/supabase-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkUserId,
            email,
            firstName,
            lastName,
          }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          console.error('supabase-link failed:', resp.status, txt);
          setDbUserId(null);
          return;
        }

        const json = await resp.json();
        setDbUserId(json.supabaseUserId ?? null);
      } catch (e) {
        console.error('supabase-link error', e);
        setDbUserId(null);
      }
    };

    link();
  }, [isLoaded, isSignedIn, clerkUserId, email, user?.firstName, user?.lastName]);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: Boolean(isLoaded && isSignedIn),
      clerkUserId,
      email,
      dbUserId,
    }),
    [isLoaded, isSignedIn, clerkUserId, email, dbUserId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);