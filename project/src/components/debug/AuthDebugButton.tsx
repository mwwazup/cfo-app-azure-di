import { debugAuthState } from '../auth/SupabaseSessionBridge';
import { Button } from '../ui/button';

/**
 * Temporary debug component to test Clerk-Supabase authentication.
 * Add this to any page to test if the session exchange is working.
 */
export function AuthDebugButton() {
  const handleDebugAuth = async () => {
    await debugAuthState();
  };

  return (
    <Button 
      onClick={handleDebugAuth}
      variant="outline"
      className="bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"
    >
      🔍 Debug Auth State
    </Button>
  );
}

export default AuthDebugButton;
