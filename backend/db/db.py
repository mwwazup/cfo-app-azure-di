"""
Database module for the CFO App.
"""
from fastapi import FastAPI
from .neo4j_client import Neo4jClient

def init_db(app: FastAPI):
    """Initialize database connections"""
    @app.on_event("startup")
    async def startup_db_client():
        """Get Neo4j driver on startup"""
        try:
            Neo4jClient.get_driver()
        except Exception as e:
            print(f"Warning: Failed to initialize Neo4j driver: {str(e)}")

    @app.on_event("shutdown")
    async def shutdown_db_client():
        """Close Neo4j driver on shutdown"""
        Neo4jClient.close_driver()
