import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAuth() {
  console.log('🔐 Testing authentication configuration...');
  
  try {
    // Test login with dev user
    console.log('📧 Attempting login with dev@example.com...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'dev@example.com',
      password: 'secureDevPassword123!'
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.log('🔍 Error details:', error);
      
      if (error.message.includes('grant_type')) {
        console.log('\n💡 SOLUTION:');
        console.log('1. Go to Supabase Dashboard → Authentication → Settings');
        console.log('2. Enable "Email" provider');
        console.log('3. Ensure password authentication is enabled');
        console.log('4. Disable email confirmations for development');
      }
      return;
    }

    console.log('✅ Login successful!');
    console.log('👤 User:', data.user.email);
    console.log('🎫 Session:', data.session ? 'Active' : 'None');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testAuth();
