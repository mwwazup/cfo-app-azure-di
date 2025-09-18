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
    // Set a timeout to ensure loading state doesn't persist indefinitely
    const timeoutId = setTimeout(() => {
      console.log('Auth timeout reached, setting loading to false');
      setIsLoading(false);
    }, 5000); // 5 second timeout

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state change:', _event, !!session);
        clearTimeout(timeoutId); // Clear timeout since we got a response
        
        if (session?.user) {
          console.log('Setting user from session');
          // Set user immediately without waiting for profile fetch
          const newUser = {
            id: session.user.id,
            email: session.user.email || '',
            first_name: session.user.user_metadata?.first_name,
            last_name: session.user.user_metadata?.last_name
          };
          console.log('About to set user:', newUser);
          setUser(newUser);
          
          // Fetch profile in background (don't await)
          fetchUserProfile(session.user.id).then(userData => {
            if (userData) {
              setUser(prev => prev ? {
                ...prev,
                first_name: userData.first_name || prev.first_name,
                last_name: userData.last_name || prev.last_name
              } : null);
            }
          });
        } else {
          console.log('No session user, clearing user state');
          setUser(null);
        }
        console.log('Setting isLoading to false from auth state change');
        setIsLoading(false);
      }
    );

    // Check current session
    const checkSession = async () => {
      try {
        console.log('Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session check result:', { session: !!session, error });
        
        if (error) {
          console.error('Session check error:', error);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('User found in session, setting user immediately');
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            first_name: session.user.user_metadata?.first_name,
            last_name: session.user.user_metadata?.last_name
          });
        } else {
          console.log('No user in session');
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };

    checkSession();
    return () => {
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      
      console.log('Profile fetch result:', { data, error });
      if (error) {
        console.warn('Profile fetch error (this is OK):', error);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('Error fetching user profile (this is OK):', error);
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

      if (error) {
        console.error('Login error:', error);
        return false;
      }
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