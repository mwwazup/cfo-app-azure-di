import React from 'react';

const EnvTestComponent: React.FC = () => {
  // Log environment variables to console for debugging
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
  console.log('All env vars:', import.meta.env);

  return (
    <div>
      <h2>Environment Variable Test</h2>
      <p>Check the browser console for environment variable values.</p>
    </div>
  );
};

export default EnvTestComponent;
