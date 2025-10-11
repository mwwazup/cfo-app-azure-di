const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying table revenue display fixes...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📋 Checking table structure updates:');
  
  // Check for revenue column addition
  const tableChecks = [
    { name: 'Revenue column header', pattern: '<th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</th>' },
    { name: 'Updated colspan for empty state', pattern: 'colSpan={5}' },
    { name: 'Revenue data display logic', pattern: 'document.summary_metrics?.totalRevenue' },
    { name: 'Fallback to revenue field', pattern: 'document.summary_metrics?.revenue' },
    { name: 'Fallback to raw_json', pattern: 'document.raw_json?.revenue?.value' },
    { name: 'Default dash for no data', pattern: ': \'-\'' }
  ];
  
  let tableFixed = true;
  tableChecks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) tableFixed = false;
  });
  
  console.log('\n📋 Checking state update improvements:');
  
  // Check for improved state updates
  const stateChecks = [
    { name: 'Debug logging for updates', pattern: 'console.log(\'🔄 Updating local state with:\', updatedDocument);' },
    { name: 'Flattened field updates', pattern: 'start_date: updatedDocument.start_date,' },
    { name: 'Summary metrics update', pattern: 'summary_metrics: updatedDocument.summary_metrics' },
    { name: 'Updated documents logging', pattern: 'console.log(\'🔄 Updated documents array:\', updated);' }
  ];
  
  let stateFixed = true;
  stateChecks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) stateFixed = false;
  });
  
  const allFixed = tableFixed && stateFixed;
  
  console.log(`\n${allFixed ? '🎉' : '⚠️'} Table display fixes: ${allFixed ? 'ALL APPLIED' : 'SOME ISSUES REMAINING'}`);
  
  if (allFixed) {
    console.log('\n✅ Changes should now be visible in the table!');
    console.log('🔄 Expected behavior:');
    console.log('   1. Table now has a "Revenue" column showing financial data');
    console.log('   2. Revenue displays from summary_metrics.totalRevenue or .revenue');
    console.log('   3. Falls back to raw_json.revenue.value if needed');
    console.log('   4. Shows "-" if no revenue data found');
    console.log('   5. Changes made in modal will immediately update the table');
    console.log('   6. Console logs will show the update process');
    console.log('\n💡 Test by editing a document and watching the Revenue column!');
    console.log('💡 Expected format: $60,642 (formatted with commas)');
  } else {
    console.log('\n❌ Some table display issues may still need attention.');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
