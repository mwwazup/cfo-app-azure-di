const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying CORS fix for X-User-ID header...');

const serverPath = path.join(__dirname, 'server-minimal.js');

try {
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Check for the CORS configuration
  const corsConfigMatch = content.match(/allowedHeaders:\s*\[(.*?)\]/s);
  
  if (corsConfigMatch) {
    const allowedHeaders = corsConfigMatch[1];
    console.log('📋 Current CORS allowedHeaders:', allowedHeaders.trim());
    
    const hasXUserId = allowedHeaders.includes('X-User-ID');
    console.log(`${hasXUserId ? '✅' : '❌'} X-User-ID header: ${hasXUserId ? 'ALLOWED' : 'MISSING'}`);
    
    if (hasXUserId) {
      console.log('\n🎉 CORS fix applied successfully!');
      console.log('🔄 Next steps:');
      console.log('   1. Restart the server (Ctrl+C and run npm run dev:full again)');
      console.log('   2. Refresh the Financial Documents page');
      console.log('   3. Check browser console for successful API calls');
      console.log('\n💡 Expected console logs after restart:');
      console.log('   - 🔄 Loading documents from API...');
      console.log('   - 📄 API Response: {data: [...]}');
      console.log('   - ✅ Documents loaded successfully: 2');
    } else {
      console.log('\n❌ X-User-ID header still not allowed in CORS config');
    }
  } else {
    console.log('❌ Could not find CORS configuration in server file');
  }

} catch (error) {
  console.error('❌ Error reading server file:', error.message);
}
