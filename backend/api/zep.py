"""
Zep Cloud API endpoints - Backend proxy for memory operations
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Path
from supabase import create_client, Client
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from logging_config import get_logger

def get_supabase_client() -> Client:
    """Get Supabase client for database queries"""
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            logger.warning("Supabase environment variables not configured")
            return None
        return create_client(supabase_url, supabase_key)
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


def get_financial_context(user_id: str) -> Dict[str, Any]:
    """Get financial context data for a user from Supabase tables"""
    from datetime import datetime, timedelta
    
    supabase = get_supabase_client()
    if not supabase:
        logger.warning("No Supabase client available for financial context")
        return {}

    try:
        # Get current date info
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        current_date = now.strftime("%Y-%m-%d")
        
        financial_data = {}

        # Get historical revenue data (only completed months)
        try:
            # Only get data up to the previous month (completed data)
            # If current month has data, we'll include it but mark it as in-progress
            revenue_response = supabase.table('revenue_entries').select(
                'year, month, actual_revenue, desired_revenue'
            ).eq('user_id', user_id).order('year', desc=True).order('month', desc=True).execute()

            if revenue_response.data:
                # Filter out future months and organize by recency
                valid_revenue = []
                current_month_data = None
                
                for entry in revenue_response.data:
                    entry_year = entry['year']
                    entry_month = entry['month']
                    
                    # Skip future months
                    if entry_year > current_year or (entry_year == current_year and entry_month > current_month):
                        continue
                        
                    # Separate current month from historical
                    if entry_year == current_year and entry_month == current_month:
                        current_month_data = entry
                    else:
                        valid_revenue.append(entry)
                
                # Take last 6 completed months
                valid_revenue = valid_revenue[:6]
                
                financial_data['historical_revenue'] = valid_revenue
                financial_data['current_month_revenue'] = current_month_data
                financial_data['current_date_context'] = {
                    'current_year': current_year,
                    'current_month': current_month,
                    'current_date': current_date,
                    'is_current_month_complete': False  # We never have complete month data in real-time
                }
                
                logger.info(f"📊 Retrieved {len(valid_revenue)} historical revenue entries for {user_id}")
                if current_month_data:
                    logger.info(f"📊 Current month data: {current_month_data}")
        except Exception as e:
            logger.warning(f"Could not retrieve revenue data: {e}")

        # Get current KPIs (most recent, excluding future months)
        try:
            kpi_response = supabase.table('kpi_records').select(
                'year, month, kpi_type, kpi_value, goal_value'
            ).eq('user_id', user_id).order('year', desc=True).order('month', desc=True).execute()

            if kpi_response.data:
                # Filter out future months
                valid_kpis = []
                for kpi in kpi_response.data:
                    if kpi['year'] > current_year or (kpi['year'] == current_year and kpi['month'] > current_month):
                        continue
                    valid_kpis.append(kpi)
                
                financial_data['current_kpis'] = valid_kpis[:5]  # Most recent 5
                logger.info(f"📊 Retrieved {len(valid_kpis)} KPI records for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve KPI data: {e}")

        # Get employee LER data (recent, no future filtering needed for daily data)
        try:
            ler_response = supabase.table('employee_daily_records').select(
                'employee_id, work_day, ler, bonus'  # Fixed column name from work_date to work_day
            ).eq('user_id', user_id).order('work_day', desc=True).limit(10).execute()  # Reduced from 20

            if ler_response.data:
                financial_data['recent_ler'] = ler_response.data
                logger.info(f"📊 Retrieved {len(ler_response.data)} LER records for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve LER data: {e}")

        # Get historical year-over-year revenue data (multi-year for seasonal patterns)
        try:
            yoy_revenue_response = supabase.table('revenue_entries').select(
                'year, month, actual_revenue, desired_revenue'
            ).eq('user_id', user_id).gte('year', current_year - 4).order('year', desc=True).order('month', desc=True).execute()  # Last 5 years

            if yoy_revenue_response.data:
                # Filter out future months
                valid_yoy_revenue = []
                for entry in yoy_revenue_response.data:
                    entry_year = entry['year']
                    entry_month = entry['month']
                    # Skip future months
                    if entry_year > current_year or (entry_year == current_year and entry_month > current_month):
                        continue
                    valid_yoy_revenue.append(entry)
                
                financial_data['historical_yoy_revenue'] = valid_yoy_revenue
                logger.info(f"📊 Retrieved {len(valid_yoy_revenue)} historical year-over-year revenue entries for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve historical year-over-year revenue data: {e}")

        # Get historical year-over-year KPI data (multi-year trends)
        try:
            yoy_kpi_response = supabase.table('kpi_records').select(
                'year, month, kpi_type, kpi_value, goal_value'
            ).eq('user_id', user_id).gte('year', current_year - 4).order('year', desc=True).order('month', desc=True).execute()  # Last 5 years

            if yoy_kpi_response.data:
                # Filter out future months
                valid_yoy_kpis = []
                for kpi in yoy_kpi_response.data:
                    if kpi['year'] > current_year or (kpi['year'] == current_year and kpi['month'] > current_month):
                        continue
                    valid_yoy_kpis.append(kpi)
                
                financial_data['historical_yoy_kpis'] = valid_yoy_kpis
                logger.info(f"📊 Retrieved {len(valid_yoy_kpis)} historical year-over-year KPI entries for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve historical year-over-year KPI data: {e}")

        # Get top services by revenue over the last 90 days
        try:
            ninety_days_ago = now - timedelta(days=90)

            # Fetch recent service activities
            service_activities_response = supabase.table('service_activities').select(
                'service_id, week_start_date, total_revenue, appointment_count'
            ).eq('user_id', user_id).gte('week_start_date', ninety_days_ago.strftime('%Y-%m-%d')).execute()

            service_activities_data = service_activities_response.data or []

            if service_activities_data:
                # Aggregate revenue and appointments per service
                service_totals: Dict[str, Dict[str, Any]] = {}
                for activity in service_activities_data:
                    service_id = activity.get('service_id')
                    if not service_id:
                        continue

                    total_revenue = float(activity.get('total_revenue') or 0)
                    appointments = int(activity.get('appointment_count') or 0)

                    if service_id not in service_totals:
                        service_totals[service_id] = {
                            'service_id': service_id,
                            'total_revenue': 0.0,
                            'appointment_count': 0
                        }

                    service_totals[service_id]['total_revenue'] += total_revenue
                    service_totals[service_id]['appointment_count'] += appointments

                if service_totals:
                    # Fetch service metadata (names, categories, colors)
                    service_ids = list(service_totals.keys())
                    services_response = supabase.table('services').select(
                        'id, service_name, service_category, color'
                    ).eq('user_id', user_id).in_('id', service_ids).execute()

                    services_data = services_response.data or []
                    service_meta = {s['id']: s for s in services_data}

                    # Build enriched list and sort by revenue
                    enriched = []
                    for service_id, totals in service_totals.items():
                        meta = service_meta.get(service_id, {})
                        enriched.append({
                            'service_id': service_id,
                            'service_name': meta.get('service_name', 'Unknown Service'),
                            'service_category': meta.get('service_category'),
                            'color': meta.get('color'),
                            'total_revenue': totals['total_revenue'],
                            'appointment_count': totals['appointment_count'],
                        })

                    # Sort by total revenue descending and take top 3
                    enriched.sort(key=lambda s: s['total_revenue'], reverse=True)
                    top_services = enriched[:3]

                    financial_data['top_services_last_90_days'] = top_services
                    logger.info(
                        f"📊 Computed top {len(top_services)} services for last 90 days for {user_id}"
                    )
        except Exception as e:
            logger.warning(f"Could not retrieve top services for last 90 days: {e}")

        # Get upcoming FIR targets (next 2 months of desired_revenue)
        try:
            def add_month(year: int, month: int, delta: int) -> tuple[int, int]:
                new_month = month + delta
                new_year = year + (new_month - 1) // 12
                new_month = ((new_month - 1) % 12) + 1
                return new_year, new_month

            next1_year, next1_month = add_month(current_year, current_month, 1)
            next2_year, next2_month = add_month(current_year, current_month, 2)

            years_to_check = list({current_year, next1_year, next2_year})

            fir_response = supabase.table('revenue_entries').select(
                'year, month, desired_revenue'
            ).eq('user_id', user_id).in_('year', years_to_check).execute()

            fir_data = fir_response.data or []
            upcoming_targets = []
            for entry in fir_data:
                year = entry.get('year')
                month = entry.get('month')
                desired_revenue = entry.get('desired_revenue')
                if desired_revenue is None:
                    continue

                if (year, month) in [(next1_year, next1_month), (next2_year, next2_month)]:
                    upcoming_targets.append({
                        'year': year,
                        'month': month,
                        'desired_revenue': float(desired_revenue),
                    })

            if upcoming_targets:
                # Sort by year/month ascending
                upcoming_targets.sort(key=lambda e: (e['year'], e['month']))
                financial_data['upcoming_fir_targets'] = upcoming_targets
                logger.info(
                    f"📊 Retrieved {len(upcoming_targets)} upcoming FIR targets for next 2 months for {user_id}"
                )
        except Exception as e:
            logger.warning(f"Could not retrieve upcoming FIR targets: {e}")

        # Get historical year-over-year LER data (performance patterns)
        try:
            yoy_ler_response = supabase.table('employee_daily_records').select(
                'employee_id, work_day, ler, bonus'
            ).eq('user_id', user_id).gte('work_day', f'{current_year - 4}-01-01').order('work_day', desc=True).limit(50).execute()  # Last 5 years, approx 50 entries

            if yoy_ler_response.data:
                financial_data['historical_yoy_ler'] = yoy_ler_response.data
                logger.info(f"📊 Retrieved {len(yoy_ler_response.data)} historical year-over-year LER entries for {user_id}")
        except Exception as e:
            logger.warning(f"Could not retrieve historical year-over-year LER data: {e}")

        return financial_data

    except Exception as e:
        logger.error(f"Error retrieving financial context for {user_id}: {e}")
        return {}

logger = get_logger(__name__)

router = APIRouter(prefix="/api/zep", tags=["zep"])

# Zep Cloud client (lazy initialization)
_zep_client = None

def get_zep_client():
    """Get or initialize Zep Cloud client"""
    global _zep_client
    
    if _zep_client is None:
        try:
            from zep_cloud.client import Zep
            
            api_key = os.getenv("ZEP_API_KEY")
            if not api_key:
                logger.warning("ZEP_API_KEY not configured")
                return None
            
            _zep_client = Zep(api_key=api_key)
            logger.info("✅ Zep Cloud client initialized")
        except ImportError:
            logger.error("zep-cloud package not installed. Run: pip install zep-cloud")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Zep client: {e}")
            return None
    
    return _zep_client


# Request/Response Models
class ZepMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    metadata: Optional[Dict[str, Any]] = None


class AddMessagesRequest(BaseModel):
    userId: str
    messages: List[ZepMessage]
    userEmail: Optional[str] = None
    userFirstName: Optional[str] = None
    userLastName: Optional[str] = None


class GetContextRequest(BaseModel):
    userId: str
    lastN: Optional[int] = 10


class ZepContextResponse(BaseModel):
    context: str
    recentMessages: List[Dict[str, Any]]
    relevantMemories: List[Dict[str, Any]]
    facts: Dict[str, Any]
    financialContext: Optional[Dict[str, Any]] = {}


# Endpoints
@router.post("/messages")
async def add_messages(request: AddMessagesRequest):
    """
    Add messages to a user's thread in Zep Cloud
    """
    client = get_zep_client()
    if not client:
        return {
            "success": False,
            "error": "Zep not configured"
        }
    
    try:
        # Ensure user exists first (required by Zep Cloud)
        # Per Zep docs: provide firstName and lastName for better user association
        try:
            client.user.add(
                user_id=request.userId,
                email=request.userEmail or f"{request.userId}@app.local",
                first_name=request.userFirstName or "User",
                last_name=request.userLastName or "Account"
            )
            logger.info(f"👤 Created user {request.userId}")
        except Exception as user_error:
            # User might already exist, that's okay
            error_msg = str(user_error).lower()
            if "already exists" not in error_msg and "duplicate" not in error_msg:
                logger.debug(f"User creation note: {user_error}")
        
        # Ensure thread exists (create if not)
        # Using userId as threadId for simplicity (one thread per user)
        try:
            client.thread.create(
                thread_id=request.userId,
                user_id=request.userId
            )
            logger.info(f"📝 Created thread for user {request.userId}")
        except Exception as create_error:
            # Thread might already exist, that's okay
            error_msg = str(create_error).lower()
            if "already exists" not in error_msg and "duplicate" not in error_msg:
                logger.debug(f"Thread creation note: {create_error}")
        
        # Convert messages to Zep format
        # Per Zep docs: include 'name' field to help with graph construction
        user_name = f"{request.userFirstName or 'User'} {request.userLastName or 'Account'}".strip()
        
        zep_messages = [
            {
                "role": msg.role,
                "content": msg.content,
                "name": user_name if msg.role == "user" else "AI Assistant",
                "metadata": msg.metadata or {}
            }
            for msg in request.messages
        ]
        
        # Add messages to thread (thread ID = user ID)
        response = client.thread.add_messages(
            thread_id=request.userId,
            messages=zep_messages
        )
        
        logger.info(f"💾 Saved {len(request.messages)} messages for user {request.userId}")
        
        return {
            "success": True,
            "messageCount": len(request.messages)
        }
        
    except Exception as e:
        logger.error(f"Error adding messages to Zep: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/context/{user_id}")
async def get_context(user_id: str, lastN: int = 10):
    """
    Get conversation context for a user from Zep Cloud
    """
    # Force logging to appear - MULTIPLE METHODS
    import sys
    print(f"\n{'='*60}", flush=True)
    print(f"🔍 ENDPOINT CALLED: Getting context for user {user_id}", flush=True)
    print(f"{'='*60}\n", flush=True)
    sys.stdout.flush()
    logger.info(f"🔍 Getting context for user {user_id}")
    logger.warning(f"⚠️ CONTEXT ENDPOINT HIT FOR {user_id}")
    
    client = get_zep_client()
    if not client:
        print("⚠️ Zep client not available", flush=True)
        logger.warning("⚠️ Zep client not available")
        return {
            "context": "",
            "recentMessages": [],
            "relevantMemories": [],
            "facts": {},
            "_debug": "no_zep_client"
        }
    
    try:
        # Get user context using getUserContext method (per Zep docs)
        user_context = client.thread.get_user_context(
            thread_id=user_id
        )
        
        # Log what we received for debugging
        logger.info(f"📊 Zep context retrieved for {user_id}")
        logger.debug(f"Context object: {user_context}")
        
        # Get recent messages
        # NOTE: The Python SDK example shows only thread_id; lastN/last_n are not
        # accepted keyword args in this version, so we let Zep return its
        # default window and, if needed, slice messages on our side.
        messages_response = client.thread.get(
            thread_id=user_id
        )
        messages = getattr(messages_response, 'messages', []) or []
        
        # Extract context string (this contains the graph data)
        context_string = getattr(user_context, 'context', '')
        logger.info(f"📝 Context string length: {len(context_string)} chars")
        if context_string:
            logger.debug(f"Context preview: {context_string[:200]}...")
        
        # Format facts as dict
        facts = {}
        if hasattr(user_context, 'facts') and user_context.facts:
            logger.info(f"📌 Found {len(user_context.facts)} facts")
            for fact in user_context.facts:
                fact_name = getattr(fact, 'name', 'unknown')
                fact_value = getattr(fact, 'value', None)
                facts[fact_name] = fact_value
                logger.debug(f"  - {fact_name}: {fact_value}")

        # If Zep did not provide a structured businessName fact, try to infer it
        # from recent user messages (e.g., "My business name is Clearview Windows").
        if "businessName" not in facts:
            inferred_name = None
            for msg in reversed(messages):
                try:
                    role = getattr(msg, "role", None) or msg.get("role")
                    content = getattr(msg, "content", None) or msg.get("content")
                except AttributeError:
                    continue

                if not content:
                    continue

                # Only consider user-facing messages
                if role not in ["user", "norole", None]:
                    continue

                text = str(content).strip()
                lower = text.lower()

                patterns = [
                    "my business name is ",
                    "the business name is ",
                    "our business name is ",
                    "the business is called ",
                    "my company name is ",
                ]

                for p in patterns:
                    idx = lower.find(p)
                    if idx != -1:
                        candidate = text[idx + len(p):].strip()
                        # Trim trailing punctuation
                        candidate = candidate.strip(" .!?,\"'")
                        if candidate:
                            inferred_name = candidate
                        break

                if inferred_name:
                    break

            if inferred_name:
                facts["businessName"] = inferred_name
                logger.info(f"🧠 Inferred businessName from messages: {inferred_name}")
        
        # Get financial context data
        financial_context = get_financial_context(user_id)
        
        result = {
            "context": context_string,
            "recentMessages": messages,
            "relevantMemories": getattr(user_context, 'facts', []),
            "facts": facts,
            "financialContext": financial_context,
            "_debug": "success"
        }
        print(f"✅ Returning context: {len(context_string)} chars, {len(facts)} facts", flush=True)
        return result
        
    except Exception as e:
        print(f"❌ ERROR in get_context: {e}", flush=True)
        logger.error(f"Error getting context from Zep: {e}")
        import traceback
        traceback.print_exc()
        return {
            "context": "",
            "recentMessages": [],
            "relevantMemories": [],
            "facts": {},
            "_debug": f"error: {str(e)}"
        }


@router.get("/messages/{user_id}")
async def get_messages(user_id: str, lastN: int = 10):
    """
    Get recent messages for a user from Zep Cloud
    """
    client = get_zep_client()
    if not client:
        return {"messages": []}
    
    try:
        response = client.thread.get(
            thread_id=user_id,
            lastN=lastN
        )
        
        return {
            "messages": getattr(response, 'messages', [])
        }
        
    except Exception as e:
        logger.error(f"Error getting messages from Zep: {e}")
        return {"messages": []}


@router.delete("/thread/{user_id}")
async def delete_thread(user_id: str):
    """
    Delete a user's thread (clear memory)
    """
    client = get_zep_client()
    if not client:
        return {
            "success": False,
            "error": "Zep not configured"
        }
    
    try:
        client.thread.delete(thread_id=user_id)
        logger.info(f"🗑️ Deleted thread for user {user_id}")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error deleting thread from Zep: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/health")
async def zep_health():
    """
    Check if Zep is configured and accessible
    """
    client = get_zep_client()
    
    return {
        "configured": client is not None,
        "apiKey": "present" if os.getenv("ZEP_API_KEY") else "missing"
    }
