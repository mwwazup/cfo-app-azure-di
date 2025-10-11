console.log('🔍 Debug script to check modal data issues...');

console.log('📋 Expected document fields for EditDocumentModal:');
console.log('   - document_type (string): "pnl", "balance_sheet", "cash_flow"');
console.log('   - start_date (string): "YYYY-MM-DD" format');
console.log('   - end_date (string): "YYYY-MM-DD" format');
console.log('   - status (string): "pending", "reviewed", "approved", "rejected"');
console.log('   - summary_metrics (object): { revenue: 1000, expenses: 500, ... }');
console.log('   - confidence_score (number): 0.0 to 1.0 (optional)');

console.log('\n🎨 Styling Issues Identified:');
console.log('   - Modal uses hardcoded colors (bg-white, text-gray-900)');
console.log('   - Should use CSS custom properties for theme compatibility');
console.log('   - White text on white background = hardcoded styling conflict');

console.log('\n🔄 Next Steps:');
console.log('   1. Check browser console for document structure logs');
console.log('   2. Fix modal styling to use theme-aware CSS classes');
console.log('   3. Verify document data has expected fields');

console.log('\n💡 To see the data structure:');
console.log('   - Refresh the Financial Documents page');
console.log('   - Check console for "🔍 First document structure" logs');
console.log('   - Click edit button and check "🔍 Editing document" logs');
