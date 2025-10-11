const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying all imports in FinancialStatements.tsx...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');
const componentDir = path.join(__dirname, 'src', 'components', 'financial');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const files = fs.readdirSync(componentDir);
  
  // Extract imports from the file
  const importLines = content.split('\n').filter(line => line.trim().startsWith('import') && line.includes('./'));
  
  console.log('📋 Found local imports:');
  
  let allImportsValid = true;
  
  importLines.forEach(line => {
    // Extract the file path from the import
    const match = line.match(/from ['"]\.\/([^'"]+)['"]/);
    if (match) {
      const importedFile = match[1];
      const expectedFile = `${importedFile}.tsx`;
      const fileExists = files.includes(expectedFile);
      
      console.log(`${fileExists ? '✅' : '❌'} ${importedFile} -> ${expectedFile} ${fileExists ? 'EXISTS' : 'MISSING'}`);
      
      if (!fileExists) {
        allImportsValid = false;
        // Check for similar files
        const similarFiles = files.filter(f => f.toLowerCase().includes(importedFile.toLowerCase()));
        if (similarFiles.length > 0) {
          console.log(`   💡 Similar files found: ${similarFiles.join(', ')}`);
        }
      }
    }
  });
  
  console.log(`\n${allImportsValid ? '🎉' : '⚠️'} Import status: ${allImportsValid ? 'ALL VALID' : 'SOME ISSUES'}`);
  
  if (allImportsValid) {
    console.log('✅ All imports should resolve correctly now!');
    console.log('🔄 The server should start without import errors.');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}
