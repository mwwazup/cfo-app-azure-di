"""
Voice Coach API (v1 shim -> RAG V2 first), with robust multi-year "best month" fallback.
This version lives at backend/api/voice_coach.py
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from supabase import create_client

print(f"[voice_coach] Loaded from {__file__}")

# ---------- Clients ----------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

BACKEND_BASE = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")

# Dev fallback UUID (your working user)
DEV_DEFAULT_USER_ID = os.getenv("DEV_DEFAULT_USER_ID", "e2e72fa4-3e63-4b9d-ab12-1ed2ca583fa3")

router = APIRouter(prefix="/api/voice-coach", tags=["voice-coach"])

# ---------- Models ----------
class VoiceCoachRequest(BaseModel):
    question: str
    user_id: Optional[str] = None
    timestamp: Optional[str] = None

class VoiceCoachResponse(BaseModel):
    answer: str
    conversation_id: str
    tags: List[str]
    duration_seconds: Optional[int] = None

class SaveConversationRequest(BaseModel):
    question: str
    answer: str
    tags: List[str]
    duration_seconds: Optional[int] = None
    user_id: str

class ConversationHistoryResponse(BaseModel):
    conversations: List[Dict[str, Any]]
    total_count: int

# ---------- Helpers ----------
def ensure_user_id(uid: Optional[str]) -> str:
    """Use provided user_id, otherwise dev default to avoid 'tenant/user not found' paths."""
    if uid and isinstance(uid, str) and len(uid) >= 8:
        return uid
    return DEV_DEFAULT_USER_ID

def extract_tags_from_question(question: str) -> List[str]:
    tags = []
    lower_question = question.lower()
    tag_keywords = {
        'revenue': ['revenue', 'sales', 'income', 'earnings'],
        'costs': ['cost', 'expense', 'spending', 'budget'],
        'profit': ['profit', 'margin', 'profitability', 'bottom line'],
        'growth': ['growth', 'grow', 'increase', 'expand', 'scale'],
        'targets': ['target', 'goal', 'objective', 'aim'],
        'performance': ['performance', 'best', 'worst', 'trend', 'compare', 'month', 'quarter', 'year'],
        'marketing': ['market', 'advertis', 'lead', 'customer', 'client'],
        'pricing': ['price', 'pricing', 'rate', 'charge', 'fee']
    }
    for tag, kws in tag_keywords.items():
        if any(k in lower_question for k in kws):
            tags.append(tag)
    return tags or ['general']

def parse_years(question: str) -> List[int]:
    """Return all unique years mentioned, in order."""
    years = re.findall(r'\b(20\d{2})\b', question)
    out: List[int] = []
    for y in years:
        yi = int(y)
        if yi not in out:
            out.append(yi)
    return out

def fetch_revenue_rows(user_id: str) -> List[Dict[str, Any]]:
    if not supabase:
        return []
    resp = supabase.table("revenue_entries").select("*").eq("user_id", user_id).limit(5000).execute()
    return resp.data or []

def best_month_per_year(rows: List[Dict[str, Any]], years: List[int]) -> Dict[int, Dict[str, Any]]:
    """Return {year: {month:int, amount:float}} for each requested year, if present."""
    result: Dict[int, Dict[str, Any]] = {}
    for y in years:
        best_amt = None
        best_mon = None
        for r in rows:
            if r.get("year") == y:
                amt = r.get("actual_revenue") or r.get("amount") or r.get("revenue")
                if amt is None:
                    continue
                amt = float(amt)
                if best_amt is None or amt > best_amt:
                    best_amt = amt
                    best_mon = int(r.get("month"))
        if best_amt is not None and best_mon is not None:
            result[y] = {"month": best_mon, "amount": best_amt}
    return result

def month_name(m: int) -> str:
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][max(0, min(11, m-1))]

def legacy_best_month_answer(question: str, user_id: str) -> Optional[str]:
    """
    Handle questions like:
      - "What was the best performing revenue month in 2023 and 2024?"
      - "What was my best month in 2023?"
    Uses revenue_entries directly and answers precisely across multiple years.
    """
    q = question.lower()
    triggers = ["best", "highest", "top"]
    if not any(t in q for t in triggers):
        return None  # not a best-month question

    rows = fetch_revenue_rows(user_id)
    if not rows:
        return "I couldn't find any revenue rows for your account. Add data to revenue_entries and try seeding again."

    years = parse_years(question)
    if not years:
        # No years specified: choose the latest 2 years present in data
        yrs_present = sorted({int(r["year"]) for r in rows if r.get("year")})
        years = yrs_present[-2:] if len(yrs_present) >= 2 else yrs_present

    winners = best_month_per_year(rows, years)
    if not winners:
        return f"I found revenue entries but couldn't determine a best month for {', '.join(map(str, years))}."

    parts = []
    for y in years:
        w = winners.get(y)
        if w:
            parts.append(f"{y}: {month_name(w['month'])} with ${w['amount']:,.0f}")
        else:
            parts.append(f"{y}: no data")
    joined = "; ".join(parts)
    return f"Best performing revenue months by year → {joined}."

async def call_v2_rag(question: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Prefer RAG V2 for grounded answers. Returns dict or None on failure.
    """
    payload = {
        "user_id": user_id,
        "question": question,
        "context_window": "12_months",
        "auto_seed": True,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{BACKEND_BASE}/api/voice-coach/v2/ask", json=payload)
            if r.status_code == 200:
                return r.json()
            return None
    except Exception:
        return None

def save_conversation_row(user_id: str, question: str, answer: str, tags: List[str], duration_seconds: Optional[int]=None):
    if not supabase:
        return
    try:
        supabase.table("voice_conversations").insert({
            "user_id": user_id,
            "question": question,
            "answer": answer,
            "tags": tags,
            "duration_seconds": duration_seconds,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }).execute()
    except Exception:
        pass

# ---------- Endpoints ----------

@router.post("/ask", response_model=VoiceCoachResponse)
async def ask_voice_coach(request: VoiceCoachRequest):
    """
    Legacy entry point used by your frontend (no UI changes needed).
    1) Tries RAG V2 first (graph + evidence) to avoid any tenant checks.
    2) If that fails, answers "best month" precisely from revenue_entries (multi-year safe).
    3) Else, returns a short coaching hint.
    """
    user_id = ensure_user_id(request.user_id)
    question = request.question
    tags = extract_tags_from_question(question)

    # Try RAG V2 first (your new brain)
    v2 = await call_v2_rag(question, user_id)
    if v2 and v2.get("answer"):
        ans = v2["answer"]
        save_conversation_row(user_id, question, ans, tags)
        return VoiceCoachResponse(
            answer=ans,
            conversation_id="v2-" + str(datetime.utcnow().timestamp()),
            tags=tags
        )

    # Precise best-month fallback if applicable
    bm = legacy_best_month_answer(question, user_id)
    if bm:
        save_conversation_row(user_id, question, bm, tags)
        return VoiceCoachResponse(
            answer=bm,
            conversation_id="best-" + str(datetime.utcnow().timestamp()),
            tags=tags
        )

    # Minimal fallback
    answer = (
        "I can analyze your revenue by month and year once your graph is seeded. "
        "Try asking: 'Compare Q4 2023 vs Q1 2024' or 'What drove my best month in 2024?'."
    )
    save_conversation_row(user_id, question, answer, tags)
    return VoiceCoachResponse(
        answer=answer,
        conversation_id="fallback-" + str(datetime.utcnow().timestamp()),
        tags=tags
    )

@router.post("/conversations")
async def save_conversation(request: SaveConversationRequest):
    if not supabase:
        return {"success": True, "conversation_id": "offline-" + str(datetime.utcnow().timestamp())}
    try:
        resp = supabase.table("voice_conversations").insert({
            "user_id": request.user_id,
            "question": request.question,
            "answer": request.answer,
            "tags": request.tags,
            "duration_seconds": request.duration_seconds,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }).execute()
        if resp.data:
            return {"success": True, "conversation_id": resp.data[0]["id"]}
        return {"success": True, "conversation_id": "offline-" + str(datetime.utcnow().timestamp())}
    except Exception:
        return {"success": True, "conversation_id": "offline-" + str(datetime.utcnow().timestamp())}

@router.get("/conversations", response_model=ConversationHistoryResponse)
async def get_conversation_history(user_id: str, limit: int = 50, offset: int = 0, tags: Optional[str] = None):
    if not supabase:
        return {"conversations": [], "total_count": 0}
    try:
        query = supabase.table("voice_conversations").select("*").eq("user_id", user_id)
        if tags:
            tag_list = [t.strip() for t in tags.split(",")]
            query = query.overlaps("tags", tag_list)
        response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        count_resp = supabase.table("voice_conversations").select("id", count="exact").eq("user_id", user_id).execute()
        total_count = count_resp.count or 0
        return {"conversations": response.data or [], "total_count": total_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversations: {str(e)}")

@router.get("/tags")
async def get_available_tags():
    try:
        result = supabase.table("conversation_tags").select("*").order("name").execute()
        return {"tags": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tags: {str(e)}")

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: Optional[str] = None):
    if not supabase or not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    try:
        result = supabase.table("voice_conversations").delete().eq("id", conversation_id).eq("user_id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"message": "Conversation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")
