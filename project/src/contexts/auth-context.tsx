import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

interface User {
  id: string;
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
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const userData = await fetchUserProfile(session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            first_name: userData?.first_name || session.user.user_metadata?.first_name,
            last_name: userData?.last_name || session.user.user_metadata?.last_name
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check current session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userData = await fetchUserProfile(session.user.id);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            first_name: userData?.first_name || session.user.user_metadata?.first_name,
            last_name: userData?.last_name || session.user.user_metadata?.last_name
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) return false;

      // Fetch additional user data if needed
      const userData = await fetchUserProfile(data.user.id);
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        first_name: userData?.first_name || data.user.user_metadata?.first_name,
        last_name: userData?.last_name || data.user.user_metadata?.last_name
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
          },
        },
      });

      if (error) throw error;
      if (!data.user) return false;

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Auto-login after signup
      return await login(userData.email, userData.password);
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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