from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os

app = FastAPI(title="Test Revenue API Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SupabaseLinkRequest(BaseModel):
    clerkUserId: str
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None

class UpsertRevenueRequest(BaseModel):
    userId: str
    year: int
    month: int
    actualRevenue: Optional[float] = None
    desiredRevenue: Optional[float] = None
    targetRevenue: Optional[float] = None
    profitMargin: Optional[float] = None
    ownerDraws: Optional[float] = None
    isLocked: Optional[bool] = None
    notes: Optional[str] = None

@app.get("/")
def root():
    return {"status": "ok", "message": "Test server running"}

@app.post("/api/auth/supabase-link")
def link_supabase_account(request: SupabaseLinkRequest):
    """Link a Clerk user account to Supabase profile"""
    try:
        return {
            "supabaseUserId": request.clerkUserId,
            "message": "Profile linked successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )

# Mock data storage
mock_revenue_data = {}
mock_kpi_data = {}  # Store KPI records by userId
mock_financial_documents = {}  # Store financial documents by userId

@app.get("/api/revenue-entries/years")
def get_available_years(userId: str = Query(...)):
    """Get all available years for a user's revenue data"""
    try:
        user_data = mock_revenue_data.get(userId, {})
        years = list(user_data.keys())
        years.sort(reverse=True)
        return {"years": years}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/revenue-entries")
def get_revenue_entries(
    userId: str = Query(...),
    year: int = Query(...),
    month: Optional[int] = Query(None)
):
    """Get revenue entries for a user, year, and optionally month"""
    try:
        user_data = mock_revenue_data.get(userId, {})
        year_data = user_data.get(year, {})
        
        if month is not None:
            month_data = year_data.get(month)
            return {"rows": [month_data] if month_data else []}
        else:
            rows = []
            for m in range(1, 13):
                if m in year_data:
                    rows.append(year_data[m])
            return {"rows": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/revenue-entries")
def upsert_monthly_revenue(request: UpsertRevenueRequest):
    """Create or update a monthly revenue entry"""
    try:
        # Initialize user data if not exists
        if request.userId not in mock_revenue_data:
            mock_revenue_data[request.userId] = {}
        if request.year not in mock_revenue_data[request.userId]:
            mock_revenue_data[request.userId][request.year] = {}
        
        # Create/update the entry
        entry = {
            'id': f"{request.userId}-{request.year}-{request.month}",
            'user_id': request.userId,
            'year': request.year,
            'month': request.month,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Only include non-None values
        if request.actualRevenue is not None:
            entry['actual_revenue'] = request.actualRevenue
        if request.desiredRevenue is not None:
            entry['desired_revenue'] = request.desiredRevenue
        if request.targetRevenue is not None:
            entry['target_revenue'] = request.targetRevenue
        if request.profitMargin is not None:
            entry['profit_margin'] = request.profitMargin
        if request.ownerDraws is not None:
            entry['owner_draws'] = request.ownerDraws
        if request.isLocked is not None:
            entry['is_locked'] = request.isLocked
        if request.notes is not None:
            entry['notes'] = request.notes
        
        mock_revenue_data[request.userId][request.year][request.month] = entry
        
        return {"ok": True, "row": entry}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/revenue-kpis")
def get_revenue_kpis(
    userId: str = Query(...),
    year: int = Query(...)
):
    """Get revenue KPIs for a user and year"""
    return {"rows": []}  # Mock empty response

@app.get("/api/kpi-records")
def get_kpi_records(
    userId: str = Query(...),
    period: Optional[str] = Query(None)
):
    """Get KPI records for a user"""
    try:
        user_kpis = mock_kpi_data.get(userId, [])
        if period:
            # Filter by period if specified
            filtered_kpis = [kpi for kpi in user_kpis if kpi.get('period') == period]
            return {"rows": filtered_kpis}
        return {"rows": user_kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/kpi-records")
def upsert_kpi_record(request: dict):
    """Create or update a KPI record"""
    try:
        print(f"📊 KPI upsert request: {request}")
        
        user_id = request.get('userId')
        kpi_data = request.get('kpiData', {})
        
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")
        
        # Initialize user KPI storage if not exists
        if user_id not in mock_kpi_data:
            mock_kpi_data[user_id] = []
        
        # Create KPI record with timestamp
        kpi_record = {
            'id': f"kpi-{user_id}-{len(mock_kpi_data[user_id])}",
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            **kpi_data  # Spread the KPI data
        }
        
        # Check if KPI with same name/period exists and update, otherwise append
        kpi_name = kpi_data.get('kpi_name')
        period = kpi_data.get('period')
        
        existing_index = None
        for i, existing_kpi in enumerate(mock_kpi_data[user_id]):
            if (existing_kpi.get('kpi_name') == kpi_name and 
                existing_kpi.get('period') == period):
                existing_index = i
                break
        
        if existing_index is not None:
            # Update existing KPI
            mock_kpi_data[user_id][existing_index] = kpi_record
            print(f"✅ Updated existing KPI: {kpi_name} for period: {period}")
        else:
            # Add new KPI
            mock_kpi_data[user_id].append(kpi_record)
            print(f"✅ Added new KPI: {kpi_name} for period: {period}")
        
        print(f"📈 Total KPIs for user {user_id}: {len(mock_kpi_data[user_id])}")
        
        return {"ok": True, "record": kpi_record}
    except Exception as e:
        print(f"❌ KPI upsert error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/kpi-records")
def delete_kpi_by_name(
    userId: str = Query(...),
    kpi_name: str = Query(...)
):
    """Delete a KPI record by name"""
    return {"ok": True}

# Financial Documents endpoints
@app.get("/api/financial-documents")
def get_financial_documents(userId: str = Query(...)):
    """Get financial documents for a user"""
    try:
        user_docs = mock_financial_documents.get(userId, [])
        # Sort by uploaded_at descending (most recent first)
        sorted_docs = sorted(user_docs, key=lambda x: x.get('uploaded_at', ''), reverse=True)
        return {"data": sorted_docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/financial-documents")
def upload_financial_document(request: dict):
    """Upload a financial document"""
    try:
        print(f"📄 Financial document upload request: {request}")
        
        user_id = request.get('userId')
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")
        
        # Initialize user document storage if not exists
        if user_id not in mock_financial_documents:
            mock_financial_documents[user_id] = []
        
        # Create document record
        doc_record = {
            'id': f"doc-{user_id}-{len(mock_financial_documents[user_id])}",
            'user_id': user_id,
            'uploaded_at': datetime.utcnow().isoformat(),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            **{k: v for k, v in request.items() if k != 'userId'}  # Spread other fields
        }
        
        mock_financial_documents[user_id].append(doc_record)
        
        print(f"✅ Added financial document: {doc_record.get('filename', 'unknown')}")
        print(f"📊 Total documents for user {user_id}: {len(mock_financial_documents[user_id])}")
        
        return {"data": doc_record}
    except Exception as e:
        print(f"❌ Financial document upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/financial-documents/{document_id}")
def delete_financial_document(document_id: str):
    """Delete a financial document"""
    try:
        print(f"🗑️ Delete financial document request: {document_id}")
        
        # Find and remove document from all users
        deleted = False
        for user_id, user_docs in mock_financial_documents.items():
            for i, doc in enumerate(user_docs):
                if doc.get('id') == document_id:
                    del user_docs[i]
                    deleted = True
                    print(f"✅ Deleted document {document_id} for user {user_id}")
                    break
            if deleted:
                break
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Financial document delete error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Document processing endpoints (replacing Azure functionality)
@app.get("/api/docs/meta")
def get_document_metadata(user_id: str = Query(...)):
    """Get document metadata for a user (replaces Azure endpoint)"""
    try:
        user_docs = mock_financial_documents.get(user_id, [])
        # Return metadata only (no full document content)
        metadata = []
        for doc in user_docs:
            metadata.append({
                'id': doc.get('id'),
                'document_type': doc.get('document_type'),
                'filename': doc.get('filename'),
                'uploaded_at': doc.get('uploaded_at'),
                'status': doc.get('status', 'pending'),
                'confidence_score': doc.get('confidence_score', 0.85)
            })
        return {"data": metadata}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/docs/kpis")
def get_document_kpis(document_id: str = Query(...)):
    """Get precomputed KPIs for a document (replaces Azure endpoint)"""
    try:
        # Mock KPI data for document
        mock_kpis = [
            {"name": "Total Revenue", "value": 150000, "category": "Revenue"},
            {"name": "Total Expenses", "value": 120000, "category": "Expenses"},
            {"name": "Net Profit", "value": 30000, "category": "Profit"},
            {"name": "Profit Margin", "value": 20.0, "category": "Ratio"}
        ]
        return {"data": mock_kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/docs/metrics")
def get_document_metrics(document_id: str = Query(...)):
    """Get detailed metrics for a document (replaces Azure endpoint)"""
    try:
        # Mock detailed metrics
        mock_metrics = [
            {"label": "Total Revenue", "value": 150000, "category": "pnl", "is_verified": True},
            {"label": "Cost of Goods Sold", "value": 90000, "category": "pnl", "is_verified": True},
            {"label": "Gross Profit", "value": 60000, "category": "pnl", "is_verified": True},
            {"label": "Operating Expenses", "value": 30000, "category": "pnl", "is_verified": True},
            {"label": "Net Income", "value": 30000, "category": "pnl", "is_verified": True}
        ]
        return {"data": mock_metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Starting test revenue API server on port 5180...")
    print("Available endpoints:")
    print("- GET /api/revenue-entries/years")
    print("- GET /api/revenue-entries")
    print("- POST /api/revenue-entries")
    print("- POST /api/auth/supabase-link")
    print("- GET /api/financial-documents")
    print("- POST /api/financial-documents")
    print("- DELETE /api/financial-documents/{document_id}")
    print("- GET /api/docs/meta")
    print("- GET /api/docs/kpis")
    print("- GET /api/docs/metrics")
    uvicorn.run(app, host="0.0.0.0", port=5180)
