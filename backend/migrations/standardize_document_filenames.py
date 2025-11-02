"""
Migration: Standardize Financial Document Filenames

This migration updates all financial document filenames to follow a consistent format:
{YYYY}_{MM}_{month_name}_{document_type}.csv

Format Examples:
- 2025_06_june_pnl.csv
- 2025_03_march_balance_sheet.csv
- 2024_12_december_cash_flow.csv

This ensures:
1. Consistent date extraction from filenames
2. No period mismatches in document list
3. Predictable sorting and filtering
"""

import os
import sys
from datetime import datetime
from typing import Optional

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Month names mapping
MONTH_NAMES = {
    1: 'january',
    2: 'february',
    3: 'march',
    4: 'april',
    5: 'may',
    6: 'june',
    7: 'july',
    8: 'august',
    9: 'september',
    10: 'october',
    11: 'november',
    12: 'december'
}

# Document type mapping
DOC_TYPE_MAP = {
    'pnl': 'pnl',
    'profit_loss': 'pnl',
    'p&l': 'pnl',
    'income_statement': 'pnl',
    'balance_sheet': 'balance_sheet',
    'balance': 'balance_sheet',
    'cash_flow': 'cash_flow',
    'cashflow': 'cash_flow',
    'cash': 'cash_flow'
}


def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")
    
    return create_client(url, key)


def standardize_filename(
    start_date: str,
    document_type: str,
    original_filename: Optional[str] = None
) -> str:
    """
    Generate standardized filename from document metadata.
    
    Args:
        start_date: ISO format date string (YYYY-MM-DD)
        document_type: Document type (pnl, balance_sheet, cash_flow)
        original_filename: Original filename for reference
    
    Returns:
        Standardized filename in format: YYYY_MM_monthname_doctype.ext
    """
    try:
        # Parse start date
        date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        year = date_obj.year
        month = date_obj.month
        month_name = MONTH_NAMES[month]
        
        # Normalize document type
        doc_type_normalized = DOC_TYPE_MAP.get(document_type.lower(), document_type.lower())
        
        # Determine file extension from original filename
        extension = '.csv'  # Default
        if original_filename:
            if original_filename.lower().endswith('.pdf'):
                extension = '.pdf'
            elif original_filename.lower().endswith('.png'):
                extension = '.png'
            elif original_filename.lower().endswith('.xlsx'):
                extension = '.xlsx'
        
        # Generate standardized filename
        standardized = f"{year}_{month:02d}_{month_name}_{doc_type_normalized}{extension}"
        
        return standardized
        
    except Exception as e:
        print(f"Error standardizing filename: {e}")
        return original_filename or f"unknown_{document_type}.csv"


def migrate_document_filenames(dry_run: bool = True):
    """
    Migrate all financial document filenames to standardized format.
    
    Args:
        dry_run: If True, only print changes without updating database
    """
    print("=" * 80)
    print("FINANCIAL DOCUMENT FILENAME STANDARDIZATION MIGRATION")
    print("=" * 80)
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE UPDATE'}")
    print()
    
    try:
        # Initialize Supabase client
        supabase = get_supabase_client()
        print("✅ Connected to Supabase")
        print()
        
        # Fetch all financial documents
        response = supabase.table('financial_documents').select('*').execute()
        documents = response.data
        
        print(f"📄 Found {len(documents)} documents to process")
        print()
        
        # Track statistics
        stats = {
            'total': len(documents),
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        
        # Process each document
        for doc in documents:
            doc_id = doc.get('id')
            original_filename = doc.get('filename', '')
            start_date = doc.get('start_date')
            document_type = doc.get('document_type', 'pnl')
            
            # Skip if missing required fields
            if not start_date:
                print(f"⚠️  Skipping document {doc_id}: Missing start_date")
                stats['skipped'] += 1
                continue
            
            # Generate standardized filename
            new_filename = standardize_filename(start_date, document_type, original_filename)
            
            # Check if filename needs updating
            if original_filename == new_filename:
                print(f"✓ Document {doc_id}: Already standardized - {new_filename}")
                stats['skipped'] += 1
                continue
            
            # Show the change
            print(f"📝 Document {doc_id}:")
            print(f"   Old: {original_filename}")
            print(f"   New: {new_filename}")
            
            # Update database if not dry run
            if not dry_run:
                try:
                    supabase.table('financial_documents').update({
                        'filename': new_filename
                    }).eq('id', doc_id).execute()
                    print(f"   ✅ Updated")
                    stats['updated'] += 1
                except Exception as e:
                    print(f"   ❌ Error: {e}")
                    stats['errors'] += 1
            else:
                print(f"   [DRY RUN - would update]")
                stats['updated'] += 1
            
            print()
        
        # Print summary
        print("=" * 80)
        print("MIGRATION SUMMARY")
        print("=" * 80)
        print(f"Total documents:     {stats['total']}")
        print(f"Updated:             {stats['updated']}")
        print(f"Already standard:    {stats['skipped']}")
        print(f"Errors:              {stats['errors']}")
        print()
        
        if dry_run:
            print("⚠️  This was a DRY RUN - no changes were made to the database")
            print("   Run with --live flag to apply changes")
        else:
            print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Standardize financial document filenames')
    parser.add_argument('--live', action='store_true', help='Apply changes to database (default is dry run)')
    args = parser.parse_args()
    
    migrate_document_filenames(dry_run=not args.live)
