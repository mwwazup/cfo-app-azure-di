const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying UUID fix for document updates...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📋 Checking UUID handling:');
  
  // Check for proper UUID usage
  const uuidChecks = [
    { name: 'Extract Supabase UUID from document', pattern: 'const supabaseUserId = updatedDocument.user_id;' },
    { name: 'Use supabaseUserId in query', pattern: '.eq(\'user_id\', supabaseUserId)' },
    { name: 'NOT using dbUserId in query', pattern: '!content.includes(".eq(\'user_id\', dbUserId)")' },
    { name: 'Debug logging for UUID', pattern: 'console.log(\'🔍 Using Supabase user ID for update:\', supabaseUserId);' }
  ];
  
  let uuidFixed = true;
  uuidChecks.forEach(check => {
    if (check.name === 'NOT using dbUserId in query') {
      // Special check for what should NOT be there
      const notFound = !content.includes('.eq(\'user_id\', dbUserId)');
      console.log(`${notFound ? '✅' : '❌'} ${check.name}: ${notFound ? 'CORRECT' : 'STILL PRESENT'}`);
      if (!notFound) uuidFixed = false;
    } else {
      const found = content.includes(check.pattern);
      console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
      if (!found) uuidFixed = false;
    }
  });
  
  console.log(`\n${uuidFixed ? '🎉' : '⚠️'} UUID fix: ${uuidFixed ? 'APPLIED' : 'ISSUES REMAINING'}`);
  
  if (uuidFixed) {
    console.log('\n✅ The UUID error should now be resolved!');
    console.log('🔄 Expected behavior:');
    console.log('   1. Document updates will use the correct Supabase UUID');
    console.log('   2. No more "invalid input syntax for type uuid" errors');
    console.log('   3. Console will show the UUID being used for updates');
    console.log('   4. Modal saves should work properly');
    console.log('\n💡 The document already contains the correct user_id from the API response!');
    console.log('💡 Expected UUID format: f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f');
    console.log('💡 NOT Clerk ID format: user_33fQP5vCktD5cLZwkg7fbysz2JS');
  } else {
    console.log('\n❌ Some UUID issues may still need attention.');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
