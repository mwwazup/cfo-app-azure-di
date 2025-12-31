import { useEffect } from 'react';
import { useAuthContext } from '../contexts/auth-context';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to handle plan selection and upgrade flows from Clerk Account Portal
 * Handles both new user signups and existing user plan upgrades
 */
export function usePlanRedirect() {
  const { isSignedIn } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Only run if user is signed in
    if (isSignedIn) {
      // Handle new user signup with plan selection
      const selectedPlan = sessionStorage.getItem('selectedPlan');
      const selectedPrice = sessionStorage.getItem('selectedPrice');
      const selectedPlanName = sessionStorage.getItem('selectedPlanName');

      if (selectedPlan && selectedPrice && selectedPlanName) {
        // Clear the stored data
        sessionStorage.removeItem('selectedPlan');
        sessionStorage.removeItem('selectedPrice');
        sessionStorage.removeItem('selectedPlanName');

        // Redirect to onboarding with plan info for subscription setup
        navigate(`/onboarding?plan=${selectedPlan}&price=${selectedPrice}&name=${selectedPlanName}`, { replace: true });
        return;
      }

      // Handle existing user plan upgrade from Clerk Account Portal
      const upgradePlan = sessionStorage.getItem('upgradePlan');
      const upgradePrice = sessionStorage.getItem('upgradePrice');
      const upgradePlanName = sessionStorage.getItem('upgradePlanName');

      if (upgradePlan && upgradePrice && upgradePlanName) {
        // Clear the stored data
        sessionStorage.removeItem('upgradePlan');
        sessionStorage.removeItem('upgradePrice');
        sessionStorage.removeItem('upgradePlanName');

        // Redirect to success page or dashboard with upgrade confirmation
        navigate(`/dashboard?upgraded=true&plan=${upgradePlan}&price=${upgradePrice}&name=${upgradePlanName}`, { replace: true });
        return;
      }
    }
  }, [isSignedIn, navigate]);
}

/**
 * Component to handle plan redirects - place in your app root or dashboard
 */
export function PlanRedirectHandler() {
  usePlanRedirect();
  return null; // This component doesn't render anything
}
