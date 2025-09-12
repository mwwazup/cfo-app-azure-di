"""
Document Intelligence API endpoints for ingest-once/fetch-on-demand pattern.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import base64
import os
import logging
from datetime import datetime
from api.auth import get_current_user, User
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document-ingest"])

# Initialize Supabase client
def get_supabase_client():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for server operations
    )

class DocumentIngestRequest(BaseModel):
    file_data: str  # Base64 encoded file
    filename: str
    document_type: str = "pnl"

class DocumentIngestResponse(BaseModel):
    success: bool
    doc_id: str
    message: str = ""

class DocumentMeta(BaseModel):
    id: str
    document_type: str
    start_date: Optional[str]
    end_date: Optional[str]
    source: Optional[str]
    created_at: str

class DocumentKPIs(BaseModel):
    doc_id: str
    revenue_total: float
    cogs_total: float
    opex_total: float
    gross_profit: float
    net_income: float
    gross_margin_percent: float
    net_margin_percent: float

class DocumentMetric(BaseModel):
    id: str
    doc_id: str
    metric_key: str
    label: str
    value: float
    confidence: float

@router.post("/di/ingest", response_model=DocumentIngestResponse)
async def ingest_document(
    request: DocumentIngestRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Ingest a document: process with Azure DI, normalize fields, store metrics and KPIs.
    """
    try:
        logger.info(f"Processing document ingest for user: {current_user.id}")
        
        # Decode base64 file data
        try:
            # Handle data URL format
            if "," in request.file_data:
                file_data = base64.b64decode(request.file_data.split(",", 1)[1])
            else:
                file_data = base64.b64decode(request.file_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 file data: {str(e)}")
        
        # Process with Azure Document Intelligence
        from api.document_analysis import _process_document_with_azure_di
        azure_result = await _process_document_with_azure_di(file_data)
        
        # Generate document ID
        doc_id = str(uuid.uuid4())
        
        # Extract and normalize fields using canonical LABEL_MAP
        normalized_metrics = _normalize_azure_fields(azure_result, doc_id)
        
        # Calculate KPIs from normalized metrics
        kpis = _calculate_kpis_from_metrics(normalized_metrics)
        
        # Extract document metadata (dates, type, etc.)
        doc_metadata = _extract_document_metadata(azure_result, request.filename, request.document_type)
        
        # Store in Supabase
        supabase = get_supabase_client()
        
        # Insert document record
        doc_record = {
            "id": doc_id,
            "user_id": current_user.id,
            "document_type": doc_metadata["document_type"],
            "source": doc_metadata["source"],
            "start_date": doc_metadata.get("start_date"),
            "end_date": doc_metadata.get("end_date"),
            "created_at": datetime.utcnow().isoformat(),
            "file_size": len(file_data),
            "filename": request.filename
        }
        
        # Insert into documents table (assuming it exists from memory)
        supabase.table("documents").insert(doc_record).execute()
        
        # Insert metrics
        if normalized_metrics:
            supabase.table("document_metrics").insert(normalized_metrics).execute()
        
        # Insert KPIs
        kpi_record = {
            "doc_id": doc_id,
            "user_id": current_user.id,
            **kpis,
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("document_kpis").insert(kpi_record).execute()
        
        logger.info(f"Successfully ingested document {doc_id} with {len(normalized_metrics)} metrics")
        
        return DocumentIngestResponse(
            success=True,
            doc_id=doc_id,
            message=f"Document processed successfully with {len(normalized_metrics)} metrics"
        )
        
    except Exception as e:
        logger.error(f"Error ingesting document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document ingestion failed: {str(e)}")

@router.get("/docs/meta")
async def get_documents_metadata(
    user_id: str = Query(..., description="User ID to fetch documents for"),
    current_user: User = Depends(get_current_user)
):
    """
    Get metadata only for user's documents (no metrics).
    """
    try:
        # Ensure user can only access their own documents
        if user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        supabase = get_supabase_client()
        
        result = supabase.table("documents").select(
            "id, document_type, start_date, end_date, source, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        
        documents = []
        for doc in result.data:
            documents.append(DocumentMeta(
                id=doc["id"],
                document_type=doc["document_type"],
                start_date=doc.get("start_date"),
                end_date=doc.get("end_date"),
                source=doc.get("source"),
                created_at=doc["created_at"]
            ))
        
        return documents
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document metadata: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")

@router.get("/docs/kpis")
async def get_document_kpis(
    id: str = Query(..., description="Document ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get precomputed KPIs for a document.
    """
    try:
        supabase = get_supabase_client()
        
        # Verify user owns this document
        doc_result = supabase.table("documents").select("user_id").eq("id", id).execute()
        if not doc_result.data or doc_result.data[0]["user_id"] != current_user.id:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Fetch KPIs
        kpi_result = supabase.table("document_kpis").select("*").eq("doc_id", id).execute()
        
        if not kpi_result.data:
            raise HTTPException(status_code=404, detail="KPIs not found for document")
        
        kpi_data = kpi_result.data[0]
        return DocumentKPIs(
            doc_id=kpi_data["doc_id"],
            revenue_total=kpi_data.get("revenue_total", 0),
            cogs_total=kpi_data.get("cogs_total", 0),
            opex_total=kpi_data.get("opex_total", 0),
            gross_profit=kpi_data.get("gross_profit", 0),
            net_income=kpi_data.get("net_income", 0),
            gross_margin_percent=kpi_data.get("gross_margin_percent", 0),
            net_margin_percent=kpi_data.get("net_margin_percent", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document KPIs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch KPIs: {str(e)}")

@router.get("/docs/metrics")
async def get_document_metrics(
    id: str = Query(..., description="Document ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed metrics for a document.
    """
    try:
        supabase = get_supabase_client()
        
        # Verify user owns this document
        doc_result = supabase.table("documents").select("user_id").eq("id", id).execute()
        if not doc_result.data or doc_result.data[0]["user_id"] != current_user.id:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Fetch metrics
        metrics_result = supabase.table("document_metrics").select("*").eq("doc_id", id).execute()
        
        metrics = []
        for metric in metrics_result.data:
            metrics.append(DocumentMetric(
                id=metric["id"],
                doc_id=metric["doc_id"],
                metric_key=metric["metric_key"],
                label=metric["label"],
                value=metric["value"],
                confidence=metric.get("confidence", 0.5)
            ))
        
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")

# Helper functions

async def _process_document_with_azure_di(file_data: bytes) -> Dict[str, Any]:
    """Process document with Azure Document Intelligence."""
    # Import and use existing Azure DI processing
    from api.document_analysis import DocumentIntelligenceClient, AzureKeyCredential
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    endpoint = os.getenv("DI_ENDPOINT")
    key = os.getenv("DI_KEY")
    model_id = os.getenv("DI_MODEL_ID", "PNL")
    
    if not endpoint or not key:
        raise HTTPException(status_code=500, detail="Azure DI credentials not configured")
    
    client = DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))
    
    # Convert to base64 for Azure DI
    base64_data = base64.b64encode(file_data).decode('utf-8')
    analyze_request = {"base64Source": base64_data}
    
    # Run in executor
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor()
    
    poller = await loop.run_in_executor(
        executor,
        lambda: client.begin_analyze_document(model_id, analyze_request)
    )
    result = await loop.run_in_executor(executor, poller.result)
    
    return result

def _normalize_azure_fields(azure_result: Any, doc_id: str) -> List[Dict[str, Any]]:
    """Normalize Azure DI fields using canonical LABEL_MAP."""
    # Import the label mapping utilities (we'll need to create a Python version)
    normalized_metrics = []
    
    # Extract fields from Azure result
    if hasattr(azure_result, 'documents') and azure_result.documents:
        for doc in azure_result.documents:
            if hasattr(doc, 'fields') and doc.fields:
                for field_name, field_value in doc.fields.items():
                    # Normalize the field name
                    normalized_label = _normalize_label_python(field_name)
                    mapped_field = _map_label_python(normalized_label)
                    
                    if mapped_field:
                        value = 0
                        if hasattr(field_value, 'value'):
                            value = _parse_monetary_value_python(field_value.value)
                        elif hasattr(field_value, 'content'):
                            value = _parse_monetary_value_python(field_value.content)
                        
                        metric = {
                            "id": str(uuid.uuid4()),
                            "doc_id": doc_id,
                            "metric_key": mapped_field["key"],
                            "label": field_name,
                            "value": value,
                            "confidence": getattr(field_value, 'confidence', 0.5),
                            "created_at": datetime.utcnow().isoformat()
                        }
                        normalized_metrics.append(metric)
    
    return normalized_metrics

def _calculate_kpis_from_metrics(metrics: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate KPIs from normalized metrics."""
    revenue_total = sum(m["value"] for m in metrics if m["metric_key"] == "revenue_total")
    cogs_total = sum(m["value"] for m in metrics if m["metric_key"] == "cogs_total")
    opex_total = sum(m["value"] for m in metrics if m["metric_key"] == "opex_total")
    
    gross_profit = revenue_total - cogs_total
    net_income = gross_profit - opex_total
    
    gross_margin_percent = (gross_profit / revenue_total * 100) if revenue_total > 0 else 0
    net_margin_percent = (net_income / revenue_total * 100) if revenue_total > 0 else 0
    
    return {
        "revenue_total": revenue_total,
        "cogs_total": cogs_total,
        "opex_total": opex_total,
        "gross_profit": gross_profit,
        "net_income": net_income,
        "gross_margin_percent": round(gross_margin_percent, 2),
        "net_margin_percent": round(net_margin_percent, 2)
    }

def _extract_document_metadata(azure_result: Any, filename: str, doc_type: str) -> Dict[str, Any]:
    """Extract document metadata from Azure result."""
    metadata = {
        "document_type": doc_type,
        "source": filename,
        "start_date": None,
        "end_date": None
    }
    
    # Try to extract dates from Azure result
    if hasattr(azure_result, 'documents') and azure_result.documents:
        for doc in azure_result.documents:
            if hasattr(doc, 'fields') and doc.fields:
                for field_name, field_value in doc.fields.items():
                    if 'date' in field_name.lower() or 'period' in field_name.lower():
                        # Extract date information
                        if hasattr(field_value, 'value'):
                            date_str = str(field_value.value)
                            # Simple date extraction - could be enhanced
                            if 'start' in field_name.lower():
                                metadata["start_date"] = date_str
                            elif 'end' in field_name.lower():
                                metadata["end_date"] = date_str
    
    return metadata

# Python versions of the TypeScript label mapping functions
def _normalize_label_python(label: str) -> str:
    """Python version of normalizeLabel function."""
    import re
    return re.sub(r'[^\w\s]', '', label.lower().strip()).strip()

def _map_label_python(normalized_label: str) -> Optional[Dict[str, str]]:
    """Python version of mapLabel function."""
    # Simplified mapping - in production, import from shared config
    label_map = {
        'total revenue': {'type': 'kpi', 'key': 'revenue_total'},
        'revenue': {'type': 'kpi', 'key': 'revenue_total'},
        'cost of goods sold': {'type': 'kpi', 'key': 'cogs_total'},
        'cogs': {'type': 'kpi', 'key': 'cogs_total'},
        'operating expenses': {'type': 'kpi', 'key': 'opex_total'},
        'gross profit': {'type': 'kpi', 'key': 'gross_profit'},
        'net income': {'type': 'kpi', 'key': 'net_income'},
    }
    return label_map.get(normalized_label)

def _parse_monetary_value_python(value) -> float:
    """Python version of parseMonetaryValue function."""
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        # Remove currency symbols and parse
        import re
        clean_value = re.sub(r'[$,\s()]', '', value)
        try:
            return float(clean_value)
        except ValueError:
            return 0.0
    
    return 0.0
