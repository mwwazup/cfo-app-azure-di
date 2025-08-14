"""
Financial API endpoints for the CFO App.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Path
from sqlalchemy.orm import Session
from sqlalchemy.sql import select
from typing import List
from datetime import datetime
import uuid
import os
from db.postgres import get_db, FinancialStatement

# Flag to determine if Postgres should be bypassed (e.g. during CI / local tests)
SKIP_DB = os.getenv("SKIP_DB", "0") in {"1", "true", "True"}

# In-memory storage used only when SKIP_DB is enabled so that the endpoints
# still behave consistently for the test suite without touching Postgres.
if SKIP_DB:
    _MEM_STATEMENTS: dict[str, dict] = {}
from api.auth import get_current_user, User

router = APIRouter(prefix="/financial", tags=["financial"])

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
