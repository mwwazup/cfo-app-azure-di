"""
Voice Coach V2 - Enhanced with Temporal/Graph RAG + Action System
Integrates graph database querying with actionable business intelligence
"""

import os
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
import openai
from supabase import create_client, Client

# Import our RAG modules
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'rag'))
from rag_query import RAGQueryEngine, QueryRequest
from rag_seed import RAGSeeder

# Initialize clients
openai.api_key = os.getenv("OPENAI_API_KEY")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
    os.getenv("SUPABASE_SERVICE_KEY") or 
    os.getenv("SUPABASE_ANON_KEY")
)
supabase = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

router = APIRouter(prefix="/api/voice-coach/v2", tags=["voice-coach-v2"])

class VoiceCoachRequest(BaseModel):
    question: str
    user_id: str
    timestamp: str
    context_window: Optional[str] = "12_months"
    auto_seed: bool = True  # Automatically seed data if graph is empty

class VoiceCoachResponse(BaseModel):
    answer: str
    confidence: float
    conversation_id: str
    tags: List[str]
    actions: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    temporal_context: Dict[str, Any]
    processing_time_ms: int
    data_sources: List[str]
    next_steps: List[str]

class ActionUpdateRequest(BaseModel):
    action_id: str
    status: str  # 'in_progress', 'completed', 'dismissed'
    user_id: str
    notes: Optional[str] = None

class ConversationSaveRequest(BaseModel):
    question: str
    answer: str
    confidence: float
    actions: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    tags: List[str]
    user_id: str
    processing_time_ms: int

class EnhancedVoiceCoach:
    """Enhanced voice coach with RAG capabilities and action system"""
    
    def __init__(self):
        self.rag_query_engine = RAGQueryEngine()
        self.rag_seeder = RAGSeeder()
        
    async def process_question(self, request: VoiceCoachRequest) -> VoiceCoachResponse:
        """Main processing function that orchestrates RAG + AI + Actions"""
        start_time = datetime.now()
        
        try:
            # Check if user has graph data, seed if needed
            if request.auto_seed:
                await self._ensure_graph_data(request.user_id)
            
            # Process question through RAG system
            rag_response = await self.rag_query_engine.process_query(
                user_id=request.user_id,
                question=request.question,
                context_window=request.context_window,
                include_actions=True,
                include_evidence=True
            )
            
            # Enhance answer with AI if confidence is low or for complex queries
            enhanced_answer = await self._enhance_answer_with_ai(
                request.question, 
                rag_response.answer, 
                rag_response.confidence,
                rag_response.related_entities
            )
            
            # Generate next steps based on context
            next_steps = self._generate_next_steps(
                request.question, 
                rag_response.actions, 
                rag_response.related_entities
            )
            
            # Extract tags from question and entities
            tags = self._extract_enhanced_tags(request.question, rag_response.related_entities)
            
            # Determine data sources used
            data_sources = self._identify_data_sources(rag_response.evidence)
            
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return VoiceCoachResponse(
                answer=enhanced_answer,
                confidence=rag_response.confidence,
                conversation_id=f"rag-{datetime.now().timestamp()}",
                tags=tags,
                actions=[action.dict() for action in rag_response.actions],
                evidence=[evidence.dict() for evidence in rag_response.evidence],
                temporal_context=rag_response.temporal_context,
                processing_time_ms=processing_time,
                data_sources=data_sources,
                next_steps=next_steps
            )
            
        except Exception as e:
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # Fallback to basic AI response
            fallback_answer = await self._get_ai_fallback(request.question)
            
            return VoiceCoachResponse(
                answer=fallback_answer,
                confidence=0.3,
                conversation_id=f"fallback-{datetime.now().timestamp()}",
                tags=self._extract_basic_tags(request.question),
                actions=[],
                evidence=[],
                temporal_context={},
                processing_time_ms=processing_time,
                data_sources=["ai_fallback"],
                next_steps=["Please ensure your financial data is properly uploaded and processed."]
            )
    
    async def _ensure_graph_data(self, user_id: str):
        """Ensure user has graph data, seed if necessary"""
        try:
            # Check if user has any entities
            conn = await self.rag_query_engine._get_database_connection()
            entity_count = await conn.fetchval(
                "SELECT COUNT(*) FROM financial_entities WHERE user_id = $1", user_id
            )
            await conn.close()
            
            # If no entities, trigger seeding
            if entity_count == 0:
                print(f"No graph data found for user {user_id}, triggering auto-seed...")
                await self.rag_seeder.seed_user_data(
                    user_id=user_id,
                    data_sources=["revenue_entries", "document_kpis", "document_metrics"],
                    rebuild_graph=False
                )
                
        except Exception as e:
            print(f"Error checking/seeding graph data: {e}")
    
    async def _enhance_answer_with_ai(self, question: str, rag_answer: str, 
                                    confidence: float, entities: List[Dict]) -> str:
        """Enhance RAG answer with AI for better context and clarity"""
        
        # If confidence is high and answer is substantial, use RAG answer
        if confidence > 0.7 and len(rag_answer) > 100:
            return rag_answer
        
        # For low confidence or short answers, enhance with AI
        try:
            if not os.getenv("OPENAI_API_KEY"):
                return rag_answer
            
            # Create context from entities
            entity_context = ""
            if entities:
                entity_context = "Available data: " + ", ".join([
                    f"{e.get('entity_name', 'Unknown')}: ${e.get('entity_value', 0):,.2f}" 
                    for e in entities[:3]
                ])
            
            system_prompt = f"""You are an expert business coach and CFO advisor. 
            
            A user asked: "{question}"
            
            Our data analysis found: "{rag_answer}"
            
            {entity_context}
            
            Please provide a comprehensive, actionable response that:
            1. Incorporates the data analysis findings
            2. Adds strategic business context and insights
            3. Provides specific, actionable recommendations
            4. Maintains a professional, coaching tone
            
            Keep the response focused and under 300 words."""
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            ai_enhanced = response.choices[0].message.content.strip()
            
            # Combine RAG data with AI insights
            if len(rag_answer) > 50:
                return f"{rag_answer}\n\n**Strategic Insight:** {ai_enhanced}"
            else:
                return ai_enhanced
                
        except Exception as e:
            print(f"AI enhancement failed: {e}")
            return rag_answer
    
    def _generate_next_steps(self, question: str, actions: List, entities: List[Dict]) -> List[str]:
        """Generate contextual next steps based on the conversation"""
        next_steps = []
        
        # Add action-based next steps
        if actions:
            high_priority_actions = [a for a in actions if a.priority >= 7]
            if high_priority_actions:
                next_steps.append(f"Review {len(high_priority_actions)} high-priority recommendations")
        
        # Add data-driven next steps
        if entities:
            revenue_entities = [e for e in entities if e.get('entity_type') == 'revenue']
            if revenue_entities and len(revenue_entities) > 1:
                next_steps.append("Compare revenue trends across different periods")
        
        # Add question-specific next steps
        question_lower = question.lower()
        if 'revenue' in question_lower and 'target' not in question_lower:
            next_steps.append("Set revenue targets for better goal tracking")
        elif 'cost' in question_lower or 'expense' in question_lower:
            next_steps.append("Analyze cost categories for optimization opportunities")
        elif 'profit' in question_lower:
            next_steps.append("Review profit margins by product/service line")
        
        # Default next steps if none generated
        if not next_steps:
            next_steps = [
                "Upload more financial documents for deeper analysis",
                "Set up regular financial review meetings",
                "Consider implementing automated financial tracking"
            ]
        
        return next_steps[:3]  # Limit to top 3
    
    def _extract_enhanced_tags(self, question: str, entities: List[Dict]) -> List[str]:
        """Extract tags from question and related entities"""
        tags = set()
        
        # Basic question analysis
        question_lower = question.lower()
        tag_keywords = {
            'revenue': ['revenue', 'sales', 'income', 'earnings'],
            'costs': ['cost', 'expense', 'spending', 'budget'],
            'profit': ['profit', 'margin', 'profitability', 'bottom line'],
            'growth': ['growth', 'grow', 'increase', 'expand', 'scale'],
            'targets': ['target', 'goal', 'objective', 'aim'],
            'performance': ['performance', 'month', 'quarter', 'year', 'period'],
            'trends': ['trend', 'pattern', 'direction', 'change'],
            'comparison': ['compare', 'vs', 'versus', 'difference'],
            'recommendations': ['recommend', 'suggest', 'should', 'advice']
        }
        
        for tag, keywords in tag_keywords.items():
            if any(keyword in question_lower for keyword in keywords):
                tags.add(tag)
        
        # Add entity-based tags
        if entities:
            entity_types = set(e.get('entity_type', 'unknown') for e in entities)
            tags.update(entity_types)
        
        return list(tags) if tags else ['general']
    
    def _extract_basic_tags(self, question: str) -> List[str]:
        """Basic tag extraction for fallback scenarios"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ['revenue', 'sales', 'income']):
            return ['revenue']
        elif any(word in question_lower for word in ['cost', 'expense', 'budget']):
            return ['costs']
        elif any(word in question_lower for word in ['profit', 'margin']):
            return ['profit']
        else:
            return ['general']
    
    def _identify_data_sources(self, evidence: List) -> List[str]:
        """Identify which data sources were used in the analysis"""
        sources = set()
        
        for ev in evidence:
            source = ev.source if hasattr(ev, 'source') else ev.get('source', 'unknown')
            sources.add(source)
        
        return list(sources) if sources else ['graph_database']
    
    async def _get_ai_fallback(self, question: str) -> str:
        """Get AI fallback response when RAG fails"""
        try:
            if not os.getenv("OPENAI_API_KEY"):
                return "I'm having trouble accessing your financial data right now. Please ensure your data has been uploaded and try again."
            
            system_prompt = """You are a business coach and CFO advisor. The user's financial data is not available right now, but you can still provide general business guidance. Keep responses practical and actionable, under 200 words."""
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                max_tokens=250,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return "I'm currently unable to process your question. Please check your connection and try again."

# Initialize enhanced voice coach
enhanced_coach = EnhancedVoiceCoach()

@router.post("/ask")
async def ask_enhanced_voice_coach(request: VoiceCoachRequest):
    """Ask the enhanced voice coach with RAG capabilities"""
    
    try:
        response = await enhanced_coach.process_question(request)
        return response
        
    except Exception as e:
        print(f"Error in enhanced voice coach: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")

@router.post("/conversations")
async def save_enhanced_conversation(request: ConversationSaveRequest):
    """Save enhanced conversation with additional metadata"""
    
    if not supabase:
        return {"success": True, "conversation_id": f"offline-{datetime.now().timestamp()}"}
    
    try:
        conversation_data = {
            "user_id": request.user_id,
            "question": request.question,
            "answer": request.answer,
            "confidence": request.confidence,
            "tags": request.tags,
            "actions": request.actions,
            "evidence": request.evidence,
            "processing_time_ms": request.processing_time_ms,
            "created_at": datetime.now().isoformat(),
            "version": "v2_rag"
        }
        
        response = supabase.table("voice_conversations").insert(conversation_data).execute()
        
        if response.data:
            return {"success": True, "conversation_id": response.data[0]["id"]}
        else:
            return {"success": True, "conversation_id": f"offline-{datetime.now().timestamp()}"}
            
    except Exception as e:
        print(f"Error saving enhanced conversation: {e}")
        return {"success": True, "conversation_id": f"offline-{datetime.now().timestamp()}"}

@router.post("/actions/update")
async def update_action_status(request: ActionUpdateRequest):
    """Update the status of an action recommendation"""
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        # Update action status in database
        update_data = {
            "status": request.status,
            "updated_at": datetime.now().isoformat()
        }
        
        if request.notes:
            update_data["notes"] = request.notes
        
        response = supabase.table("action_recommendations").update(update_data).eq("id", request.action_id).eq("user_id", request.user_id).execute()
        
        if response.data:
            return {"success": True, "message": f"Action status updated to {request.status}"}
        else:
            raise HTTPException(status_code=404, detail="Action not found")
            
    except Exception as e:
        print(f"Error updating action status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update action: {str(e)}")

@router.get("/actions/{user_id}")
async def get_user_actions(user_id: str, status: Optional[str] = None, limit: int = 20):
    """Get user's action recommendations with optional status filtering"""
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    try:
        query = supabase.table("action_recommendations").select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
        
        response = query.order("priority", desc=True).order("created_at", desc=True).limit(limit).execute()
        
        return {"actions": response.data or []}
        
    except Exception as e:
        print(f"Error fetching user actions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch actions: {str(e)}")

@router.post("/seed")
async def trigger_data_seeding(user_id: str, background_tasks: BackgroundTasks, rebuild: bool = False):
    """Manually trigger data seeding for a user"""
    
    try:
        background_tasks.add_task(
            enhanced_coach.rag_seeder.seed_user_data,
            user_id,
            ["revenue_entries", "document_kpis", "document_metrics"],
            rebuild
        )
        
        return {"message": "Data seeding started in background", "user_id": user_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start seeding: {str(e)}")

@router.get("/status/{user_id}")
async def get_system_status(user_id: str):
    """Get system status including graph data availability"""
    
    try:
        # Get seeding status
        conn = await enhanced_coach.rag_query_engine._get_database_connection()
        
        entity_count = await conn.fetchval(
            "SELECT COUNT(*) FROM financial_entities WHERE user_id = $1", user_id
        )
        
        relationship_count = await conn.fetchval(
            "SELECT COUNT(*) FROM financial_relationships WHERE user_id = $1", user_id
        )
        
        action_count = await conn.fetchval(
            "SELECT COUNT(*) FROM action_recommendations WHERE user_id = $1 AND status = 'pending'", user_id
        )
        
        await conn.close()
        
        return {
            "user_id": user_id,
            "graph_entities": entity_count,
            "relationships": relationship_count,
            "pending_actions": action_count,
            "rag_enabled": entity_count > 0,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "user_id": user_id,
            "graph_entities": 0,
            "relationships": 0,
            "pending_actions": 0,
            "rag_enabled": False,
            "error": str(e)
        }
