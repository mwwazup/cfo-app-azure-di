const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for TypeScript issues in FinancialStatements.tsx...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log('📋 Checking specific problem areas:');
  
  // Check line 185 area (the indexing issue)
  console.log('\n🔍 Line 185 area (indexing issue):');
  const line185Area = lines.slice(182, 192);
  line185Area.forEach((line, i) => {
    const lineNum = 183 + i;
    console.log(`${lineNum}: ${line}`);
  });
  
  // Check for unused variables
  console.log('\n🔍 Checking for unused variable declarations:');
  const unusedVariablePatterns = [
    'const updatedProcessingResult',
    'const updatedExtractedData'
  ];
  
  let foundUnusedVars = false;
  unusedVariablePatterns.forEach(pattern => {
    const found = content.includes(pattern);
    console.log(`${found ? '❌' : '✅'} ${pattern}: ${found ? 'FOUND (should be removed)' : 'NOT FOUND (good)'}`);
    if (found) foundUnusedVars = true;
  });
  
  // Check for proper type assertions
  console.log('\n🔍 Checking for proper type handling:');
  const hasTypeAssertion = content.includes('(extractedData.extractedFields as any)');
  console.log(`${hasTypeAssertion ? '✅' : '❌'} Type assertion for extractedFields: ${hasTypeAssertion ? 'PRESENT' : 'MISSING'}`);
  
  // Summary
  console.log('\n📊 Summary:');
  const allGood = !foundUnusedVars && hasTypeAssertion;
  console.log(`${allGood ? '🎉' : '⚠️'} TypeScript issues: ${allGood ? 'ALL RESOLVED' : 'SOME REMAINING'}`);
  
  if (allGood) {
    console.log('✅ The TypeScript errors should now be resolved!');
    console.log('🔄 The IDE should show fewer or no TypeScript errors.');
  } else {
    console.log('❌ Some issues may still need attention.');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
