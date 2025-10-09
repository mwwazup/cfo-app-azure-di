"""
Financial API endpoints for the CFO App.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import select
from typing import List, Optional
from datetime import datetime
import uuid
import os
from pydantic import BaseModel
from supabase import create_client, Client
from db.postgres import get_db, FinancialStatement

# Flag to determine if Postgres should be bypassed (e.g. during CI / local tests)
SKIP_DB = os.getenv("SKIP_DB", "0") in {"1", "true", "True"}

# In-memory storage used only when SKIP_DB is enabled so that the endpoints
# still behave consistently for the test suite without touching Postgres.
if SKIP_DB:
    _MEM_STATEMENTS: dict[str, dict] = {}
from api.auth import get_current_user, User, get_supabase_db

router = APIRouter(prefix="/financial", tags=["financial"])

# Pydantic models for revenue operations
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

@router.get("/statements")
async def get_financial_statements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all financial statements for the current user

    When SKIP_DB is enabled the data is pulled from the in-memory store.
    """
    if SKIP_DB:
        # Return all items for this user from in-memory store
        return [rec for rec in _MEM_STATEMENTS.values() if rec["user_id"] == current_user.id]

    try:
        stmt = select(FinancialStatement).where(FinancialStatement.user_id == current_user.id)
        result = db.execute(stmt)
        statements = result.scalars().all()
        
        return [{
            "id": str(stmt.id),
            "file_name": stmt.file_name,
            "statement_type": stmt.statement_type,
            "upload_date": stmt.upload_date.isoformat(),
            "file_type": stmt.file_type,
            "file_size": stmt.file_size,
            "metadata": getattr(stmt, "metadata", None)
        } for stmt in statements]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statements/{statement_id}")
async def get_financial_statement(
    statement_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific financial statement by ID"""
    if SKIP_DB:
        rec = _MEM_STATEMENTS.get(str(statement_id))
        if not rec or rec["user_id"] != current_user.id:
            raise HTTPException(status_code=404, detail="Financial statement not found")
        return rec

    try:
        stmt = db.query(FinancialStatement).filter(
            FinancialStatement.id == statement_id,
            FinancialStatement.user_id == current_user.id
        ).first()
        
        if not stmt:
            raise HTTPException(status_code=404, detail="Financial statement not found")
        
        return {
            "id": str(stmt.id),
            "file_name": stmt.file_name,
            "statement_type": stmt.statement_type,
            "upload_date": stmt.upload_date.isoformat(),
            "file_type": stmt.file_type,
            "file_size": stmt.file_size,
            "parsed_data": getattr(stmt, "parsed_data", None),
            "metadata": getattr(stmt, "metadata", None)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_financial_data(
    file: UploadFile = File(...),
    statement_type: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and process financial data file"""
    if SKIP_DB:
        try:
            # Save file to tmp dir so tests can clean up easily
            file_path = f"uploads/{current_user.id}/{file.filename}"
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)

            statement_id = uuid.uuid4()
            record = {
                "id": str(statement_id),
                "user_id": current_user.id,
                "file_name": file.filename,
                "file_path": file_path,
                "statement_type": statement_type or "unknown",
                "upload_date": datetime.utcnow().isoformat(),
                "file_type": file.filename.split('.')[-1].lower(),
                "file_size": len(contents),
                "parsed_data": None,
                "metadata": {
                    "content_type": file.content_type,
                    "original_filename": file.filename
                }
            }
            _MEM_STATEMENTS[str(statement_id)] = record
            return record
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    try:
        # Save file to temporary location
        file_path = f"uploads/{current_user.id}/{file.filename}"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Create financial statement record
        statement = FinancialStatement(
            user_id=current_user.id,
            file_name=file.filename,
            file_path=file_path,
            statement_type=statement_type or "unknown",
            file_size=len(contents),
            file_type=file.filename.split('.')[-1].lower(),
            extra_metadata={
                "content_type": file.content_type,
                "original_filename": file.filename
            }
        )
        
        db.add(statement)
        db.commit()
        db.refresh(statement)
        
        return {
            "id": str(statement.id),
            "file_name": statement.file_name,
            "statement_type": statement.statement_type,
            "upload_date": statement.upload_date.isoformat(),
            "file_type": statement.file_type,
            "file_size": statement.file_size
        }
    except Exception as e:
        if 'file_path' in locals():
            try:
                os.remove(file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/statements/{statement_id}/parse")
async def parse_financial_statement(
    statement_id: uuid.UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parse and extract data from a financial statement"""
    if SKIP_DB:
        rec = _MEM_STATEMENTS.get(str(statement_id))
        if not rec or rec["user_id"] != current_user.id:
            raise HTTPException(status_code=404, detail="Financial statement not found")
        rec["parsed_data"] = {
            "status": "parsed",
            "timestamp": datetime.utcnow().isoformat()
        }
        return {"id": str(statement_id), "file_name": rec["file_name"], "parsed_data": rec["parsed_data"]}

    try:
        stmt = db.query(FinancialStatement).filter(
            FinancialStatement.id == statement_id,
            FinancialStatement.user_id == current_user.id
        ).first()
        
        if not stmt:
            raise HTTPException(status_code=404, detail="Financial statement not found")
        
        # TODO: Implement actual parsing logic based on file type
        # For now, just update the parsed_data field with a placeholder
        stmt.parsed_data = {
            "status": "parsed",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        db.commit()
        db.refresh(stmt)
        
        return {
            "id": str(stmt.id),
            "file_name": stmt.file_name,
            "parsed_data": stmt.parsed_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create a separate router for revenue API endpoints without the /financial prefix
revenue_router = APIRouter(tags=["revenue"])

@revenue_router.get("/api/revenue-entries/years")
async def get_available_years(userId: str = Query(...)):
    """Get all available years for a user's revenue data"""
    try:
        supabase = get_supabase_db()
        result = supabase.table('revenue_entries').select('year').eq('user_id', userId).execute()
        
        years = list(set(row['year'] for row in result.data))
        years.sort(reverse=True)
        
        return {"years": years}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@revenue_router.get("/api/revenue-entries")
async def get_revenue_entries(
    userId: str = Query(...),
    year: int = Query(...),
    month: Optional[int] = Query(None)
):
    """Get revenue entries for a user, year, and optionally month"""
    try:
        supabase = get_supabase_db()
        query = supabase.table('revenue_entries').select('*').eq('user_id', userId).eq('year', year)
        
        if month is not None:
            query = query.eq('month', month)
        
        result = query.order('month').execute()
        return {"rows": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@revenue_router.post("/api/revenue-entries")
async def upsert_monthly_revenue(request: UpsertRevenueRequest):
    """Create or update a monthly revenue entry"""
    try:
        supabase = get_supabase_db()
        
        # Prepare the data for upsert
        data = {
            'user_id': request.userId,
            'year': request.year,
            'month': request.month,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Only include non-None values
        if request.actualRevenue is not None:
            data['actual_revenue'] = request.actualRevenue
        if request.desiredRevenue is not None:
            data['desired_revenue'] = request.desiredRevenue
        if request.targetRevenue is not None:
            data['target_revenue'] = request.targetRevenue
        if request.profitMargin is not None:
            data['profit_margin'] = request.profitMargin
        if request.ownerDraws is not None:
            data['owner_draws'] = request.ownerDraws
        if request.isLocked is not None:
            data['is_locked'] = request.isLocked
        if request.notes is not None:
            data['notes'] = request.notes
        
        result = supabase.table('revenue_entries').upsert(data, on_conflict='user_id,year,month').execute()
        
        return {"ok": True, "row": result.data[0] if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@revenue_router.get("/api/revenue-kpis")
async def get_revenue_kpis(
    userId: str = Query(...),
    year: int = Query(...)
):
    """Get revenue KPIs for a user and year"""
    try:
        supabase = get_supabase_db()
        result = supabase.table('revenue_kpis').select('*').eq('user_id', userId).eq('year', year).execute()
        return {"rows": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@revenue_router.get("/api/kpi-records")
async def get_kpi_records(
    userId: str = Query(...),
    period: Optional[str] = Query(None)
):
    """Get KPI records for a user"""
    try:
        supabase = get_supabase_db()
        query = supabase.table('kpi_records').select('*').eq('user_id', userId)
        
        if period:
            query = query.eq('period', period)
        
        result = query.execute()
        return {"rows": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@revenue_router.post("/api/kpi-records")
async def upsert_kpi_record(
    request: dict
):
    """Create or update a KPI record"""
    try:
        supabase = get_supabase_db()
        
        # Extract data from request
        user_id = request.get('userId')
        kpi_data = request.get('kpiData')
        
        if not user_id or not kpi_data:
            raise HTTPException(status_code=400, detail="Missing userId or kpiData")
        
        # Add user_id to kpi_data
        kpi_data['user_id'] = user_id
        
        # Use upsert to create or update
        result = supabase.table('kpi_records').upsert(kpi_data).execute()
        
        if result.data:
            return {"ok": True, "record": result.data[0]}
        else:
            return {"ok": True, "record": None}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@revenue_router.delete("/api/kpi-records")
async def delete_kpi_by_name(
    userId: str = Query(...),
    kpi_name: str = Query(...)
):
    """Delete a KPI record by name"""
    try:
        supabase = get_supabase_db()
        result = supabase.table('kpi_records').delete().eq('user_id', userId).eq('kpi_name', kpi_name).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
