import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

export default function Navbar() {
  return (
    <header className="bg-card shadow-md sticky top-0 z-50 border-b border-border">
      <div className="container px-4 md:px-6 max-w-7xl mx-auto flex justify-between items-center h-16">
        <a href="/" className="flex items-center">
          <img 
            src="/wave-rider-logo.png" 
            alt="Wave Rider Logo" 
            className="h-14 w-auto border-0 outline-none"
          />
        </a>
        <nav className="hidden md:flex items-center gap-6">
          <a href="/" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Home</a>
          <a href="/features" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Features</a>
          <a href="/pricing" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Pricing</a>
          <a href="/about" className="text-sm font-medium text-muted hover:text-foreground transition-colors">About</a>
          <SignedOut>
            <a
              href="/sign-in"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Log in
            </a>
            <a
              href="/sign-up"
              className="px-4 py-2 bg-accent text-background rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Sign up
            </a>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}

