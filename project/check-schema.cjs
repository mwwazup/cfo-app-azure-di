const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkSchema() {
  console.log('🔍 Checking financial_documents table schema...');
  
  try {
    // Try to insert a minimal record to see what columns are required/available
    const testRecord = {
      user_id: 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f',
      document_type: 'pnl',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };
    
    const { data, error } = await supabase
      .from('financial_documents')
      .insert([testRecord])
      .select();
      
    if (error) {
      console.log('❌ Error with minimal insert:', error.message);
      console.log('This tells us about required columns or schema issues');
    } else {
      console.log('✅ Minimal insert successful!');
      console.log('📋 Inserted record structure:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Clean up the test record
      await supabase
        .from('financial_documents')
        .delete()
        .eq('id', data[0].id);
      console.log('🧹 Cleaned up test record');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema().catch(console.error);
