import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const SIGN_IN_URL = import.meta.env.VITE_CLERK_SIGN_IN_URL ?? '/sign-in';
const SIGN_UP_URL = import.meta.env.VITE_CLERK_SIGN_UP_URL ?? '/sign-up';
const AFTER_SIGN_IN_URL = import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL ?? '/dashboard';
const AFTER_SIGN_UP_URL = import.meta.env.VITE_CLERK_AFTER_SIGN_UP_URL ?? '/onboarding';

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl={SIGN_IN_URL}
      signUpUrl={SIGN_UP_URL}
      signInFallbackRedirectUrl={AFTER_SIGN_IN_URL}
      afterSignUpUrl={AFTER_SIGN_UP_URL}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>
);
