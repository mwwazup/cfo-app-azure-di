import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/auth-context';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  BookOpen,
  Menu,
  X,
  BarChart3,
  Target,
  Users,
  Brain,
  TrendingDown,
} from 'lucide-react';
import { useState } from 'react';
import { ZepChatBubble } from '../ZepChatBubble';
import { Button } from '../ui/button';

export function DashboardLayout() {
  const { isLoaded, isSignedIn, email } = useAuthContext();
  const { user } = useUser();
  const clerk = useClerk();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  const displayName = user?.firstName ?? user?.fullName ?? email ?? 'there';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Master Revenue', href: '/revenue/master', icon: TrendingUp },
    { name: 'Budget vs Actual', href: '/budget-vs-actual', icon: Target },
    { name: 'Service Mix', href: '/service-mix', icon: BarChart3 },
    { name: 'Business Intelligence', href: '/business-intelligence', icon: Brain },
    { name: 'Employee LER', href: '/employee-ler', icon: Users },
    { name: 'Bonus ROI', href: '/bonus-roi', icon: TrendingDown },
    // { name: 'CFO Playground', href: '/revenue/playground', icon: PlayCircle }, // Hidden - not in use
    { name: 'Financial Statements', href: '/financial-statements', icon: FileText },
    { name: 'Profit Impact', href: '/coach/profit-impact', icon: BookOpen },
    { name: 'Lighthouse', href: '/coach/your-big-fig', icon: BookOpen },
    { name: 'Momentum Tracker', href: '/momentum', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-card transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-foreground" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center justify-center px-4">
              <img 
                src="/wave-rider-logo.png" 
                alt="Wave Rider Logo" 
                className="h-14 w-auto"
              />
            </div>
            <nav className="mt-8 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent text-background'
                        : 'text-foreground hover:bg-border'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 px-4">
              <Link
                to="/pricing"
                className="flex items-center justify-center rounded-lg border border-dashed border-[#d5b274]/50 bg-[#d5b274]/10 px-3 py-2 text-sm font-semibold text-[#d5b274] transition hover:border-[#d5b274]"
              >
                Start Your Free Trial
              </Link>
              <p className="mt-1 text-xs text-gray-400">
                14-day trial · no credit card required
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-border bg-card">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-center flex-shrink-0 px-4">
              <img 
                src="/wave-rider-logo.png" 
                alt="Wave Rider Logo" 
                className="h-20 w-auto"
              />
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent text-background'
                        : 'text-foreground hover:bg-border'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 px-4">
              <Link
                to="/pricing"
                className="flex items-center justify-center rounded-lg border border-dashed border-[#d5b274]/50 bg-[#d5b274]/10 px-3 py-2 text-sm font-semibold text-[#d5b274] transition hover:border-[#d5b274]"
              >
                Start Your Free Trial
              </Link>
              <p className="mt-1 text-xs text-gray-400">
                14-day trial · no credit card required
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0 border-t border-border p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted">Welcome!</p>
              <Link
                to="/account"
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-border transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-medium text-foreground">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={displayName ?? 'User avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (displayName?.[0] ?? '?').toUpperCase()
                  )}
                </div>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs px-2 py-1 w-full justify-center"
                onClick={() => clerk.signOut({ redirectUrl: '/' })}
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-background">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-lg text-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto">
            <div className="py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Global AI Chat - Floating Bubble on all pages */}
      <ZepChatBubble />
    </div>
  );
}