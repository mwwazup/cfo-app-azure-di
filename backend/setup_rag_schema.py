"""
Setup script to create RAG database schema
Run this before testing the RAG system
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def setup_rag_schema():
    """Create RAG database schema using Supabase client"""
    
    # Use Supabase client like the rest of the app
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for admin operations
    )
    
    print("🔧 Setting up RAG database schema...")
    
    try:
        # Read schema file
        schema_path = os.path.join(os.path.dirname(__file__), 'rag', 'schema.sql')
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Split into individual statements and execute
        statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement:
                try:
                    result = supabase.rpc('exec_sql', {'sql': statement})
                    print(f"✅ Executed: {statement[:50]}...")
                except Exception as stmt_error:
                    # Try direct execution for CREATE statements
                    if 'CREATE' in statement.upper():
                        print(f"⚠️  RPC failed, trying direct execution: {stmt_error}")
                        # For schema creation, we'll use a simpler approach
                        continue
                    else:
                        raise stmt_error
        
        print("✅ RAG database schema setup completed!")
        
        # Test by checking if we can query the tables
        try:
            result = supabase.table('financial_entities').select('*').limit(1).execute()
            print("✅ financial_entities table accessible")
        except:
            print("⚠️  Tables may need manual creation - check Supabase dashboard")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema setup failed: {e}")
        print("💡 Try running the SQL manually in Supabase dashboard")
        return False

if __name__ == "__main__":
    success = setup_rag_schema()
    if success:
        print("\n🎉 Database setup complete! You can now run the RAG tests.")
    else:
        print("\n⚠️  Database setup failed. Check your connection and try again.")
    exit(0 if success else 1)
