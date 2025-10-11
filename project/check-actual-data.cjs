const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkActualData() {
  console.log('🔍 Checking actual data in financial_documents table...');
  
  try {
    // Get all documents without user filter to see what's actually there
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error querying table:', error.message);
      return;
    }

    console.log(`📊 Total documents in table: ${data?.length || 0}`);

    if (data && data.length > 0) {
      console.log('\n📋 All documents in table:');
      data.forEach((doc, i) => {
        console.log(`\n${i + 1}. Document ID: ${doc.id}`);
        console.log(`   User ID: ${doc.user_id}`);
        console.log(`   Type: ${doc.document_type || 'Not specified'}`);
        console.log(`   Period: ${doc.start_date} to ${doc.end_date}`);
        console.log(`   Source: ${doc.source}`);
        
        // Show the structure of raw_json and summary_metrics
        if (doc.raw_json) {
          const fields = Object.keys(doc.raw_json);
          console.log(`   Raw JSON fields: ${fields.join(', ')}`);
        }
        
        if (doc.summary_metrics) {
          const metrics = Object.keys(doc.summary_metrics);
          console.log(`   Summary metrics: ${metrics.join(', ')}`);
          console.log(`   Revenue: $${doc.summary_metrics.totalRevenue?.toLocaleString() || 'N/A'}`);
        }
      });
      
      // Check if any documents match our expected user ID
      const expectedUserId = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
      const userDocs = data.filter(doc => doc.user_id === expectedUserId);
      
      console.log(`\n👤 Documents for expected user ID (${expectedUserId}): ${userDocs.length}`);
      
      if (userDocs.length === 0) {
        console.log('❌ No documents found for the expected user ID');
        console.log('💡 The documents might be associated with a different user ID');
        
        // Show unique user IDs in the table
        const uniqueUserIds = [...new Set(data.map(doc => doc.user_id))];
        console.log(`\n🔑 Unique user IDs in table: ${uniqueUserIds.length}`);
        uniqueUserIds.forEach((userId, i) => {
          const count = data.filter(doc => doc.user_id === userId).length;
          console.log(`   ${i + 1}. ${userId} (${count} documents)`);
        });
      }
      
    } else {
      console.log('📝 Table is empty - no documents found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkActualData().catch(console.error);
