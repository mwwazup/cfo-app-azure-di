"""
RAG Seed Module - Populates the graph database with financial entities and relationships
Transforms existing financial data into a graph structure for enhanced querying
"""

import os
import json
import hashlib
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import asyncio
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client, Client
import asyncpg

# Initialize Supabase client - try multiple key names
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
    os.getenv("SUPABASE_SERVICE_KEY") or 
    os.getenv("SUPABASE_ANON_KEY")
)
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

router = APIRouter(prefix="/api/rag/seed", tags=["rag-seed"])

@dataclass
class FinancialEntity:
    """Represents a financial entity in our graph"""
    entity_type: str
    entity_name: str
    entity_value: Optional[Decimal] = None
    entity_metadata: Dict = None
    time_period: Optional[date] = None

@dataclass
class FinancialRelationship:
    """Represents a relationship between financial entities"""
    source_entity_name: str
    target_entity_name: str
    relationship_type: str
    strength: float = 1.0
    context: Dict = None

class SeedRequest(BaseModel):
    user_id: str
    data_sources: List[str] = ["revenue_entries", "document_kpis", "document_metrics"]
    rebuild_graph: bool = False

class SeedResponse(BaseModel):
    success: bool
    entities_created: int
    relationships_created: int
    actions_generated: int
    processing_time_seconds: float
    message: str

class RAGSeeder:
    """Handles seeding the RAG graph database from existing financial data"""
    
    def __init__(self):
        self.db_url = self._get_database_url()
        self.entity_cache = {}  # Cache entity IDs to avoid duplicates
        
    def _get_database_url(self) -> str:
        """Construct database URL from environment variables"""
        db_password = os.getenv("DB_PASSWORD", "")
        if "@" in db_password:
            db_password = db_password.replace("@", "%40")
        
        return f"postgresql://postgres.rpilyciarvacbmaaszvc:{db_password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
    
    async def seed_user_data(self, user_id: str, data_sources: List[str], rebuild_graph: bool = False) -> SeedResponse:
        """Main seeding function that orchestrates the entire process"""
        start_time = datetime.now()
        
        try:
            # Connect to database
            conn = await asyncpg.connect(self.db_url)
            
            # Set user context for RLS
            await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
            
            if rebuild_graph:
                await self._clear_existing_data(conn, user_id)
            
            entities_created = 0
            relationships_created = 0
            actions_generated = 0
            
            # Process each data source
            for source in data_sources:
                if source == "revenue_entries":
                    e, r, a = await self._seed_from_revenue_entries(conn, user_id)
                elif source == "document_kpis":
                    e, r, a = await self._seed_from_document_kpis(conn, user_id)
                elif source == "document_metrics":
                    e, r, a = await self._seed_from_document_metrics(conn, user_id)
                else:
                    continue
                
                entities_created += e
                relationships_created += r
                actions_generated += a
            
            # Generate additional relationships based on patterns
            additional_relationships = await self._generate_pattern_relationships(conn, user_id)
            relationships_created += additional_relationships
            
            # Generate contextual actions
            additional_actions = await self._generate_contextual_actions(conn, user_id)
            actions_generated += additional_actions
            
            await conn.close()
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return SeedResponse(
                success=True,
                entities_created=entities_created,
                relationships_created=relationships_created,
                actions_generated=actions_generated,
                processing_time_seconds=processing_time,
                message=f"Successfully seeded graph for user {user_id}"
            )
            
        except Exception as e:
            return SeedResponse(
                success=False,
                entities_created=0,
                relationships_created=0,
                actions_generated=0,
                processing_time_seconds=(datetime.now() - start_time).total_seconds(),
                message=f"Seeding failed: {str(e)}"
            )
    
    async def _clear_existing_data(self, conn: asyncpg.Connection, user_id: str):
        """Clear existing graph data for a user"""
        tables = ["answer_evidence", "action_recommendations", "temporal_contexts", 
                 "financial_relationships", "financial_entities"]
        
        for table in tables:
            await conn.execute(f"DELETE FROM {table} WHERE user_id = $1", user_id)
    
    async def _seed_from_revenue_entries(self, conn: asyncpg.Connection, user_id: str) -> Tuple[int, int, int]:
        """Seed entities from revenue_entries table"""
        entities_created = 0
        relationships_created = 0
        actions_generated = 0
        
        # Fetch revenue entries
        rows = await conn.fetch("""
            SELECT * FROM revenue_entries 
            WHERE user_id = $1 
            ORDER BY year, month
        """, user_id)
        
        for row in rows:
            # Create revenue entity
            revenue_entity = FinancialEntity(
                entity_type="revenue",
                entity_name=f"Revenue {row['month']}/{row['year']}",
                entity_value=Decimal(str(row.get('actual_revenue', 0) or row.get('amount', 0) or 0)),
                entity_metadata={
                    "source": "revenue_entries",
                    "month": row['month'],
                    "year": row['year'],
                    "target_revenue": row.get('target_revenue'),
                    "raw_data": dict(row)
                },
                time_period=date(row['year'], row['month'], 1)
            )
            
            entity_id = await self._create_entity(conn, user_id, revenue_entity)
            if entity_id:
                entities_created += 1
            
            # Create target entity if exists
            if row.get('target_revenue'):
                target_entity = FinancialEntity(
                    entity_type="goal",
                    entity_name=f"Revenue Target {row['month']}/{row['year']}",
                    entity_value=Decimal(str(row['target_revenue'])),
                    entity_metadata={
                        "source": "revenue_entries",
                        "month": row['month'],
                        "year": row['year'],
                        "target_type": "revenue"
                    },
                    time_period=date(row['year'], row['month'], 1)
                )
                
                target_id = await self._create_entity(conn, user_id, target_entity)
                if target_id:
                    entities_created += 1
                    
                    # Create relationship between actual and target
                    if entity_id and target_id:
                        relationship_created = await self._create_relationship(
                            conn, user_id, entity_id, target_id,
                            "targets", 1.0, {"comparison": "actual_vs_target"}
                        )
                        if relationship_created:
                            relationships_created += 1
        
        return entities_created, relationships_created, actions_generated
    
    async def _seed_from_document_kpis(self, conn: asyncpg.Connection, user_id: str) -> Tuple[int, int, int]:
        """Seed entities from document_kpis table"""
        entities_created = 0
        relationships_created = 0
        actions_generated = 0
        
        # Fetch KPI data
        rows = await conn.fetch("""
            SELECT * FROM document_kpis 
            WHERE user_id = $1
        """, user_id)
        
        for row in rows:
            kpi_entity = FinancialEntity(
                entity_type="kpi",
                entity_name=row['kpi_name'],
                entity_value=Decimal(str(row.get('value', 0))),
                entity_metadata={
                    "source": "document_kpis",
                    "document_id": row.get('document_id'),
                    "category": row.get('category'),
                    "raw_data": dict(row)
                },
                time_period=row.get('created_at', datetime.now()).date() if row.get('created_at') else None
            )
            
            entity_id = await self._create_entity(conn, user_id, kpi_entity)
            if entity_id:
                entities_created += 1
        
        return entities_created, relationships_created, actions_generated
    
    async def _seed_from_document_metrics(self, conn: asyncpg.Connection, user_id: str) -> Tuple[int, int, int]:
        """Seed entities from document_metrics table"""
        entities_created = 0
        relationships_created = 0
        actions_generated = 0
        
        # Fetch metrics data
        rows = await conn.fetch("""
            SELECT * FROM document_metrics 
            WHERE user_id = $1
        """, user_id)
        
        for row in rows:
            # Create entity for each metric
            metric_entity = FinancialEntity(
                entity_type=self._classify_metric_type(row['field_name']),
                entity_name=row['field_name'],
                entity_value=Decimal(str(row.get('normalized_value', 0))),
                entity_metadata={
                    "source": "document_metrics",
                    "document_id": row.get('document_id'),
                    "original_value": row.get('original_value'),
                    "confidence": row.get('confidence'),
                    "raw_data": dict(row)
                },
                time_period=row.get('created_at', datetime.now()).date() if row.get('created_at') else None
            )
            
            entity_id = await self._create_entity(conn, user_id, metric_entity)
            if entity_id:
                entities_created += 1
        
        return entities_created, relationships_created, actions_generated
    
    def _classify_metric_type(self, field_name: str) -> str:
        """Classify a metric into entity type based on field name"""
        field_lower = field_name.lower()
        
        if any(term in field_lower for term in ['revenue', 'sales', 'income']):
            return 'revenue'
        elif any(term in field_lower for term in ['cost', 'expense', 'cogs']):
            return 'expense'
        elif any(term in field_lower for term in ['profit', 'margin', 'ebitda']):
            return 'kpi'
        else:
            return 'metric'
    
    async def _create_entity(self, conn: asyncpg.Connection, user_id: str, entity: FinancialEntity) -> Optional[str]:
        """Create a financial entity in the database"""
        try:
            # Check if entity already exists
            cache_key = f"{user_id}:{entity.entity_name}:{entity.time_period}"
            if cache_key in self.entity_cache:
                return self.entity_cache[cache_key]
            
            # Insert entity
            entity_id = await conn.fetchval("""
                INSERT INTO financial_entities 
                (user_id, entity_type, entity_name, entity_value, entity_metadata, time_period)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, entity_name, time_period) 
                DO UPDATE SET 
                    entity_value = EXCLUDED.entity_value,
                    entity_metadata = EXCLUDED.entity_metadata,
                    updated_at = NOW()
                RETURNING id
            """, user_id, entity.entity_type, entity.entity_name, 
                entity.entity_value, json.dumps(entity.entity_metadata or {}), entity.time_period)
            
            if entity_id:
                self.entity_cache[cache_key] = str(entity_id)
                
                # Create temporal context if time_period exists
                if entity.time_period:
                    await self._create_temporal_context(conn, user_id, str(entity_id), entity.time_period)
            
            return str(entity_id) if entity_id else None
            
        except Exception as e:
            print(f"Error creating entity {entity.entity_name}: {e}")
            return None
    
    async def _create_relationship(self, conn: asyncpg.Connection, user_id: str, 
                                 source_id: str, target_id: str, relationship_type: str, 
                                 strength: float, context: Dict) -> bool:
        """Create a relationship between two entities"""
        try:
            await conn.execute("""
                INSERT INTO financial_relationships 
                (user_id, source_entity_id, target_entity_id, relationship_type, strength, context)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, source_entity_id, target_entity_id, relationship_type)
                DO UPDATE SET 
                    strength = EXCLUDED.strength,
                    context = EXCLUDED.context
            """, user_id, source_id, target_id, relationship_type, strength, json.dumps(context or {}))
            
            return True
            
        except Exception as e:
            print(f"Error creating relationship: {e}")
            return False
    
    async def _create_temporal_context(self, conn: asyncpg.Connection, user_id: str, 
                                     entity_id: str, time_period: date):
        """Create temporal context for an entity"""
        try:
            # Determine time window and period boundaries
            period_start = time_period.replace(day=1)
            if time_period.month == 12:
                period_end = date(time_period.year + 1, 1, 1)
            else:
                period_end = date(time_period.year, time_period.month + 1, 1)
            
            await conn.execute("""
                INSERT INTO temporal_contexts 
                (user_id, entity_id, time_window, period_start, period_end)
                VALUES ($1, $2, 'month', $3, $4)
                ON CONFLICT (user_id, entity_id, time_window, period_start)
                DO NOTHING
            """, user_id, entity_id, period_start, period_end)
            
        except Exception as e:
            print(f"Error creating temporal context: {e}")
    
    async def _generate_pattern_relationships(self, conn: asyncpg.Connection, user_id: str) -> int:
        """Generate relationships based on data patterns"""
        relationships_created = 0
        
        # Find revenue trends and create correlations
        revenue_entities = await conn.fetch("""
            SELECT id, entity_name, entity_value, time_period
            FROM financial_entities 
            WHERE user_id = $1 AND entity_type = 'revenue'
            ORDER BY time_period
        """, user_id)
        
        # Create sequential relationships for trend analysis
        for i in range(1, len(revenue_entities)):
            prev_entity = revenue_entities[i-1]
            curr_entity = revenue_entities[i]
            
            # Calculate trend strength
            if prev_entity['entity_value'] and curr_entity['entity_value']:
                change = float(curr_entity['entity_value'] - prev_entity['entity_value'])
                change_pct = change / float(prev_entity['entity_value']) if prev_entity['entity_value'] != 0 else 0
                
                relationship_created = await self._create_relationship(
                    conn, user_id, str(prev_entity['id']), str(curr_entity['id']),
                    "precedes", min(1.0, abs(change_pct)), 
                    {"change_amount": change, "change_percent": change_pct}
                )
                
                if relationship_created:
                    relationships_created += 1
        
        return relationships_created
    
    async def _generate_contextual_actions(self, conn: asyncpg.Connection, user_id: str) -> int:
        """Generate actionable recommendations based on current data"""
        actions_generated = 0
        
        # Analyze revenue gaps
        revenue_gaps = await conn.fetch("""
            SELECT fe1.id as actual_id, fe1.entity_value as actual,
                   fe2.id as target_id, fe2.entity_value as target,
                   fe1.time_period
            FROM financial_entities fe1
            JOIN financial_relationships fr ON fr.source_entity_id = fe1.id
            JOIN financial_entities fe2 ON fr.target_entity_id = fe2.id
            WHERE fe1.user_id = $1 AND fe1.entity_type = 'revenue'
            AND fe2.entity_type = 'goal' AND fr.relationship_type = 'targets'
            AND fe1.entity_value < fe2.entity_value
        """, user_id)
        
        for gap in revenue_gaps:
            gap_amount = float(gap['target'] - gap['actual'])
            
            action_id = await conn.fetchval("""
                INSERT INTO action_recommendations 
                (user_id, trigger_entity_id, action_type, action_title, action_description, 
                 priority, estimated_impact, time_horizon, prerequisites, success_metrics)
                VALUES ($1, $2, 'increase_revenue', $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            """, 
                user_id, str(gap['actual_id']),
                f"Close Revenue Gap for {gap['time_period'].strftime('%B %Y')}",
                f"Your actual revenue (${gap['actual']:,.0f}) is ${gap_amount:,.0f} below target (${gap['target']:,.0f}). Consider increasing marketing spend, improving conversion rates, or expanding to new markets.",
                8,  # High priority
                gap_amount,
                "short_term",
                json.dumps(["Review current marketing channels", "Analyze conversion funnel"]),
                json.dumps({"target_revenue": float(gap['target']), "gap_to_close": gap_amount})
            )
            
            if action_id:
                actions_generated += 1
        
        return actions_generated

# Initialize seeder instance
seeder = RAGSeeder()

@router.post("/user")
async def seed_user_data(request: SeedRequest, background_tasks: BackgroundTasks):
    """Seed RAG graph database for a specific user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    # Run seeding in background for large datasets
    background_tasks.add_task(
        seeder.seed_user_data, 
        request.user_id, 
        request.data_sources, 
        request.rebuild_graph
    )
    
    return {"message": "Seeding started in background", "user_id": request.user_id}

@router.post("/user/sync")
async def seed_user_data_sync(request: SeedRequest):
    """Seed RAG graph database for a specific user (synchronous)"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    result = await seeder.seed_user_data(
        request.user_id, 
        request.data_sources, 
        request.rebuild_graph
    )
    
    return result

@router.get("/status/{user_id}")
async def get_seed_status(user_id: str):
    """Get seeding status for a user"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Count entities and relationships
        conn = await asyncpg.connect(seeder.db_url)
        await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
        
        entity_count = await conn.fetchval(
            "SELECT COUNT(*) FROM financial_entities WHERE user_id = $1", user_id
        )
        
        relationship_count = await conn.fetchval(
            "SELECT COUNT(*) FROM financial_relationships WHERE user_id = $1", user_id
        )
        
        action_count = await conn.fetchval(
            "SELECT COUNT(*) FROM action_recommendations WHERE user_id = $1", user_id
        )
        
        await conn.close()
        
        return {
            "user_id": user_id,
            "entities": entity_count,
            "relationships": relationship_count,
            "actions": action_count,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")
