const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'financial', 'FinancialStatements.tsx');

console.log('🔧 Adding editDocument functions with simple approach...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if functions already exist
  if (content.includes('const editDocument')) {
    console.log('✅ editDocument function already exists!');
    return;
  }
  
  // Find the return statement and add functions before it
  const returnIndex = content.lastIndexOf('  return (');
  
  if (returnIndex === -1) {
    console.log('❌ Could not find return statement');
    return;
  }
  
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

  // Insert the functions before the return statement
  const newContent = content.slice(0, returnIndex) + editFunctions + content.slice(returnIndex);
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Successfully added editDocument functions!');
  console.log('🔄 Refresh your browser - the edit button should now work!');

} catch (error) {
  console.error('❌ Error:', error.message);
}
