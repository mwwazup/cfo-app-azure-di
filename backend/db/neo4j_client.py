"""
Neo4j database client module.
"""
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Neo4jClient:
    _instance = None
    _driver = None

    @classmethod
    def get_driver(cls):
        """Get Neo4j driver instance, creating it if necessary"""
        if cls._driver is None:
            print("\nInitializing Neo4j driver...")
            NEO4J_URI = os.getenv("NEO4J_URI")
            NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
            NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

            print(f"Neo4j URI set: {bool(NEO4J_URI)} (value: {NEO4J_URI})")
            print(f"Neo4j username set: {bool(NEO4J_USERNAME)} (value: {NEO4J_USERNAME})")
            print(f"Neo4j password set: {bool(NEO4J_PASSWORD)} (length: {len(NEO4J_PASSWORD) if NEO4J_PASSWORD else 0})")

            if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
                missing_vars = [
                    var for var, val in [
                        ("NEO4J_URI", NEO4J_URI),
                        ("NEO4J_USERNAME", NEO4J_USERNAME),
                        ("NEO4J_PASSWORD", NEO4J_PASSWORD)
                    ] if not val
                ]
                raise ValueError(f"Missing Neo4j configuration: {', '.join(missing_vars)}")

            print(f"\nAttempting Neo4j connection:")
            print(f"URI: {NEO4J_URI}")
            print(f"Username: {NEO4J_USERNAME}")
            print(f"Password length: {len(NEO4J_PASSWORD)}")

            try:
                print("Creating Neo4j driver...")
                cls._driver = GraphDatabase.driver(
                    NEO4J_URI,
                    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
                )
                print("Driver created, testing connection...")

                # Test the connection
                with cls._driver.session(database="neo4j") as session:
                    print("Session opened, running test query...")
                    result = session.run("RETURN 1 as test")
                    test_value = result.single()["test"]
                    print(f"Successfully connected to Neo4j (test value: {test_value})")
            except Exception as e:
                print(f"\nFailed to connect to Neo4j:")
                print(f"Error type: {type(e).__name__}")
                print(f"Error message: {str(e)}")
                if hasattr(e, '__cause__') and e.__cause__:
                    print(f"Caused by: {str(e.__cause__)}")
                raise
        return cls._driver

    @classmethod
    def close_driver(cls):
        """Close Neo4j driver if it exists"""
        if cls._driver is not None:
            cls._driver.close()
            cls._driver = None
