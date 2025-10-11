const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

console.log('Starting to patch FinancialStatements.tsx...');
console.log('File path:', filePath);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully, length:', content.length);
  
  // 1. Add import for EditDocumentModal
  if (!content.includes("import { EditDocumentModal }")) {
    content = content.replace(
      "import { ManualCashFlowForm } from './ManualCashFlowForm';",
      "import { ManualCashFlowForm } from './ManualCashFlowForm';\nimport { EditDocumentModal } from './EditDocumentModal';"
    );
    console.log('✓ Added EditDocumentModal import');
  } else {
    console.log('✓ EditDocumentModal import already exists');
  }
  
  // 2. Add edit functions after deleteDocument function
  const editFunctions = `
  const editDocument = (document: FinancialDocument) => {
    setEditingDocument(document);
    setShowEditModal(true);
  };

  const handleSaveDocumentEdit = async (updatedDocument: FinancialDocument) => {
    if (!dbUserId) return;

    try {
      // Update document in database
      const { supabase } = await import('../../config/supabaseClient');
      const { error } = await supabase
        .from('financial_documents')
        .update({
          document_type: updatedDocument.document_type,
          start_date: updatedDocument.start_date,
          end_date: updatedDocument.end_date,
          summary_metrics: updatedDocument.summary_metrics,
          status: updatedDocument.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedDocument.id)
        .eq('user_id', dbUserId);

      if (error) {
        throw error;
      }

      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === updatedDocument.id ? updatedDocument : doc
      ));

      // Close modal
      setShowEditModal(false);
      setEditingDocument(null);

      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      notification.innerHTML = \`
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Document updated successfully!
      \`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);

    } catch (error) {
      console.error('Error updating document:', error);
      alert(\`Error updating document: \${error instanceof Error ? error.message : 'Unknown error'}\`);
    }
  };
`;

  if (!content.includes('const editDocument = (document: FinancialDocument)')) {
    content = content.replace(
      '  };\n\n  // Calendar helper functions',
      `  };${editFunctions}\n  // Calendar helper functions`
    );
    console.log('✓ Added edit functions');
  } else {
    console.log('✓ Edit functions already exist');
  }
  
  // 3. Update documents list to show loading state
  if (!content.includes('isLoadingDocuments ?')) {
    content = content.replace(
      'documents.length === 0 ? (',
      `isLoadingDocuments ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-foreground font-medium">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (`
    );
    console.log('✓ Added loading state');
  } else {
    console.log('✓ Loading state already exists');
  }
  
  // 4. Add edit button to actions column
  if (!content.includes('onClick={() => editDocument(document)}')) {
    // Find the Eye button and add edit button after it
    const eyeButtonPattern = /<button\s+onClick=\{\(\) => viewDocument\(document\)\}[\s\S]*?<\/button>/;
    const eyeButtonMatch = content.match(eyeButtonPattern);
    
    if (eyeButtonMatch) {
      const editButton = `
                          <button
                            onClick={() => editDocument(document)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit document"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>`;
      
      content = content.replace(eyeButtonMatch[0], eyeButtonMatch[0] + editButton);
      console.log('✓ Added edit button');
    } else {
      console.log('⚠ Could not find Eye button to add edit button after');
    }
  } else {
    console.log('✓ Edit button already exists');
  }
  
  // 5. Add EditDocumentModal component
  if (!content.includes('<EditDocumentModal')) {
    // Find the Manual Cash Flow Form section and add modal before it
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
    
    content = content.replace(
      '      {/* Manual Cash Flow Form */}',
      `${modalComponent}      {/* Manual Cash Flow Form */}`
    );
    console.log('✓ Added EditDocumentModal component');
  } else {
    console.log('✓ EditDocumentModal component already exists');
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully patched FinancialStatements.tsx!');
  console.log('📄 File updated with document loading and editing functionality');
  
} catch (error) {
  console.error('❌ Error patching file:', error.message);
  process.exit(1);
}
