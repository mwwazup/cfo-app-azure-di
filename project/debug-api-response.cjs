const http = require('http');

async function debugAPIResponse() {
  console.log('🔍 Debugging API response structure...');
  
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
      console.log('📊 Response status:', res.statusCode);
      console.log('📋 Response headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📄 Raw response data:');
        console.log(data);
        
        try {
          const parsed = JSON.parse(data);
          console.log('\n🔍 Parsed response:');
          console.log(JSON.stringify(parsed, null, 2));
          
          console.log('\n📊 Response analysis:');
          console.log('- Type:', typeof parsed);
          console.log('- Keys:', Object.keys(parsed));
          console.log('- Has success property:', 'success' in parsed);
          console.log('- Has documents property:', 'documents' in parsed);
          console.log('- Has error property:', 'error' in parsed);
          
        } catch (parseError) {
          console.log('\n❌ Failed to parse as JSON:', parseError.message);
          console.log('This might be HTML or plain text response');
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      resolve();
    });

    req.end();
  });
}

debugAPIResponse().catch(console.error);
