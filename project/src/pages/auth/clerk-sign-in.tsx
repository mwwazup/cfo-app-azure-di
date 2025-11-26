import { SignIn } from '@clerk/clerk-react';
import Navbar from '../../components/navigation/navbar';

export default function ClerkSignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-wide text-[#d5b274]">Welcome back</p>
            <h1 className="text-3xl font-semibold text-foreground">Sign in or create your account</h1>
            <p className="text-sm text-muted">
              Access your WaveRider dashboard with your registered account credentials. If you don&apos;t
              have an account yet, you can create one here.
            </p>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-in"
              fallbackRedirectUrl="/dashboard"
              afterSignUpUrl="/onboarding"
              appearance={{
                elements: {
                  rootBox: 'w-full text-foreground',
                  card: 'bg-transparent shadow-none border-0 p-0',
                  header: 'hidden',
                  footer: 'bg-transparent border-0 shadow-none mt-4',
                  formFieldLabel: 'text-foreground text-sm font-medium',
                  formFieldInput:
                    'bg-input text-foreground border border-border rounded-md focus:ring-2 focus:ring-accent focus:border-accent',
                  formButtonPrimary:
                    'bg-accent text-background hover:bg-accent/90 rounded-md text-sm font-semibold w-full',
                  socialButtonsBlockButton:
                    'bg-background text-foreground border border-border hover:bg-muted/50 rounded-md',
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
