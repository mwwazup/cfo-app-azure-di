"""
Business API endpoints for Neo4j operations.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from neo4j import Driver
from .auth import get_current_user, User
from db import get_neo4j_driver  # Import the new driver getter function
from logging_config import get_logger

router = APIRouter(prefix="/business", tags=["business"])
logger = get_logger(__name__)

# Whitelist of allowed entity types to prevent Cypher injection
ALLOWED_ENTITY_TYPES = {
    "User", "Employee", "Document", "KPI", "Revenue", 
    "Service", "PayPeriod", "DailyRecord", "FinancialStatement"
}

# Whitelist of allowed relationship types
ALLOWED_RELATIONSHIP_TYPES = {
    "OWNS", "WORKS_FOR", "HAS_SERVICE", "MANAGES", 
    "CONTAINS", "RELATED_TO", "PERFORMED", "EARNED"
}

async def execute_query(query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Execute a Neo4j query using a session context manager"""
    try:
        with get_neo4j_driver().session(database="neo4j") as session:
            result = session.run(query, params or {})
            return [dict(record) for record in result]
    except Exception as e:
        logger.error(f"Neo4j query error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database query error")

@router.post("/entity")
async def create_entity(
    entity_type: str,
    properties: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Create a new entity node"""
    # Validate entity type against whitelist
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid entity type. Allowed types: {', '.join(ALLOWED_ENTITY_TYPES)}"
        )
    
    query = (
        f"CREATE (e:{entity_type} $properties) "
        "RETURN e"
    )
    result = await execute_query(query, {"properties": properties})
    return {"success": True, "entity": result[0]["e"] if result else None}

@router.get("/entity/{entity_type}")
async def get_entities(
    entity_type: str,
    current_user: User = Depends(get_current_user)
):
    """Get all entities of a specific type"""
    # Validate entity type against whitelist
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid entity type. Allowed types: {', '.join(ALLOWED_ENTITY_TYPES)}"
        )
    
    query = f"MATCH (e:{entity_type}) RETURN e"
    result = await execute_query(query)
    return {"entities": [record["e"] for record in result]}

@router.post("/relationship")
async def create_relationship(
    from_type: str,
    from_id: str,
    to_type: str,
    to_id: str,
    relationship_type: str,
    properties: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user)
):
    """Create a relationship between two nodes"""
    # Validate entity types against whitelist
    if from_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid from_type: {from_type}")
    if to_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid to_type: {to_type}")
    
    # Validate relationship type against whitelist
    if relationship_type not in ALLOWED_RELATIONSHIP_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid relationship type. Allowed types: {', '.join(ALLOWED_RELATIONSHIP_TYPES)}"
        )
    
    query = (
        f"MATCH (from:{from_type} {{id: $from_id}}), "
        f"(to:{to_type} {{id: $to_id}}) "
        f"CREATE (from)-[r:{relationship_type} $properties]->(to) "
        "RETURN r"
    )
    params = {
        "from_id": from_id,
        "to_id": to_id,
        "properties": properties or {}
    }
    result = await execute_query(query, params)
    return {"success": True, "relationship": result[0]["r"] if result else None}

@router.get("/schema")
async def get_schema(current_user: User = Depends(get_current_user)):
    """Get the database schema"""
    nodes_query = "CALL db.schema.visualization()"
    result = await execute_query(nodes_query)
    return {"schema": result}

@router.post("/query")
async def custom_query(
    query: str,
    params: Dict[str, Any] = None,
    current_user: User = Depends(get_current_user)
):
    """Execute a custom Cypher query (admin use only - validate carefully)"""
    # WARNING: This endpoint allows arbitrary queries
    # In production, this should be restricted to admin users only
    # or removed entirely
    logger.warning(f"Custom query executed by user {current_user.id}: {query[:100]}")
    
    # Basic safety check - prevent destructive operations
    dangerous_keywords = ["DELETE", "DETACH", "REMOVE", "DROP", "SET"]
    query_upper = query.upper()
    for keyword in dangerous_keywords:
        if keyword in query_upper:
            logger.warning(f"Blocked dangerous query keyword: {keyword}")
            raise HTTPException(
                status_code=403, 
                detail="Destructive operations not allowed via custom query"
            )
    
    result = await execute_query(query, params)
    return {"results": result}
