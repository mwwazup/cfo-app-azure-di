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
from logging_config import get_logger

logger = get_logger(__name__)

from api.validation_models import (
    UpsertRevenueRequest,
    RevenueQueryParams,
    KPIRecordData,
    UpsertKPIRequest,
    KPIQueryParams,
    DeleteKPIParams,
    UpdateKPIGoalRequest,
    FinancialDocumentCreate,
    FinancialDocumentUpdate,
    UserIdQuery,
    YearQuery
)

# Flag to determine if Postgres should be bypassed (e.g. during CI / local tests)
SKIP_DB = os.getenv("SKIP_DB", "0") in {"1", "true", "True"}

# In-memory storage used only when SKIP_DB is enabled so that the endpoints
# still behave consistently for the test suite without touching Postgres.
if SKIP_DB:
    _MEM_STATEMENTS: dict[str, dict] = {}
from api.auth import get_current_user, User, get_supabase_db

router = APIRouter(prefix="/financial", tags=["financial"])

# Validation models are now imported from validation_models.py
# This provides comprehensive input validation with clear error messages

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
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

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
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

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
            logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

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
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

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
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# Create a separate router for revenue API endpoints without the /financial prefix
revenue_router = APIRouter(tags=["revenue"])

@revenue_router.get("/api/revenue-entries/years")
async def get_available_years(userId: str = Query(..., description="User ID")):
    """Get all available years for a user's revenue data
    
    Args:
        userId: User ID (required)
        
    Returns:
        List of years with revenue data
        
    Raises:
        HTTPException: If userId is invalid or database error occurs
    """
    # Validate userId
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(status_code=400, detail="userId cannot be empty")
    
    try:
        supabase = get_supabase_db()
        result = supabase.table('revenue_entries').select('year').eq('user_id', userId).execute()
        
        years = list(set(row['year'] for row in result.data))
        years.sort(reverse=True)
        
        return {"years": years}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.get("/api/revenue-entries")
async def get_revenue_entries(
    userId: str = Query(..., description="User ID"),
    year: int = Query(..., ge=2000, le=2100, description="Year (2000-2100)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12, optional)")
):
    """Get revenue entries for a user, year, and optionally month
    
    Args:
        userId: User ID (required)
        year: Year between 2000-2100 (required)
        month: Month between 1-12 (optional)
        
    Returns:
        List of revenue entries
        
    Raises:
        HTTPException: If parameters are invalid or database error occurs
    """
    # Validate inputs
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(status_code=400, detail="userId cannot be empty")
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="year must be between 2000 and 2100")
    if month is not None and (month < 1 or month > 12):
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")
    
    try:
        supabase = get_supabase_db()
        query = supabase.table('revenue_entries').select('*').eq('user_id', userId).eq('year', year)
        
        if month is not None:
            query = query.eq('month', month)
        
        result = query.order('month').execute()
        return {"rows": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.post("/api/revenue-entries")
async def upsert_monthly_revenue(request: UpsertRevenueRequest):
    """Create or update a monthly revenue entry
    
    Args:
        request: Validated revenue entry data
        
    Returns:
        Created/updated revenue entry
        
    Raises:
        HTTPException: If validation fails or database error occurs
        
    Note:
        All input validation is handled by Pydantic UpsertRevenueRequest model.
        Invalid data will return 422 Unprocessable Entity with detailed error messages.
    """
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
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.get("/api/revenue-kpis")
async def get_revenue_kpis(
    userId: str = Query(..., description="User ID"),
    year: int = Query(..., ge=2000, le=2100, description="Year (2000-2100)")
):
    """Get revenue KPIs for a user and year
    
    Args:
        userId: User ID (required)
        year: Year between 2000-2100 (required)
        
    Returns:
        List of revenue KPIs
        
    Raises:
        HTTPException: If parameters are invalid or database error occurs
    """
    # Validate inputs
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(status_code=400, detail="userId cannot be empty")
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="year must be between 2000 and 2100")
    
    try:
        supabase = get_supabase_db()
        result = supabase.table('revenue_kpis').select('*').eq('user_id', userId).eq('year', year).execute()
        return {"rows": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.get("/api/kpi-records")
async def get_kpi_records(
    userId: str = Query(..., description="User ID"),
    period: Optional[str] = Query(None, description="Period filter (YYYY-MM-DD)")
):
    """Get KPI records for a user
    
    Args:
        userId: User ID (required)
        period: Period filter in YYYY-MM-DD format (optional)
        
    Returns:
        List of KPI records
        
    Raises:
        HTTPException: If parameters are invalid or database error occurs
    """
    # Validate inputs
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(status_code=400, detail="userId cannot be empty")
    if period:
        try:
            datetime.strptime(period, '%Y-%m-%d')
        except ValueError:
            raise HTTPException(status_code=400, detail="period must be in YYYY-MM-DD format")
    
    try:
        supabase = get_supabase_db()
        query = supabase.table('kpi_records').select('*').eq('user_id', userId)
        
        if period:
            query = query.eq('period', period)
        
        result = query.execute()
        return {"rows": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.post("/api/kpi-records")
async def upsert_kpi_record(request: UpsertKPIRequest):
    """Create or update a KPI record
    
    Args:
        request: Validated KPI record data
        
    Returns:
        Created/updated KPI record
        
    Raises:
        HTTPException: If validation fails or database error occurs
        
    Note:
        All input validation is handled by Pydantic UpsertKPIRequest model.
    """
    try:
        supabase = get_supabase_db()
        
        # Convert Pydantic model to dict and add user_id
        kpi_data = request.kpiData.dict()
        kpi_data['user_id'] = request.userId
        
        # Use upsert to create or update
        result = supabase.table('kpi_records').upsert(
            kpi_data,
            on_conflict='user_id,kpi_name,period'
        ).execute()
        
        if result.data:
            return {"ok": True, "record": result.data[0]}
        else:
            return {"ok": True, "record": None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.get("/api/financial-documents")
async def get_financial_documents(userId: str = Query(..., description="User ID")):
    """Get financial documents for a user
    
    Args:
        userId: User ID (required)
        
    Returns:
        List of financial documents
        
    Raises:
        HTTPException: If userId is invalid or database error occurs
    """
    # Validate userId
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(status_code=400, detail="userId cannot be empty")
    
    try:
        supabase = get_supabase_db()
        result = supabase.table('financial_documents').select('*').eq('user_id', userId).order('uploaded_at', desc=True).execute()
        return {"data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.post("/api/financial-documents")
async def create_financial_document(request: FinancialDocumentCreate):
    """Create a financial document
    
    Args:
        request: Validated financial document data
        
    Returns:
        Created financial document
        
    Raises:
        HTTPException: If validation fails or database error occurs
        
    Note:
        All input validation is handled by Pydantic FinancialDocumentCreate model.
    """
    try:
        supabase = get_supabase_db()
        
        # Convert Pydantic model to dict
        doc_data = request.dict(exclude_none=True)
        # Rename userId to user_id for database
        doc_data['user_id'] = doc_data.pop('userId')
        
        result = supabase.table('financial_documents').insert(doc_data).execute()
        return {"data": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.put("/api/financial-documents/{document_id}")
async def update_financial_document(
    document_id: str = Path(..., description="Document ID"),
    request: FinancialDocumentUpdate = None
):
    """Update a financial document
    
    Args:
        document_id: Document ID (required)
        request: Validated update data
        
    Returns:
        Updated financial document
        
    Raises:
        HTTPException: If validation fails or database error occurs
    """
    # Validate document_id
    if not document_id or len(document_id.strip()) == 0:
        raise HTTPException(status_code=400, detail="document_id cannot be empty")
    
    try:
        supabase = get_supabase_db()
        
        # Convert Pydantic model to dict, excluding None values
        update_data = request.dict(exclude_none=True) if request else {}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = supabase.table('financial_documents').update(update_data).eq('id', document_id).execute()
        return {"data": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.delete("/api/financial-documents/{document_id}")
async def delete_financial_document(document_id: str = Path(..., description="Document ID")):
    """Delete a financial document
    
    Args:
        document_id: Document ID (required)
        
    Returns:
        Success confirmation
        
    Raises:
        HTTPException: If document_id is invalid or database error occurs
    """
    # Validate document_id
    if not document_id or len(document_id.strip()) == 0:
        raise HTTPException(status_code=400, detail="document_id cannot be empty")
    
    try:
        supabase = get_supabase_db()
        result = supabase.table('financial_documents').delete().eq('id', document_id).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@revenue_router.delete("/api/kpi-records")
async def delete_kpi_by_name(
    userId: str = Query(..., description="User ID"),
    kpi_name: str = Query(..., min_length=1, description="KPI name to delete")
):
    """Delete a KPI record by name
    
    Args:
        userId: User ID (required)
        kpi_name: KPI name to delete (required)
        
    Returns:
        Success confirmation
        
    Raises:
        HTTPException: If parameters are invalid or database error occurs
    """
    # Validate inputs
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(status_code=400, detail="userId cannot be empty")
    if not kpi_name or len(kpi_name.strip()) == 0:
        raise HTTPException(status_code=400, detail="kpi_name cannot be empty")
    
    try:
        supabase = get_supabase_db()
        result = supabase.table('kpi_records').delete().eq('user_id', userId).eq('kpi_name', kpi_name).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
