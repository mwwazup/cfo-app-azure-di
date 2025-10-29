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
import os
import asyncio
import time
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from api.auth import get_current_user, User
from supabase import create_client, Client
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document-ingest"])

# Custom exceptions
class DocumentProcessingError(Exception):
    """Raised when document processing fails"""
    pass

class StorageError(Exception):
    """Raised when storage operations fail"""
    pass

class ValidationError(Exception):
    """Raised when input validation fails"""
    pass

# Retry configuration
RETRY_ATTEMPTS = 3
RETRY_MIN_WAIT = 1  # seconds
RETRY_MAX_WAIT = 10  # seconds

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

def validate_environment() -> None:
    """Validate required environment variables"""
    required_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "AZURE_DI_ENDPOINT", "AZURE_DI_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

def validate_document_request(request: DocumentIngestRequest) -> None:
    """Validate document ingestion request"""
    if not request.file_data or not request.filename:
        raise ValidationError("File data and filename are required")
    
    try:
        # Basic base64 validation
        if len(request.file_data) > 10 * 1024 * 1024:  # 10MB max
            raise ValidationError("File size exceeds maximum limit of 10MB")
        if not all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in request.file_data):
            raise ValidationError("Invalid base64 data")
    except Exception as e:
        raise ValidationError(f"Invalid file data: {str(e)}")

@retry(
    stop=stop_after_attempt(RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=1, min=RETRY_MIN_WAIT, max=RETRY_MAX_WAIT),
    retry=retry_if_exception_type((ConnectionError, TimeoutError, StorageError)),
    reraise=True
)
async def _process_with_retry(file_data: bytes) -> Any:
    """Process document with retry logic"""
    try:
        return await _process_document_with_azure_di(file_data)
    except Exception as e:
        logger.error(f"Azure Document Intelligence processing failed: {str(e)}", exc_info=True)
        raise StorageError(f"Failed to process document: {str(e)}")

@router.post(
    "/di/ingest",
    response_model=DocumentIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"description": "Invalid request"},
        401: {"description": "Unauthorized"},
        500: {"description": "Internal server error"},
        503: {"description": "Service unavailable"}
    }
)
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
        
        # Process with Azure Document Intelligence with retry
        azure_result = await _process_with_retry(file_data)
        
        # Generate a unique document ID
        doc_id = str(uuid.uuid4())
        
        # Normalize and store the document data
        try:
            normalized_data = _normalize_azure_fields(azure_result, doc_id)
        except Exception as e:
            raise DocumentProcessingError(f"Failed to normalize document data: {str(e)}")
        
        # Initialize Supabase client
        try:
            supabase = get_supabase_client()
        except Exception as e:
            raise StorageError(f"Failed to initialize storage client: {str(e)}")
        
        # Store document data in a transaction
        try:
            # Extract and store document metadata
            doc_meta = _extract_document_metadata(azure_result, request.filename, request.document_type)
            
            # Store metrics
            metrics = normalized_data.get("metrics", [])
            if metrics:
                result = supabase.table("document_metrics").insert(metrics).execute()
                if hasattr(result, 'error') and result.error:
                    raise StorageError(f"Failed to store metrics: {result.error.message}")
            
            # Calculate and store KPIs
            kpis = _calculate_kpis_from_metrics(metrics)
            if kpis:
                result = supabase.table("document_kpis").insert(kpis).execute()
                if hasattr(result, 'error') and result.error:
                    raise StorageError(f"Failed to store KPIs: {result.error.message}")
            
            processing_time = time.time() - start_time
            logger.info(f"Successfully processed document {doc_id} in {processing_time:.2f} seconds")
            
            return DocumentIngestResponse(
                success=True,
                doc_id=doc_id,
                message=f"Document processed successfully in {processing_time:.2f} seconds"
            )
            
        except Exception as e:
            # Attempt cleanup on failure
            try:
                cleanup_failed_ingestion(supabase, doc_id)
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up after error: {str(cleanup_error)}")
            raise
    except StorageError as e:
        logger.error(f"Storage error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Storage service error: {str(e)}"
        )
    except DocumentProcessingError as e:
        logger.error(f"Document processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process document: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during document ingestion: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your document"
        )

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

@router.delete("/docs/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a financial document and all associated data (metrics, KPIs).
    """
    try:
        supabase = get_supabase_client()
        
        # Verify user owns this document
        doc_result = supabase.table("documents").select("user_id, file_path").eq("id", document_id).execute()
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if doc_result.data[0]["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this document")
        
        logger.info(f"Deleting document {document_id} for user {current_user.id}")
        
        # Delete associated metrics (cascade should handle this, but explicit is better)
        supabase.table("document_metrics").delete().eq("doc_id", document_id).execute()
        logger.info(f"Deleted metrics for document {document_id}")
        
        # Delete associated KPIs
        supabase.table("document_kpis").delete().eq("doc_id", document_id).execute()
        logger.info(f"Deleted KPIs for document {document_id}")
        
        # Delete the document itself
        supabase.table("documents").delete().eq("id", document_id).execute()
        logger.info(f"Deleted document {document_id}")
        
        # TODO: Delete file from storage if needed
        # file_path = doc_result.data[0].get("file_path")
        # if file_path:
        #     supabase.storage.from_("documents").remove([file_path])
        
        return {"message": "Document deleted successfully", "document_id": document_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# Helper functions

async def _process_document_with_azure_di(file_data: bytes) -> Any:
    """Process document with Azure Document Intelligence.
    
    Args:
        file_data: Binary content of the document to process
        
    Returns:
        The analysis result from Azure Document Intelligence
        
    Raises:
        ConnectionError: If connection to Azure fails
        TimeoutError: If the request times out
        Exception: For other processing errors
    """
    endpoint = os.getenv("AZURE_DI_ENDPOINT")
    key = os.getenv("AZURE_DI_KEY")
    
    if not endpoint or not key:
        raise RuntimeError("Azure Document Intelligence credentials not configured")
    
    try:
        # Create client with timeout
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=endpoint, 
            credential=AzureKeyCredential(key),
            logging_enable=True
        )
        
        # Process with timeout
        poller = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: document_intelligence_client.begin_analyze_document(
                "prebuilt-document",
                analyze_request=file_data,
                content_type="application/octet-stream",
                output_content_format="markdown",
                features=["ocr.highResolution"],
                locale="en-US"
            )
        )
        
        # Wait for result with timeout
        try:
            result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, poller.result),
                timeout=300  # 5 minute timeout
            )
            return result
            
        except asyncio.TimeoutError:
            poller.cancel()
            raise TimeoutError("Document processing timed out after 5 minutes")
            
    except Exception as e:
        logger.error(f"Azure Document Intelligence error: {str(e)}", exc_info=True)
        if isinstance(e, (ConnectionError, TimeoutError)):
            raise
        raise Exception(f"Document processing failed: {str(e)}")

def cleanup_failed_ingestion(supabase: Client, doc_id: str) -> None:
    """Clean up partially ingested document data on failure.
    
    Args:
        supabase: Supabase client instance
        doc_id: ID of the document to clean up
    """
    try:
        # Delete any partially created records
        supabase.table("document_metrics").delete().eq("doc_id", doc_id).execute()
        supabase.table("document_kpis").delete().eq("doc_id", doc_id).execute()
        logger.info(f"Cleaned up failed ingestion for document {doc_id}")
    except Exception as e:
        logger.error(f"Failed to clean up after failed ingestion: {str(e)}")
    # Document processing complete

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
