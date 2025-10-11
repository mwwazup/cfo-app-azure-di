const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying EditDocumentModal fixes...');

const modalPath = path.join(__dirname, 'src', 'components', 'financial', 'EditDocumentModal.tsx');

try {
  const content = fs.readFileSync(modalPath, 'utf8');
  
  console.log('📋 Checking styling fixes:');
  
  // Check for theme-aware classes
  const checks = [
    { name: 'bg-card (instead of bg-white)', pattern: 'bg-card' },
    { name: 'text-foreground (instead of text-gray-900)', pattern: 'text-foreground' },
    { name: 'border-border (instead of border-gray-300)', pattern: 'border-border' },
    { name: 'bg-background (for inputs)', pattern: 'bg-background' },
    { name: 'text-muted-foreground', pattern: 'text-muted-foreground' },
    { name: 'focus:ring-accent', pattern: 'focus:ring-accent' },
    { name: 'bg-accent (for save button)', pattern: 'bg-accent' }
  ];
  
  let stylingFixed = true;
  checks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) stylingFixed = false;
  });
  
  console.log('\n📋 Checking data handling fixes:');
  
  // Check for null-safe value handling
  const dataChecks = [
    { name: 'Safe start_date handling', pattern: 'editedDocument.start_date || \'\'' },
    { name: 'Safe end_date handling', pattern: 'editedDocument.end_date || \'\'' },
    { name: 'Safe status handling', pattern: 'editedDocument.status || \'pending\'' },
    { name: 'Safe confidence_score handling', pattern: 'editedDocument.confidence_score || 0' },
    { name: 'Safe value string conversion', pattern: 'String(value || \'\')' }
  ];
  
  let dataFixed = true;
  dataChecks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) dataFixed = false;
  });
  
  console.log('\n📋 Checking cleanup:');
  
  // Check for removed unused function
  const hasUnusedFunction = content.includes('formatCurrency = (value: number)');
  console.log(`${!hasUnusedFunction ? '✅' : '❌'} Unused formatCurrency removed: ${!hasUnusedFunction ? 'YES' : 'NO'}`);
  
  const allFixed = stylingFixed && dataFixed && !hasUnusedFunction;
  
  console.log(`\n${allFixed ? '🎉' : '⚠️'} Modal fixes: ${allFixed ? 'ALL APPLIED' : 'SOME ISSUES REMAINING'}`);
  
  if (allFixed) {
    console.log('\n✅ Modal should now work properly!');
    console.log('🔄 Expected improvements:');
    console.log('   1. Proper text visibility (no more white on white)');
    console.log('   2. Theme-consistent styling');
    console.log('   3. Safe handling of missing data fields');
    console.log('   4. No TypeScript errors');
    console.log('\n💡 Test by clicking the blue edit button on a document!');
  } else {
    console.log('\n❌ Some issues may still need attention.');
  }

} catch (error) {
  console.error('❌ Error reading modal file:', error.message);
}
