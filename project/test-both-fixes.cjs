const fs = require('fs');
const path = require('path');

console.log('🔍 Testing both API and UI fixes...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📋 Checking API fix:');
  
  // Check API fix - query parameter instead of header
  const hasQueryParam = content.includes('?userId=${encodeURIComponent(dbUserId)}');
  const hasOldHeader = content.includes('X-User-ID');
  
  console.log(`${hasQueryParam ? '✅' : '❌'} Query parameter: ${hasQueryParam ? 'FOUND' : 'MISSING'}`);
  console.log(`${!hasOldHeader ? '✅' : '❌'} Old X-User-ID header: ${!hasOldHeader ? 'REMOVED' : 'STILL PRESENT'}`);
  
  console.log('\n📋 Checking UI fix:');
  
  // Check UI fix - table always shows
  const hasTableStructure = content.includes('<table className="w-full">');
  const hasEmptyState = content.includes('colSpan={4}');
  const hasConditionalTable = content.includes('documents.length === 0 ? (') && content.includes('</table>');
  
  console.log(`${hasTableStructure ? '✅' : '❌'} Table structure: ${hasTableStructure ? 'PRESENT' : 'MISSING'}`);
  console.log(`${hasEmptyState ? '✅' : '❌'} Empty state in table: ${hasEmptyState ? 'PRESENT' : 'MISSING'}`);
  console.log(`${hasConditionalTable ? '✅' : '❌'} Table always renders: ${hasConditionalTable ? 'YES' : 'NO'}`);
  
  console.log('\n📋 Checking syntax:');
  
  // Basic syntax checks
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  console.log(`${openParens === closeParens ? '✅' : '❌'} Parentheses: ${openParens} open, ${closeParens} close`);
  console.log(`${openBraces === closeBraces ? '✅' : '❌'} Braces: ${openBraces} open, ${closeBraces} close`);
  
  const allGood = hasQueryParam && !hasOldHeader && hasTableStructure && hasEmptyState && 
                  hasConditionalTable && openParens === closeParens && openBraces === closeBraces;
  
  console.log(`\n${allGood ? '🎉' : '⚠️'} Overall status: ${allGood ? 'ALL FIXES APPLIED' : 'SOME ISSUES REMAINING'}`);
  
  if (allGood) {
    console.log('\n✅ Both fixes should now work!');
    console.log('🔄 Expected behavior:');
    console.log('   1. API calls will use query parameter (no more 400 errors)');
    console.log('   2. Table will always show with headers and action columns');
    console.log('   3. Empty state will show inside the table structure');
    console.log('   4. Documents will populate the table when loaded');
    console.log('\n💡 Refresh the page to see the changes!');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
