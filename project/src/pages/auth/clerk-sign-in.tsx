import { SignIn } from '@clerk/clerk-react';

export default function ClerkSignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-16">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-800 bg-gray-950/80 p-8 shadow-xl backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-[#d5b274]">Welcome back</p>
          <h1 className="text-3xl font-semibold text-white">Sign in or create your account</h1>
          <p className="text-sm text-gray-400">
            Access your WaveRider CFO dashboard with your Clerk account. If you don&apos;t
            have an account yet, you can create one from here.
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-in"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/onboarding"
          />
        </div>
      </div>
    </div>
  );
}
