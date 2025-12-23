/**
 * Migration Script: Fix Crew LER Values
 * 
 * This script corrects the LER values for crew records.
 * When crew records were originally created, each member got their own calculated LER
 * based on individual pay rate and split revenue. This was incorrect - all crew members
 * on the same crew day should have the SAME crew-level LER.
 * 
 * This migration:
 * 1. Finds all crew records (is_crew_job = true) grouped by date + crew_id
 * 2. Calculates the correct crew-level LER (total gross profit / total labor cost)
 * 3. Updates all member records for that crew day with the same LER value
 * 
 * IMPORTANT: This ONLY affects crew records. Solo records are NOT touched.
 * 
 * To run: npx ts-node src/scripts/migrateCrewLER.ts
 */

import { createClient } from '@supabase/supabase-js';

// You'll need to set these environment variables or replace with your values
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface CrewRecord {
  id: string;
  date: string;
  crew_id: string;
  employee_id: string;
  gross_profit_before_bonus: number;
  employee_base_pay: number;
  ler: number;
}

async function migrateCrewLER() {
  console.log('🚀 Starting Crew LER Migration...');
  console.log('⚠️  This will ONLY update crew records (is_crew_job = true)');
  console.log('✅ Solo records will NOT be affected\n');

  // Step 1: Fetch all crew records
  const { data: crewRecords, error: fetchError } = await supabase
    .from('employee_daily_records')
    .select('id, date, crew_id, employee_id, gross_profit_before_bonus, employee_base_pay, ler')
    .eq('is_crew_job', true)
    .not('crew_id', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching crew records:', fetchError);
    return;
  }

  if (!crewRecords || crewRecords.length === 0) {
    console.log('ℹ️  No crew records found. Nothing to migrate.');
    return;
  }

  console.log(`📊 Found ${crewRecords.length} crew records to process\n`);

  // Step 2: Group records by date + crew_id
  const crewDayGroups = new Map<string, CrewRecord[]>();
  
  crewRecords.forEach((record: CrewRecord) => {
    const key = `${record.date}-${record.crew_id}`;
    const existing = crewDayGroups.get(key);
    if (existing) {
      existing.push(record);
    } else {
      crewDayGroups.set(key, [record]);
    }
  });

  console.log(`📅 Grouped into ${crewDayGroups.size} unique crew days\n`);

  // Step 3: Calculate correct crew LER for each group and update records
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const [key, records] of crewDayGroups) {
    const [date, crewId] = key.split('-');
    
    // Calculate total gross profit and total labor cost for the crew day
    const totalGrossProfit = records.reduce((sum, r) => sum + (r.gross_profit_before_bonus || 0), 0);
    const totalLaborCost = records.reduce((sum, r) => sum + (r.employee_base_pay || 0), 0);
    
    // Calculate crew-level LER
    const crewLER = totalLaborCost > 0 ? totalGrossProfit / totalLaborCost : 0;
    
    // Check if all records already have the correct LER (within tolerance)
    const allCorrect = records.every(r => Math.abs(r.ler - crewLER) < 0.01);
    
    if (allCorrect) {
      skippedCount += records.length;
      continue;
    }

    console.log(`📝 Crew day ${date} (crew: ${crewId?.substring(0, 8)}...):`);
    console.log(`   Members: ${records.length}`);
    console.log(`   Total Gross Profit: $${totalGrossProfit.toFixed(2)}`);
    console.log(`   Total Labor Cost: $${totalLaborCost.toFixed(2)}`);
    console.log(`   Crew LER: ${crewLER.toFixed(2)}`);
    console.log(`   Current LERs: ${records.map(r => r.ler.toFixed(2)).join(', ')}`);

    // Update all records in this group with the crew LER
    for (const record of records) {
      const { error: updateError } = await supabase
        .from('employee_daily_records')
        .update({ ler: crewLER })
        .eq('id', record.id);

      if (updateError) {
        console.error(`   ❌ Error updating record ${record.id}:`, updateError);
        errorCount++;
      } else {
        updatedCount++;
      }
    }
    
    console.log(`   ✅ Updated ${records.length} records to LER: ${crewLER.toFixed(2)}\n`);
  }

  // Summary
  console.log('\n========== Migration Complete ==========');
  console.log(`✅ Updated: ${updatedCount} records`);
  console.log(`⏭️  Skipped (already correct): ${skippedCount} records`);
  console.log(`❌ Errors: ${errorCount} records`);
  console.log('=========================================\n');
}

// Run the migration
migrateCrewLER()
  .then(() => {
    console.log('🏁 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
