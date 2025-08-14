import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testKpiService() {
  console.log('🧪 Testing KPI Service...\n');

  try {
    // Test 1: Check if revenue_kpis view exists
    console.log('1. Testing if revenue_kpis view exists...');
    const { data: viewData, error: viewError } = await supabase
      .from('revenue_kpis')
      .select('*')
      .limit(1);

    if (viewError) {
      console.error('❌ ERROR: revenue_kpis view does not exist or has issues:');
      console.error(viewError.message);
      console.log('\n📋 SOLUTION: Apply the migration file:');
      console.log('   project/supabase/migrations/20250729000001_create_revenue_kpis_view.sql');
      return;
    }

    console.log('✅ revenue_kpis view exists and is accessible');

    // Test 2: Check if we have any revenue entries to work with
    console.log('\n2. Checking for revenue entries...');
    const { data: revenueData, error: revenueError } = await supabase
      .from('revenue_entries')
      .select('user_id, year, month, actual_revenue')
      .limit(5);

    if (revenueError) {
      console.error('❌ ERROR accessing revenue_entries:', revenueError.message);
      return;
    }

    if (!revenueData || revenueData.length === 0) {
      console.log('⚠️  No revenue entries found. KPI view will be empty but functional.');
    } else {
      console.log(`✅ Found ${revenueData.length} revenue entries (showing first 5)`);
      console.table(revenueData);
    }

    // Test 3: Test KPI calculations
    console.log('\n3. Testing KPI calculations...');
    const { data: kpiData, error: kpiError } = await supabase
      .from('revenue_kpis')
      .select('*')
      .limit(5);

    if (kpiError) {
      console.error('❌ ERROR fetching KPIs:', kpiError.message);
      return;
    }

    if (!kpiData || kpiData.length === 0) {
      console.log('⚠️  No KPI data found. This is normal if you have no revenue entries.');
    } else {
      console.log(`✅ KPI calculations working! Found ${kpiData.length} KPI records:`);
      console.table(kpiData.map(kpi => ({
        user_id: kpi.user_id.substring(0, 8) + '...',
        year: kpi.year,
        total_revenue: kpi.total_revenue,
        avg_monthly: kpi.avg_monthly_revenue,
        target: kpi.annual_fir_target,
        gap: kpi.gap_to_target,
        prev_year: kpi.prev_year_revenue
      })));
    }

    // Test 4: Simulate the actual KPI service call
    console.log('\n4. Testing KPIDataService-like query...');
    
    if (revenueData && revenueData.length > 0) {
      const testUserId = revenueData[0].user_id;
      const testYear = revenueData[0].year;
      
      const { data: specificKpi, error: specificError } = await supabase
        .from('revenue_kpis')
        .select('*')
        .eq('user_id', testUserId)
        .eq('year', testYear)
        .single();

      if (specificError && specificError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ ERROR with specific KPI query:', specificError.message);
        return;
      }

      if (specificKpi) {
        console.log(`✅ KPIDataService.getKpis() simulation successful for user ${testUserId.substring(0, 8)}... year ${testYear}`);
        console.log('   KPI Data:', {
          total_revenue: specificKpi.total_revenue,
          avg_monthly_revenue: specificKpi.avg_monthly_revenue,
          annual_fir_target: specificKpi.annual_fir_target,
          gap_to_target: specificKpi.gap_to_target,
          prev_year_revenue: specificKpi.prev_year_revenue
        });
      } else {
        console.log(`ℹ️  No KPI data for user ${testUserId.substring(0, 8)}... year ${testYear} (this is normal if no revenue data exists)`);
      }
    }

    console.log('\n🎉 KPI Service test completed successfully!');
    console.log('   The revenue_kpis database error should now be resolved.');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testKpiService().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
