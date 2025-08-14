import os
from dotenv import load_dotenv

# Load test environment variables before any imports
print("Loading test environment variables...")
env_test_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.test')
print(f"Looking for .env.test at: {env_test_path}")
if not os.path.exists(env_test_path):
    raise FileNotFoundError(f".env.test file not found at {env_test_path}")
load_dotenv(env_test_path)

# Print loaded environment variables for debugging
env_vars = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_DB_PASSWORD",
    "NEO4J_URI",
    "NEO4J_USERNAME",
    "NEO4J_PASSWORD",
    "JWT_SECRET_KEY",
    "JWT_ALGORITHM"
]

for var in env_vars:
    print(f"{var} set: {bool(os.getenv(var))}")

# Now import other dependencies
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.postgres import get_db
from main import app  # Import app last after environment is set up

# Determine whether we should actually connect to a real database
SKIP_DB = os.getenv("SKIP_DB", "0") in {"1", "true", "True"}

print("\nInitializing database connection (SKIP_DB=%s)..." % SKIP_DB)

if not SKIP_DB:
    # Create test database engine with URL-encoded password
    db_password = os.getenv('SUPABASE_DB_PASSWORD')
    if not db_password:
        raise ValueError("SUPABASE_DB_PASSWORD environment variable is not set")

    # URL encode the @ symbol in the password
    db_password = db_password.replace('@', '%40')
    print(f"DB Password set: {'yes' if db_password else 'no'} (length: {len(db_password) if db_password else 0})")
    print("URL encoded @ symbol in password")

    # Construct database URL with pooler hostname and project-qualified username
    TEST_DATABASE_URL = f"postgresql://postgres.rpilyciarvacbmaaszvc:{db_password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
    print(f"Database URL: {TEST_DATABASE_URL}")

    # Create engine with debug output
    print("Creating SQLAlchemy engine...")
    try:
        engine = create_engine(TEST_DATABASE_URL, echo=True)  # Enable SQL query logging
        print("Successfully created SQLAlchemy engine")

        # Create test session
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    except Exception as e:
        print("\nFailed to create SQLAlchemy engine:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        if hasattr(e, '__cause__') and e.__cause__:
            print(f"Caused by: {str(e.__cause__)}")
        raise
else:
    # When SKIP_DB is enabled we use dummy placeholders
    engine = None
    TestingSessionLocal = None

def override_get_db():
    """Override database session for testing. When SKIP_DB is enabled we simply yield None to satisfy the dependency but avoid any real DB interaction."""
    if SKIP_DB:
        yield None
    else:
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

# Override the database dependency
app.dependency_overrides[get_db] = override_get_db

# Create test client
client = TestClient(app)

@pytest.fixture(scope="module")
def auth_tokens():
    """Fixture to get auth tokens for protected endpoint tests"""
    # Test signup first
    signup_data = {
        "email": "test@example.com",
        "password": "Test123!@#"
    }
    response = client.post("/auth/signup", json=signup_data)
    
    # If signup succeeds, use those tokens
    if response.status_code == 200:
        tokens = response.json()
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"]
        }
    
    # If signup fails (user exists), try login
    login_data = {
        "username": "test@example.com",
        "password": "Test123!@#"
    }
    response = client.post("/auth/token", data=login_data)
    assert response.status_code == 200, f"Login failed: {response.text}"
    
    tokens = response.json()
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"]
    }

@pytest.fixture(scope="module")
def test_token(auth_tokens):
    """Fixture to get access token for backward compatibility"""
    return auth_tokens["access_token"]

def test_list_financial_statements(auth_tokens):
    """Test listing financial statements"""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    response = client.get("/financial/statements", headers=headers)
    
    # If token expired, try refresh
    if response.status_code == 401:
        refresh_response = client.post("/auth/refresh-token", json={"refresh_token": auth_tokens["refresh_token"]})
        assert refresh_response.status_code == 200, "Token refresh failed"
        new_tokens = refresh_response.json()
        headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
        response = client.get("/financial/statements", headers=headers)
    
    assert response.status_code == 200, f"Request failed: {response.text}"
    statements = response.json()
    assert isinstance(statements, list)

def test_upload_financial_statement(auth_tokens, tmp_path):
    """Test uploading a financial statement"""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    
    # Create a test CSV file
    test_file = tmp_path / "test_statement.csv"
    test_file.write_text("Date,Description,Amount\n2025-01-01,Test Revenue,1000.00")
    
    with open(test_file, "rb") as f:
        files = {"file": ("test_statement.csv", f, "text/csv")}
        data = {"statement_type": "income_statement"}
        response = client.post("/financial/upload", headers=headers, files=files, data=data)
        
        # If token expired, try refresh
        if response.status_code == 401:
            refresh_response = client.post("/auth/refresh-token", json={"refresh_token": auth_tokens["refresh_token"]})
            assert refresh_response.status_code == 200, "Token refresh failed"
            new_tokens = refresh_response.json()
            headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
            with open(test_file, "rb") as f:
                files = {"file": ("test_statement.csv", f, "text/csv")}
                response = client.post("/financial/upload", headers=headers, files=files, data=data)
    
    assert response.status_code == 200, f"Upload failed: {response.text}"
    result = response.json()
    assert "id" in result
    assert result["file_name"] == "test_statement.csv"
    assert result["statement_type"] == "income_statement"
    assert result["file_type"] == "csv"
    
    # Store statement ID for other tests
    return result["id"]

def test_get_financial_statement(auth_tokens, test_upload_financial_statement):
    """Test getting a specific financial statement"""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    statement_id = test_upload_financial_statement
    
    response = client.get(f"/financial/statements/{statement_id}", headers=headers)
    
    # If token expired, try refresh
    if response.status_code == 401:
        refresh_response = client.post("/auth/refresh-token", json={"refresh_token": auth_tokens["refresh_token"]})
        assert refresh_response.status_code == 200, "Token refresh failed"
        new_tokens = refresh_response.json()
        headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
        response = client.get(f"/financial/statements/{statement_id}", headers=headers)
    
    assert response.status_code == 200, f"Request failed: {response.text}"
    result = response.json()
    assert result["id"] == statement_id
    assert "file_name" in result
    assert "statement_type" in result
    assert "parsed_data" in result

def test_parse_financial_statement(auth_tokens, test_upload_financial_statement):
    """Test parsing a financial statement"""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    statement_id = test_upload_financial_statement
    
    response = client.put(f"/financial/statements/{statement_id}/parse", headers=headers)
    
    # If token expired, try refresh
    if response.status_code == 401:
        refresh_response = client.post("/auth/refresh-token", json={"refresh_token": auth_tokens["refresh_token"]})
        assert refresh_response.status_code == 200, "Token refresh failed"
        new_tokens = refresh_response.json()
        headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
        response = client.put(f"/financial/statements/{statement_id}/parse", headers=headers)
    
    assert response.status_code == 200, f"Request failed: {response.text}"
    result = response.json()
    assert result["id"] == statement_id
    assert "parsed_data" in result
    assert result["parsed_data"]["status"] == "parsed"