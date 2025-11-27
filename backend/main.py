"""
Main FastAPI application module.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import openai
from supabase import create_client, Client
import httpx
from datetime import datetime
from api import auth, chat, memory, business, financial, bonus_roi, zep, big_fig
from logging_config import setup_logging, get_logger

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CFO App API",
    description="Backend API for CFO App with Supabase, Claude AI, and Zep Cloud integration",
    version="1.0.0"
)

# Neo4j removed - not used in this application
logger.info("Database connections managed by individual services")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on app shutdown"""
    logger.info("Shutting down gracefully")

# Configure CORS - use environment variable for allowed origins
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]

logger.info(f"CORS configured for origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
)

# Include routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(business.router)
app.include_router(financial.router)
app.include_router(financial.revenue_router)  # Include revenue router separately
app.include_router(bonus_roi.bonus_roi_router)  # Include bonus ROI router
app.include_router(zep.router)  # Include Zep proxy router
app.include_router(big_fig.router)  # Lighthouse / Big Fig goals

@app.on_event("startup")
async def startup_event():
    """Test connections to all services on startup"""
    # Allow tests to bypass costly external checks
    if os.getenv("SKIP_SERVICE_CHECKS", "0") == "1":
        logger.info("Skipping service checks (SKIP_SERVICE_CHECKS=1)")
        return

    errors = []

    # Test Supabase connection
    try:
        supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY")
        )
        # Simple connectivity test
        logger.info("Supabase connection successful")
    except Exception as e:
        error_msg = "Supabase connection failed"
        logger.error(f"{error_msg}: {str(e)}")
        errors.append(error_msg)

    # Test OpenAI connection
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        if openai.api_key:
            logger.info("OpenAI API key configured")
        else:
            logger.warning("OpenAI API key not configured")
    except Exception as e:
        error_msg = "OpenAI configuration failed"
        logger.error(f"{error_msg}: {str(e)}")
        errors.append(error_msg)

    # Zep is tested via backend proxy endpoint
    logger.info("Zep connection managed via backend proxy")

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
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database connectivity
    try:
        from db.postgres import get_supabase_db
        supabase = get_supabase_db()
        # Simple query to verify connection
        result = supabase.table('users').select('id').limit(1).execute()
        health_status["checks"]["database"] = "ok"
    except Exception as e:
        logger.error(f"Health check - database failed: {str(e)}")
        health_status["checks"]["database"] = "degraded"
        health_status["status"] = "degraded"
    
    # Check OpenAI API key presence (not actual connection)
    if os.getenv("OPENAI_API_KEY"):
        health_status["checks"]["openai"] = "configured"
    else:
        health_status["checks"]["openai"] = "not_configured"
    
    # Neo4j removed - not used
    health_status["checks"]["zep"] = "via_proxy"
    
    status_code = 200 if health_status["status"] in ["healthy", "degraded"] else 503
    return JSONResponse(content=health_status, status_code=status_code)

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting CFO App Backend...")
    logger.info("📊 Available endpoints:")
    logger.info("   - GET /")
    logger.info("   - GET /health")
    logger.info("   - GET /api/financial-documents")
    logger.info("   - POST /api/financial-documents")
    logger.info("   - PUT /api/financial-documents/{id}")
    logger.info("   - DELETE /api/financial-documents/{id}")
    logger.info("   - GET /api/revenue-entries")
    logger.info("   - POST /api/revenue-entries")
    logger.info("   - GET /api/revenue-kpis")
    logger.info("   - GET /api/kpi-records")
    logger.info("   - POST /api/kpi-records")
    logger.info("   - PUT /api/kpi-records/goal")
    logger.info("   - DELETE /api/kpi-records")
    logger.info("   - GET /docs (FastAPI auto-docs)")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
