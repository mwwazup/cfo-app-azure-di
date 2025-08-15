"""
Document Analysis API endpoints for Azure Document Intelligence integration.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import base64
import os
import tempfile
import logging
import time
from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document-analysis"])

class DocumentAnalysisRequest(BaseModel):
    files: List[str]  # Base64 encoded files
    userId: str

class DocumentAnalysisResponse(BaseModel):
    success: bool
    result: Dict[str, Any]
    error: str = None

@router.post("/documentAnalysis")
async def analyze_document(request: DocumentAnalysisRequest):
    """
    Analyze documents using Azure Document Intelligence.
    Processes P&L documents and extracts financial data.
    """
    try:
        logger.info(f"Processing document analysis request for user: {request.userId}")
        logger.info(f"Number of files to process: {len(request.files)}")
        
        # Get Azure DI credentials from environment
        endpoint = os.getenv("DI_ENDPOINT")
        key = os.getenv("DI_KEY")
        model_id = os.getenv("DI_MODEL_ID", "PNL")
        
        logger.info(f"Azure DI Endpoint: {endpoint[:50] if endpoint else 'None'}...")
        logger.info(f"Azure DI Key: {'***' if key else 'None'} (length: {len(key) if key else 0})")
        logger.info(f"Azure DI Model ID: {model_id}")
        
        if not endpoint or not key:
            raise HTTPException(
                status_code=500, 
                detail="Azure Document Intelligence credentials not configured. Please set DI_ENDPOINT and DI_KEY environment variables."
            )
        
        logger.info("Using real Azure Document Intelligence API")
        
        # Process the first file (assuming single file upload for now)
        if not request.files:
            raise ValueError("No files provided for analysis")
            
        # Accept both raw base64 and data URLs (e.g., "data:application/pdf;base64,AAAA...")
        raw_input = request.files[0]
        base64_str = raw_input.split(",", 1)[1] if "," in raw_input else raw_input
        file_data = base64.b64decode(base64_str)
        
        try:
            # Initialize Azure Document Intelligence client
            document_intelligence_client = DocumentIntelligenceClient(
                endpoint=endpoint, 
                credential=AzureKeyCredential(key)
            )
            
            # Analyze document directly with bytes data
            logger.info(f"Analyzing document with model: {model_id}")
            logger.info(f"File bytes length: {len(file_data)}")
            
            # Use asyncio to run the sync Azure DI client in async context
            loop = asyncio.get_event_loop()
            executor = ThreadPoolExecutor()
            
            # Convert bytes to base64 for Azure DI API
            base64_data = base64.b64encode(file_data).decode('utf-8')
            
            # Create request body with base64Source
            analyze_request = {
                "base64Source": base64_data
            }
            
            # Call Azure DI with proper request format
            poller = await loop.run_in_executor(
                executor,
                lambda: document_intelligence_client.begin_analyze_document(
                    model_id,
                    analyze_request
                )
            )
            result = await loop.run_in_executor(executor, poller.result)
            
            logger.info("Azure DI analysis completed, processing result...")
            
            # Process the Azure result
            processed_result = await _process_azure_result(result)
            
            logger.info("Document analysis completed successfully")
            return {"success": True, "data": processed_result}
            
        except Exception as azure_error:
            logger.error(f"Azure DI error: {str(azure_error)}")
            # Log the specific error type for debugging
            logger.error(f"Azure DI error type: {type(azure_error)}")
            raise azure_error
                
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")


async def _process_azure_result(result) -> Dict[str, Any]:
    """
    Process real Azure Document Intelligence result and extract P&L financial data.
    """
    try:
        logger.info("Processing real Azure Document Intelligence result")
        
        # Convert Azure DI result to our expected format
        analyze_result = {
            "apiVersion": result.api_version if hasattr(result, 'api_version') else "2024-11-30",
            "modelId": result.model_id if hasattr(result, 'model_id') else "prebuilt-layout",
            "stringIndexType": "utf16CodeUnit",
            "content": result.content if hasattr(result, 'content') else "",
            "pages": [],
            "tables": [],
            "keyValuePairs": [],
            "documents": []
        }
        
        # Process pages if available
        if hasattr(result, 'pages') and result.pages:
            for page in result.pages:
                page_data = {
                    "pageNumber": page.page_number if hasattr(page, 'page_number') else 1,
                    "angle": page.angle if hasattr(page, 'angle') else 0,
                    "width": page.width if hasattr(page, 'width') else 8.5,
                    "height": page.height if hasattr(page, 'height') else 11,
                    "unit": page.unit if hasattr(page, 'unit') else "inch",
                    "words": [],
                    "lines": []
                }
                analyze_result["pages"].append(page_data)
        
        # Process tables if available
        if hasattr(result, 'tables') and result.tables:
            for table in result.tables:
                table_data = {
                    "rowCount": table.row_count if hasattr(table, 'row_count') else 0,
                    "columnCount": table.column_count if hasattr(table, 'column_count') else 0,
                    "cells": [],
                    "boundingRegions": []
                }
                
                if hasattr(table, 'cells'):
                    for cell in table.cells:
                        cell_data = {
                            "kind": cell.kind if hasattr(cell, 'kind') else "content",
                            "rowIndex": cell.row_index if hasattr(cell, 'row_index') else 0,
                            "columnIndex": cell.column_index if hasattr(cell, 'column_index') else 0,
                            "content": cell.content if hasattr(cell, 'content') else "",
                            "boundingRegions": []
                        }
                        table_data["cells"].append(cell_data)
                
                analyze_result["tables"].append(table_data)
        
        # Process key-value pairs if available
        if hasattr(result, 'key_value_pairs') and result.key_value_pairs:
            for kvp in result.key_value_pairs:
                kvp_data = {
                    "key": {"content": kvp.key.content if hasattr(kvp.key, 'content') else ""},
                    "value": {"content": kvp.value.content if hasattr(kvp.value, 'content') else ""},
                    "confidence": kvp.confidence if hasattr(kvp, 'confidence') else 0.5
                }
                analyze_result["keyValuePairs"].append(kvp_data)
        
        # Process documents and extract P&L fields
        extracted_fields = {}
        if hasattr(result, 'documents') and result.documents:
            for doc in result.documents:
                if hasattr(doc, 'fields') and doc.fields:
                    # Extract all fields from the document (including reportingPeriod)
                    for field_name, field_value in doc.fields.items():
                        # Include P&L fields and period/date fields
                        if (any(keyword in field_name.lower() for keyword in ['revenue', 'income', 'expense', 'cost', 'profit', 'loss']) or
                            any(keyword in field_name.lower() for keyword in ['period', 'date', 'reporting'])):
                            extracted_fields[field_name] = {
                                "type": field_value.value_type if hasattr(field_value, 'value_type') else "string",
                                "value": field_value.value if hasattr(field_value, 'value') else field_value.content if hasattr(field_value, 'content') else "",
                                "valueString": str(field_value.value) if hasattr(field_value, 'value') else field_value.content if hasattr(field_value, 'content') else "",
                                "confidence": field_value.confidence if hasattr(field_value, 'confidence') else 0.5,
                                "content": field_value.content if hasattr(field_value, 'content') else str(field_value.value) if hasattr(field_value, 'value') else ""
                            }
        
        # If no specific P&L fields found, try to extract from tables and content
        if not extracted_fields:
            logger.info("No specific P&L fields found, attempting to extract from tables and content")
            extracted_fields = _extract_pnl_from_content(analyze_result)
        
        # Create document structure with extracted fields
        document_data = {
            "docType": "PNL",
            "boundingRegions": [{"pageNumber": 1, "boundingBox": [0, 0, 8.5, 0, 8.5, 11, 0, 11]}],
            "fields": extracted_fields,
            "confidence": 0.85
        }
        analyze_result["documents"].append(document_data)
        
        logger.info(f"Extracted {len(extracted_fields)} P&L fields from Azure DI result")
        
        return {
            "status": "succeeded",
            "createdDateTime": "2025-01-10T21:00:00Z",
            "lastUpdatedDateTime": "2025-01-10T21:00:05Z",
            "analyzeResult": analyze_result
        }
        
    except Exception as e:
        logger.error(f"Error processing Azure result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


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
