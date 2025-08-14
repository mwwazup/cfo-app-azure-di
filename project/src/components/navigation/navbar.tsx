import React from 'react';

export default function Navbar() {
  return (
    <header className="bg-background shadow-md sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <a href="/" className="flex items-center gap-2">
          <img 
            src="/Master-Logo_white-on-white2.png" 
            alt="Big Fig CFO Logo" 
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold text-foreground">Wave Rider</span>
        </a>
        <nav className="hidden md:flex items-center gap-6">
          <a href="/" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Home</a>
          <a href="/features" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Features</a>
          <a href="/pricing" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Pricing</a>
          <a href="/about" className="text-sm font-medium text-muted hover:text-foreground transition-colors">About</a>
          <a href="/login" className="text-sm font-medium text-muted hover:text-foreground transition-colors">Log in</a>
          <a href="/signup" className="px-4 py-2 bg-accent text-background rounded-md text-sm font-medium hover:bg-accent/90 transition-colors">Sign up</a>
        </nav>
      </div>
    </header>
  );
}