// Debug script to check document dates - paste this in your browser console
// This will help us see what dates your documents actually have

// Get the documents from the component state
// You'll need to open the WhereDidTheMoneyGo component and run this

console.log('🔍 DEBUG: Document dates analysis');

// If you can access the documents array, run:
const documents = /* your documents array here */;

documents.forEach((doc, index) => {
  console.log(`Document ${index + 1}:`, {
    id: doc.id,
    filename: doc.filename,
    start_date: doc.start_date,
    end_date: doc.end_date,
    analysis_result_start_date: doc.analysis_result?.start_date,
    analysis_result_end_date: doc.analysis_result?.end_date,
    created_at: doc.created_at,
    uploaded_at: doc.uploaded_at
  });
});

// Also check what the current filter values are
console.log('Current filter values:', {
  filterYear: /* current filter year */,
  filterMonth: /* current filter month */,
  currentDate: new Date()
});

// Test the date parsing logic
documents.forEach((doc, index) => {
  const startDate = doc.start_date || doc.analysis_result?.start_date || '';
  if (startDate) {
    const docDate = new Date(startDate + 'T00:00:00');
    console.log(`Document ${index + 1} date parsing:`, {
      original_startDate: startDate,
      parsed_date: docDate,
      year: docDate.getFullYear(),
      month: docDate.getMonth() + 1,
      isValid: !isNaN(docDate.getTime())
    });
  }
});
