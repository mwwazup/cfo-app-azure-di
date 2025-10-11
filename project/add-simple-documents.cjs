const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function addSimpleDocuments() {
  console.log('📝 Adding simple financial documents...');
  const userId = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
  
  // Try with just the most basic columns
  const basicRecord = {
    user_id: userId,
    document_type: 'pnl'
  };
  
  try {
    console.log('🧪 Testing basic insert...');
    const { data, error } = await supabase
      .from('financial_documents')
      .insert([basicRecord])
      .select();
      
    if (error) {
      console.log('❌ Basic insert failed:', error.message);
      
      // Try even simpler - maybe the table has different column names
      console.log('🧪 Trying alternative column names...');
      const altRecord = {
        user_id: userId,
        type: 'pnl'
      };
      
      const { data: altData, error: altError } = await supabase
        .from('financial_documents')
        .insert([altRecord])
        .select();
        
      if (altError) {
        console.log('❌ Alternative insert failed:', altError.message);
        console.log('💡 The table might not exist or have different structure than expected');
        
        // Let's check what tables actually exist
        console.log('🔍 Checking available tables...');
        const { data: tables, error: tablesError } = await supabase
          .rpc('get_schema_tables');
          
        if (tablesError) {
          console.log('❌ Could not get table list:', tablesError.message);
        }
        
      } else {
        console.log('✅ Alternative insert successful!');
        console.log('📋 Record structure:', JSON.stringify(altData[0], null, 2));
      }
      
    } else {
      console.log('✅ Basic insert successful!');
      console.log('📋 Record structure:', JSON.stringify(data[0], null, 2));
      
      // Now try to add more complete records
      console.log('📝 Adding more complete sample documents...');
      
      const moreRecords = [
        {
          user_id: userId,
          document_type: 'pnl'
        },
        {
          user_id: userId,
          document_type: 'balance_sheet'
        }
      ];
      
      const { data: moreData, error: moreError } = await supabase
        .from('financial_documents')
        .insert(moreRecords)
        .select();
        
      if (moreError) {
        console.log('❌ Additional records failed:', moreError.message);
      } else {
        console.log(`✅ Added ${moreData.length} additional records!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addSimpleDocuments().catch(console.error);
