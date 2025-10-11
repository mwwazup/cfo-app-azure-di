const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkDocuments() {
  console.log('🔍 Checking financial_documents table...');
  console.log('📡 Supabase URL:', process.env.SUPABASE_URL);
  
  try {
    // First check if table exists and get all documents
    const { data: allDocs, error: allError } = await supabase
      .from('financial_documents')
      .select('*')
      .limit(10);
      
    if (allError) {
      console.error('❌ Error querying financial_documents:', allError.message);
      console.error('Full error:', allError);
      return;
    }
    
    console.log(`📊 Total documents in table: ${allDocs?.length || 0}`);
    
    if (allDocs && allDocs.length > 0) {
      console.log('📋 Sample documents:');
      allDocs.forEach((doc, i) => {
        console.log(`  ${i+1}. ID: ${doc.id}, User: ${doc.user_id}, Type: ${doc.document_type}, Date: ${doc.uploaded_at}`);
      });
    }
    
    // Check for specific user
    const userId = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
    console.log(`\n🔍 Checking documents for user: ${userId}`);
    
    const { data: userDocs, error: userError } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('user_id', userId);
      
    if (userError) {
      console.error('❌ Error querying user documents:', userError.message);
      return;
    }
    
    console.log(`📊 Documents for this user: ${userDocs?.length || 0}`);
    
    if (userDocs && userDocs.length > 0) {
      userDocs.forEach((doc, i) => {
        console.log(`  ${i+1}. ${doc.document_type} - ${doc.start_date} to ${doc.end_date} (${doc.status})`);
      });
    } else {
      console.log('📝 No documents found for this user. This explains why the list is empty.');
      console.log('💡 You need to upload some financial documents first, or check if they exist under a different user ID.');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDocuments().catch(console.error);
