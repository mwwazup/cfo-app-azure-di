"""
Voice Coach API with robust intent + synonym handling.
- Maps "total revenue / gross revenue / topline / sales / turnover / income" to revenue.
- Understands "to date / YTD / so far / through {Month} {Year} / as of {Month} {Year}".
- Uses desired_revenue as canonical actual amount.
- Calls RAG V2 first; falls back to best-month and YTD+gap handlers.
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple

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

# ---------- Synonyms & Patterns ----------
MONTHS = {
    "jan":1,"january":1,"feb":2,"february":2,"mar":3,"march":3,"apr":4,"april":4,
    "may":5,"jun":6,"june":6,"jul":7,"july":7,"aug":8,"august":8,
    "sep":9,"sept":9,"september":9,"oct":10,"october":10,"nov":11,"november":11,"dec":12,"december":12
}
MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

REVENUE_SYNONYMS = {
    "revenue","revenues","total revenue","gross revenue","topline","sales","income","turnover","gross sales"
}
YTD_PHRASES = {
    "ytd","to date","year to date","so far","till now","up to now","through","as of"
}
BEST_PHRASES = {"best","highest","peak","max","top"}
GAP_PHRASES  = {"gap","shortfall","behind target","remaining to goal","to hit my goal","to meet my goal","to reach my goal"}
TOTAL_PHRASES = {"total","sum","aggregate","combined"}

THROUGH_RE = re.compile(r"\b(?:through|as of)\s+([A-Za-z]+)\s+(20\d{2})\b", re.IGNORECASE)

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
    return uid if uid and isinstance(uid, str) and len(uid) >= 8 else DEV_DEFAULT_USER_ID

def month_name(m: int) -> str:
    return MONTH_LABELS[max(0, min(11, m-1))]

def has_any(text: str, vocab: set) -> bool:
    t = text.lower()
    return any(phrase in t for phrase in vocab)

def coalesce_amount(entry: Dict[str, Any]) -> Optional[float]:
    """Treat desired_revenue as actual amount; fallback to other fields if needed."""
    for key in ("desired_revenue", "actual_revenue", "amount", "revenue"):
        val = entry.get(key)
        if val is not None:
            try:
                return float(val)
            except Exception:
                continue
    return None

def parse_years(question: str) -> List[int]:
    years = re.findall(r'\b(20\d{2})\b', question)
    out: List[int] = []
    for y in years:
        yi = int(y)
        if yi not in out:
            out.append(yi)
    return out

def parse_through_clause(question: str) -> Optional[Tuple[int,int]]:
    """
    Returns (year, month_number) if user said 'through/as of {Month} {Year}'.
    """
    m = THROUGH_RE.search(question)
    if not m: return None
    mon_str = m.group(1).strip().lower()
    yr = int(m.group(2))
    mon = MONTHS.get(mon_str)
    return (yr, mon) if mon else None

def detect_revenue_intent(question: str) -> Dict[str, Any]:
    """
    Normalize what the user means:
    - metric: 'revenue' if any revenue synonyms present
    - ytd: True if 'to date / YTD / ...' present
    - through: (year, month) if 'through/as of Month Year' present
    - wants_total: True if they said 'total/sum/aggregate'
    - wants_best: True if they asked 'best/highest...'
    - years: list of years mentioned
    - wants_gap: True if asked about gap/goal/target
    """
    q = question.lower()
    years = parse_years(q)
    through = parse_through_clause(q)

    metric_revenue = has_any(q, REVENUE_SYNONYMS) or ("revenue" in q)
    ytd = has_any(q, YTD_PHRASES)
    wants_total = has_any(q, TOTAL_PHRASES) or ("total revenue" in q or "revenue total" in q)
    wants_best = has_any(q, BEST_PHRASES)
    wants_gap = has_any(q, GAP_PHRASES) or ("target" in q or "goal" in q)

    return {
        "metric_revenue": metric_revenue,
        "ytd": ytd,
        "through": through,  # (year, month) or None
        "wants_total": wants_total,
        "wants_best": wants_best,
        "wants_gap": wants_gap,
        "years": years,
    }

def extract_tags_from_question(question: str) -> List[str]:
    t = question.lower()
    tags = []
    if has_any(t, REVENUE_SYNONYMS) or "revenue" in t: tags.append("revenue")
    if any(k in t for k in ["profit","margin","profitability"]): tags.append("profit")
    if any(k in t for k in ["cost","expense","budget","spend"]): tags.append("costs")
    if any(k in t for k in ["growth","increase","scale"]): tags.append("growth")
    if any(k in t for k in ["target","goal","objective"]): tags.append("targets")
    if any(k in t for k in ["compare","trend","best","worst"]): tags.append("performance")
    return tags or ["general"]

def fetch_revenue_rows(user_id: str) -> List[Dict[str, Any]]:
    if not supabase:
        return []
    resp = supabase.table("revenue_entries").select("*").eq("user_id", user_id).limit(5000).execute()
    return resp.data or []

def get_annual_target(user_id: str, year: int) -> Optional[float]:
    if not supabase:
        return None
    try:
        r = supabase.table("annual_targets").select("target_revenue").eq("user_id", user_id).eq("year", year).limit(1).execute()
        if r.data and len(r.data) > 0:
            return float(r.data[0]["target_revenue"])
    except Exception:
        pass
    return None

def best_month_per_year(rows: List[Dict[str, Any]], years: List[int]) -> Dict[int, Dict[str, Any]]:
    result: Dict[int, Dict[str, Any]] = {}
    for y in years:
        best_amt = None
        best_mon = None
        for r in rows:
            if r.get("year") == y:
                amt = coalesce_amount(r)
                if amt is None:
                    continue
                if best_amt is None or amt > best_amt:
                    best_amt = amt
                    best_mon = int(r.get("month"))
        if best_amt is not None and best_mon is not None:
            result[y] = {"month": best_mon, "amount": best_amt}
    return result

# ---------- Legacy handlers (robust) ----------
def legacy_best_month_answer(question: str, user_id: str) -> Optional[str]:
    intent = detect_revenue_intent(question)
    if not (intent["metric_revenue"] and intent["wants_best"]):
        # Also handle phrasings like “best month in 2023”
        if not (intent["wants_best"] or "best month" in question.lower()):
            return None

    rows = fetch_revenue_rows(user_id)
    if not rows:
        return "I couldn't find any revenue rows for your account. Add data to revenue_entries and re-seed."

    years = intent["years"]
    if not years:
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
    return "Best performing revenue months → " + "; ".join(parts) + "."

def legacy_ytd_and_gap_answer(question: str, user_id: str) -> Optional[str]:
    """
    Handles:
      - 'total revenue to date in 2025'
      - 'gross revenue YTD'
      - 'total revenue through Sep 2025'
      - 'what is the gap to my goal in 2025'
    """
    intent = detect_revenue_intent(question)
    q = question.lower()

    # Only run if it's clearly a revenue question
    if not intent["metric_revenue"]:
        return None

    wants_ytdish = intent["ytd"] or "to date" in q or "so far" in q or intent["through"] is not None
    mentions_year = len(intent["years"]) > 0

    # Run if YTD-like phrasing OR they ask total with a year OR they mention gap
    if not (wants_ytdish or (intent["wants_total"] and mentions_year) or intent["wants_gap"]):
        return None

    rows = fetch_revenue_rows(user_id)
    if not rows:
        return None

    # Determine the year and the "up-to" month cap
    year: int
    cap_month: int

    if intent["through"]:
        # explicit cap like "through Sep 2025"
        y, m = intent["through"]
        year, cap_month = y, (m or datetime.utcnow().month)
    else:
        years = intent["years"] or [datetime.utcnow().year]
        year = years[0]
        cap_month = datetime.utcnow().month  # default YTD cap

    # Sum months up to the cap for that year
    ytd_amount = 0.0
    month_lines: List[str] = []
    for r in rows:
        if r.get("year") == year:
            try:
                m = int(r.get("month"))
            except Exception:
                continue
            if m <= cap_month:
                amt = coalesce_amount(r)
                if amt is not None:
                    ytd_amount += amt
                    month_lines.append((m, f"{month_name(m)}: ${amt:,.0f}"))

    month_lines.sort(key=lambda t: t[0])
    month_text = ", ".join([s for _, s in month_lines]) if month_lines else "No monthly rows found."

    # Annual target and GAP
    target = get_annual_target(user_id, year)
    parts = [f"Revenue to {month_name(cap_month)} {year}: ${ytd_amount:,.0f}"]
    if month_lines:
        parts.append("Included → " + month_text)

    if intent["wants_gap"] or "target" in q or "goal" in q:
        if target is not None:
            gap = target - ytd_amount
            if gap > 0:
                parts.append(f"Annual target: ${target:,.0f} → Gap to fill: ${gap:,.0f}")
            elif gap < 0:
                parts.append(f"Annual target: ${target:,.0f} → You’re ahead by ${abs(gap):,.0f}")
            else:
                parts.append(f"Annual target: ${target:,.0f} → Exactly on target.")
        else:
            parts.append("No annual target found. Set one in table 'annual_targets' to enable gap calculations.")

    return " | ".join(parts)

# ---------- RAG V2 Bridge ----------
async def call_v2_rag(question: str, user_id: str) -> Optional[Dict[str, Any]]:
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
    user_id = ensure_user_id(request.user_id)
    question = request.question
    tags = extract_tags_from_question(question)

    # 1) Try RAG V2 (graph + vector)
    v2 = await call_v2_rag(question, user_id)
    if v2 and v2.get("answer"):
        ans = v2["answer"]
        save_conversation_row(user_id, question, ans, tags)
        return VoiceCoachResponse(
            answer=ans,
            conversation_id="v2-" + str(datetime.utcnow().timestamp()),
            tags=tags
        )

    # 2) Smart deterministic fallbacks (synonym-aware)
    ytd_gap = legacy_ytd_and_gap_answer(question, user_id)
    if ytd_gap:
        save_conversation_row(user_id, question, ytd_gap, tags)
        return VoiceCoachResponse(
            answer=ytd_gap,
            conversation_id="ytd-" + str(datetime.utcnow().timestamp()),
            tags=tags
        )

    bm = legacy_best_month_answer(question, user_id)
    if bm:
        save_conversation_row(user_id, question, bm, tags)
        return VoiceCoachResponse(
            answer=bm,
            conversation_id="best-" + str(datetime.utcnow().timestamp()),
            tags=tags
        )

    # 3) Minimal fallback
    answer = (
        "I can analyze your revenue by month/year once your graph is seeded. "
        "Try: 'Compare Q4 2023 vs Q1 2024' or 'What drove my best month in 2024?'."
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
