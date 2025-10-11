const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

async function checkWithServiceKey() {
  console.log('🔍 Checking data with service role key (bypasses RLS)...');
  
  // Try with service role key if available
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  console.log('🔑 Service key available:', !!serviceKey);
  console.log('🔑 Anon key available:', !!anonKey);
  
  const supabaseService = createClient(
    process.env.SUPABASE_URL,
    serviceKey || anonKey
  );
  
  try {
    console.log('\n📋 Checking financial_documents table...');
    const { data: docs, error: docsError } = await supabaseService
      .from('financial_documents')
      .select('*')
      .limit(10);

    if (docsError) {
      console.log('❌ financial_documents error:', docsError.message);
    } else {
      console.log(`✅ financial_documents: ${docs?.length || 0} records`);
      if (docs && docs.length > 0) {
        docs.forEach((doc, i) => {
          console.log(`   ${i+1}. User: ${doc.user_id}, Type: ${doc.document_type}, Period: ${doc.start_date} - ${doc.end_date}`);
        });
      }
    }
    
    // Check other possible table names
    const possibleTables = [
      'financial_statements',
      'documents', 
      'user_documents',
      'pl_statements',
      'manual_entries'
    ];
    
    for (const tableName of possibleTables) {
      console.log(`\n📋 Checking ${tableName} table...`);
      try {
        const { data, error } = await supabaseService
          .from(tableName)
          .select('*')
          .limit(5);
          
        if (error) {
          console.log(`❌ ${tableName} error: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: ${data?.length || 0} records`);
          if (data && data.length > 0) {
            console.log(`   Sample record keys: ${Object.keys(data[0]).join(', ')}`);
            
            // Check if this looks like financial data
            const firstRecord = data[0];
            if (firstRecord.raw_json || firstRecord.summary_metrics || firstRecord.revenue) {
              console.log('   🎯 This table contains financial data!');
              if (firstRecord.raw_json) {
                console.log(`   Raw JSON fields: ${Object.keys(firstRecord.raw_json).join(', ')}`);
              }
              if (firstRecord.summary_metrics) {
                console.log(`   Summary metrics: ${Object.keys(firstRecord.summary_metrics).join(', ')}`);
              }
            }
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName} unexpected error: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkWithServiceKey().catch(console.error);
