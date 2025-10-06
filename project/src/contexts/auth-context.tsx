import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';

interface User {
  id: string;
  supabaseId?: string | null;
  clerkId: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email?: string, password?: string) => Promise<boolean>;
  signup: (userData?: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [hasSyncedSupabaseId, setHasSyncedSupabaseId] = useState(false);

  const user = useMemo<User | null>(() => {
    if (!isSignedIn || !clerkUser || !hasSyncedSupabaseId) {
      return null;
    }

    const resolvedSupabaseId = supabaseUserId ?? null;
    const resolvedId = resolvedSupabaseId ?? clerkUser.id;

    return {
      id: resolvedId,
      supabaseId: resolvedSupabaseId,
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      first_name: clerkUser.firstName || undefined,
      last_name: clerkUser.lastName || undefined,
    };
  }, [isSignedIn, clerkUser, supabaseUserId, hasSyncedSupabaseId]);

  useEffect(() => {
    if (!isLoaded || !hasSyncedSupabaseId) {
      setIsLoading(true);
      return;
    }
    setIsLoading(false);
  }, [isLoaded, hasSyncedSupabaseId]);

  useEffect(() => {
    if (!isSignedIn || !clerkUser) {
      setSupabaseUserId(null);
      setHasSyncedSupabaseId(true);
      return;
    }

    let isActive = true;
    setHasSyncedSupabaseId(false);

    const syncSupabaseUser = async () => {
      try {
        const response = await fetch('/api/auth/supabase-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkUserId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to link Supabase user (status ${response.status})`);
        }

        const data: { supabaseUserId?: string } = await response.json();
        if (isActive) {
          setSupabaseUserId(data.supabaseUserId ?? null);
        }
      } catch (error) {
        console.error('Failed to sync Supabase user ID with Clerk account:', error);
        if (isActive) {
          setSupabaseUserId(null);
        }
      } finally {
        if (isActive) {
          setHasSyncedSupabaseId(true);
        }
      }
    };

    syncSupabaseUser();

    return () => {
      isActive = false;
    };
  }, [isSignedIn, clerkUser]);

  const login = async () => {
    setIsLoading(true);
    try {
      window.location.assign('/sign-in');
      return true;
    } catch (error) {
      console.error('Clerk login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async () => {
    setIsLoading(true);
    try {
      window.location.assign('/sign-in');
      return true;
    } catch (error) {
      console.error('Clerk signup error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Clerk logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}