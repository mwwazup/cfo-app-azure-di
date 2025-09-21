import React from 'react';

export const EnvTest: React.FC = () => {
  const allEnvVars = import.meta.env;
  
  console.log('🔍 All environment variables:', allEnvVars);
  console.log('🔍 VITE_ANTHROPIC_API_KEY:', import.meta.env.VITE_ANTHROPIC_API_KEY);
  console.log('🔍 VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY);
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '20px' }}>
      <h3>Environment Variables Debug</h3>
      <p><strong>VITE_ANTHROPIC_API_KEY:</strong> {import.meta.env.VITE_ANTHROPIC_API_KEY ? 'Found' : 'Missing'}</p>
      <p><strong>VITE_OPENAI_API_KEY:</strong> {import.meta.env.VITE_OPENAI_API_KEY ? 'Found' : 'Missing'}</p>
      <p><strong>All VITE_ vars:</strong> {Object.keys(allEnvVars).filter(k => k.startsWith('VITE_')).join(', ')}</p>
    </div>
  );
};
