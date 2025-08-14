"""
Business API endpoints for Neo4j operations.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from neo4j import Driver
from .auth import get_current_user, User
from db import get_neo4j_driver  # Import the new driver getter function

router = APIRouter(prefix="/business", tags=["business"])

async def execute_query(query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Execute a Neo4j query using a session context manager"""
    try:
        with get_neo4j_driver().session(database="neo4j") as session:
            result = session.run(query, params or {})
            return [dict(record) for record in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neo4j query error: {str(e)}")

@router.post("/entity")
async def create_entity(
    entity_type: str,
    properties: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Create a new entity node"""
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
    """Execute a custom Cypher query"""
    result = await execute_query(query, params)
    return {"results": result}
