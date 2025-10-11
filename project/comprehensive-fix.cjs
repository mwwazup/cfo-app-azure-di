const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

console.log('🔧 Applying comprehensive fix...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find where the functions end and the main return should start
  const functionsEndPattern = '  };';
  const mainReturnStart = '  return (';
  
  // Find the last occurrence of the handleSaveDocumentEdit function
  const handleSaveIndex = content.lastIndexOf('const handleSaveDocumentEdit');
  if (handleSaveIndex === -1) {
    console.log('❌ Could not find handleSaveDocumentEdit function');
    return;
  }
  
  // Find the end of that function (the closing brace)
  let functionEndIndex = content.indexOf('  };\n\n  return (', handleSaveIndex);
  if (functionEndIndex === -1) {
    // Try alternative pattern
    functionEndIndex = content.indexOf('  };\n\n  return (', handleSaveIndex);
    if (functionEndIndex === -1) {
      console.log('❌ Could not find function end pattern');
      return;
    }
  }
  
  // Remove everything after the function end until we find the proper component return
  const properReturnIndex = content.indexOf('    <div className="space-y-6">');
  if (properReturnIndex === -1) {
    console.log('❌ Could not find proper component return');
    return;
  }
  
  // Reconstruct the file properly
  const beforeFunctions = content.slice(0, functionEndIndex + 4); // Include the closing };
  const afterReturn = content.slice(properReturnIndex - 12); // Include the return ( part
  
  const newContent = beforeFunctions + '\n\n  return (\n' + afterReturn;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Applied comprehensive fix!');
  console.log('🔄 The component should now work properly.');

} catch (error) {
  console.error('❌ Error:', error.message);
}
