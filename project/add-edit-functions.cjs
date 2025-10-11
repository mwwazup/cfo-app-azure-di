const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

console.log('🔧 Adding missing editDocument functions...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // The exact string to find and replace
  const searchString = `  const deleteDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    await initiateDocumentDeletion(document);
  };

  // Calendar helper functions`;

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

  const replacementString = `  const deleteDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    await initiateDocumentDeletion(document);
  };
${editFunctions}
  // Calendar helper functions`;

  if (content.includes(searchString)) {
    content = content.replace(searchString, replacementString);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully added editDocument functions!');
    console.log('🔄 The edit button should now work when you refresh the page.');
  } else {
    console.log('❌ Could not find the exact search string');
    console.log('💡 The file structure might be different than expected');
    
    // Try to find where to insert the functions
    if (content.includes('const deleteDocument')) {
      console.log('✅ Found deleteDocument function');
      console.log('💡 Manual insertion might be needed');
    }
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}
