import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/auth-context';
import { RevenueProvider } from './contexts/revenue-context';
import { DashboardLayout } from './components/layout/dashboard-layout';
import HeroSection from './components/landing/hero-section';
import LoginForm from './components/auth/login-form';
import SignupForm from './components/auth/signup-form';
import { LoginPage } from './pages/auth/login';
import { OnboardingPage } from './pages/onboarding';
import { DashboardPage } from './pages/dashboard';
import { MasterRevenuePage } from './pages/revenue/master';
import { PlaygroundPage } from './pages/revenue/playground';
import { FinancialStatementsPage } from './pages/financial-statements';
import { YourBigFigPage } from './pages/coach/your-big-fig';
import { MomentumPage } from './pages/momentum';
import { MomentumWizardPage } from './pages/momentum/wizard';
import { CallbackPage } from './pages/auth/callback';
import './styles/globals.css';

function App() {
  return (
    <AuthProvider>
      <RevenueProvider>
        <Router>
          <div className="min-h-screen bg-gray-900">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HeroSection />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/callback" element={<CallbackPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              
              {/* Protected dashboard routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
              </Route>
              
              <Route path="/revenue" element={<DashboardLayout />}>
                <Route path="master" element={<MasterRevenuePage />} />
                <Route path="playground" element={<PlaygroundPage />} />
              </Route>
              
              <Route path="/financial-statements" element={<DashboardLayout />}>
                <Route index element={<FinancialStatementsPage />} />
              </Route>
              
              <Route path="/coach" element={<DashboardLayout />}>
                <Route path="your-big-fig" element={<YourBigFigPage />} />
              </Route>
              
              <Route path="/momentum" element={<DashboardLayout />}>
                <Route index element={<MomentumPage />} />
                <Route path="wizard" element={<MomentumWizardPage />} />
              </Route>
              
              {/* Redirect any unknown routes to dashboard if authenticated, otherwise to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </RevenueProvider>
    </AuthProvider>
  );
}

export default App;