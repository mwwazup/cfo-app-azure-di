"""
RAG Query Module - Intelligent querying of the graph database for contextual answers
Provides temporal and relationship-aware financial analysis
"""

import os
import json
import hashlib
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import re
import asyncio

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import asyncpg
from supabase import create_client, Client

# Initialize Supabase client - try multiple key names
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
    os.getenv("SUPABASE_SERVICE_KEY") or 
    os.getenv("SUPABASE_ANON_KEY")
)
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

router = APIRouter(prefix="/api/rag/query", tags=["rag-query"])

class QueryRequest(BaseModel):
    user_id: str
    question: str
    context_window: Optional[str] = "12_months"  # "1_month", "3_months", "12_months", "all"
    include_actions: bool = True
    include_evidence: bool = True

class Evidence(BaseModel):
    type: str  # "data_point", "trend", "correlation", "benchmark"
    source: str
    data: Dict[str, Any]
    confidence: float
    description: str

class Action(BaseModel):
    id: str
    title: str
    description: str
    priority: int
    estimated_impact: Optional[Decimal]
    time_horizon: str
    prerequisites: List[str]
    success_metrics: Dict[str, Any]

class QueryResponse(BaseModel):
    answer: str
    confidence: float
    evidence: List[Evidence]
    actions: List[Action]
    related_entities: List[Dict[str, Any]]
    temporal_context: Dict[str, Any]
    processing_time_ms: int

class RAGQueryEngine:
    """Handles intelligent querying of the financial graph database"""
    
    def __init__(self):
        self.db_url = self._get_database_url()
        
    def _get_database_url(self) -> str:
        """Construct database URL from environment variables"""
        db_password = os.getenv("DB_PASSWORD", "")
        if "@" in db_password:
            db_password = db_password.replace("@", "%40")
        
        return f"postgresql://postgres.rpilyciarvacbmaaszvc:{db_password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
    
    async def process_query(self, user_id: str, question: str, context_window: str = "12_months", 
                          include_actions: bool = True, include_evidence: bool = True) -> QueryResponse:
        """Main query processing function"""
        start_time = datetime.now()
        
        try:
            # Connect to database
            conn = await asyncpg.connect(self.db_url)
            await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
            
            # Analyze the question to determine intent and entities
            query_intent = self._analyze_question_intent(question)
            relevant_entities = await self._find_relevant_entities(conn, user_id, question, context_window)
            
            # Generate contextual answer based on intent
            answer = await self._generate_contextual_answer(conn, user_id, question, query_intent, relevant_entities)
            
            # Gather evidence if requested
            evidence = []
            if include_evidence:
                evidence = await self._gather_evidence(conn, user_id, question, query_intent, relevant_entities)
            
            # Get relevant actions if requested
            actions = []
            if include_actions:
                actions = await self._get_relevant_actions(conn, user_id, query_intent, relevant_entities)
            
            # Get temporal context
            temporal_context = await self._get_temporal_context(conn, user_id, relevant_entities, context_window)
            
            # Calculate confidence based on data availability and relevance
            confidence = self._calculate_confidence(relevant_entities, evidence, temporal_context)
            
            await conn.close()
            
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return QueryResponse(
                answer=answer,
                confidence=confidence,
                evidence=evidence,
                actions=actions,
                related_entities=relevant_entities,
                temporal_context=temporal_context,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return QueryResponse(
                answer=f"I encountered an error processing your question: {str(e)}",
                confidence=0.0,
                evidence=[],
                actions=[],
                related_entities=[],
                temporal_context={},
                processing_time_ms=processing_time
            )
    
    def _analyze_question_intent(self, question: str) -> Dict[str, Any]:
        """Analyze question to determine user intent and key entities"""
        lower_q = question.lower()
        
        intent = {
            "type": "general",
            "entities": [],
            "time_period": None,
            "comparison": False,
            "trend_analysis": False,
            "action_request": False
        }
        
        # Detect question type
        if any(word in lower_q for word in ['what', 'how much', 'tell me']):
            intent["type"] = "information"
        elif any(word in lower_q for word in ['why', 'explain', 'reason']):
            intent["type"] = "explanation"
        elif any(word in lower_q for word in ['should', 'recommend', 'suggest', 'what to do', 'next steps']):
            intent["type"] = "recommendation"
            intent["action_request"] = True
        elif any(word in lower_q for word in ['compare', 'difference', 'vs', 'versus']):
            intent["type"] = "comparison"
            intent["comparison"] = True
        elif any(word in lower_q for word in ['trend', 'growing', 'increasing', 'decreasing', 'pattern']):
            intent["type"] = "trend"
            intent["trend_analysis"] = True
        
        # Extract entities
        if any(word in lower_q for word in ['revenue', 'sales', 'income']):
            intent["entities"].append("revenue")
        if any(word in lower_q for word in ['cost', 'expense', 'spending']):
            intent["entities"].append("expense")
        if any(word in lower_q for word in ['profit', 'margin', 'profitability']):
            intent["entities"].append("kpi")
        if any(word in lower_q for word in ['target', 'goal', 'objective']):
            intent["entities"].append("goal")
        
        # Extract time periods
        month_match = re.search(r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:of\s+)?(\d{4})', lower_q)
        year_match = re.search(r'(\d{4})', lower_q)
        
        if month_match:
            intent["time_period"] = {
                "type": "month",
                "month": month_match.group(1),
                "year": int(month_match.group(2))
            }
        elif year_match:
            intent["time_period"] = {
                "type": "year", 
                "year": int(year_match.group(1))
            }
        
        return intent
    
    async def _find_relevant_entities(self, conn: asyncpg.Connection, user_id: str, 
                                    question: str, context_window: str) -> List[Dict[str, Any]]:
        """Find entities relevant to the question using similarity search and context"""
        
        # Get time boundary for context window
        time_boundary = self._get_time_boundary(context_window)
        
        # Use fuzzy search to find relevant entities
        search_terms = self._extract_search_terms(question)
        relevant_entities = []
        
        for term in search_terms:
            entities = await conn.fetch("""
                SELECT * FROM search_entities($1, $2, NULL, 10)
            """, user_id, term)
            
            for entity in entities:
                entity_dict = dict(entity)
                # Add temporal filtering
                entity_details = await conn.fetchrow("""
                    SELECT * FROM financial_entities 
                    WHERE id = $1 AND user_id = $2
                    AND (time_period IS NULL OR time_period >= $3)
                """, entity_dict['entity_id'], user_id, time_boundary)
                
                if entity_details:
                    relevant_entities.append(dict(entity_details))
        
        # Remove duplicates and sort by relevance
        seen_ids = set()
        unique_entities = []
        for entity in relevant_entities:
            if entity['id'] not in seen_ids:
                seen_ids.add(entity['id'])
                unique_entities.append(entity)
        
        return unique_entities[:10]  # Limit to top 10 most relevant
    
    def _extract_search_terms(self, question: str) -> List[str]:
        """Extract key search terms from the question"""
        # Remove common words and extract meaningful terms
        stop_words = {'what', 'is', 'my', 'the', 'how', 'much', 'was', 'were', 'are', 'in', 'for', 'of', 'to', 'and', 'or'}
        words = re.findall(r'\b\w+\b', question.lower())
        
        meaningful_terms = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Add some financial synonyms
        financial_terms = []
        for term in meaningful_terms:
            if term in ['sales', 'income']:
                financial_terms.append('revenue')
            elif term in ['costs', 'expenses']:
                financial_terms.append('expense')
            elif term in ['profits', 'margins']:
                financial_terms.append('profit')
            financial_terms.append(term)
        
        return list(set(financial_terms))
    
    def _get_time_boundary(self, context_window: str) -> date:
        """Get the time boundary for the context window"""
        today = date.today()
        
        if context_window == "1_month":
            return today - timedelta(days=30)
        elif context_window == "3_months":
            return today - timedelta(days=90)
        elif context_window == "12_months":
            return today - timedelta(days=365)
        else:  # "all"
            return date(2000, 1, 1)  # Very old date to include everything
    
    async def _generate_contextual_answer(self, conn: asyncpg.Connection, user_id: str, 
                                        question: str, query_intent: Dict, 
                                        relevant_entities: List[Dict]) -> str:
        """Generate a contextual answer based on the graph data"""
        
        if not relevant_entities:
            return "I don't have enough data to answer your question. Please ensure your financial data has been processed into the system."
        
        # Handle different intent types
        if query_intent["type"] == "information":
            return await self._generate_information_answer(conn, user_id, query_intent, relevant_entities)
        elif query_intent["type"] == "comparison":
            return await self._generate_comparison_answer(conn, user_id, query_intent, relevant_entities)
        elif query_intent["type"] == "trend":
            return await self._generate_trend_answer(conn, user_id, query_intent, relevant_entities)
        elif query_intent["type"] == "recommendation":
            return await self._generate_recommendation_answer(conn, user_id, query_intent, relevant_entities)
        elif query_intent["type"] == "explanation":
            return await self._generate_explanation_answer(conn, user_id, query_intent, relevant_entities)
        else:
            return await self._generate_general_answer(conn, user_id, query_intent, relevant_entities)
    
    async def _generate_information_answer(self, conn: asyncpg.Connection, user_id: str,
                                         query_intent: Dict, relevant_entities: List[Dict]) -> str:
        """Generate informational answers with specific data points"""
        
        if query_intent.get("time_period"):
            # Time-specific query
            time_info = query_intent["time_period"]
            matching_entities = [e for e in relevant_entities 
                               if e.get('time_period') and 
                               e['time_period'].year == time_info.get("year")]
            
            if time_info["type"] == "month":
                month_num = self._month_name_to_number(time_info["month"])
                matching_entities = [e for e in matching_entities 
                                   if e['time_period'].month == month_num]
            
            if matching_entities:
                entity = matching_entities[0]
                return f"Based on your data, your {entity['entity_name']} was ${entity['entity_value']:,.2f} in {time_info.get('month', '')} {time_info['year']}."
            else:
                return f"I couldn't find specific data for {time_info.get('month', '')} {time_info['year']}."
        
        # General information query
        if "revenue" in query_intent.get("entities", []):
            revenue_entities = [e for e in relevant_entities if e['entity_type'] == 'revenue']
            if revenue_entities:
                total_revenue = sum(float(e['entity_value'] or 0) for e in revenue_entities)
                return f"Based on your available data, your total revenue across {len(revenue_entities)} periods is ${total_revenue:,.2f}."
        
        # Fallback to first relevant entity
        if relevant_entities:
            entity = relevant_entities[0]
            return f"I found information about {entity['entity_name']}: ${entity['entity_value']:,.2f}."
        
        return "I found some relevant data but need more specific information to provide a detailed answer."
    
    async def _generate_comparison_answer(self, conn: asyncpg.Connection, user_id: str,
                                        query_intent: Dict, relevant_entities: List[Dict]) -> str:
        """Generate comparison-based answers"""
        
        if len(relevant_entities) < 2:
            return "I need at least two data points to make a comparison."
        
        # Sort by time period for temporal comparison
        time_sorted = sorted([e for e in relevant_entities if e.get('time_period')], 
                           key=lambda x: x['time_period'])
        
        if len(time_sorted) >= 2:
            earlier = time_sorted[0]
            later = time_sorted[-1]
            
            if earlier['entity_value'] and later['entity_value']:
                change = float(later['entity_value']) - float(earlier['entity_value'])
                change_pct = (change / float(earlier['entity_value'])) * 100 if earlier['entity_value'] != 0 else 0
                
                direction = "increased" if change > 0 else "decreased"
                return f"Your {later['entity_name']} {direction} by ${abs(change):,.2f} ({abs(change_pct):.1f}%) from {earlier['time_period'].strftime('%B %Y')} (${earlier['entity_value']:,.2f}) to {later['time_period'].strftime('%B %Y')} (${later['entity_value']:,.2f})."
        
        return "I found the data points but couldn't perform a meaningful comparison."
    
    async def _generate_trend_answer(self, conn: asyncpg.Connection, user_id: str,
                                   query_intent: Dict, relevant_entities: List[Dict]) -> str:
        """Generate trend analysis answers"""
        
        # Get temporal trends using RPC function
        trends = await conn.fetch("""
            SELECT * FROM get_temporal_trends($1, $2, 'month', 12)
        """, user_id, query_intent.get("entities", [None])[0] if query_intent.get("entities") else None)
        
        if not trends:
            return "I don't have enough temporal data to analyze trends."
        
        # Analyze trend direction
        recent_trends = trends[:6]  # Last 6 periods
        if len(recent_trends) >= 3:
            values = [float(t['entity_value']) for t in recent_trends if t['entity_value']]
            if len(values) >= 3:
                # Simple trend calculation
                increasing = sum(1 for i in range(1, len(values)) if values[i] > values[i-1])
                decreasing = sum(1 for i in range(1, len(values)) if values[i] < values[i-1])
                
                if increasing > decreasing:
                    trend_direction = "upward"
                elif decreasing > increasing:
                    trend_direction = "downward"
                else:
                    trend_direction = "stable"
                
                avg_value = sum(values) / len(values)
                return f"Your {recent_trends[0]['entity_name']} shows a {trend_direction} trend over the last {len(values)} periods, with an average value of ${avg_value:,.2f}."
        
        return "I found trend data but need more periods to provide a meaningful analysis."
    
    async def _generate_recommendation_answer(self, conn: asyncpg.Connection, user_id: str,
                                            query_intent: Dict, relevant_entities: List[Dict]) -> str:
        """Generate recommendation-based answers"""
        
        # Get contextual actions
        actions = await conn.fetch("""
            SELECT * FROM get_contextual_actions($1, $2, 3)
        """, user_id, query_intent.get("entities") if query_intent.get("entities") else None)
        
        if actions:
            top_action = actions[0]
            return f"Based on your data, I recommend: {top_action['action_title']}. {top_action['action_description']} This could have an estimated impact of ${top_action['estimated_impact']:,.2f}."
        
        # Fallback recommendation based on data analysis
        if relevant_entities:
            revenue_entities = [e for e in relevant_entities if e['entity_type'] == 'revenue']
            if revenue_entities:
                return "Based on your revenue data, consider focusing on your highest-performing periods and analyzing what made them successful. Look for patterns in marketing spend, seasonal factors, or operational changes."
        
        return "I'd need more specific information about your goals to provide targeted recommendations."
    
    async def _generate_explanation_answer(self, conn: asyncpg.Connection, user_id: str,
                                         query_intent: Dict, relevant_entities: List[Dict]) -> str:
        """Generate explanatory answers with reasoning"""
        
        if relevant_entities:
            entity = relevant_entities[0]
            
            # Get related entities to provide context
            related = await conn.fetch("""
                SELECT * FROM get_related_entities($1, $2, NULL, 0.3)
            """, user_id, entity['id'])
            
            explanation = f"Looking at your {entity['entity_name']} (${entity['entity_value']:,.2f}), "
            
            if related:
                explanation += f"this is connected to {len(related)} other financial factors in your business. "
                
                # Find the strongest relationship
                strongest = max(related, key=lambda x: x['strength'])
                explanation += f"The strongest relationship is with {strongest['entity_name']} (strength: {strongest['strength']:.2f}), "
                explanation += f"which suggests these factors {strongest['relationship_type']} each other."
            else:
                explanation += "this appears to be an isolated data point without strong connections to other factors."
            
            return explanation
        
        return "I need more specific data to provide a detailed explanation."
    
    async def _generate_general_answer(self, conn: asyncpg.Connection, user_id: str,
                                     query_intent: Dict, relevant_entities: List[Dict]) -> str:
        """Generate general answers when intent is unclear"""
        
        if relevant_entities:
            entity_summary = []
            for entity in relevant_entities[:3]:  # Top 3 entities
                entity_summary.append(f"{entity['entity_name']}: ${entity['entity_value']:,.2f}")
            
            return f"I found several relevant data points: {', '.join(entity_summary)}. Could you be more specific about what you'd like to know?"
        
        return "I found some data related to your question, but I need more specific information to provide a helpful answer."
    
    def _month_name_to_number(self, month_name: str) -> int:
        """Convert month name to number"""
        month_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        return month_map.get(month_name.lower(), 1)
    
    async def _gather_evidence(self, conn: asyncpg.Connection, user_id: str, question: str,
                             query_intent: Dict, relevant_entities: List[Dict]) -> List[Evidence]:
        """Gather evidence supporting the answer"""
        evidence = []
        
        # Create evidence from relevant entities
        for entity in relevant_entities[:3]:  # Top 3 entities
            evidence.append(Evidence(
                type="data_point",
                source=entity.get('entity_metadata', {}).get('source', 'financial_entities'),
                data={
                    "entity_name": entity['entity_name'],
                    "value": float(entity['entity_value']) if entity['entity_value'] else 0,
                    "time_period": entity['time_period'].isoformat() if entity.get('time_period') else None
                },
                confidence=0.9,
                description=f"Direct data point: {entity['entity_name']} = ${entity['entity_value']:,.2f}"
            ))
        
        # Add trend evidence if applicable
        if query_intent.get("trend_analysis"):
            evidence.append(Evidence(
                type="trend",
                source="temporal_analysis",
                data={"analysis_type": "temporal_trend", "entities_analyzed": len(relevant_entities)},
                confidence=0.8,
                description=f"Trend analysis based on {len(relevant_entities)} data points"
            ))
        
        # Store evidence for future reference
        question_hash = hashlib.sha256(question.encode()).hexdigest()[:16]
        
        for ev in evidence:
            try:
                await conn.execute("""
                    INSERT INTO answer_evidence 
                    (user_id, question_hash, evidence_type, evidence_source, evidence_data, confidence_score)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (user_id, question_hash, evidence_type) DO NOTHING
                """, user_id, question_hash, ev.type, ev.source, json.dumps(ev.data), ev.confidence)
            except Exception as e:
                print(f"Error storing evidence: {e}")
        
        return evidence
    
    async def _get_relevant_actions(self, conn: asyncpg.Connection, user_id: str,
                                  query_intent: Dict, relevant_entities: List[Dict]) -> List[Action]:
        """Get relevant actions based on the query context"""
        
        # Get actions related to the entities in question
        entity_types = list(set(e['entity_type'] for e in relevant_entities))
        
        actions_data = await conn.fetch("""
            SELECT * FROM get_contextual_actions($1, $2, 5)
        """, user_id, entity_types if entity_types else None)
        
        actions = []
        for action_data in actions_data:
            actions.append(Action(
                id=str(action_data['action_id']),
                title=action_data['action_title'],
                description=action_data['action_description'],
                priority=action_data['priority'],
                estimated_impact=Decimal(str(action_data['estimated_impact'])) if action_data['estimated_impact'] else None,
                time_horizon=action_data.get('time_horizon', 'unknown'),
                prerequisites=json.loads(action_data.get('prerequisites', '[]')),
                success_metrics=json.loads(action_data.get('success_metrics', '{}'))
            ))
        
        return actions
    
    async def _get_temporal_context(self, conn: asyncpg.Connection, user_id: str,
                                  relevant_entities: List[Dict], context_window: str) -> Dict[str, Any]:
        """Get temporal context for the entities"""
        
        if not relevant_entities:
            return {}
        
        # Get time range of data
        time_periods = [e['time_period'] for e in relevant_entities if e.get('time_period')]
        
        if not time_periods:
            return {}
        
        earliest = min(time_periods)
        latest = max(time_periods)
        
        return {
            "earliest_data": earliest.isoformat(),
            "latest_data": latest.isoformat(),
            "data_span_days": (latest - earliest).days,
            "entities_with_time": len(time_periods),
            "context_window": context_window
        }
    
    def _calculate_confidence(self, relevant_entities: List[Dict], evidence: List[Evidence], 
                            temporal_context: Dict) -> float:
        """Calculate confidence score for the answer"""
        
        base_confidence = 0.5
        
        # Boost confidence based on data availability
        if relevant_entities:
            base_confidence += min(0.3, len(relevant_entities) * 0.1)
        
        # Boost confidence based on evidence quality
        if evidence:
            avg_evidence_confidence = sum(e.confidence for e in evidence) / len(evidence)
            base_confidence += avg_evidence_confidence * 0.2
        
        # Boost confidence based on temporal data availability
        if temporal_context.get("data_span_days", 0) > 30:
            base_confidence += 0.1
        
        return min(1.0, base_confidence)

# Initialize query engine
query_engine = RAGQueryEngine()

@router.post("/ask")
async def query_financial_data(request: QueryRequest):
    """Query the financial graph database with natural language"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    result = await query_engine.process_query(
        request.user_id,
        request.question,
        request.context_window,
        request.include_actions,
        request.include_evidence
    )
    
    return result

@router.get("/entities/{user_id}")
async def get_user_entities(user_id: str, entity_type: Optional[str] = None, limit: int = 50):
    """Get entities for a user with optional filtering"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        conn = await asyncpg.connect(query_engine.db_url)
        await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
        
        query = """
            SELECT * FROM financial_entities 
            WHERE user_id = $1
        """
        params = [user_id]
        
        if entity_type:
            query += " AND entity_type = $2"
            params.append(entity_type)
        
        query += " ORDER BY time_period DESC, entity_name LIMIT $" + str(len(params) + 1)
        params.append(limit)
        
        entities = await conn.fetch(query, *params)
        await conn.close()
        
        return {"entities": [dict(e) for e in entities]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entities: {str(e)}")

@router.get("/relationships/{user_id}")
async def get_user_relationships(user_id: str, entity_id: Optional[str] = None):
    """Get relationships for a user or specific entity"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        conn = await asyncpg.connect(query_engine.db_url)
        await conn.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
        
        if entity_id:
            relationships = await conn.fetch("""
                SELECT * FROM get_related_entities($1, $2, NULL, 0.0)
            """, user_id, entity_id)
        else:
            relationships = await conn.fetch("""
                SELECT fr.*, 
                       fe1.entity_name as source_name,
                       fe2.entity_name as target_name
                FROM financial_relationships fr
                JOIN financial_entities fe1 ON fr.source_entity_id = fe1.id
                JOIN financial_entities fe2 ON fr.target_entity_id = fe2.id
                WHERE fr.user_id = $1
                ORDER BY fr.strength DESC
                LIMIT 50
            """, user_id)
        
        await conn.close()
        
        return {"relationships": [dict(r) for r in relationships]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get relationships: {str(e)}")
