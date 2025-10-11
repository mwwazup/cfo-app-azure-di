const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testDocumentLoading() {
  console.log('🧪 Testing document loading with actual data structure...');
  const userId = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
  
  try {
    // Test the exact query that the API will use
    const { data, error } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error loading documents:', error.message);
      
      // Try alternative ordering if created_at doesn't exist
      console.log('🔄 Trying alternative ordering...');
      const { data: altData, error: altError } = await supabase
        .from('financial_documents')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .limit(50);
        
      if (altError) {
        console.error('❌ Alternative query failed:', altError.message);
        return;
      }
      
      console.log(`✅ Alternative query successful! Found ${altData?.length || 0} documents`);
      data = altData;
    } else {
      console.log(`✅ Query successful! Found ${data?.length || 0} documents`);
    }

    if (data && data.length > 0) {
      console.log('\n📋 Document details:');
      data.forEach((doc, i) => {
        console.log(`\n${i + 1}. Document ID: ${doc.id}`);
        console.log(`   Type: ${doc.document_type || 'Not specified'}`);
        console.log(`   Period: ${doc.start_date} to ${doc.end_date}`);
        console.log(`   Status: ${doc.status || 'Not specified'}`);
        console.log(`   Source: ${doc.source || 'Not specified'}`);
        
        // Show summary metrics if available
        if (doc.summary_metrics) {
          console.log(`   Revenue: $${doc.summary_metrics.totalRevenue?.toLocaleString() || 'N/A'}`);
          console.log(`   Net Profit: $${doc.summary_metrics.netProfit?.toLocaleString() || 'N/A'}`);
        }
        
        // Check for required fields
        const missingFields = [];
        if (!doc.start_date) missingFields.push('start_date');
        if (!doc.end_date) missingFields.push('end_date');
        if (!doc.document_type) missingFields.push('document_type');
        
        if (missingFields.length > 0) {
          console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
        } else {
          console.log(`   ✅ All required fields present`);
        }
      });
      
      console.log('\n🎉 Documents should now appear in the Financial Documents list!');
      console.log('💡 Refresh your browser to see the updated list.');
      
    } else {
      console.log('📝 No documents found for this user.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDocumentLoading().catch(console.error);
