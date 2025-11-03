"""
Database Restore Script for WaveRider
Restores data from JSON backup files

Usage:
    python restore_database.py <backup_timestamp>
    
Example:
    python restore_database.py 20251102_063000
    
This will restore all tables from the backup folder with that timestamp.
"""

import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def restore_table(supabase: Client, table_name: str, backup_file: str):
    """Restore a single table from JSON backup"""
    try:
        print(f"📥 Restoring {table_name}...", end=" ")
        
        # Read backup file
        with open(backup_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            print(f"⚠️  No data to restore")
            return 0
        
        # Insert data in batches (Supabase has limits)
        batch_size = 100
        total_inserted = 0
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            response = supabase.table(table_name).insert(batch).execute()
            total_inserted += len(batch)
        
        print(f"✅ {total_inserted} rows restored")
        return total_inserted
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 0

def main():
    """Main restore function"""
    if len(sys.argv) < 2:
        print("❌ Error: Please provide backup timestamp")
        print("\nUsage: python restore_database.py <timestamp>")
        print("Example: python restore_database.py 20251102_063000")
        print("\nAvailable backups:")
        
        backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
        if os.path.exists(backup_dir):
            files = [f for f in os.listdir(backup_dir) if f.endswith('.json')]
            timestamps = set([f.split('_', 1)[1].rsplit('_', 1)[0] + '_' + f.split('_')[-1].replace('.json', '') 
                            for f in files if '_' in f])
            for ts in sorted(timestamps):
                print(f"   • {ts}")
        return
    
    timestamp = sys.argv[1]
    
    print("=" * 60)
    print("🌊 WAVERIDER DATABASE RESTORE")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Find backup files
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
    
    if not os.path.exists(backup_dir):
        print(f"❌ Error: Backup directory not found: {backup_dir}")
        return
    
    # Get all backup files for this timestamp
    backup_files = [f for f in os.listdir(backup_dir) 
                   if f.endswith(f'{timestamp}.json')]
    
    if not backup_files:
        print(f"❌ Error: No backup files found for timestamp: {timestamp}")
        return
    
    print(f"\n📁 Backup location: {backup_dir}")
    print(f"🕐 Timestamp: {timestamp}")
    print(f"📦 Files found: {len(backup_files)}\n")
    
    # Confirm restore
    print("⚠️  WARNING: This will INSERT data into your tables.")
    print("⚠️  Make sure tables are empty or you may get duplicate data!")
    response = input("\nContinue with restore? (yes/no): ")
    
    if response.lower() != 'yes':
        print("❌ Restore cancelled")
        return
    
    print()
    
    # Restore each table
    total_rows = 0
    restored_tables = {}
    
    for backup_file in sorted(backup_files):
        table_name = backup_file.replace(f'_{timestamp}.json', '')
        filepath = os.path.join(backup_dir, backup_file)
        
        row_count = restore_table(supabase, table_name, filepath)
        restored_tables[table_name] = row_count
        total_rows += row_count
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ RESTORE COMPLETE")
    print(f"📊 Total rows restored: {total_rows}")
    print(f"📦 Tables restored: {len([t for t in restored_tables.values() if t > 0])}")
    print("=" * 60)
    
    # Show restored tables
    print("\n📋 Restored tables:")
    for table, count in restored_tables.items():
        if count > 0:
            print(f"   • {table}: {count} rows")
    
    print("\n✅ Database restore complete!\n")

if __name__ == "__main__":
    main()
