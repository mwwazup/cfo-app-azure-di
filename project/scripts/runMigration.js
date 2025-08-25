import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    const migrationPath = join(__dirname, '..', '..', 'backend', 'migrations', '03_create_document_metrics_tables.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running migration...');
    
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' });
      if (error) {
        console.error('❌ Migration statement failed:', error);
        throw error;
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
