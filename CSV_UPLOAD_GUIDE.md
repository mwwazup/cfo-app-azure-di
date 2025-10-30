# CSV Upload Guide for Financial Documents

## Overview

You can now upload financial data via CSV files! This feature allows you to quickly import P&L statements from spreadsheets, accounting software exports, or manual data entry.

## Supported Document Types

- ✅ **Profit & Loss (P&L)** - Fully supported
- ⏳ **Balance Sheet** - Coming soon
- ⏳ **Cash Flow** - Coming soon

## CSV Format Requirements

### File Requirements
- **File Extension**: `.csv`
- **Max File Size**: 5MB
- **Encoding**: UTF-8 (recommended)

### Data Format

Your CSV should have **2 columns**:
1. **Column 1**: Field Name (label)
2. **Column 2**: Value (amount)

**Optional**: You can include a header row (it will be automatically detected and skipped)

## Sample P&L CSV Format

```csv
Label,Amount
Total Revenue,150000
Cost of Goods Sold,90000
Operating Expenses,30000
Net Income,30000
Owner Distributions,10000
```

Or without headers:

```csv
Total Revenue,150000
Cost of Goods Sold,90000
Operating Expenses,30000
Net Income,30000
Owner Distributions,10000
```

## Supported Field Names

The CSV parser recognizes multiple variations of common financial terms:

### Revenue Fields
- `Revenue`, `Total Revenue`, `Sales`, `Income`, `Gross Revenue`

### Cost of Goods Sold (COGS)
- `COGS`, `Cost of Goods Sold`, `Cost of Sales`, `Direct Costs`

### Operating Expenses
- `Operating Expenses`, `OpEx`, `Expenses`, `Overhead`

### Net Income/Profit
- `Net Income`, `Net Profit`, `Profit`, `Bottom Line`

### Gross Profit
- `Gross Profit`, `Gross Margin`

### Owner Distributions
- `Owner Distributions`, `Owner Draws`, `Distributions`, `Draws`

## Value Formatting

The parser accepts multiple formats:

### Supported Formats
- ✅ Plain numbers: `150000`
- ✅ With commas: `150,000`
- ✅ With dollar signs: `$150,000`
- ✅ With decimals: `150000.50`
- ✅ Negative in parentheses: `(5000)` = -5000
- ✅ Negative with minus: `-5000`

### Examples
```csv
Total Revenue,$150,000.00
COGS,90000
Operating Expenses,$30,000
Net Income,30000.00
Owner Draws,(10000)
```

## How to Upload

1. **Prepare your CSV file** using the format above
2. **Go to Financial Statements page**
3. **Click "Upload P&L"** button
4. **Select your CSV file**
5. **Review the parsed data** in the modal
6. **Set start/end dates** using one of these methods:
   - **Quick Select**: Click "Full Year 2025" for annual statements
   - **Quick Select**: Click "Current Quarter" for quarterly data
   - **Quick Select**: Click "Current Month" for monthly data
   - **Quick Select**: Click "Year to Date" for YTD data
   - **Manual**: Click individual dates on the calendar
7. **Click "Approve"** to save

## Automatic Calculations

The CSV parser will automatically calculate missing fields:

- **Gross Profit** = Total Revenue - COGS (if not provided)
- **Net Income** = Total Revenue - COGS - Operating Expenses (if not provided)

## Example CSV Files

### Simple P&L
```csv
Total Revenue,150000
Cost of Goods Sold,90000
Operating Expenses,30000
```

The system will calculate:
- Gross Profit: $60,000
- Net Income: $30,000

### Detailed P&L
```csv
Revenue,$150,000.00
COGS,$90,000.00
Gross Profit,$60,000.00
Operating Expenses,$30,000.00
Net Income,$30,000.00
Owner Distributions,$10,000.00
```

### With Negative Values
```csv
Total Revenue,150000
Cost of Goods Sold,90000
Operating Expenses,30000
Net Income,30000
Owner Draws,(10000)
```

## Exporting from Common Tools

### QuickBooks
1. Go to Reports → Profit & Loss
2. Click "Export" → "Export to Excel"
3. Open in Excel/Google Sheets
4. Delete unnecessary rows (keep only label + amount columns)
5. Save as CSV

### Excel/Google Sheets
1. Create 2 columns: Label, Amount
2. Enter your financial data
3. File → Save As → CSV

### Wave Accounting
1. Reports → Profit & Loss
2. Export → CSV
3. Clean up the file to match the format above

## Troubleshooting

### "CSV file is empty"
- Make sure your file has at least one row of data
- Check that the file is actually a CSV (not Excel .xlsx)

### "Failed to parse CSV file"
- Verify the file has 2 columns
- Check for special characters or formatting issues
- Try removing the header row

### "Invalid CSV file"
- Check file extension is `.csv`
- Verify file size is under 5MB
- Make sure the file isn't corrupted

### Values showing as $0
- Check that amounts are in column 2
- Verify numbers don't have extra spaces
- Remove any text from the amount column

## Tips for Best Results

1. **Keep it simple**: 2 columns only (Label, Amount)
2. **Use standard names**: Stick to common terms like "Revenue", "COGS", "Expenses"
3. **Clean data**: Remove extra rows, headers, footers, or formatting
4. **Test with small file**: Try a simple 3-5 row CSV first
5. **Review before saving**: Always check the parsed data in the review modal

## Future Enhancements

Coming soon:
- Balance Sheet CSV import
- Cash Flow CSV import
- Multi-period CSV import (multiple months in one file)
- Custom field mapping
- CSV export functionality

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your CSV matches the format above
3. Try the sample CSV format provided
4. Contact support with your CSV file (remove sensitive data first)
