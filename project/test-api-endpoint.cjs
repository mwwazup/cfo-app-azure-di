const fetch = require('node-fetch');

async function testAPIEndpoint() {
  console.log('🧪 Testing the /api/financial-documents endpoint...');
  
  const API_BASE_URL = 'http://localhost:5180';
  const userId = 'user_33fQP5vCktD5cLZwkg7fbysz2JS'; // Clerk user ID from server logs
  
  try {
    const url = `${API_BASE_URL}/api/financial-documents?userId=${encodeURIComponent(userId)}&limit=50`;
    console.log('📡 Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ API response received');
    console.log('📋 Response structure:', {
      success: result.success,
      documentsCount: result.documents?.length || 0,
      error: result.error
    });

    if (result.success && result.documents && result.documents.length > 0) {
      console.log('\n📄 Documents found:');
      result.documents.forEach((doc, i) => {
        console.log(`\n${i + 1}. Document ID: ${doc.id}`);
        console.log(`   User ID: ${doc.user_id}`);
        console.log(`   Type: ${doc.document_type || 'Not specified'}`);
        console.log(`   Period: ${doc.start_date || 'N/A'} to ${doc.end_date || 'N/A'}`);
        console.log(`   Status: ${doc.status || 'Not specified'}`);
        console.log(`   Source: ${doc.source || 'Not specified'}`);
        
        if (doc.summary_metrics) {
          console.log(`   Revenue: $${doc.summary_metrics.totalRevenue?.toLocaleString() || 'N/A'}`);
          console.log(`   Net Profit: $${doc.summary_metrics.netProfit?.toLocaleString() || 'N/A'}`);
        }
      });
      
      console.log('\n🎉 SUCCESS! Documents should now appear in the Financial Documents list!');
      console.log('💡 Refresh your browser to see the updated list.');
      
    } else if (result.success && result.documents && result.documents.length === 0) {
      console.log('📝 API working but no documents found for this user');
      console.log('💡 The documents might be associated with a different user ID');
      
    } else {
      console.log('❌ API returned error:', result.error);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAPIEndpoint().catch(console.error);
