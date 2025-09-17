"""
Simple script to create RAG tables directly
This bypasses complex connection issues
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def create_rag_tables():
    """Create RAG tables using simple Supabase operations"""
    
    # Try different environment variable names for Supabase key
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_KEY") or 
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
        os.getenv("SUPABASE_ANON_KEY")
    )
    
    if not supabase_key:
        print("❌ No Supabase key found. Check your .env file has:")
        print("   SUPABASE_SERVICE_ROLE_KEY=your_service_key")
        print("   or SUPABASE_ANON_KEY=your_anon_key")
        return False
    
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        supabase_key
    )
    
    print("🔧 Creating RAG tables...")
    
    # Test connection first
    try:
        # Simple test query
        result = supabase.table('revenue_entries').select('*').limit(1).execute()
        print("✅ Supabase connection successful")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False
    
    # Check if tables already exist
    tables_to_check = [
        'financial_entities',
        'financial_relationships', 
        'temporal_contexts',
        'action_recommendations',
        'answer_evidence'
    ]
    
    existing_tables = []
    for table_name in tables_to_check:
        try:
            result = supabase.table(table_name).select('*').limit(1).execute()
            existing_tables.append(table_name)
            print(f"✅ Table '{table_name}' already exists")
        except:
            print(f"⚠️  Table '{table_name}' needs to be created")
    
    if len(existing_tables) == len(tables_to_check):
        print("🎉 All RAG tables already exist!")
        return True
    
    print("\n💡 RAG tables need to be created manually in Supabase dashboard.")
    print("📋 Copy and paste this SQL into your Supabase SQL Editor:")
    print("=" * 60)
    
    # Read and display the schema
    schema_path = os.path.join(os.path.dirname(__file__), 'rag', 'schema.sql')
    try:
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        print(schema_sql)
    except FileNotFoundError:
        print("❌ Schema file not found at:", schema_path)
        return False
    
    print("=" * 60)
    print("\n🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql")
    print("📝 Paste the SQL above and click 'Run'")
    print("\n⏳ After running the SQL, restart this script to verify tables were created.")
    
    return False

if __name__ == "__main__":
    success = create_rag_tables()
    if success:
        print("\n🎉 All RAG tables are ready!")
    else:
        print("\n⚠️  Manual table creation required.")
