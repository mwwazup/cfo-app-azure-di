#!/usr/bin/env python3
"""
Run a specific SQL migration file against the Supabase database
"""

import os
import sys
from supabase import create_client, Client

def run_migration(migration_file: str):
    """Run a SQL migration file"""
    
    # Get Supabase credentials from environment
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment")
        sys.exit(1)
    
    # Read migration file
    migration_path = os.path.join("migrations", migration_file)
    if not os.path.exists(migration_path):
        print(f"❌ Error: Migration file not found: {migration_path}")
        sys.exit(1)
    
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print(f"📄 Running migration: {migration_file}")
    print(f"📊 SQL content length: {len(sql_content)} characters")
    print()
    
    # Note: Supabase Python client doesn't support raw SQL execution
    # You need to run this via the Supabase SQL Editor or use psql
    print("⚠️  IMPORTANT: This migration must be run manually via:")
    print()
    print("Option 1: Supabase Dashboard")
    print("  1. Go to https://supabase.com/dashboard")
    print("  2. Select your project")
    print("  3. Go to SQL Editor")
    print("  4. Paste the SQL from the migration file")
    print("  5. Click 'Run'")
    print()
    print("Option 2: psql command line")
    print(f"  psql <your-connection-string> -f {migration_path}")
    print()
    print(f"📄 Migration file location: {os.path.abspath(migration_path)}")
    
    # Print the SQL for easy copy-paste
    print()
    print("=" * 80)
    print("SQL TO RUN:")
    print("=" * 80)
    print(sql_content)
    print("=" * 80)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <migration_file>")
        print("Example: python run_migration.py 14_make_pay_periods_company_wide.sql")
        sys.exit(1)
    
    migration_file = sys.argv[1]
    run_migration(migration_file)
