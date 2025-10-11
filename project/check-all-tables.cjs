const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkAllTables() {
  console.log('🔍 Checking all financial-related tables...');
  const userId = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
  
  const tablesToCheck = [
    'financial_documents',
    'financial_statements', 
    'financial_metrics',
    'revenue_entries'
  ];
  
  for (const tableName of tablesToCheck) {
    console.log(`\n📋 Checking table: ${tableName}`);
    
    try {
      // Check total count
      const { data: allData, error: allError } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);
        
      if (allError) {
        console.log(`❌ Table ${tableName} error: ${allError.message}`);
        continue;
      }
      
      console.log(`📊 Total records: ${allData?.length || 0}`);
      
      if (allData && allData.length > 0) {
        console.log('📝 Sample records:');
        allData.forEach((record, i) => {
          const keys = Object.keys(record).slice(0, 4); // Show first 4 columns
          const preview = keys.map(key => `${key}: ${record[key]}`).join(', ');
          console.log(`  ${i+1}. ${preview}`);
        });
        
        // Check for user-specific records
        if (record => record.user_id) {
          const { data: userData, error: userError } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', userId)
            .limit(3);
            
          if (!userError && userData) {
            console.log(`👤 Records for current user: ${userData.length}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error checking ${tableName}:`, error.message);
    }
  }
}

checkAllTables().catch(console.error);
