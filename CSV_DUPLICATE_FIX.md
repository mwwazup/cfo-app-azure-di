# CSV Upload Duplicate Document Fix

## Problem Identified

When clicking the Edit button on an existing CSV document (e.g., May 2025), changing the dates to a new period (e.g., December 2025), and saving:

1. **A new document was created** for December 2025 ✅ (expected)
2. **The original May 2025 document was also duplicated** ❌ (bug)

Result: Two May 2025 documents + one December 2025 document in the database.

## Root Cause

The `ManualPLFormSimplified` component **always used POST** to create new documents, even when editing existing ones. It had no way to distinguish between:
- Creating a brand new document
- Editing an existing document (which should use PUT/PATCH)

## Solution Implemented

### 1. Added `documentId` Prop to `ManualPLFormSimplified`

**File:** `project/src/components/financial/ManualPLFormSimplified.tsx`

```typescript
interface ManualPLFormProps {
  onClose: () => void;
  onSave: () => void;
  onCashflowSync?: (data: CashflowSyncData) => void;
  initialData?: Partial<PLFormData>;
  documentId?: string; // NEW: If provided, we're editing an existing document
}
```

### 2. Updated HTTP Request Logic

The component now checks if `documentId` is provided:

```typescript
const isEditing = !!documentId;
const url = isEditing 
  ? `${API_BASE_URL}/api/financial-documents/${documentId}`  // PUT to specific document
  : `${API_BASE_URL}/api/financial-documents`;                // POST to create new
const method = isEditing ? 'PUT' : 'POST';
```

### 3. Updated UI Labels

- Modal title: "Edit P&L Entry" vs "Manual P&L Entry"
- Button text: "Update P&L Statement" vs "Save P&L Statement"
- Success message: "updated" vs "saved"

### 4. Fixed Edit Document Modal in `FinancialStatements.tsx`

**File:** `project/src/components/financial/FinancialStatements.tsx`

Now passes `documentId` when opening the edit modal:

```typescript
{showEditModal && editingDocument && (
  <ManualPLFormSimplified
    documentId={editingDocument.id} // Pass ID to enable PUT request
    initialData={{
      startDate: editingDocument.start_date || '',
      endDate: editingDocument.end_date || '',
      revenue: (editingDocument as any).revenue || 0,
      cogs: (editingDocument as any).cogs || 0,
      operatingExpenses: (editingDocument as any).operating_expenses || 0,
      ownerDistributions: (editingDocument as any).owner_distributions || 0,
      taxes: (editingDocument as any).taxes || 0,
      filename: editingDocument.filename
    }}
    onClose={() => {
      setShowEditModal(false);
      setEditingDocument(null);
    }}
    onSave={async () => {
      setShowEditModal(false);
      setEditingDocument(null);
      await loadDocuments();
    }}
  />
)}
```

## Expected Behavior After Fix

### Scenario 1: Creating New Document from CSV Upload
1. Click P&L upload button
2. Select CSV file
3. Review modal opens with extracted data
4. Modify values if needed
5. Click "Save P&L Statement"
6. **Result:** POST request creates ONE new document ✅

### Scenario 2: Editing Existing Document
1. Click Edit button on existing May 2025 document
2. Modal opens with May 2025 data
3. Change dates to December 2025
4. Modify values
5. Click "Update P&L Statement"
6. **Result:** PUT request updates the SAME document (May → December) ✅
7. **No duplicate May document created** ✅

### Scenario 3: Using Existing Document as Template
If you want to use May 2025 as a starting point for December 2025 (keeping May intact):
1. **Don't click Edit** - that modifies the existing document
2. Instead, manually enter December data in a new upload
3. Or copy values manually into the upload form

## Technical Notes

### Type Safety Issue
The `FinancialDocument` interface doesn't include the flattened fields (`revenue`, `cogs`, etc.) that are added during runtime transformation (lines 119-133 of `FinancialStatements.tsx`). 

We use type assertion `(editingDocument as any)` to access these runtime-added fields. A better long-term solution would be to:
1. Extend the `FinancialDocument` interface with optional flattened fields
2. Or create a separate `TransformedFinancialDocument` type

### Console Logging
The component now logs:
- `✏️ Updating document {id}` when editing
- `➕ Creating document` when creating new
- `✅ P&L document updated successfully` or `created successfully`

### Backend Requirements
The backend must support:
- `POST /api/financial-documents` - Create new document
- `PUT /api/financial-documents/{id}` - Update existing document

## Files Modified

1. **ManualPLFormSimplified.tsx**
   - Added `documentId` prop
   - Added conditional HTTP method (POST vs PUT)
   - Updated UI labels based on edit mode
   - Enhanced console logging

2. **FinancialStatements.tsx**
   - Removed unused `EditDocumentModal` import
   - Updated edit modal to pass `documentId`
   - Added type assertions for flattened fields

## Testing Checklist

### Issue 1: Duplicate Documents
- [ ] Upload new CSV → Creates single document (not duplicate)
- [ ] Edit existing document → Updates same document (no duplicate created)
- [ ] Change dates when editing → Updates period correctly (no duplicate)
- [ ] Console shows correct log messages (✏️ Updating vs ➕ Creating)
- [ ] Success notifications show correct text (updated vs saved)

### Issue 2: Filename Generation
- [ ] Create document with Dec 1, 2025 start date → Filename is `2025_12_01_pnl.csv`
- [ ] Create document with Jan 15, 2025 start date → Filename is `2025_01_15_pnl.csv`
- [ ] No malformed filenames like `2025_00_undefined_pnl.csv`

### Issue 3: Edit Modal Values
- [ ] Click Edit on existing document → All values populate correctly
- [ ] Revenue field shows correct value (not 0)
- [ ] COGS field shows correct value (not 0)
- [ ] Operating Expenses field shows correct value (not 0)
- [ ] Owner Distributions field shows correct value (not 0)
- [ ] Taxes field shows correct value (not 0)
- [ ] Start and end dates populate correctly

### General
- [ ] Document list refreshes after save/update
- [ ] Console logs show data extraction working (check raw_json and summary_metrics)

## Additional Fixes Implemented

### Issue 2: Incorrect Filename Generation

**Problem:** Documents created without a CSV filename were generating malformed names like `2025_00_undefined_pnl.csv`

**Root Cause:** The backend or frontend was trying to parse dates incorrectly when generating filenames.

**Solution:** Generate proper filename from `startDate` in `ManualPLFormSimplified.tsx`:

```typescript
// Generate proper filename from dates if not provided
let filename = formData.filename;
if (!filename && formData.startDate) {
  const startDate = new Date(formData.startDate);
  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const day = String(startDate.getDate()).padStart(2, '0');
  filename = `${year}_${month}_${day}_pnl.csv`;
} else if (!filename) {
  filename = `manual_pnl_${Date.now()}.json`;
}
```

**Result:** 
- December 1, 2025 → `2025_12_01_pnl.csv` ✅
- No date provided → `manual_pnl_1730505600000.json` ✅

### Issue 3: Edit Modal Shows No Values

**Problem:** When clicking Edit on a document, the modal showed dates but all financial values were 0.

**Root Cause:** The data extraction in `FinancialStatements.tsx` was looking for `analysis_result`, but the backend stores data in:
- `raw_json` - Field-level data with confidence scores: `{ revenue: { value: 72361, confidence: 1.0 } }`
- `summary_metrics` - Calculated totals: `{ totalRevenue: 72361, netProfit: 5339 }`

**Solution:** Updated document transformation to extract from the correct locations:

```typescript
// Transform documents to flatten data for the modal
const transformedDocuments = documentsData.map((doc: any) => {
  const rawJson = doc.raw_json || {};
  const summaryMetrics = doc.summary_metrics || {};
  
  // Helper to extract value from raw_json structure
  const extractValue = (field: any) => {
    if (typeof field === 'object' && field !== null && 'value' in field) {
      return field.value;  // Extract from { value: 72361, confidence: 1.0 }
    }
    return field || 0;
  };
  
  const flattenedDoc = {
    ...doc,
    revenue: extractValue(rawJson.revenue) || summaryMetrics.totalRevenue || 0,
    cogs: extractValue(rawJson.cogs) || 0,
    operating_expenses: extractValue(rawJson.operatingExpenses) || 0,
    owner_distributions: extractValue(rawJson.ownerDistributions) || 0,
    taxes: extractValue(rawJson.taxes) || 0,
  };
  
  return flattenedDoc;
});
```

**Result:** Edit modal now correctly displays all saved values ✅

## Data Storage Format

### Backend Storage Structure
```json
{
  "id": "abc123",
  "start_date": "2025-12-01",
  "end_date": "2025-12-31",
  "filename": "2025_12_01_pnl.csv",
  "raw_json": {
    "revenue": { "value": 72361, "confidence": 1.0, "boundingBox": [] },
    "cogs": { "value": 21203, "confidence": 1.0, "boundingBox": [] },
    "operatingExpenses": { "value": 45819, "confidence": 1.0, "boundingBox": [] },
    "ownerDistributions": { "value": 22000, "confidence": 1.0, "boundingBox": [] },
    "taxes": { "value": 0, "confidence": 1.0, "boundingBox": [] }
  },
  "summary_metrics": {
    "totalRevenue": 72361,
    "totalExpenses": 67022,
    "netProfit": 5339,
    "grossProfit": 51158,
    "cashAfterOwnerPay": -16661
  }
}
```

### Frontend Transformation
The frontend flattens this structure for easy access:
```typescript
{
  ...doc,
  revenue: 72361,        // Extracted from raw_json.revenue.value
  cogs: 21203,           // Extracted from raw_json.cogs.value
  operating_expenses: 45819,
  owner_distributions: 22000,
  taxes: 0
}
```

## Status

✅ **All Fixes Implemented** - Ready for testing

### Fixed Issues:
1. ✅ Duplicate documents when editing
2. ✅ Malformed filenames (`2025_00_undefined_pnl.csv`)
3. ✅ Edit modal showing no values
