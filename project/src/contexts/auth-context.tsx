import React, { createContext, useContext, useState, useEffect } from 'react';

import { supabase } from '../config/supabaseClient';

// Fetch the user's profile (first and last name) from Supabase `profiles` table
async function fetchUserProfile(userId: string): Promise<{ first_name: string; last_name: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user profile', error.message);
  }

  // data may be null when no row exists yet
  return { first_name: data?.first_name ?? '', last_name: data?.last_name ?? '' };
}

// Ensure a profile row exists; create if missing
async function ensureProfile(userId: string, first_name: string, last_name: string) {
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: userId, first_name: first_name, last_name: last_name }, { onConflict: 'id', ignoreDuplicates: true });
  if (upsertError) {
    console.error('Failed to upsert profile:', upsertError.message);
  }
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

interface SignupData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { first_name, last_name } = await fetchUserProfile(session.user.id);
        const currentUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          first_name,
          last_name
        };
        setUser(currentUser);
        localStorage.setItem('bigfigcfo-user', JSON.stringify(currentUser));
      }
      setIsLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id).then(({ first_name, last_name }) => {
          const currentUser = {
            id: session.user.id,
            email: session.user.email ?? '',
            first_name,
            last_name
          };
          setUser(currentUser);
          localStorage.setItem('bigfigcfo-user', JSON.stringify(currentUser));
        });
      } else {
        setUser(null);
        localStorage.removeItem('bigfigcfo-user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session?.user) {
      console.error('Login failed:', error?.message);
      setIsLoading(false);
      return false;
    }

    const { first_name, last_name } = await fetchUserProfile(data.session.user.id);
    await ensureProfile(data.session.user.id, first_name, last_name);
    const loggedInUser: User = {
      id: data.session.user.id,
      email: data.session.user.email ?? email,
      first_name,
      last_name
    };
    setUser(loggedInUser);
    localStorage.setItem('bigfigcfo-user', JSON.stringify(loggedInUser));
    setIsLoading(false);
    return true;
  };

  const signup = async (userData: SignupData): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name
          }
        }
      });

      if (error) throw error;
      
      if (data?.user) {
        // Workaround for Supabase v2 GA bug: manually confirm user email
        // This bypasses the email confirmation requirement
        try {
          // Call backend endpoint to confirm user email
          const response = await fetch('http://localhost:5175/api/confirmUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: data.user.id }),
          });
          
          const result = await response.json();
          if (!result.success) {
            console.warn('Failed to auto-confirm user email via backend');
          }
        } catch (adminError) {
          console.warn('Failed to auto-confirm user email:', adminError);
          // Continue with signup even if confirmation fails
        }
        
        // Profile creation is handled by database trigger
        const newUser: User = {
          id: data.user.id,
          email: data.user.email ?? userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name
        };
        setUser(newUser);
        localStorage.setItem('bigfigcfo-user', JSON.stringify(newUser));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Signup Error:', err);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('bigfigcfo-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}