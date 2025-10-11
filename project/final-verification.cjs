const fs = require('fs');
const path = require('path');

console.log('🔍 Final verification of edit functionality...');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for required elements
  const checks = [
    { name: 'EditDocumentModal import', pattern: "import { EditDocumentModal } from './EditDocumentModal'" },
    { name: 'showEditModal state', pattern: 'const [showEditModal, setShowEditModal] = useState(false)' },
    { name: 'editingDocument state', pattern: 'const [editingDocument, setEditingDocument] = useState<FinancialDocument | null>(null)' },
    { name: 'editDocument function', pattern: 'const editDocument = (document: FinancialDocument) => {' },
    { name: 'handleSaveDocumentEdit function', pattern: 'const handleSaveDocumentEdit = async (updatedDocument: FinancialDocument) => {' },
    { name: 'EditDocumentModal component', pattern: '<EditDocumentModal' },
    { name: 'onClick editDocument', pattern: 'onClick={() => editDocument(document)}' }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    const found = content.includes(check.pattern);
    console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) allPassed = false;
  });
  
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall status: ${allPassed ? 'ALL CHECKS PASSED' : 'SOME ISSUES FOUND'}`);
  
  if (allPassed) {
    console.log('\n✅ Edit functionality should now work properly!');
    console.log('🔄 Refresh your browser and try clicking the blue edit button on a document.');
    console.log('📝 The modal should open with editable fields for:');
    console.log('   - Document Type (P&L, Balance Sheet, Cash Flow)');
    console.log('   - Start Date and End Date');
    console.log('   - Status (uploaded, approved, etc.)');
    console.log('   - Financial metrics (revenue, expenses, etc.)');
  } else {
    console.log('\n❌ Some components are still missing. Please check the errors above.');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
