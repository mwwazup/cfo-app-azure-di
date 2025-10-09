// src/contexts/auth-context.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';

type AuthCtx = {
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkUserId: string | null;
  email: string | null;
  dbUserId: string | null; // Clerk user ID (backend accepts this directly)
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

  const clerkUserId = user?.id ?? null;
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  // Note: We now use clerkUserId directly as dbUserId since backend accepts Clerk user IDs

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: Boolean(isLoaded && isSignedIn),
      clerkUserId,
      email,
      dbUserId: clerkUserId, // Use Clerk user ID directly since backend accepts it
    }),
    [isLoaded, isSignedIn, clerkUserId, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);