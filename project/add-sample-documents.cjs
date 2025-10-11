const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function addSampleDocuments() {
  console.log('📝 Adding sample financial documents...');
  const userId = 'f55cbadc-2ecc-4ec3-8732-3ecd9dabf04f';
  
  const sampleDocuments = [
    {
      user_id: userId,
      document_type: 'pnl',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      raw_json: {
        total_revenue: { value: 45000 },
        cost_of_goods_sold: { value: 18000 },
        operating_expenses: { value: 15000 },
        net_income: { value: 12000 }
      },
      summary_metrics: {
        total_revenue: 45000,
        cost_of_goods_sold: 18000,
        operating_expenses: 15000,
        net_income: 12000,
        gross_profit: 27000
      },
      confidence_score: 0.95,
      status: 'approved',
      source: 'sample_data'
    },
    {
      user_id: userId,
      document_type: 'pnl',
      start_date: '2024-02-01',
      end_date: '2024-02-29',
      raw_json: {
        total_revenue: { value: 52000 },
        cost_of_goods_sold: { value: 20800 },
        operating_expenses: { value: 16000 },
        net_income: { value: 15200 }
      },
      summary_metrics: {
        total_revenue: 52000,
        cost_of_goods_sold: 20800,
        operating_expenses: 16000,
        net_income: 15200,
        gross_profit: 31200
      },
      confidence_score: 0.92,
      status: 'approved',
      source: 'sample_data'
    },
    {
      user_id: userId,
      document_type: 'balance_sheet',
      start_date: '2024-03-31',
      end_date: '2024-03-31',
      raw_json: {
        total_assets: { value: 125000 },
        total_liabilities: { value: 45000 },
        total_equity: { value: 80000 }
      },
      summary_metrics: {
        total_assets: 125000,
        current_assets: 75000,
        total_liabilities: 45000,
        current_liabilities: 25000,
        total_equity: 80000
      },
      confidence_score: 0.88,
      status: 'pending',
      source: 'sample_data'
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('financial_documents')
      .insert(sampleDocuments)
      .select();
      
    if (error) {
      console.error('❌ Error inserting sample documents:', error.message);
      console.error('Full error:', error);
      return;
    }
    
    console.log(`✅ Successfully added ${data.length} sample documents!`);
    console.log('📋 Documents added:');
    data.forEach((doc, i) => {
      console.log(`  ${i+1}. ${doc.document_type.toUpperCase()} - ${doc.start_date} to ${doc.end_date} (${doc.status})`);
    });
    
    console.log('\n🎉 You can now refresh the Financial Documents page to see these entries!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addSampleDocuments().catch(console.error);
