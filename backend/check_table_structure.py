"""
Check the actual table structure in your database
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def check_table_structure():
    """Check what columns actually exist in the RAG tables"""
    
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
        os.getenv("SUPABASE_SERVICE_KEY") or 
        os.getenv("SUPABASE_ANON_KEY")
    )
    
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        supabase_key
    )
    
    tables_to_check = [
        'financial_entities',
        'financial_relationships', 
        'action_recommendations'
    ]
    
    print("🔍 Checking actual table structures...")
    print("=" * 50)
    
    for table_name in tables_to_check:
        print(f"\n📋 Table: {table_name}")
        try:
            # Try to get table structure by attempting an insert with empty data
            result = supabase.table(table_name).select('*').limit(1).execute()
            print(f"   ✅ Table exists, found {len(result.data)} rows")
            
            # Try a simple insert to see what columns are required
            try:
                test_insert = supabase.table(table_name).insert({}).execute()
            except Exception as insert_error:
                error_msg = str(insert_error)
                if 'null value in column' in error_msg:
                    # Extract required columns from error
                    import re
                    matches = re.findall(r'null value in column "([^"]+)"', error_msg)
                    if matches:
                        print(f"   📝 Required columns: {', '.join(matches)}")
                elif 'violates not-null constraint' in error_msg:
                    matches = re.findall(r'column "([^"]+)"', error_msg)
                    if matches:
                        print(f"   📝 Required columns: {', '.join(matches)}")
                else:
                    print(f"   ⚠️  Insert error: {error_msg}")
            
        except Exception as e:
            print(f"   ❌ Error accessing table: {e}")
    
    # Check if we can see the revenue entries structure for comparison
    print(f"\n📋 Reference table: revenue_entries")
    try:
        result = supabase.table('revenue_entries').select('*').limit(1).execute()
        if result.data:
            sample_row = result.data[0]
            print(f"   ✅ Sample columns: {', '.join(sample_row.keys())}")
        else:
            print("   ⚠️  No data found")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    check_table_structure()
