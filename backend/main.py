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
from api import auth, chat, memory, business, financial, document_analysis
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

    # Test Zep connection
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{os.getenv('ZEP_API_URL')}/api/v1/health",
                headers={
                    "accept": "application/json",
                    "Authorization": f"Bearer {os.getenv('ZEP_API_KEY')}"
                }
            )
            response.raise_for_status()
    except Exception as e:
        errors.append(f"Zep connection failed: {str(e)}")

    # Test Neo4j connection (skip when SKIP_SERVICE_CHECKS=1)
    if os.getenv("SKIP_SERVICE_CHECKS") != "1":
        try:
            with get_neo4j_driver().session(database="neo4j") as session:
                result = session.run("RETURN 1 AS ok")
                neo4j_ok = bool(result.single()['ok'])
        except Exception as e:
            errors.append(f"Neo4j connection failed: {str(e)}")

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
    # If we're in lightweight mode, skip external checks
    if os.getenv("SKIP_SERVICE_CHECKS") == "1":
        return {
            "status": "healthy",
            "neo4j": "skipped",
            "timestamp": datetime.utcnow().isoformat()
        }

    # Otherwise, attempt Neo4j check but never fail the endpoint
    neo4j_ok = False
    neo4j_error = None
    try:
        with get_neo4j_driver().session(database="neo4j") as session:
            result = session.run("RETURN 1 AS ok")
            neo4j_ok = bool(result.single()['ok'])
    except Exception as e:
        neo4j_error = str(e)

    response = {
        "status": "healthy" if neo4j_ok else "degraded",
        "neo4j": neo4j_ok,
        "timestamp": datetime.utcnow().isoformat()
    }
    if neo4j_error:
        response["neo4j_error"] = neo4j_error
    return response
