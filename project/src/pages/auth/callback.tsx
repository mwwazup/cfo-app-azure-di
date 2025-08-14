import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const completeSignIn = async () => {
      // Parse the URL #fragment, store the JWT in localStorage, and hydrate the session
      await supabase.auth.getSession();
      // Redirect the user to their dashboard (or any post-login route you prefer)
      navigate('/dashboard', { replace: true });
    };

    completeSignIn();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Signing you in…</p>
    </div>
  );
}

export { CallbackPage };
export default CallbackPage;
