import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/auth-context';
import { RevenueProvider } from './contexts/revenue-context';
import { CashflowSyncProvider } from './contexts/cashflow-sync-context';
import { KPIRefreshProvider } from './components/kpi/KPIRefreshProvider';
import { SupabaseSessionBridge } from './components/auth/SupabaseSessionBridge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardLayout } from './components/layout/dashboard-layout';
import HeroSection from './components/landing/hero-section';
import SignupForm from './components/auth/signup-form';
import { LoginPage } from './pages/auth/login';
import { OnboardingPage } from './pages/onboarding';
import { DashboardPage } from './pages/dashboard';
import { MasterRevenuePage } from './pages/revenue/master';
// import { PlaygroundPage } from './pages/revenue/playground'; // Hidden - not in use
import { ServiceMixTestPage } from './pages/ServiceMixTest';
import { ServiceMixPage } from './pages/ServiceMixPage';
import { FinancialStatementsPage } from './pages/financial-statements';
import { BudgetVsActualPage } from './pages/BudgetVsActualPage';
import EmployeeLERPage from './pages/EmployeeLERPage';
import { BusinessIntelligencePage } from './pages/BusinessIntelligencePage';
import { YourBigFigPage } from './pages/coach/your-big-fig';
import SMSCoachPage from './pages/coach/sms-coach';
import { MomentumPage } from './pages/momentum';
import { MomentumWizardPage } from './pages/momentum/wizard';
import { CallbackPage } from './pages/auth/callback';
import ClerkSignInPage from './pages/auth/clerk-sign-in';
import './styles/globals.css';

function App() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-[#d5b274]' : 'text-gray-300 hover:text-[#d5b274]'
    }`;

  return (
    <AuthProvider>
      <RevenueProvider>
        <CashflowSyncProvider>
          <KPIRefreshProvider>
            <SupabaseSessionBridge />
          <Router>
          <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <NavLink to="/" className="text-lg font-semibold text-[#d5b274]">
                WaveRider
              </NavLink>
              <div className="flex items-center gap-3">
                <SignedIn>
                  <nav className="hidden items-center gap-4 md:flex">
                    <NavLink to="/dashboard" className={navLinkClass}>
                      Dashboard
                    </NavLink>
                    <NavLink to="/revenue/master" className={navLinkClass}>
                      Revenue
                    </NavLink>
                    <NavLink to="/financial-statements" className={navLinkClass}>
                      Financial Statements
                    </NavLink>
                  </nav>
                </SignedIn>
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </header>
          <div className="min-h-screen bg-gray-900">
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<HeroSection />} />
                <Route path="/sign-in/*" element={<ClerkSignInPage />} />
                <Route path="/login" element={<Navigate to="/sign-in" replace />} />
                <Route path="/signup" element={<Navigate to="/sign-in" replace />} />
                <Route path="/legacy-login" element={<LoginPage />} />
                <Route path="/legacy-signup" element={<SignupForm />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                
                {/* Protected dashboard routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardPage />} />
                </Route>
                
                <Route path="/revenue" element={<DashboardLayout />}>
                  <Route path="master" element={<MasterRevenuePage />} />
                  {/* <Route path="playground" element={<PlaygroundPage />} /> */} {/* Hidden - not in use */}
                </Route>
                
                <Route path="/financial-statements" element={<DashboardLayout />}>
                  <Route index element={<FinancialStatementsPage />} />
                </Route>
                
                <Route path="/coach" element={<DashboardLayout />}>
                  <Route path="your-big-fig" element={<YourBigFigPage />} />
                  <Route path="sms" element={<SMSCoachPage />} />
                </Route>
                
                <Route path="/momentum" element={<DashboardLayout />}>
                  <Route index element={<MomentumPage />} />
                  <Route path="wizard" element={<MomentumWizardPage />} />
                </Route>
                
                {/* Service Mix page */}
                <Route path="/service-mix" element={<DashboardLayout />}>
                  <Route index element={<ServiceMixPage />} />
                </Route>
                
                {/* Test page for Service Mix feature */}
                <Route path="/service-mix-test" element={<DashboardLayout />}>
                  <Route index element={<ServiceMixTestPage />} />
                </Route>
                
                {/* Budget vs Actual Tracking */}
                <Route path="/budget-vs-actual" element={<DashboardLayout />}>
                  <Route index element={<BudgetVsActualPage />} />
                </Route>
                
                {/* Employee LER Tracking */}
                <Route path="/employee-ler" element={<DashboardLayout />}>
                  <Route index element={<EmployeeLERPage />} />
                </Route>
                
                {/* Business Intelligence */}
                <Route path="/business-intelligence" element={<DashboardLayout />}>
                  <Route index element={<BusinessIntelligencePage />} />
                </Route>
                
                {/* Redirect any unknown routes to dashboard if authenticated, otherwise to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </div>
          </Router>
          </KPIRefreshProvider>
        </CashflowSyncProvider>
      </RevenueProvider>
    </AuthProvider>
  );
}

export default App;