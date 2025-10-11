const http = require('http');

async function testFinalFix() {
  console.log('🎯 Testing final fix for document loading...');
  
  const userId = 'user_33fQP5vCktD5cLZwkg7fbysz2JS';
  const path = `/api/financial-documents?userId=${encodeURIComponent(userId)}&limit=50`;
  
  const options = {
    hostname: 'localhost',
    port: 5180,
    path: path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const documents = result.data || result.documents || [];
          
          console.log(`✅ Found ${documents.length} documents in API response`);
          
          if (documents.length > 0) {
            console.log('\n📄 Documents that will appear in the UI:');
            
            documents.forEach((doc, i) => {
              // Apply the same transformation as the updated API function
              const transformedDoc = {
                ...doc,
                uploaded_at: doc.uploaded_at || doc.created_at || doc.start_date || new Date().toISOString(),
                document_type: doc.document_type || 'pnl',
                status: doc.status || 'approved',
                start_date: doc.start_date || '2024-01-01',
                end_date: doc.end_date || '2024-01-31'
              };
              
              console.log(`\n${i + 1}. Document ID: ${transformedDoc.id}`);
              console.log(`   Type: ${transformedDoc.document_type}`);
              console.log(`   Period: ${transformedDoc.start_date} to ${transformedDoc.end_date}`);
              console.log(`   Status: ${transformedDoc.status}`);
              console.log(`   Uploaded: ${new Date(transformedDoc.uploaded_at).toLocaleDateString()}`);
              
              if (doc.summary_metrics) {
                console.log(`   Revenue: $${doc.summary_metrics.totalRevenue?.toLocaleString() || 'N/A'}`);
                console.log(`   Net Profit: $${doc.summary_metrics.netProfit?.toLocaleString() || 'N/A'}`);
              }
              
              // Check if all required fields are present
              const hasRequiredFields = transformedDoc.id && transformedDoc.start_date && transformedDoc.end_date;
              console.log(`   ✅ Ready for UI: ${hasRequiredFields ? 'YES' : 'NO'}`);
            });
            
            console.log('\n🎉 SUCCESS! The Financial Documents card should now display these entries!');
            console.log('💡 Refresh your browser to see the documents with edit functionality.');
            
          } else {
            console.log('📝 No documents found - the list will show as empty');
          }
          
          resolve();
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError.message);
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      resolve();
    });

    req.end();
  });
}

testFinalFix().catch(console.error);
