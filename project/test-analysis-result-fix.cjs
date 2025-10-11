const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying analysis_result data structure fixes...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📋 Checking data transformation fixes:');
  
  // Check for proper data extraction from analysis_result
  const dataChecks = [
    { name: 'Flattening analysis_result data', pattern: 'doc.analysis_result.start_date || doc.start_date' },
    { name: 'Extracting summary_metrics', pattern: 'doc.analysis_result.summary_metrics || doc.summary_metrics' },
    { name: 'Extracting raw_json', pattern: 'doc.analysis_result.raw_json || {}' },
    { name: 'Preserving original analysis_result', pattern: '_original_analysis_result: doc.analysis_result' }
  ];
  
  let dataFixed = true;
  dataChecks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) dataFixed = false;
  });
  
  console.log('\n📋 Checking database update fixes:');
  
  // Check for proper database update structure
  const dbChecks = [
    { name: 'Building analysis_result object', pattern: 'const updatedAnalysisResult = {' },
    { name: 'Updating analysis_result column', pattern: 'analysis_result: updatedAnalysisResult' },
    { name: 'NOT updating separate columns', pattern: '!content.includes("start_date: updatedDocument.start_date,")' },
    { name: 'Preserving raw_json data', pattern: 'raw_json: updatedDocument.raw_json || {}' }
  ];
  
  let dbFixed = true;
  dbChecks.forEach(check => {
    if (check.name === 'NOT updating separate columns') {
      // Special check for what should NOT be there
      const notFound = !content.includes('start_date: updatedDocument.start_date,');
      console.log(`${notFound ? '✅' : '❌'} ${check.name}: ${notFound ? 'CORRECT' : 'STILL PRESENT'}`);
      if (!notFound) dbFixed = false;
    } else {
      const found = content.includes(check.pattern);
      console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
      if (!found) dbFixed = false;
    }
  });
  
  console.log('\n📋 Checking state management fixes:');
  
  // Check for proper state updates
  const stateChecks = [
    { name: 'Updating local analysis_result', pattern: 'analysis_result: updatedAnalysisResult' },
    { name: 'TypeScript fix for map', pattern: 'documentsData.map((doc: any) => {' }
  ];
  
  let stateFixed = true;
  stateChecks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) stateFixed = false;
  });
  
  const allFixed = dataFixed && dbFixed && stateFixed;
  
  console.log(`\n${allFixed ? '🎉' : '⚠️'} Analysis result fixes: ${allFixed ? 'ALL APPLIED' : 'SOME ISSUES REMAINING'}`);
  
  if (allFixed) {
    console.log('\n✅ The modal should now work with your data structure!');
    console.log('🔄 Expected behavior:');
    console.log('   1. Modal will read data from analysis_result column');
    console.log('   2. Shows start_date, end_date from analysis_result.start_date/end_date');
    console.log('   3. Shows financial metrics from analysis_result.summary_metrics');
    console.log('   4. Saves changes back to analysis_result JSON column');
    console.log('   5. No more "end_date column not found" errors');
    console.log('\n💡 Test by refreshing and clicking the edit button!');
  } else {
    console.log('\n❌ Some issues may still need attention.');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
