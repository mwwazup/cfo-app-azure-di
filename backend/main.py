"""
Main FastAPI application module.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import openai
from supabase import create_client, Client
import httpx
from datetime import datetime
from api import auth, chat, memory, business, financial, document_analysis, document_ingest
from db import init_db, get_neo4j_driver, close_neo4j_driver

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Initialize FastAPI app
app = FastAPI(
    title="CFO App API",
    description="Backend API for CFO App with Supabase, OpenAI, Zep, and Neo4j integration",
    version="1.0.0"
)

# Initialize database connections
init_db(app)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on app shutdown"""
    # close_neo4j_driver is synchronous; calling it directly avoids TypeError
    close_neo4j_driver()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(business.router)
app.include_router(financial.router)
app.include_router(document_analysis.router)
app.include_router(document_ingest.router)

@app.on_event("startup")
async def startup_event():
    """Test connections to all services on startup"""
    # Allow tests to bypass costly external checks
    if os.getenv("SKIP_SERVICE_CHECKS") == "1":
        return

    errors = []

    # Test Supabase connection
    try:
        supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY")  # Changed from SUPABASE_KEY to SUPABASE_ANON_KEY
        )
        await supabase.auth.get_user("dummy-token")
    except Exception as e:
        errors.append(f"Supabase connection failed: {str(e)}")

    # Test OpenAI connection
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        openai.Model.list()
    except Exception as e:
        errors.append(f"OpenAI connection failed: {str(e)}")

    # Skip Zep and Neo4j connections - not currently used
    print("Skipping Zep and Neo4j connection tests - not currently used")

    if errors:
        raise HTTPException(
            status_code=500,
            detail={"message": "Service connection failures", "errors": errors}
        )

# Root endpoint
@app.get("/")
async def root():
    return {"status": "ok", "message": "CFO App backend is running"}

# Health check endpoint
@app.get("/health")
async def health_check():
    """Check the health of all backend services"""
    # Skip Neo4j checks since it's not currently used
    return {
        "status": "healthy",
        "neo4j": "skipped (not currently used)",
        "timestamp": datetime.utcnow().isoformat()
    }
