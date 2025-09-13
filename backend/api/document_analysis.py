"""
Document Analysis API endpoints for Azure Document Intelligence integration.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
import base64
import os
import tempfile
import logging
import time
import re
import uuid
from datetime import datetime
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import (
    ServiceRequestError, 
    ClientAuthenticationError,
    ResourceNotFoundError,
    ResourceExistsError,
    ResourceModifiedError,
    ResourceNotModifiedError,
    map_error
)
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, AnalyzeResult
import asyncio
from concurrent.futures import ThreadPoolExecutor
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Custom exceptions
class DocumentAnalysisError(Exception):
    """Raised when document analysis fails"""
    pass

class ValidationError(Exception):
    """Raised when input validation fails"""
    pass

# Retry configuration
MAX_RETRIES = 3
MIN_RETRY_DELAY = 1  # second
MAX_RETRY_DELAY = 10  # seconds

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document-analysis"])

# Request/Response Models
class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis"""
    files: List[str] = Field(..., min_items=1, max_items=10, description="List of base64 encoded files")
    userId: str = Field(..., min_length=1, description="User ID initiating the analysis")
    
    @validator('files', each_item=True)
    def validate_base64(cls, v):
        """Validate base64 encoded strings"""
        if not v:
            raise ValueError("Empty file data")
            
        # Basic base64 validation
        if len(v) > 15 * 1024 * 1024:  # 15MB max per file
            raise ValueError("File size exceeds maximum limit of 15MB")
            
        # Check if it's valid base64
        try:
            # Remove data URL prefix if present
            if "," in v:
                v = v.split(",")[1]
            # Check if it's base64
            if not re.match(r'^[A-Za-z0-9+/=]+$', v):
                raise ValueError("Invalid base64 data")
        except Exception as e:
            raise ValueError(f"Invalid file data: {str(e)}")
        return v

class DocumentAnalysisResponse(BaseModel):
    """Response model for document analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    result: Optional[Dict[str, Any]] = Field(None, description="Analysis results")
    error: Optional[str] = Field(None, description="Error message if analysis failed")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")
    document_id: Optional[str] = Field(None, description="Unique ID for the processed document")

@router.post(
    "/documentAnalysis",
    response_model=DocumentAnalysisResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"description": "Invalid request"},
        401: {"description": "Unauthorized"},
        500: {"description": "Internal server error"},
        503: {"description": "Service unavailable"}
    }
)
async def analyze_document(request: DocumentAnalysisRequest):
    """
    Analyze documents using Azure Document Intelligence.
    Processes financial documents and extracts structured data.
    
    Args:
        request: DocumentAnalysisRequest containing base64 encoded files and user ID
        
    Returns:
        DocumentAnalysisResponse with analysis results or error details
    """
    start_time = time.time()
    document_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Processing document analysis request for user: {request.userId}")
        logger.info(f"Number of files to process: {len(request.files)}")
        
        # Validate environment variables
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key = os.getenv("AZURE_DI_KEY")
        model_id = os.getenv("AZURE_DI_MODEL_ID", "prebuilt-document")
        
        if not all([endpoint, key]):
            raise DocumentAnalysisError("Azure Document Intelligence credentials not configured")
        
        logger.info(f"Processing {len(request.files)} files with Azure Document Intelligence")
        
        # Process each file
        results = []
        for i, file_data in enumerate(request.files, 1):
            try:
                # Process document with retry logic
                result = await _process_document(
                    file_data=file_data,
                    endpoint=endpoint,
                    key=key,
                    model_id=model_id,
                    file_index=i
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process file {i}: {str(e)}", exc_info=True)
                # Continue with next file even if one fails
                continue
                
        if not results:
            raise DocumentAnalysisError("Failed to process any files")
            
        processing_time = time.time() - start_time
        logger.info(f"Successfully processed {len(results)}/{len(request.files)} files in {processing_time:.2f}s")
        
        return DocumentAnalysisResponse(
            success=True,
            result={"documents": results},
            processing_time=processing_time,
            document_id=document_id
        )
        
    except ValidationError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except (ClientAuthenticationError, ResourceNotFoundError) as e:
        logger.error(f"Authentication/Resource error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document intelligence service is currently unavailable. Please try again later."
        )
    except (ServiceRequestError, TimeoutError) as e:
        logger.error(f"Network error during document processing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to connect to document processing service. Please check your connection and try again."
        )
    except DocumentAnalysisError as e:
        logger.error(f"Document processing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process document: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during document analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your document"
        )
        


@retry(
    stop=stop_after_attempt(MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=MIN_RETRY_DELAY, max=MAX_RETRY_DELAY),
    retry=retry_if_exception_type((ServiceRequestError, TimeoutError)),
    reraise=True
)
async def _process_document(
    file_data: str,
    endpoint: str,
    key: str,
    model_id: str,
    file_index: int
) -> Dict[str, Any]:
    """Process a single document with Azure Document Intelligence.
    
    Args:
        file_data: Base64 encoded file data
        endpoint: Azure Document Intelligence endpoint
        key: Azure Document Intelligence key
        model_id: Model ID to use for analysis
        file_index: Index of the file being processed (for logging)
        
    Returns:
        Processed document result
        
    Raises:
        DocumentAnalysisError: If document processing fails
    """
    temp_file_path = None
    try:
        # Remove data URL prefix if present
        if "," in file_data:
            file_data = file_data.split(",")[1]
            
        # Decode base64 data
        try:
            file_bytes = base64.b64decode(file_data)
        except Exception as e:
            raise ValidationError(f"Invalid base64 data in file {file_index}: {str(e)}")
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_bytes)
            temp_file_path = temp_file.name
        
        # Initialize the client with timeout
        document_intelligence_client = DocumentIntelligenceClient(
            endpoint=endpoint, 
            credential=AzureKeyCredential(key),
            logging_enable=True
        )
        
        # Process with timeout
        poller = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: document_intelligence_client.begin_analyze_document(
                model_id=model_id,
                analyze_request={"base64Source": file_bytes},
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
            
            # Process the result
            processed_result = await _process_azure_result(result)
            return processed_result
            
        except asyncio.TimeoutError:
            poller.cancel()
            raise TimeoutError(f"Document processing timed out after 5 minutes for file {file_index}")
            
    except Exception as e:
        error_msg = f"Failed to process file {file_index}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DocumentAnalysisError(error_msg) from e
        
    finally:
        # Clean up the temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_file_path}: {str(e)}")


async def _process_azure_result(result) -> Dict[str, Any]:
    """
    Process real Azure Document Intelligence result and extract P&L financial data.
    
    Args:
        result: Azure Document Intelligence result object
        
    Returns:
        Dict containing processed document data
        
    Raises:
        HTTPException: If processing fails
    """
    try:
        logger.info("Processing Azure Document Intelligence result")
        
        # Convert Azure DI result to our expected format
        analyze_result = {
            "apiVersion": result.api_version if hasattr(result, 'api_version') else "2024-11-30",
            "modelId": result.model_id if hasattr(result, 'model_id') else "prebuilt-document",
            "stringIndexType": "utf16CodeUnit",
            "content": result.content if hasattr(result, 'content') else "",
            "pages": [],
            "tables": [],
            "keyValuePairs": [],
            "documents": []
        }
        
        # Process pages if available
        if hasattr(result, 'pages') and result.pages:
            analyze_result["pages"] = [
                {
                    "pageNumber": page.page_number if hasattr(page, 'page_number') else idx + 1,
                    "angle": page.angle if hasattr(page, 'angle') else 0,
                    "width": page.width if hasattr(page, 'width') else 8.5,
                    "height": page.height if hasattr(page, 'height') else 11,
                    "unit": page.unit if hasattr(page, 'unit') else "inch",
                    "words": [],
                    "lines": []
                }
                for idx, page in enumerate(result.pages)
            ]
        
        # Process tables if available
        if hasattr(result, 'tables') and result.tables:
            for table in result.tables:
                table_data = {
                    "rowCount": table.row_count if hasattr(table, 'row_count') else 0,
                    "columnCount": table.column_count if hasattr(table, 'column_count') else 0,
                    "cells": [
                        {
                            "kind": cell.kind if hasattr(cell, 'kind') else "content",
                            "rowIndex": cell.row_index if hasattr(cell, 'row_index') else 0,
                            "columnIndex": cell.column_index if hasattr(cell, 'column_index') else 0,
                            "content": cell.content if hasattr(cell, 'content') else "",
                            "boundingRegions": []
                        }
                        for cell in table.cells
                    ] if hasattr(table, 'cells') else [],
                    "boundingRegions": []
                }
                analyze_result["tables"].append(table_data)
        
        # Process key-value pairs if available
        if hasattr(result, 'key_value_pairs') and result.key_value_pairs:
            analyze_result["keyValuePairs"] = [
                {
                    "key": {"content": kvp.key.content if hasattr(kvp.key, 'content') else ""},
                    "value": {"content": kvp.value.content if hasattr(kvp.value, 'content') else ""},
                    "confidence": kvp.confidence if hasattr(kvp, 'confidence') else 0.5
                }
                for kvp in result.key_value_pairs
            ]
        
        # Process documents and extract financial fields
        extracted_fields = {}
        if hasattr(result, 'documents') and result.documents:
            for doc in result.documents:
                if hasattr(doc, 'fields') and doc.fields:
                    for field_name, field_value in doc.fields.items():
                        # Include financial fields and metadata
                        if any(keyword in field_name.lower() for keyword in 
                              ['revenue', 'income', 'expense', 'cost', 'profit', 'loss', 'margin', 
                               'period', 'date', 'year', 'month', 'quarter', 'reporting']):
                            extracted_fields[field_name] = {
                                "type": field_value.value_type if hasattr(field_value, 'value_type') else "string",
                                "value": field_value.value if hasattr(field_value, 'value') else "",
                                "valueString": str(field_value.value) if hasattr(field_value, 'value') else "",
                                "confidence": field_value.confidence if hasattr(field_value, 'confidence') else 0.5,
                                "content": field_value.content if hasattr(field_value, 'content') else ""
                            }
        
        # Fallback to content extraction if no fields found
        if not extracted_fields:
            logger.info("No fields found in document, extracting from content")
            extracted_fields = _extract_pnl_from_content(analyze_result)
        
        # Create document structure with extracted fields
        analyze_result["documents"].append({
            "docType": "financial",
            "boundingRegions": [{"pageNumber": 1, "boundingBox": [0, 0, 8.5, 0, 8.5, 11, 0, 11]}],
            "fields": extracted_fields,
            "confidence": 0.85
        })
        
        logger.info(f"Extracted {len(extracted_fields)} fields from document")
        
        return {
            "status": "succeeded",
            "createdDateTime": datetime.utcnow().isoformat() + "Z",
            "lastUpdatedDateTime": datetime.utcnow().isoformat() + "Z",
            "analyzeResult": analyze_result
        }
        
    except Exception as e:
        error_msg = f"Error processing Azure result: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DocumentAnalysisError(error_msg) from e


def _extract_pnl_from_content(analyze_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract P&L data from document content and tables when specific fields aren't available.
    """
    extracted_fields = {}
    
    # Common P&L keywords to look for
    pnl_patterns = {
        'pnl_total_revenue': ['total revenue', 'revenue', 'sales', 'total income', 'income'],
        'pnl_cost_of_goods_sold': ['cost of goods sold', 'cogs', 'cost of sales'],
        'pnl_gross_profit': ['gross profit', 'gross income'],
        'pnl_operating_expenses': ['operating expenses', 'expenses', 'total expenses'],
        'pnl_net_income': ['net income', 'net profit', 'profit', 'net earnings']
    }
    
    # Search through table content
    for table in analyze_result.get("tables", []):
        for cell in table.get("cells", []):
            content = cell.get("content", "").lower()
            
            # Look for P&L field matches
            for field_key, patterns in pnl_patterns.items():
                for pattern in patterns:
                    if pattern in content:
                        # Try to find corresponding value in adjacent cells
                        value = _find_adjacent_value(table, cell)
                        if value:
                            extracted_fields[field_key] = {
                                "type": "currency",
                                "value": value,
                                "valueString": str(value),
                                "confidence": 0.7,
                                "content": f"${value:,.2f}"
                            }
                            break
    
    # If no fields found, return empty result
    if not extracted_fields:
        logger.warning("No P&L data extracted from document")
        extracted_fields = {}
    
    return extracted_fields


def _find_adjacent_value(table: Dict[str, Any], target_cell: Dict[str, Any]) -> float:
    """
    Find numeric value in cells adjacent to the target cell.
    """
    target_row = target_cell.get("rowIndex", 0)
    target_col = target_cell.get("columnIndex", 0)
    
    # Look in adjacent columns in the same row
    for cell in table.get("cells", []):
        if (cell.get("rowIndex") == target_row and 
            cell.get("columnIndex") != target_col):
            
            content = cell.get("content", "").replace("$", "").replace(",", "").strip()
            try:
                return float(content)
            except ValueError:
                continue
    
    return 0.0




@router.get("/documentAnalysis/health")
async def health_check():
    """Health check endpoint for document analysis service."""
    return {"status": "healthy", "service": "document-analysis"}

@router.get("/documentAnalysis/debug")
async def debug_credentials():
    """Debug endpoint to check Azure DI credentials."""
    endpoint = os.getenv("DI_ENDPOINT")
    key = os.getenv("DI_KEY")
    model_id = os.getenv("DI_MODEL_ID", "prebuilt-layout")
    
    return {
        "endpoint_set": bool(endpoint),
        "endpoint_length": len(endpoint) if endpoint else 0,
        "key_set": bool(key),
        "key_length": len(key) if key else 0,
        "model_id": model_id,
        "credentials_valid": bool(endpoint and key)
    }
