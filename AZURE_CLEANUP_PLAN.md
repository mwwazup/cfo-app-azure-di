# Azure Document Intelligence Cleanup Plan

## Status: Azure is deprecated - Complete removal required

---

## Files to Delete

### Frontend (project/src):
1. ✅ `api/documentAnalysis.ts` - Not imported anywhere, safe to delete
2. ✅ `services/archived/azureDocumentAnalysisService.archived.ts` - Already archived
3. ✅ `test/azureDocumentValidation.test.ts` - Test file for deprecated service

### Backend (backend/api):
1. ⚠️ `document_analysis.py` - Imported in main.py, need to remove import first
2. ⚠️ `document_analysis_complete.py` - Not imported, safe to delete
3. ⚠️ `document_ingest.py` - Imported in main.py, need to remove import first

---

## Files to Update

### Backend main.py:
**Remove imports:**
```python
# BEFORE:
from api import auth, chat, memory, business, financial, document_analysis, document_ingest

# AFTER:
from api import auth, chat, memory, business, financial
```

**Remove router includes:**
```python
# REMOVE THESE LINES:
app.include_router(document_analysis.router)
app.include_router(document_ingest.router)
```

### Backend .env.example:
**Remove Azure section:**
```env
# REMOVE:
# Azure Document Intelligence (required for document analysis)
DI_ENDPOINT=https://your-di-resource.cognitiveservices.azure.com/
DI_KEY=your_azure_di_key
DI_MODEL_ID=PNL
DI_MODEL_ID=PNL_v2
```

### Frontend .env files:
**Check and remove if present:**
- `DI_ENDPOINT`
- `DI_KEY`
- `DI_MODEL_ID`
- `DI_API_VERSION`

---

## References in Other Files (Keep but note deprecation)

### Files with Azure mentions (informational only):
- `project/src/models/FinancialStatement.ts` - Type definitions (keep)
- `project/src/components/financial/ManualPLForm_new.tsx` - Comments only (keep)
- `project/src/components/financial/ManualBalanceSheetForm_clean.tsx` - Comments only (keep)
- `project/src/components/financial/ManualBalanceSheetForm.tsx` - Comments only (keep)
- `project/src/components/financial/ManualCashFlowForm.tsx` - Comments only (keep)
- `project/src/services/mindeeService.archived.ts` - Already archived (keep)

---

## Execution Order

1. ✅ Update backend/main.py (remove imports and routers)
2. ✅ Delete backend API files
3. ✅ Delete frontend API files
4. ✅ Update backend/.env.example
5. ✅ Verify no Azure env vars in project/.env or project/.env.local
6. ✅ Test backend starts without errors
7. ✅ Test frontend builds without errors

---

## Why Azure is Deprecated

According to the user and documentation:
- Azure Document Intelligence is no longer being used
- Manual P&L entry is the current approach
- All Azure-related code can be safely removed
- This also fixes the critical security issue of `process.env` in browser code

---

## Security Issue Resolved

**Before (CRITICAL):**
```typescript
// ❌ Won't work in browser, exposes credentials
const AZURE_ENDPOINT = process.env.DI_ENDPOINT;
const AZURE_API_KEY = process.env.DI_KEY;
```

**After:**
- File deleted entirely
- No more `process.env` in browser code
- No more exposed Azure credentials

---

## Impact Assessment

### ✅ Safe to Delete:
- No active code imports `documentAnalysis.ts`
- Backend routers are not critical (document upload uses different system)
- All Azure functionality is deprecated

### ⚠️ Verify After Deletion:
- Backend starts without import errors
- Frontend builds without import errors
- Financial document upload still works (uses different system)

---

## Rollback Plan

If issues arise:
1. Git revert to commit before cleanup
2. Check `AZURE_DEPRECATION_SUMMARY.md` for context
3. Restore only necessary files

---

## Documentation

After cleanup, update:
- ✅ Create `AZURE_CLEANUP_COMPLETE.md` with summary
- ✅ Note in `API_KEY_SECURITY_FIX.md` that Azure cleanup was part of security fix
