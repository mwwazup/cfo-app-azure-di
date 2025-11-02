# Financial Document Filename Standardization Migration

## Purpose
This migration standardizes all financial document filenames to a consistent format, preventing period mismatches in the document list.

## Standard Format
```
{YYYY}_{MM}_{month_name}_{document_type}.{extension}
```

### Examples:
- `2025_06_june_pnl.csv`
- `2025_03_march_balance_sheet.pdf`
- `2024_12_december_cash_flow.xlsx`

## Benefits
1. **Consistent date extraction** - No more off-by-one month errors
2. **Predictable sorting** - Documents sort correctly by filename
3. **Timezone-safe** - Works globally, not just Mountain Time
4. **No period mismatches** - Filename always matches start_date

## Usage

### Dry Run (Preview Changes)
```bash
cd backend/migrations
python standardize_document_filenames.py
```

This will show you what changes would be made without actually updating the database.

### Live Update
```bash
python standardize_document_filenames.py --live
```

This will apply the changes to your database.

## What It Does

1. Fetches all documents from `financial_documents` table
2. For each document:
   - Extracts `start_date` and `document_type`
   - Generates standardized filename
   - Compares with existing filename
   - Updates if different (or shows preview in dry run)
3. Prints summary statistics

## Safety Features

- **Dry run by default** - Must explicitly use `--live` flag
- **Skips documents** with missing start_date
- **Preserves file extensions** from original filename
- **Error handling** - Continues processing even if one document fails
- **Detailed logging** - Shows every change being made

## After Migration

All new uploads will automatically use the standardized format, so you only need to run this migration once for existing documents.
