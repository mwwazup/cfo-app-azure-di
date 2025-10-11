const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

console.log('🔧 Adding EditDocumentModal component to JSX...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if modal already exists
  if (content.includes('<EditDocumentModal')) {
    console.log('✅ EditDocumentModal component already exists!');
    return;
  }
  
  // Find the closing div tag before the end
  const closingDivIndex = content.lastIndexOf('    </div>');
  
  if (closingDivIndex === -1) {
    console.log('❌ Could not find closing div tag');
    return;
  }
  
  const modalComponent = `
      {/* Edit Document Modal */}
      <EditDocumentModal
        document={editingDocument}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDocument(null);
        }}
        onSave={handleSaveDocumentEdit}
      />

`;

  // Insert the modal component before the closing div
  const newContent = content.slice(0, closingDivIndex) + modalComponent + content.slice(closingDivIndex);
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Successfully added EditDocumentModal component!');
  console.log('🎉 The edit functionality should now be complete!');
  console.log('🔄 Refresh your browser to test the edit button.');

} catch (error) {
  console.error('❌ Error:', error.message);
}
