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
import gzip
import hashlib
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Dict, List, Any, Optional

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Backup version for schema compatibility
BACKUP_VERSION = "2.0"

# Tables to backup with their relationships
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

# Related data mappings (for comprehensive exports)
RELATED_DATA = {
    'pay_periods': ['employee_info', 'company_settings'],
    'employee_daily_records': ['employee_info', 'pay_periods', 'services', 'cogs_settings'],
    'service_activities': ['services'],
}

def create_backup_folder():
    """Create backups folder if it doesn't exist"""
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def calculate_checksum(data: Any) -> str:
    """Calculate SHA-256 checksum for data integrity verification"""
    json_str = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(json_str.encode()).hexdigest()

def get_date_range(data: List[Dict]) -> Optional[Dict[str, str]]:
    """Extract date range from data if date fields exist"""
    date_fields = ['date', 'created_at', 'start_date', 'period_start']
    dates = []
    
    for record in data:
        for field in date_fields:
            if field in record and record[field]:
                try:
                    dates.append(str(record[field]))
                except:
                    pass
    
    if dates:
        dates.sort()
        return {"start": dates[0], "end": dates[-1]}
    return None

def backup_table(supabase: Client, table_name: str, backup_dir: str, timestamp: str, compress: bool = True) -> Dict[str, Any]:
    """Backup a single table to JSON file with metadata and optional compression"""
    try:
        print(f"📦 Backing up {table_name}...", end=" ")
        
        # Fetch all data from table
        response = supabase.table(table_name).select('*').execute()
        data = response.data
        
        if not data:
            print(f"⚠️  Empty (0 rows)")
            return {
                "table_name": table_name,
                "record_count": 0,
                "file_size": 0,
                "compressed_size": 0,
                "checksum": None,
                "date_range": None,
                "validation_errors": []
            }
        
        # Calculate metadata
        date_range = get_date_range(data)
        checksum = calculate_checksum(data)
        
        # Create enhanced backup structure with metadata
        backup_data = {
            "metadata": {
                "export_date": datetime.now(timezone.utc).isoformat(),
                "export_version": BACKUP_VERSION,
                "table_name": table_name,
                "record_count": len(data),
                "date_range": date_range,
                "checksum": checksum,
                "schema_version": "1.0",
                "compressed": compress
            },
            "validation": {
                "total_records": len(data),
                "null_count": sum(1 for record in data if any(v is None for v in record.values())),
                "duplicate_ids": len(data) - len(set(r.get('id') for r in data if 'id' in r)),
                "errors": []
            },
            "data": data
        }
        
        # Create filename with timestamp
        filename = f"{table_name}_{timestamp}.json"
        filepath = os.path.join(backup_dir, filename)
        
        # Write to JSON file (uncompressed for reference)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, default=str)
        
        uncompressed_size = os.path.getsize(filepath)
        compressed_size = uncompressed_size
        
        # Compress if requested
        if compress:
            compressed_filename = f"{table_name}_{timestamp}.json.gz"
            compressed_filepath = os.path.join(backup_dir, compressed_filename)
            
            with open(filepath, 'rb') as f_in:
                with gzip.open(compressed_filepath, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            compressed_size = os.path.getsize(compressed_filepath)
            compression_ratio = (1 - compressed_size / uncompressed_size) * 100
            
            print(f"✅ {len(data)} rows | {uncompressed_size/1024:.1f}KB → {compressed_size/1024:.1f}KB ({compression_ratio:.0f}% saved)")
        else:
            print(f"✅ {len(data)} rows | {uncompressed_size/1024:.1f}KB")
        
        return {
            "table_name": table_name,
            "record_count": len(data),
            "file_size": uncompressed_size,
            "compressed_size": compressed_size,
            "checksum": checksum,
            "date_range": date_range,
            "validation_errors": backup_data["validation"]["errors"]
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            "table_name": table_name,
            "record_count": 0,
            "file_size": 0,
            "compressed_size": 0,
            "checksum": None,
            "date_range": None,
            "validation_errors": [str(e)]
        }

def create_backup_manifest(backup_dir: str, timestamp: str, table_stats: List[Dict[str, Any]]):
    """Create a comprehensive backup manifest with all metadata"""
    manifest_file = os.path.join(backup_dir, f"MANIFEST_{timestamp}.json")
    
    manifest = {
        "backup_info": {
            "timestamp": timestamp,
            "export_date": datetime.now(timezone.utc).isoformat(),
            "backup_version": BACKUP_VERSION,
            "total_tables": len(table_stats),
            "total_records": sum(t["record_count"] for t in table_stats),
            "total_size_bytes": sum(t["file_size"] for t in table_stats),
            "total_compressed_bytes": sum(t["compressed_size"] for t in table_stats)
        },
        "tables": table_stats,
        "validation_summary": {
            "tables_with_errors": sum(1 for t in table_stats if t["validation_errors"]),
            "total_errors": sum(len(t["validation_errors"]) for t in table_stats),
            "all_checksums_valid": all(t["checksum"] is not None for t in table_stats if t["record_count"] > 0)
        },
        "restore_instructions": {
            "step_1": "Decompress .json.gz files: gunzip *.json.gz",
            "step_2": "Verify checksums match manifest",
            "step_3": "Load data via Supabase client or dashboard",
            "step_4": "Verify record counts match manifest"
        }
    }
    
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, default=str)
    
    print(f"\n📋 Backup manifest created: MANIFEST_{timestamp}.json")
    return manifest

def create_restore_script(backup_dir: str, timestamp: str, table_stats: List[Dict[str, Any]]):
    """Create a SQL script to restore the backup"""
    restore_file = os.path.join(backup_dir, f"RESTORE_{timestamp}.sql")
    
    with open(restore_file, 'w', encoding='utf-8') as f:
        f.write(f"-- RESTORE SCRIPT FOR BACKUP: {timestamp}\n")
        f.write(f"-- Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Backup Version: {BACKUP_VERSION}\n")
        f.write(f"-- Total tables backed up: {len(table_stats)}\n")
        f.write(f"-- Total records: {sum(t['record_count'] for t in table_stats)}\n\n")
        
        f.write("-- STEP 1: Decompress backup files\n")
        f.write("-- gunzip *.json.gz\n\n")
        
        f.write("-- STEP 2: Verify checksums (see MANIFEST file)\n\n")
        
        f.write("-- STEP 3: Restore tables in dependency order\n")
        for table_stat in table_stats:
            if table_stat["record_count"] > 0:
                table = table_stat["table_name"]
                count = table_stat["record_count"]
                checksum = table_stat["checksum"][:16] if table_stat["checksum"] else "N/A"
                
                f.write(f"\n-- Restore {table} ({count} rows, checksum: {checksum}...)\n")
                f.write(f"-- File: {table}_{timestamp}.json\n")
                
                if table in RELATED_DATA:
                    f.write(f"-- Dependencies: {', '.join(RELATED_DATA[table])}\n")
                
                f.write(f"-- DELETE FROM {table}; -- Clear existing data if needed\n")
                f.write(f"-- Load JSON data using Supabase client or dashboard\n")
        
        f.write("\n-- STEP 4: Verify restoration\n")
        for table_stat in table_stats:
            if table_stat["record_count"] > 0:
                table = table_stat["table_name"]
                count = table_stat["record_count"]
                f.write(f"-- SELECT COUNT(*) FROM {table}; -- Should be {count}\n")
    
    print(f"📄 Restore script created: RESTORE_{timestamp}.sql")

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
    
    # Backup each table with compression
    table_stats = []
    
    for table in TABLES_TO_BACKUP:
        stats = backup_table(supabase, table, backup_dir, timestamp, compress=True)
        table_stats.append(stats)
    
    # Create backup manifest
    manifest = create_backup_manifest(backup_dir, timestamp, table_stats)
    
    # Create restore script
    create_restore_script(backup_dir, timestamp, table_stats)
    
    # Summary
    total_rows = sum(t["record_count"] for t in table_stats)
    total_size = sum(t["file_size"] for t in table_stats)
    total_compressed = sum(t["compressed_size"] for t in table_stats)
    compression_ratio = (1 - total_compressed / total_size) * 100 if total_size > 0 else 0
    
    print("\n" + "=" * 60)
    print(f"✅ BACKUP COMPLETE")
    print(f"📊 Total rows backed up: {total_rows:,}")
    print(f"📦 Files created: {len([t for t in table_stats if t['record_count'] > 0])} tables")
    print(f"💾 Total size: {total_size/1024:.1f}KB → {total_compressed/1024:.1f}KB ({compression_ratio:.0f}% compression)")
    print(f"🔐 All checksums calculated for integrity verification")
    print("=" * 60)
    
    # Show non-empty tables
    print("\n📋 Tables with data:")
    for table_stat in table_stats:
        if table_stat["record_count"] > 0:
            table = table_stat["table_name"]
            count = table_stat["record_count"]
            size = table_stat["compressed_size"] / 1024
            print(f"   • {table}: {count:,} rows ({size:.1f}KB compressed)")
    
    # Show validation summary
    errors = [t for t in table_stats if t["validation_errors"]]
    if errors:
        print("\n⚠️  Validation warnings:")
        for table_stat in errors:
            print(f"   • {table_stat['table_name']}: {len(table_stat['validation_errors'])} issues")
    
    print(f"\n💡 Backup saved to: {backup_dir}")
    print(f"💡 Manifest: MANIFEST_{timestamp}.json")
    print(f"💡 To restore, see: RESTORE_{timestamp}.sql")
    print(f"💡 Compressed files: *_{timestamp}.json.gz\n")

if __name__ == "__main__":
    main()
