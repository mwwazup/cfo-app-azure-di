from fastapi import APIRouter, HTTPException, Depends
import os
import httpx
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from .auth import get_current_user, User

router = APIRouter(prefix="/memory", tags=["memory"])

# Models
class Memory(BaseModel):
    id: str
    content: str
    metadata: dict
    created_at: datetime
    updated_at: datetime

class MemoryCreate(BaseModel):
    content: str
    metadata: Optional[dict] = None

class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    metadata: Optional[dict] = None

async def get_zep_client():
    """Get authenticated Zep client"""
    return httpx.AsyncClient(
        base_url=os.getenv("ZEP_API_URL"),
        headers={
            "accept": "application/json",
            "Authorization": f"Bearer {os.getenv('ZEP_API_KEY')}"
        }
    )

@router.post("/", response_model=Memory)
async def create_memory(
    memory: MemoryCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new memory"""
    async with await get_zep_client() as client:
        try:
            response = await client.post(
                "/api/v1/memory",
                json={
                    "content": memory.content,
                    "metadata": {
                        **(memory.metadata or {}),
                        "user_id": current_user.id
                    }
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Zep API error: {str(e)}")

@router.get("/", response_model=List[Memory])
async def list_memories(
    current_user: User = Depends(get_current_user),
    limit: int = 10,
    offset: int = 0
):
    """List memories for the current user"""
    async with await get_zep_client() as client:
        try:
            response = await client.get(
                "/api/v1/memory",
                params={
                    "limit": limit,
                    "offset": offset,
                    "metadata.user_id": current_user.id
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Zep API error: {str(e)}")

@router.get("/{memory_id}", response_model=Memory)
async def get_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific memory"""
    async with await get_zep_client() as client:
        try:
            response = await client.get(f"/api/v1/memory/{memory_id}")
            response.raise_for_status()
            memory = response.json()
            
            # Check if memory belongs to user
            if memory["metadata"].get("user_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to access this memory")
                
            return memory
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Zep API error: {str(e)}")

@router.put("/{memory_id}", response_model=Memory)
async def update_memory(
    memory_id: str,
    memory: MemoryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a memory"""
    # First check if memory exists and belongs to user
    async with await get_zep_client() as client:
        try:
            get_response = await client.get(f"/api/v1/memory/{memory_id}")
            get_response.raise_for_status()
            existing = get_response.json()
            
            if existing["metadata"].get("user_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to modify this memory")
            
            # Update memory
            update_data = {}
            if memory.content is not None:
                update_data["content"] = memory.content
            if memory.metadata is not None:
                update_data["metadata"] = {
                    **memory.metadata,
                    "user_id": current_user.id  # Ensure user_id is preserved
                }
            
            response = await client.put(
                f"/api/v1/memory/{memory_id}",
                json=update_data
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Zep API error: {str(e)}")

@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a memory"""
    # First check if memory exists and belongs to user
    async with await get_zep_client() as client:
        try:
            get_response = await client.get(f"/api/v1/memory/{memory_id}")
            get_response.raise_for_status()
            existing = get_response.json()
            
            if existing["metadata"].get("user_id") != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to delete this memory")
            
            # Delete memory
            response = await client.delete(f"/api/v1/memory/{memory_id}")
            response.raise_for_status()
            return {"message": "Memory deleted successfully"}
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Zep API error: {str(e)}")
