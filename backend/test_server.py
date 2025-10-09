from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Test Auth Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SupabaseLinkRequest(BaseModel):
    clerkUserId: str
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None

@app.get("/")
def root():
    return {"status": "ok", "message": "Test server running"}

@app.post("/api/auth/supabase-link")
def link_supabase_account(request: SupabaseLinkRequest):
    """Link a Clerk user account to Supabase profile"""
    try:
        return {
            "supabaseUserId": request.clerkUserId,
            "message": "Profile linked successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    print("Starting test server on port 5180...")
    uvicorn.run(app, host="0.0.0.0", port=5180)
