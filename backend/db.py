"""
This file has been replaced by the db/ package.
Please use:
- db.get_neo4j_driver() instead of neo4j_driver
- db.close_neo4j_driver() instead of close_neo4j()
"""
import os
from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# Initialize Neo4j driver (ONE driver for the whole process)
neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

async def close_neo4j():
    """Close the Neo4j driver connection"""
    neo4j_driver.close()
