# backend/routers/rag_compat.py
import os, json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
import openai
from supabase import create_client

router = APIRouter()

# Clients
openai.api_key = os.getenv("OPENAI_API_KEY", "")
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
)

def embed_small(texts: List[str]) -> List[List[float]]:
    """Embedding with OpenAI; local fallback if quota/key issues."""
    try:
        resp = openai.Embedding.create(model="text-embedding-3-small", input=texts)
        return [d["embedding"] for d in resp["data"]]
    except Exception:
        # local normalized hash fallback
        def local(t, d=1536):
            v=[0.0]*d; h=2166136261
            for ch in t: h=(h^ord(ch))*16777619 & 0xffffffff; v[h%d]+=1
            n=(sum(x*x for x in v)**0.5) or 1; return [x/n for x in v]
        return [local(t) for t in texts]

@router.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat()+"Z"}

@router.get("/api/rag/seed/status-v2/{user_id}")
def rag_seed_status(user_id: str):
    try:
        n = supabase.table("graph_nodes").select("id", count="exact").eq("user_id", user_id).execute()
        e = supabase.table("graph_edges").select("id", count="exact").eq("user_id", user_id).execute()
        a = supabase.table("user_actions").select("id", count="exact").eq("user_id", user_id).execute()
        return {
            "entities": n.count or 0,
            "relationships": e.count or 0,
            "actions": a.count or 0,
            "success": True
        }
    except Exception as ex:
        raise HTTPException(500, f"status error: {ex}")

@router.post("/api/rag/seed/user/sync-v2")
def rag_seed_user_sync(payload: Dict[str, Any]):
    """Build Month nodes from revenue_entries for the given user_id. No tenant checks."""
    print(f"DEBUG: rag_seed_user_sync called with payload: {payload}")
    user_id = payload.get("user_id")
    print(f"DEBUG: Extracted user_id: {user_id}")
    if not user_id:
        print("DEBUG: No user_id provided, raising 400 error")
        raise HTTPException(400, "user_id required")
    rebuild = bool(payload.get("rebuild_graph", False))
    try:
        # Optional: clean this user's graph first
        if rebuild:
            edges = supabase.table("graph_edges").select("id").eq("user_id", user_id).limit(50000).execute().data or []
            if edges:
                supabase.table("graph_edges").delete().in_("id", [e["id"] for e in edges]).execute()
            nodes = supabase.table("graph_nodes").select("id").eq("user_id", user_id).limit(50000).execute().data or []
            if nodes:
                supabase.table("graph_nodes").delete().in_("id", [n["id"] for n in nodes]).execute()

        # fetch revenue data
        print(f"DEBUG: Fetching revenue data for user_id: {user_id}")
        rev = supabase.table("revenue_entries").select("*").eq("user_id", user_id).limit(5000).execute()
        rows = rev.data or []
        print(f"DEBUG: Found {len(rows)} revenue rows")
        if not rows:
            return {
                "success": False,
                "entities_created": 0,
                "relationships_created": 0,
                "actions_generated": 0,
                "processing_time_seconds": 0.0,
                "message": f"No revenue data found for user_id '{user_id}'. Add rows to revenue_entries first."
            }

        # create Month nodes
        entities_created = 0
        print(f"DEBUG: Processing {len(rows)} revenue rows")
        for i, r in enumerate(rows):
            print(f"DEBUG: Row {i}: {r}")
            yr = r.get("year"); mo = r.get("month")
            amt = r.get("actual_revenue") or r.get("amount") or r.get("revenue") or 0
            print(f"DEBUG: Extracted - year: {yr}, month: {mo}, amount: {amt}")
            if not (yr and mo):
                print(f"DEBUG: Skipping row {i} - missing year or month")
                continue
            body = f"Revenue for {yr}-{int(mo):02d} was {float(amt):,.0f} dollars"
            vec = embed_small([body])[0]
            node_payload = {
                "user_id": user_id,
                "label": "Month",
                "body": body,
                "props": {"month": f"{yr}-{int(mo):02d}", "amount": float(amt)},
                "valid_from": f"{yr}-{int(mo):02d}-28T00:00:00Z",
                "embedding": "[" + ",".join(str(x) for x in vec) + "]"
            }
            supabase.table("graph_nodes").insert(node_payload).execute()
            entities_created += 1

        # create next_month edges in chronological order
        months = supabase.table("graph_nodes") \
            .select("id, props") \
            .eq("user_id", user_id) \
            .eq("label", "Month") \
            .order("props->>month") \
            .limit(5000).execute().data or []

        edge_batch = []
        for i in range(len(months) - 1):
            edge_batch.append({
                "user_id": user_id,
                "src": months[i]["id"],
                "dst": months[i+1]["id"],
                "kind": "next_month",
                "weight": 1
            })
        if edge_batch:
            supabase.table("graph_edges").insert(edge_batch).execute()

        return {
            "success": True,
            "entities_created": entities_created,
            "relationships_created": len(edge_batch),
            "actions_generated": 0,
            "processing_time_seconds": 0.0
        }
    except Exception as ex:
        print(f"DEBUG: Exception in seed sync: {type(ex).__name__}: {ex}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"seed sync error: {ex}")

@router.get("/api/rag/debug/users")
def debug_users():
    """Debug endpoint to see which user_ids have revenue data"""
    try:
        result = supabase.table("revenue_entries").select("user_id").execute()
        user_ids = list(set(row["user_id"] for row in result.data if row.get("user_id")))
        return {
            "success": True,
            "user_ids": user_ids,
            "count": len(user_ids)
        }
    except Exception as ex:
        return {"success": False, "error": str(ex)}

@router.post("/api/rag/debug/test-action")
def debug_test_action(payload: Dict[str, Any]):
    """Debug endpoint to test action storage"""
    user_id = payload.get("user_id", "test-user")
    try:
        # Test inserting a simple action
        test_action = {
            "user_id": user_id,
            "title": "Test Action",
            "due_date": "2025-01-01",
            "status": "open",
            "source_question": "test",
            "source_answer": "test"
        }
        print(f"DEBUG: Testing action insert: {test_action}")
        result = supabase.table("user_actions").insert(test_action).execute()
        print(f"DEBUG: Insert result: {result.data}")
        
        # Try to retrieve it
        actions = supabase.table("user_actions").select("*").eq("user_id", user_id).execute()
        print(f"DEBUG: Retrieved actions: {actions.data}")
        
        return {
            "success": True,
            "inserted": result.data,
            "retrieved": actions.data,
            "message": "Action storage test completed"
        }
    except Exception as ex:
        print(f"DEBUG: Action test failed: {ex}")
        return {"success": False, "error": str(ex)}

@router.post("/api/rag/query/ask-v2")
def rag_query_ask(payload: Dict[str, Any]):
    q = payload.get("question", "")
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(400, "user_id required")
    try:
        # get query embedding
        qvec = embed_small([q])[0]
        since = (datetime.utcnow() - timedelta(days=365*5)).isoformat()+"Z"

        # Try user-scoped ANN RPC; fallback to recent nodes
        ctx = ""
        top = []
        try:
            rpc = supabase.rpc(
                "match_nodes_arr_user",
                {"q": qvec, "p_user_id": user_id, "since": since, "k": 8}
            ).execute()
            top = rpc.data or []
            ctx = "\n".join(f"{n['label']} {n.get('props',{}).get('month','')}: {n.get('body','')}" for n in top[:12])
        except Exception:
            rows = supabase.table("graph_nodes").select("*").eq("user_id", user_id).eq("label","Month").order("valid_from", desc=True).limit(12).execute().data or []
            top = rows
            ctx = "\n".join(f"{r['label']} {r.get('props',{}).get('month','')}: {r.get('body','')}" for r in rows)

        system = "You are a CFO coach. Ground answers in the provided context if relevant. Be concise and numeric."
        ans = ""
        try:
            resp = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role":"system","content":system},
                          {"role":"user","content":f"Q: {q}\n\nContext:\n{ctx}"}],
                temperature=0.2, max_tokens=350
            )
            ans = resp.choices[0].message.content.strip()
        except Exception as e:
            # still return a structured result
            return {"success": True, "answer": f"(Fallback) {q}\n\n{ctx[:400]}", "confidence": 0.5, "evidence": top[:5], "actions": [], "processing_time_ms": 0}

        # Extract 1-3 next steps
        actions = []
        try:
            ar = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role":"system","content":'Extract 1-3 next steps as JSON: {"actions":[{"title":"...","due":"YYYY-MM-DD"}]}'},
                    {"role":"user","content":ans}
                ],
                temperature=0, max_tokens=120
            )
            jd = json.loads(ar.choices[0].message.content)
            actions = jd.get("actions", [])[:3]
        except Exception:
            pass

        print(f"DEBUG: Storing {len(actions)} actions for user {user_id}")
        for i, a in enumerate(actions):
            action_data = {
                "user_id": user_id,
                "title": a.get("title") or "Follow up",
                "due_date": a.get("due"),
                "status": "open",
                "source_question": q,
                "source_answer": ans
            }
            print(f"DEBUG: Action {i}: {action_data}")
            try:
                result = supabase.table("user_actions").insert(action_data).execute()
                print(f"DEBUG: Action {i} stored successfully: {result.data}")
            except Exception as e:
                print(f"DEBUG: Failed to store action {i}: {e}")

        return {
            "success": True,
            "answer": ans,
            "confidence": 0.76,
            "evidence": top[:5],
            "actions": actions,
            "processing_time_ms": 0
        }
    except Exception as ex:
        raise HTTPException(500, f"rag ask error: {ex}")

@router.post("/api/voice-coach/v2/ask-fixed")
def vc_v2_ask(payload: Dict[str, Any]):
    """Voice Coach V2 - completely self-contained RAG implementation"""
    print(f"DEBUG: Voice Coach V2 called with payload: {payload}")
    q = payload.get("question", "")
    user_id = payload.get("user_id")
    print(f"DEBUG: V2 - user_id: {user_id}, question: {q}")
    
    if not user_id:
        raise HTTPException(400, "user_id required")
    
    try:
        # Embed query
        print("DEBUG: V2 - Getting query embedding")
        qvec = embed_small([q])[0]
        since = (datetime.utcnow() - timedelta(days=365*5)).isoformat()+"Z"

        # Get direct revenue data first
        print("DEBUG: V2 - Querying revenue_entries table directly")
        revenue_ctx = ""
        try:
            # Get all revenue entries for user, ordered by year/month
            revenue_data = supabase.table("revenue_entries").select("*").eq("user_id", user_id).order("year,month").execute().data or []
            print(f"DEBUG: V2 - Found {len(revenue_data)} revenue entries")
            
            # Build revenue context
            revenue_lines = []
            total_2025 = 0
            desired_revenue_goal = None
            
            for entry in revenue_data:
                year = entry.get('year')
                month = entry.get('month')
                actual = entry.get('actual_revenue', 0)
                desired = entry.get('desired_revenue', 0)
                
                print(f"DEBUG: Processing entry - {month}/{year}: actual=${actual}, desired=${desired}")
                
                # Track 2025 total and goal using the same logic as voice coach
                if year == 2025:
                    # Use coalesce logic like voice coach: desired_revenue as actual amount
                    amount = desired or actual or 0
                    if amount > 0:
                        total_2025 += amount
                        print(f"DEBUG: Adding to 2025 total: ${amount} (running total: ${total_2025})")
                
                # Look for revenue goal in desired_revenue field
                if desired > 0 and not desired_revenue_goal:
                    desired_revenue_goal = desired
                    print(f"DEBUG: Found revenue goal: ${desired}")
                
                if actual > 0:
                    revenue_lines.append(f"{month}/{year}: ${actual:,.0f} revenue")
            
            revenue_ctx = "\n".join(revenue_lines[-24:])  # Last 24 months
            
            # Try to get annual target from annual_targets table (like voice coach)
            if not desired_revenue_goal:
                try:
                    annual_target_result = supabase.table("annual_targets").select("target_revenue").eq("user_id", user_id).eq("year", 2025).limit(1).execute()
                    if annual_target_result.data and len(annual_target_result.data) > 0:
                        desired_revenue_goal = float(annual_target_result.data[0]["target_revenue"])
                        print(f"DEBUG: Found annual target from annual_targets table: ${desired_revenue_goal}")
                except Exception as e:
                    print(f"DEBUG: Could not fetch from annual_targets table: {e}")
            
            # Add summary for 2025
            print(f"DEBUG: Final 2025 total: ${total_2025}, revenue goal: ${desired_revenue_goal}")
            if total_2025 > 0:
                revenue_ctx += f"\n\n2025 Total Revenue to Date: ${total_2025:,.0f}"
            if desired_revenue_goal:
                revenue_ctx += f"\nAnnual Revenue Goal: ${desired_revenue_goal:,.0f}"
                if total_2025 > 0:
                    gap = desired_revenue_goal - total_2025
                    revenue_ctx += f"\nRemaining Gap to Goal: ${gap:,.0f}"
                    print(f"DEBUG: Gap calculation: ${desired_revenue_goal} - ${total_2025} = ${gap}")
            else:
                revenue_ctx += f"\nNo annual revenue goal found. Set one to enable gap calculations."
            
            print(f"DEBUG: V2 - Revenue context length: {len(revenue_ctx)}")
            
        except Exception as e:
            print(f"DEBUG: V2 - Revenue query failed: {e}")
            revenue_ctx = ""
        
        # Try user-scoped ANN RPC; fallback to recent nodes
        graph_ctx = ""
        top = []
        try:
            print("DEBUG: V2 - Trying user-scoped RPC")
            rpc = supabase.rpc(
                "match_nodes_arr_user",
                {"q": qvec, "p_user_id": user_id, "since": since, "k": 8}
            ).execute()
            top = rpc.data or []
            graph_ctx = "\n".join(f"{n['label']} {n.get('props',{}).get('month','')}: {n.get('body','')}" for n in top[:12])
            print(f"DEBUG: V2 - Found {len(top)} nodes via RPC")
        except Exception as e:
            print(f"DEBUG: V2 - RPC failed: {e}, trying fallback")
            rows = supabase.table("graph_nodes").select("*").eq("user_id", user_id).eq("label","Month").order("valid_from", desc=True).limit(12).execute().data or []
            top = rows
            graph_ctx = "\n".join(f"{r['label']} {r.get('props',{}).get('month','')}: {r.get('body','')}" for r in rows)
            print(f"DEBUG: V2 - Found {len(rows)} nodes via fallback")
        
        # Combine contexts
        ctx = f"REVENUE DATA:\n{revenue_ctx}\n\nADDITIONAL INSIGHTS:\n{graph_ctx}" if revenue_ctx else graph_ctx

        print(f"DEBUG: V2 - Context length: {len(ctx)}")
        
        # Generate answer
        system = "You are a CFO coach. Ground answers in the provided context if relevant. Be concise and numeric."
        ans = ""
        try:
            print("DEBUG: V2 - Calling OpenAI")
            resp = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role":"system","content":system},
                          {"role":"user","content":f"Q: {q}\n\nContext:\n{ctx}"}],
                temperature=0.2, max_tokens=350
            )
            ans = resp.choices[0].message.content.strip()
            print(f"DEBUG: V2 - Got answer: {ans[:100]}...")
        except Exception as e:
            print(f"DEBUG: V2 - OpenAI failed: {e}")
            ans = f"Based on your revenue data: {ctx[:400]}"

        # Extract actions
        actions = []
        try:
            print("DEBUG: V2 - Extracting actions")
            ar = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role":"system","content":'Extract 1-3 next steps as JSON: {"actions":[{"title":"...","due":"YYYY-MM-DD"}]}'},
                    {"role":"user","content":ans}
                ],
                temperature=0, max_tokens=120
            )
            jd = json.loads(ar.choices[0].message.content)
            actions = jd.get("actions", [])[:3]
            print(f"DEBUG: V2 - Extracted {len(actions)} actions")
        except Exception as e:
            print(f"DEBUG: V2 - Action extraction failed: {e}")

        return {
            "success": True,
            "answer": ans,
            "confidence": 0.76,
            "evidence": top[:5],
            "actions": actions,
            "next_steps": actions,
            "data_sources": ["revenue_entries","graph_nodes"],
            "processing_time_ms": 0
        }
    except Exception as ex:
        print(f"DEBUG: V2 - Exception: {ex}")
        return {
            "success": False,
            "answer": f"Voice Coach V2 encountered an error: {ex}",
            "confidence": 0,
            "evidence": [],
            "actions": [],
            "next_steps": [],
            "data_sources": ["revenue_entries","graph_nodes"]
        }

@router.get("/api/voice-coach/v2/actions-fixed/{user_id}")
def get_actions(user_id: str):
    print(f"DEBUG: Getting actions for user_id: {user_id}")
    try:
        res = supabase.table("user_actions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(200).execute()
        print(f"DEBUG: Found {len(res.data or [])} actions")
        print(f"DEBUG: Actions data: {res.data}")
        return {"actions": res.data or []}
    except Exception as e:
        print(f"DEBUG: Get actions failed: {e}")
        return {"actions": [], "error": str(e)}

@router.post("/api/voice-coach/v2/actions/update")
def update_action(payload: Dict[str, Any]):
    action_id = payload.get("action_id"); user_id = payload.get("user_id")
    if not action_id: raise HTTPException(400, "action_id required")
    upd = {}
    if payload.get("status"): upd["status"] = payload["status"]
    if payload.get("notes"):  upd["notes"]  = payload["notes"]
    q = supabase.table("user_actions").update(upd).eq("id", action_id)
    if user_id: q = q.eq("user_id", user_id)
    res = q.execute()
    return {"success": True, "updated": len(res.data or [])}

@router.get("/api/voice-coach/v2/status/{user_id}")
def system_status(user_id: str):
    n = supabase.table("graph_nodes").select("id", count="exact").eq("user_id", user_id).execute()
    e = supabase.table("graph_edges").select("id", count="exact").eq("user_id", user_id).execute()
    p = supabase.table("user_actions").select("id", count="exact").eq("user_id", user_id).neq("status","done").execute()
    return {"graph_entities": n.count or 0, "relationships": e.count or 0, "pending_actions": p.count or 0, "rag_enabled": True}
