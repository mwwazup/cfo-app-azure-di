import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// IMPORTANT: Only use service role key for this - NEVER expose it client-side
const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function createDevUser() {
  console.log('🔧 Creating development user...');
  
  // Debug environment variables
  console.log('📍 Checking environment variables...');
  console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing');
  console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing');
  
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables!');
    console.log('Make sure your .env file contains:');
    console.log('VITE_SUPABASE_URL=your_supabase_url');
    console.log('VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'dev@example.com',
      password: 'secureDevPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Dev',
        last_name: 'User',
        role: 'developer'
      }
    });

    if (error) {
      if (error.message.includes('already been registered') || error.code === 'email_exists') {
        console.log('ℹ️  User already exists!');
        console.log('📧 Email: dev@example.com');
        console.log('🔑 Password: secureDevPassword123!');
        console.log('✅ You can use this existing user for testing.');
        return;
      }
      console.error('❌ User creation error:', error);
      return;
    }

    console.log('✅ Dev user created successfully!');
    console.log('📧 Email:', data.user.email);
    console.log('🆔 User ID:', data.user.id);
    console.log('👤 Metadata:', data.user.user_metadata);
    
    // The database trigger should automatically create the profile
    console.log('📝 Profile should be created automatically by database trigger');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Security check - only run in development
if (process.env.NODE_ENV === 'production') {
  console.error('🚫 This script should NOT be run in production!');
  process.exit(1);
}

// Run the script
createDevUser();
