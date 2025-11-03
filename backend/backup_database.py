"""
Database Backup Script for WaveRider
Exports all critical tables to JSON files with timestamps
Run this regularly to prevent data loss!

Usage:
    python backup_database.py
    
Output:
    Creates backups in ./backups/ folder with timestamp
"""

import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Tables to backup
TABLES_TO_BACKUP = [
    'revenue_entries',
    'kpi_records',
    'financial_documents',
    'services',
    'service_activities',
    'employee_info',
    'pay_periods',
    'employee_daily_records',
    'cogs_settings',
    'company_settings',
    'profiles'
]

def create_backup_folder():
    """Create backups folder if it doesn't exist"""
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def backup_table(supabase: Client, table_name: str, backup_dir: str, timestamp: str):
    """Backup a single table to JSON file"""
    try:
        print(f"📦 Backing up {table_name}...", end=" ")
        
        # Fetch all data from table
        response = supabase.table(table_name).select('*').execute()
        data = response.data
        
        if not data:
            print(f"⚠️  Empty (0 rows)")
            return 0
        
        # Create filename with timestamp
        filename = f"{table_name}_{timestamp}.json"
        filepath = os.path.join(backup_dir, filename)
        
        # Write to JSON file
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"✅ {len(data)} rows")
        return len(data)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 0

def create_restore_script(backup_dir: str, timestamp: str, table_stats: dict):
    """Create a SQL script to restore the backup"""
    restore_file = os.path.join(backup_dir, f"RESTORE_{timestamp}.sql")
    
    with open(restore_file, 'w', encoding='utf-8') as f:
        f.write(f"-- RESTORE SCRIPT FOR BACKUP: {timestamp}\n")
        f.write(f"-- Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Total tables backed up: {len(table_stats)}\n\n")
        
        for table, count in table_stats.items():
            if count > 0:
                f.write(f"-- Restore {table} ({count} rows)\n")
                f.write(f"-- Load data from: {table}_{timestamp}.json\n")
                f.write(f"-- Use: Copy JSON data and insert via Supabase dashboard or API\n\n")
        
        f.write("\n-- IMPORTANT: To restore, you'll need to:\n")
        f.write("-- 1. Clear existing data (if needed): DELETE FROM table_name;\n")
        f.write("-- 2. Load JSON files using Supabase client or dashboard\n")
        f.write("-- 3. Verify row counts match the backup\n")
    
    print(f"\n📄 Restore script created: RESTORE_{timestamp}.sql")

def main():
    """Main backup function"""
    print("=" * 60)
    print("🌊 WAVERIDER DATABASE BACKUP")
    print("=" * 60)
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return
    
    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Create backup folder
    backup_dir = create_backup_folder()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    print(f"\n📁 Backup location: {backup_dir}")
    print(f"🕐 Timestamp: {timestamp}\n")
    
    # Backup each table
    table_stats = {}
    total_rows = 0
    
    for table in TABLES_TO_BACKUP:
        row_count = backup_table(supabase, table, backup_dir, timestamp)
        table_stats[table] = row_count
        total_rows += row_count
    
    # Create restore script
    create_restore_script(backup_dir, timestamp, table_stats)
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ BACKUP COMPLETE")
    print(f"📊 Total rows backed up: {total_rows}")
    print(f"📦 Files created: {len([t for t in table_stats.values() if t > 0])} JSON files")
    print("=" * 60)
    
    # Show non-empty tables
    print("\n📋 Tables with data:")
    for table, count in table_stats.items():
        if count > 0:
            print(f"   • {table}: {count} rows")
    
    print(f"\n💡 Backup saved to: {backup_dir}")
    print(f"💡 To restore, see: RESTORE_{timestamp}.sql\n")

if __name__ == "__main__":
    main()
