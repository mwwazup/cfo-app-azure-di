const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for EditDocumentModal
  content = content.replace(
    "import { ManualCashFlowForm } from './ManualCashFlowForm';",
    "import { ManualCashFlowForm } from './ManualCashFlowForm';\nimport { EditDocumentModal } from './EditDocumentModal';"
  );
  
  // Add edit functions after deleteDocument function
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

  content = content.replace(
    '  };\n\n  // Calendar helper functions',
    `  };${editFunctions}\n  // Calendar helper functions`
  );
  
  // Update documents list to show loading state and add edit buttons
  content = content.replace(
    'documents.length === 0 ? (',
    'isLoadingDocuments ? (\n            <div className="p-8 text-center">\n              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>\n              <p className="text-foreground font-medium">Loading documents...</p>\n            </div>\n          ) : documents.length === 0 ? ('
  );
  
  // Add edit button to actions column
  content = content.replace(
    '<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">',
    `<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => editDocument(document)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit document"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>`
  );
  
  // Add EditDocumentModal component before closing div
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
      />`;
  
  content = content.replace(
    '      {/* Manual Cash Flow Form */}',
    `${modalComponent}\n\n      {/* Manual Cash Flow Form */}`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched FinancialStatements.tsx');
  
} catch (error) {
  console.error('Error patching file:', error);
}
